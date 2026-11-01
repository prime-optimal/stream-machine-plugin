import { TwitchFault, type TwitchAccountProvider } from "../../auth/twitch";
import { TwitchChannelClient, type TwitchChannel } from "./client";
import { BROADCAST_SCOPE, twitchPermissions } from "../../auth/permissions";
export const TITLE_SCOPE = BROADCAST_SCOPE;
type Preview = { id: string; before: TwitchChannel; title: string; expiresAt: number; approved: boolean; consumed: boolean };
export class TwitchTitleService {
  private previews = new Map<string, Preview>();
  private executing = false;
  constructor(readonly accounts: TwitchAccountProvider, private client = new TwitchChannelClient(), private now = Date.now) {}
  async status() { return this.accounts.withAccount(async ({ account }) => ({ mode: "live", account: { ...account, scopes: [...account.scopes] }, ...twitchPermissions(account.scopes) })); }
  async channel() { return this.accounts.withAccount(async access => ({ mode: "live", channel: await this.client.read(access) })); }
  async profile() { return this.accounts.withAccount(async access => ({ mode: "live", source: "https://api.twitch.tv/helix/users", profile: await this.client.readProfile(access) })); }
  async preview(title: string) {
    if (!title.trim() || [...title].length > 140) throw new TwitchFault("INVALID_TITLE");
    for (const [id, p] of this.previews) if (p.expiresAt <= this.now()) this.previews.delete(id);
    if (this.previews.size >= 100) throw new TwitchFault("PREVIEW_LIMIT");
    return this.accounts.withAccount(async access => {
      const before = await this.client.read(access);
      if (title === before.title) throw new TwitchFault("NO_TITLE_CHANGE");
      const p: Preview = { id: crypto.randomUUID(), before, title, expiresAt: this.now() + 300000, approved: false, consumed: false };
      this.previews.set(p.id, p);
      return { mode: "live", executable: access.account.scopes.includes(TITLE_SCOPE), previewId: p.id, account: access.account.id, before, after: { title }, expiresAt: p.expiresAt, requiredScope: TITLE_SCOPE };
    });
  }
  approvalDetails(id: string) { const p = this.pending(id); return { previewId: p.id, account: p.before.login, before: p.before.title, after: p.title, expiresAt: p.expiresAt }; }
  approve(id: string) { this.pending(id).approved = true; }
  clear() { this.previews.clear(); }
  private pending(id: string) {
    const p = this.previews.get(id);
    if (!p) throw new TwitchFault("PREVIEW_NOT_FOUND");
    if (p.consumed) throw new TwitchFault("PREVIEW_CONSUMED");
    if (p.expiresAt <= this.now()) throw new TwitchFault("PREVIEW_EXPIRED");
    return p;
  }
  async apply(id: string) {
    if (this.executing) throw new TwitchFault("TWITCH_EXECUTION_BUSY");
    const p = this.pending(id);
    if (!p.approved) throw new TwitchFault("BROWSER_APPROVAL_REQUIRED");
    this.executing = true;
    try {
      return await this.accounts.withAccount(async access => {
        if (access.account.id !== p.before.broadcasterId) throw new TwitchFault("TWITCH_WRONG_ACCOUNT");
        if (!access.account.scopes.includes(TITLE_SCOPE)) throw new TwitchFault("TWITCH_SCOPE_REQUIRED");
        const current = await this.client.read(access);
        if (current.title !== p.before.title || current.categoryId !== p.before.categoryId) throw new TwitchFault("PREVIEW_STALE");
        this.pending(id);
        p.consumed = true;
        await this.client.writeTitle(access, p.title);
        try {
          const channel = await this.client.read(access);
          return { mode: "live", status: channel.title === p.title ? "verified" : "applied_unverified", previewId: id, channel };
        } catch { return { mode: "live", status: "applied_unverified", previewId: id }; }
      });
    } finally { this.executing = false; }
  }
}
