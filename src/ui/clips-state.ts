import { z } from "zod";
import type { ToolResult } from "./tool-transport";

const nullableString = z.string().nullable();
const storedSchema = z.object({
  fileId: z.string().min(1), playbackUrl: z.string(), downloadUrl: z.string(), bytes: z.number().finite().nonnegative(), storedAt: z.string(),
});
const clipSchema = z.object({
  id: z.string().min(1), title: z.string(), url: z.string(), createdAt: z.string(),
  durationSeconds: z.number(), viewCount: z.number(),
  creator: z.object({ id: nullableString, name: nullableString }),
  game: z.object({ id: nullableString, name: nullableString }),
  thumbnailUrl: nullableString, videoId: nullableString, vodOffsetSeconds: z.number().nullable(),
  stored: storedSchema.nullable(),
});
const libraryResultSchema = z.object({
  clips: z.object({
    account: z.object({ id: z.string(), login: z.string(), displayName: z.string() }),
    items: z.array(clipSchema), cursor: nullableString, storage: z.enum(["site", "local"]),
  }),
});
const faultSchema = z.object({ error: z.object({ code: z.string() }) });
const batchSchema = z.object({ url: z.string(), clipCount: z.number(), bytes: z.number(), expiresAt: z.string() });
const zipResultSchema = z.object({ zip: z.object({ batches: z.array(batchSchema) }) });

export type ClipItem = z.infer<typeof clipSchema>;
export type ClipPage = z.infer<typeof libraryResultSchema>["clips"];
export type ZipBatch = z.infer<typeof batchSchema>;
export type ClipSort = "newest" | "oldest" | "views";
export type ClipFilter = { search: string; category: string };
export const allCategories = "";
export const uncategorized = "\u0000none";
export const thumbnailHosts = ["static-cdn.jtvnw.net", "clips-media-assets2.twitch.tv"];
export const twitchHosts = ["twitch.tv", "www.twitch.tv", "clips.twitch.tv", "m.twitch.tv"];

export class ClipLibraryError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export function parseLibrary(value: unknown): ClipPage {
  const fault = faultSchema.safeParse(value);
  if (fault.success) throw new ClipLibraryError(fault.data.error.code, faultMessage(fault.data.error.code));
  const parsed = libraryResultSchema.safeParse(value);
  if (!parsed.success) throw new ClipLibraryError("INVALID_RESPONSE", "The clip library returned an unexpected response.");
  return parsed.data.clips;
}

export function parseZipBatches(value: unknown): ZipBatch[] {
  const fault = faultSchema.safeParse(value);
  if (fault.success) throw new ClipLibraryError(fault.data.error.code, faultMessage(fault.data.error.code));
  const parsed = zipResultSchema.safeParse(value);
  if (!parsed.success) throw new ClipLibraryError("INVALID_RESPONSE", "The ZIP tool returned an unexpected response.");
  return parsed.data.zip.batches.flatMap(batch => {
    const url = safeHttpsUrl(batch.url);
    return url ? [{ ...batch, url }] : [];
  });
}

const archiveSchema = z.object({ archive: z.object({
  saved: z.array(z.object({ clipId: z.string(), stored: storedSchema.optional() })),
  skipped: z.array(z.object({ clipId: z.string(), stored: storedSchema.optional() })),
  failed: z.array(z.object({ clipId: z.string(), code: z.string(), outcome: z.string() })),
}) });

export function parseArchive(value: unknown) {
  const fault = faultSchema.safeParse(value);
  if (fault.success) throw new ClipLibraryError(fault.data.error.code, `The clip could not be saved (${fault.data.error.code}).`);
  const parsed = archiveSchema.safeParse(value);
  if (!parsed.success) throw new ClipLibraryError("INVALID_RESPONSE", "The save tool returned an unexpected response.");
  return parsed.data.archive;
}

export type StoredClip = z.infer<typeof storedSchema>;
export type PreparationResult =
  | { kind: "ready"; stored: StoredClip; alreadyStored: boolean }
  | { kind: "failed" | "unknown" | "unconfirmed"; message: string }
  | { kind: "cancelled" };

