import { z } from "zod";
import { TwitchFault, type TwitchAccess } from "../../auth/twitch";
const channelSchema = z.object({ broadcaster_id: z.string(), broadcaster_login: z.string(), broadcaster_name: z.string(), title: z.string(), game_id: z.string(), game_name: z.string() });
export type TwitchChannel = { broadcasterId: string; login: string; displayName: string; title: string; categoryId: string; categoryName: string };
export class TwitchChannelClient {
  constructor(private fetcher: typeof fetch = fetch) {}
  private async request(access: TwitchAccess, title?: string) {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.twitch.tv/helix/channels?broadcaster_id=${encodeURIComponent(access.account.id)}`, {
        method: title === undefined ? "GET" : "PATCH", signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${access.accessToken}`, "Client-Id": access.clientId, "Content-Type": "application/json" },
        ...(title === undefined ? {} : { body: JSON.stringify({ title }) }),
      });
    } catch { throw new TwitchFault(title === undefined ? "TWITCH_UNAVAILABLE" : "WRITE_OUTCOME_UNKNOWN"); }
    if (!response.ok) throw new TwitchFault(response.status === 401 ? "TWITCH_RECONNECT_REQUIRED" : response.status === 403 ? "TWITCH_SCOPE_REQUIRED" : response.status === 429 ? "TWITCH_RATE_LIMITED" : title !== undefined && response.status >= 500 ? "WRITE_OUTCOME_UNKNOWN" : "TWITCH_UNAVAILABLE");
    return response;
  }
  async read(access: TwitchAccess): Promise<TwitchChannel> {
    const response = await this.request(access);
    let value: unknown; try { value = await response.json(); } catch { throw new TwitchFault("TWITCH_INVALID_RESPONSE"); }
    const parsed = z.object({ data: z.array(channelSchema).length(1) }).safeParse(value);
    if (!parsed.success) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    const channel = parsed.data.data[0];
    if (!channel || channel.broadcaster_id !== access.account.id) throw new TwitchFault("TWITCH_WRONG_ACCOUNT");
    return { broadcasterId: channel.broadcaster_id, login: channel.broadcaster_login, displayName: channel.broadcaster_name, title: channel.title, categoryId: channel.game_id, categoryName: channel.game_name };
  }
  async writeTitle(access: TwitchAccess, title: string) { await this.request(access, title); }
}
