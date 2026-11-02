import { z } from "zod";
import type { ToolRequest, ToolResult } from "./tool-transport";

export const homeCacheKey = "stream-machine:home:v1";
export const snapshotSections = ["channel", "followers", "lastStream", "clips"] as const;
export type SnapshotSection = typeof snapshotSections[number];

const image = z.string().nullable();
export const snapshotSchema = z.object({
  account: z.object({
    id: z.string().min(1), login: z.string(), displayName: z.string().min(1), profileImageUrl: image, offlineImageUrl: image,
    description: z.string(), broadcasterType: z.string(), createdAt: z.string(),
  }),
  channel: z.object({ title: z.string(), category: z.string().nullable() }).nullable(),
  followers: z.object({ total: z.number() }).nullable(),
  lastStream: z.object({ title: z.string(), url: z.string(), thumbnailUrl: image, createdAt: z.string(), duration: z.string() }).nullable(),
  clips: z.object({
    count: z.number(), more: z.boolean(),
    recent: z.array(z.object({ id: z.string(), title: z.string(), url: z.string(), thumbnailUrl: image, viewCount: z.number(), createdAt: z.string() })),
  }).nullable(),
  unavailable: z.array(z.enum(snapshotSections)),
  twitchRequests: z.number(),
});
export type ChannelSnapshot = z.infer<typeof snapshotSchema>;

const statusSchema = z.object({ twitch: z.object({ account: z.object({ id: z.string().min(1), displayName: z.string().min(1) }) }) });
const faultSchema = z.object({ error: z.object({ code: z.string() }) });

export type HomeAccount = { id: string; displayName: string };
export type HomeStatus =
  | { kind: "unknown" } | { kind: "checking" } | { kind: "connected"; account: HomeAccount }
  | { kind: "disconnected" } | { kind: "unavailable" };
export type HomeSnapshotState =
  | { kind: "idle" }
  | { kind: "loading"; data: ChannelSnapshot | null; cached: boolean }
  | { kind: "ready"; data: ChannelSnapshot; cached: false }
  | { kind: "failed"; data: ChannelSnapshot | null; cached: boolean; message: string };
export type HomeState = { status: HomeStatus; snapshot: HomeSnapshotState };
export type CacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readCache(storage: CacheStorage | null): ChannelSnapshot | null {
  try {
    const raw = storage?.getItem(homeCacheKey);
    if (!raw) return null;
    const parsed = snapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

function writeCache(storage: CacheStorage | null, data: ChannelSnapshot | null) {
  try {
    if (data) storage?.setItem(homeCacheKey, JSON.stringify(data)); else storage?.removeItem(homeCacheKey);
  } catch { }
}

export function cacheForAccount(cached: ChannelSnapshot | null, account: HomeAccount): ChannelSnapshot | null {
  return cached && cached.account.id === account.id ? cached : null;
}

function faultCode(result: ToolResult): string | null {
  const parsed = faultSchema.safeParse(result.structuredContent);
  return parsed.success ? parsed.data.error.code : null;
}

export function parseSnapshot(result: ToolResult): ChannelSnapshot {
  if (result.isError || faultCode(result)) throw new Error("The channel snapshot could not be loaded.");
  const parsed = snapshotSchema.safeParse(result.structuredContent);
  if (!parsed.success) throw new Error("The channel snapshot returned an unexpected response.");
  return parsed.data;
}

export function createHomeState(request: ToolRequest, changed: () => void, storage: CacheStorage | null) {
  let state: HomeState = { status: { kind: "unknown" }, snapshot: { kind: "idle" } };
  let revision = 0;
  let disposed = false;
  function set(next: HomeState) { state = next; if (!disposed) changed(); }
  function drop() { writeCache(storage, null); }
  async function load(account: HomeAccount, attempt: number) {
    const held = state.snapshot.kind === "idle" ? cacheForAccount(readCache(storage), account) : "data" in state.snapshot ? state.snapshot.data : null;
    const data = held && held.account.id === account.id ? held : null;
    if (!data) drop();
    set({ status: state.status, snapshot: { kind: "loading", data, cached: data !== null } });
    try {
      const fresh = parseSnapshot(await request("stream_machine_twitch_snapshot"));
      if (disposed || revision !== attempt) return;
      if (fresh.account.id !== account.id) throw new Error("The channel snapshot belongs to a different account.");
      writeCache(storage, fresh);
      set({ status: state.status, snapshot: { kind: "ready", data: fresh, cached: false } });
    } catch (cause) {
      if (disposed || revision !== attempt) return;
      const message = cause instanceof Error && cause.message ? cause.message : "The channel snapshot could not be loaded.";
      set({ status: state.status, snapshot: { kind: "failed", data, cached: data !== null, message } });
    }
  }
  function paintCache() {
    const cached = readCache(storage);
    state = { status: { kind: "checking" }, snapshot: cached ? { kind: "loading", data: cached, cached: true } : { kind: "idle" } };
    changed();
  }
  return {
    state: () => state,
    async open() {
      if (disposed) return;
      const attempt = ++revision;
      paintCache();
      let account: HomeAccount;
      try {
        const result = await request("stream_machine_twitch_status");
        if (disposed || revision !== attempt) return;
        const code = faultCode(result);
        if (code) { drop(); set({ status: { kind: "disconnected" }, snapshot: { kind: "idle" } }); return; }
        if (result.isError) throw new Error("status");
        account = statusSchema.parse(result.structuredContent).twitch.account;
      } catch {
        if (disposed || revision !== attempt) return;
        set({ status: { kind: "unavailable" }, snapshot: state.snapshot });
        return;
      }
      set({ status: { kind: "connected", account }, snapshot: state.snapshot });
      await load(account, attempt);
    },
    async verified(account: HomeAccount) {
      if (disposed) return;
      const attempt = ++revision;
      state = { status: { kind: "connected", account }, snapshot: state.snapshot };
      await load(account, attempt);
    },
    async retry() {
      if (state.status.kind === "connected") { const attempt = ++revision; await load(state.status.account, attempt); } else await this.open();
    },
    dispose() { disposed = true; revision++; },
  };
}

export function snapshotNotes(data: ChannelSnapshot): string[] {
  const labels: Record<SnapshotSection, string> = {
    channel: "Current title and category", followers: "Follower total", lastStream: "Last stream", clips: "Clips",
  };
  return data.unavailable.map(section => `${labels[section]} is not available right now.`);
}

export function clipCountLabel(clips: NonNullable<ChannelSnapshot["clips"]>): string {
  return `${clips.count}${clips.more ? "+" : ""} ${clips.count === 1 && !clips.more ? "clip" : "clips"}`;
}
