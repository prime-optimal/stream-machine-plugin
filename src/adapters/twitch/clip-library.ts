import { z } from "zod";
import { TwitchFault, type TwitchAccount } from "../../auth/twitch";

export const clipThumbnailHosts = ["static-cdn.jtvnw.net", "clips-media-assets2.twitch.tv"] as const;
const clipPageHosts = ["clips.twitch.tv", "www.twitch.tv"];
const gameBatchSize = 100;
export const defaultClipPageSize = 24;

export const clipLibraryInputSchema = z.object({
  cursor: z.string().min(1).max(2048).optional(),
  first: z.number().int().min(1).max(100).default(defaultClipPageSize),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  endedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();
export type ClipLibraryInput = z.input<typeof clipLibraryInputSchema>;

export type StoredClip = { fileId: string; playbackUrl: string; downloadUrl: string; bytes: number; storedAt: string };
export type ClipItem = {
  id: string; title: string; url: string;
  createdAt: string; durationSeconds: number; viewCount: number;
  creator: { id: string | null; name: string | null };
  game: { id: string | null; name: string | null };
  thumbnailUrl: string | null;
  videoId: string | null; vodOffsetSeconds: number | null;
  stored: StoredClip | null;
};
export type ClipLibraryPage = {
  account: Pick<TwitchAccount, "id" | "login" | "displayName">;
  items: ClipItem[];
  cursor: string | null;
  storage: "site" | "local";
};
export type HelixGet = (path: "clips" | "games", params: URLSearchParams) => Promise<unknown>;

const text = z.string().nullish();
const helixClipSchema = z.object({
  id: z.string().min(1), url: z.string(), title: z.string(), created_at: z.string().min(1),
  duration: z.number().finite().nonnegative(), view_count: z.number().finite().nonnegative(),
  creator_id: text, creator_name: text, game_id: text, thumbnail_url: text, video_id: text,
  vod_offset: z.number().finite().nonnegative().nullish(),
});
const clipPageSchema = z.object({
  data: z.array(helixClipSchema).max(100),
  pagination: z.object({ cursor: z.string().nullish() }).optional(),
});
const gamePageSchema = z.object({ data: z.array(z.object({ id: z.string(), name: z.string() })) });

const present = (value: string | null | undefined) => value ? value : null;

export function safeClipThumbnail(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  return (clipThumbnailHosts as readonly string[]).includes(url.hostname) ? url.href : null;
}

function safeClipPage(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new TwitchFault("TWITCH_INVALID_RESPONSE"); }
  if (url.protocol !== "https:" || !clipPageHosts.includes(url.hostname) || url.username || url.password || url.port) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
  return url.href;
}

async function gameNames(get: HelixGet, ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (let start = 0; start < ids.length; start += gameBatchSize) {
    const params = new URLSearchParams();
    for (const id of ids.slice(start, start + gameBatchSize)) params.append("id", id);
    const parsed = gamePageSchema.safeParse(await get("games", params));
    if (!parsed.success) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
    for (const game of parsed.data.data) names.set(game.id, game.name);
  }
  return names;
}

export async function fetchClipLibraryPage(
  get: HelixGet, account: ClipLibraryPage["account"], input: ClipLibraryInput, storage: ClipLibraryPage["storage"],
): Promise<ClipLibraryPage> {
  const args = clipLibraryInputSchema.parse(input);
  const params = new URLSearchParams({ broadcaster_id: account.id, first: String(args.first) });
  if (args.cursor) params.set("after", args.cursor);
  if (args.startedAt) params.set("started_at", args.startedAt);
  if (args.endedAt) params.set("ended_at", args.endedAt);
  const parsed = clipPageSchema.safeParse(await get("clips", params));
  if (!parsed.success) throw new TwitchFault("TWITCH_INVALID_RESPONSE");
  const gameIds = [...new Set(parsed.data.data.map(clip => present(clip.game_id)).filter((id): id is string => id !== null))];
  const names = gameIds.length ? await gameNames(get, gameIds) : new Map<string, string>();
  const items = parsed.data.data.map((clip): ClipItem => {
    const gameId = present(clip.game_id);
    return {
      id: clip.id, title: clip.title, url: safeClipPage(clip.url),
      createdAt: clip.created_at, durationSeconds: clip.duration, viewCount: clip.view_count,
      creator: { id: present(clip.creator_id), name: present(clip.creator_name) },
      game: { id: gameId, name: gameId ? names.get(gameId) ?? null : null },
      thumbnailUrl: safeClipThumbnail(clip.thumbnail_url),
      videoId: present(clip.video_id), vodOffsetSeconds: clip.vod_offset ?? null,
      stored: null,
    };
  });
  return {
    account: { id: account.id, login: account.login, displayName: account.displayName },
    items, cursor: present(parsed.data.pagination?.cursor), storage,
  };
}
