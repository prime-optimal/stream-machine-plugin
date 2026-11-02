import { z } from "zod";
import { TwitchFault, type TwitchAccess } from "../../auth/twitch";
export const clipIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);
const clipSchema = z.object({ id: clipIdSchema, broadcaster_id: z.string().min(1), title: z.string(), url: z.url() });
const downloadSchema = z.object({ clip_id: clipIdSchema, landscape_download_url: z.string().nullable(), portrait_download_url: z.string().nullable() });
export class TwitchClipClient {
  constructor(private fetcher: typeof fetch = fetch) {}
  private async request(access: TwitchAccess, path: string, params: Record<string, string>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.twitch.tv/helix/${path}?${new URLSearchParams(params)}`, {
        redirect: "manual", signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${access.accessToken}`, "Client-Id": access.clientId },
      });
    } catch { throw new TwitchFault("TWITCH_UNAVAILABLE"); }
    if (!response.ok) throw new TwitchFault(response.status === 401 ? "TWITCH_RECONNECT_REQUIRED" : response.status === 403 ? "TWITCH_SCOPE_REQUIRED" : response.status === 429 ? "TWITCH_RATE_LIMITED" : "TWITCH_UNAVAILABLE");
    try { return await response.json(); } catch { throw new TwitchFault("TWITCH_INVALID_RESPONSE"); }
  }
  async read(access: TwitchAccess, clipId: string) {
    const parsed = z.object({ data: z.array(clipSchema).max(1) }).safeParse(await this.request(access, "clips", { id: clipId }));
    if (!parsed.success) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    const clip = parsed.data.data[0];
    if (!clip) throw new TwitchFault("CLIP_NOT_FOUND");
    if (clip.id !== clipId) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    const source = new URL(clip.url);
    if (source.protocol !== "https:" || !["clips.twitch.tv", "www.twitch.tv"].includes(source.hostname) || source.username || source.password || source.port) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    return { id: clip.id, broadcasterId: clip.broadcaster_id, title: clip.title, sourceUrl: clip.url };
  }
  async download(access: TwitchAccess, clipId: string) {
    const parsed = z.object({ data: z.array(downloadSchema).max(1) }).safeParse(await this.request(access, "clips/downloads", { broadcaster_id: access.account.id, editor_id: access.account.id, clip_id: clipId }));
    if (!parsed.success) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    const clip = parsed.data.data[0];
    if (!clip) throw new TwitchFault("CLIP_FORMAT_UNAVAILABLE");
    if (clip.clip_id !== clipId) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    if (clip.landscape_download_url) return { format: "landscape", url: clip.landscape_download_url };
    if (clip.portrait_download_url) return { format: "portrait", url: clip.portrait_download_url };
    throw new TwitchFault("CLIP_FORMAT_UNAVAILABLE");
  }
}
