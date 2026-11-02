import { TwitchFault, type TwitchAccountProvider } from "../../auth/twitch";
import { TwitchChannelClient } from "./client";
import { BROADCAST_SCOPE, twitchPermissions } from "../../auth/permissions";
import { MemoryTitlePreviewStore, type TitlePreviewStore } from "./title-preview-store";
export const TITLE_SCOPE = BROADCAST_SCOPE;
export class TwitchTitleService {
  private executing = false;
  constructor(readonly accounts: TwitchAccountProvider, private client = new TwitchChannelClient(), private now = Date.now, private previews: TitlePreviewStore = new MemoryTitlePreviewStore()) {}
  async status() { return this.accounts.withAccount(async ({ account }) => ({ mode: "live", account: { ...account, scopes: [...account.scopes] }, ...twitchPermissions(account.scopes) })); }
  async channel() { return this.accounts.withAccount(async access => ({ mode: "live", channel: await this.client.read(access) })); }
  async profile() { return this.accounts.withAccount(async access => ({ mode: "live", source: "https://api.twitch.tv/helix/users", profile: await this.client.readProfile(access) })); }
  async preview(title: string) {
    if (!title.trim() || [...title].length > 140) throw new TwitchFault("INVALID_TITLE");
    return this.accounts.withAccount(async access => {
      const before = await this.client.read(access);
      if (title === before.title) throw new TwitchFault("NO_TITLE_CHANGE");
      const p = { id: crypto.randomUUID(), before, title, expiresAt: this.now() + 300000, approved: false, consumed: false };
      await this.previews.create(p, this.now());
      return { mode: "live", executable: access.account.scopes.includes(TITLE_SCOPE), previewId: p.id, account: access.account.id, before, after: { title }, expiresAt: p.expiresAt, requiredScope: TITLE_SCOPE };
    });
  }
  async approvalDetails(id: string) { const p = await this.pending(id); return { previewId: p.id, account: p.before.login, before: p.before.title, after: p.title, expiresAt: p.expiresAt }; }
  async approve(id: string) {
    await this.pending(id);
    if (!await this.previews.approve(id, this.now())) { await this.pending(id); throw new TwitchFault("PREVIEW_CONSUMED"); }
  }
  async clear() { await this.previews.clear(); }
  private async pending(id: string) {
    const p = await this.previews.get(id);
    if (!p) throw new TwitchFault("PREVIEW_NOT_FOUND");
    if (p.consumed) throw new TwitchFault("PREVIEW_CONSUMED");
    if (p.expiresAt <= this.now()) throw new TwitchFault("PREVIEW_EXPIRED");
    return p;
  }
  async apply(id: string) {
    if (this.executing) throw new TwitchFault("TWITCH_EXECUTION_BUSY");
    const p = await this.pending(id);
    if (!p.approved) throw new TwitchFault("BROWSER_APPROVAL_REQUIRED");
    this.executing = true;
    const lease = crypto.randomUUID();
    let acquired = false;
    try {
      return await this.accounts.withAccount(async access => {
        if (access.account.id !== p.before.broadcasterId) throw new TwitchFault("TWITCH_WRONG_ACCOUNT");
        if (!access.account.scopes.includes(TITLE_SCOPE)) throw new TwitchFault("TWITCH_SCOPE_REQUIRED");
        acquired = await this.previews.acquire(lease, this.now());
        if (!acquired) throw new TwitchFault("TWITCH_EXECUTION_BUSY");
        const current = await this.client.read(access);
        if (current.title !== p.before.title || current.categoryId !== p.before.categoryId) throw new TwitchFault("PREVIEW_STALE");
        await this.pending(id);
        if (!await this.previews.consume(id, this.now())) { await this.pending(id); throw new TwitchFault("PREVIEW_CONSUMED"); }
        await this.client.writeTitle(access, p.title);
        try {
          const channel = await this.client.read(access);
          return { mode: "live", status: channel.title === p.title ? "verified" : "applied_unverified", previewId: id, channel };
        } catch { return { mode: "live", status: "applied_unverified", previewId: id }; }
      });
    } finally { this.executing = false; if (acquired) await this.previews.release(lease); }
  }
}