export function siteMediaUrl(value: unknown, siteOrigin: string): string {
  const safe = safeHttpsUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  return url.origin === siteOrigin && url.pathname.startsWith("/api/user-data/files/") && !url.hash ? safe : "";
}

export function playableStored(stored: StoredClip, siteOrigin: string): boolean {
  return Boolean(siteMediaUrl(stored.playbackUrl, siteOrigin) && siteMediaUrl(stored.downloadUrl, siteOrigin));
}

export function resolveArchive(result: ToolResult, clipId: string, siteOrigin: string): PreparationResult {
  const unconfirmed: PreparationResult = { kind: "unconfirmed", message: "The save is not confirmed. Reload the library to check this clip before another save." };
  if (result.isError) return { kind: "unknown", message: "The save outcome is unknown. Reload the library to check before another save." };
  try {
    const archive = parseArchive(result.structuredContent);
    const successes = [...archive.saved, ...archive.skipped].filter(item => item.clipId === clipId);
    const failures = archive.failed.filter(item => item.clipId === clipId);
    if (successes.length + failures.length !== 1) return unconfirmed;
    const failure = failures[0];
    if (failure) return failure.outcome === "failed"
      ? { kind: "failed", message: `The clip could not be saved (${failure.code}).` }
      : { kind: "unknown", message: "The save outcome is unknown. Reload the library to check before another save." };
    const stored = successes[0]?.stored;
    if (!stored || !playableStored(stored, siteOrigin)) return unconfirmed;
    return { kind: "ready", stored, alreadyStored: archive.skipped.some(item => item.clipId === clipId) };
  } catch { return unconfirmed; }
}

export function faultMessage(code: string): string {
  if (/NOT_CONNECTED|NOT_CONFIGURED|UNAUTHORI[SZ]ED|NO_TOKEN|RECONNECT|ACCOUNT/.test(code)) return `Twitch is not connected (${code}). Select Connect with Twitch in Connections, then reload.`;
  if (/SCOPE|PERMISSION/.test(code)) return `Twitch permissions are missing (${code}). Review permissions in Connections.`;
  return `Clips could not be loaded (${code}).`;
}

export function safeHttpsUrl(value: unknown, hosts?: readonly string[]): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    if (hosts && !hosts.includes(url.hostname)) return "";
    return url.href;
  } catch { return ""; }
}

export function mergePage(existing: readonly ClipItem[], incoming: readonly ClipItem[]): ClipItem[] {
  const next = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) next.set(item.id, item);
  return [...next.values()];
}

export function categoryKey(item: ClipItem): string { return item.game.name ?? uncategorized; }

export function categoriesOf(items: readonly ClipItem[]): { key: string; label: string }[] {
  const names = new Set<string>();
  let hasNone = false;
  for (const item of items) { if (item.game.name) names.add(item.game.name); else hasNone = true; }
  const sorted = [...names].sort((a, b) => a.localeCompare(b)).map(name => ({ key: name, label: name }));
  return hasNone ? [...sorted, { key: uncategorized, label: "Unknown category" }] : sorted;
}

export function visibleClips(items: readonly ClipItem[], filter: ClipFilter, sort: ClipSort): ClipItem[] {
  const needle = filter.search.trim().toLocaleLowerCase();
  const matches = items.filter(item => {
    if (filter.category !== allCategories && categoryKey(item) !== filter.category) return false;
    if (!needle) return true;
    return [item.title, item.game.name, item.creator.name].some(field => field?.toLocaleLowerCase().includes(needle));
  });
  const time = (item: ClipItem) => Date.parse(item.createdAt) || 0;
  const order: Record<ClipSort, (a: ClipItem, b: ClipItem) => number> = {
    newest: (a, b) => time(b) - time(a), oldest: (a, b) => time(a) - time(b), views: (a, b) => b.viewCount - a.viewCount || time(b) - time(a),
  };
  return matches.sort(order[sort]);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatViews(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "view" : "views"}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function formatOffset(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const rest = `${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return hours ? `${hours}:${rest}` : rest;
}
