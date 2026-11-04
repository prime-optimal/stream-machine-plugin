import { describe, expect, test } from "bun:test";
import {
  clipCountLabel, createHomeState, homeCacheKey, readCache, snapshotNotes, type CacheStorage, type ChannelSnapshot,
} from "../src/ui/home-state";
import { canTry, carouselState, messageParams, scrollTarget, suggestions, tryLabel } from "../src/ui/suggestions";
import type { ToolResult } from "../src/ui/tool-transport";

function snapshot(id = "owner", over: Partial<ChannelSnapshot> = {}): ChannelSnapshot {
  return {
    account: { id, login: id, displayName: `Name ${id}`, profileImageUrl: null, offlineImageUrl: null, description: "", broadcasterType: "", createdAt: "2020-01-01T00:00:00Z" },
    channel: { title: "Live", category: "Chess" }, followers: { total: 12 }, lastStream: null,
    clips: { count: 20, more: true, recent: [] }, unavailable: [], twitchRequests: 5, ...over,
  };
}
const status = (id = "owner"): ToolResult => ({ structuredContent: { twitch: { mode: "live", account: { id, login: id, displayName: `Name ${id}`, scopes: [] } } } });
const fault: ToolResult = { isError: true, structuredContent: { error: { code: "TWITCH_NOT_CONNECTED" } } };
const ok = (data: ChannelSnapshot): ToolResult => ({ structuredContent: data });
function memory(initial?: ChannelSnapshot): CacheStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(initial ? [[homeCacheKey, JSON.stringify(initial)]] : []);
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}
const deferred = () => Promise.withResolvers<ToolResult>();

describe("hosted Home state", () => {
  test("connected status loads the snapshot and refreshes the cache", async () => {
    const storage = memory(); const calls: string[] = [];
    const home = createHomeState(async name => { calls.push(name); return name.endsWith("status") ? status() : ok(snapshot()); }, () => { }, storage);
    await home.open();
    expect(calls).toEqual(["stream_machine_twitch_status", "stream_machine_twitch_snapshot"]);
    expect(home.state().status).toEqual({ kind: "connected", account: { id: "owner", displayName: "Name owner" } });
    expect(home.state().snapshot).toMatchObject({ kind: "ready", cached: false });
    expect(readCache(storage)?.account.id).toBe("owner");
  });
  test("cached snapshot paints before status resolves, then fresh data replaces it", async () => {
    const pending = deferred(); const seen: string[] = [];
    const home = createHomeState(name => name.endsWith("status") ? pending.promise : Promise.resolve(ok(snapshot("owner", { followers: { total: 99 } }))),
      () => seen.push(JSON.stringify(home.state().snapshot.kind)), memory(snapshot("owner", { followers: { total: 1 } })));
    const opening = home.open();
    const painted = home.state().snapshot;
    expect(painted).toMatchObject({ kind: "loading", cached: true });
    pending.resolve(status()); await opening;
    const ready = home.state().snapshot;
    expect(ready.kind === "ready" && ready.data.followers?.total).toBe(99);
  });
  test("a different account or a disconnected status drops the cache", async () => {
    const other = memory(snapshot("someone"));
    const differ = createHomeState(async name => name.endsWith("status") ? status("owner") : { isError: true }, () => { }, other);
    await differ.open();
    expect(differ.state().snapshot).toMatchObject({ kind: "failed", data: null, cached: false });
    expect(other.data.has(homeCacheKey)).toBe(false);
    const gone = memory(snapshot());
    const disconnected = createHomeState(async () => fault, () => { }, gone);
    await disconnected.open();
    expect(disconnected.state()).toEqual({ status: { kind: "disconnected" }, snapshot: { kind: "idle" } });
    expect(gone.data.has(homeCacheKey)).toBe(false);
  });
  test("a transient status failure keeps the cached snapshot", async () => {
    const storage = memory(snapshot());
    const home = createHomeState(async () => { throw new Error("offline"); }, () => { }, storage);
    await home.open();
    expect(home.state().status.kind).toBe("unavailable");
    expect(home.state().snapshot).toMatchObject({ kind: "loading", cached: true });
    expect(storage.data.has(homeCacheKey)).toBe(true);
  });
  test("snapshot failure keeps the connection and offers retry that recovers", async () => {
    let fail = true;
    const home = createHomeState(async name => name.endsWith("status") ? status() : fail ? { isError: true } : ok(snapshot()), () => { }, memory());
    await home.open();
    expect(home.state().status.kind).toBe("connected");
    expect(home.state().snapshot.kind).toBe("failed");
    fail = false; await home.retry();
    expect(home.state().snapshot.kind).toBe("ready");
  });
  test("stale snapshot responses are ignored", async () => {
    const first = deferred(), second = deferred(); let reads = 0;
    const home = createHomeState(name => name.endsWith("status") ? Promise.resolve(status()) : (++reads === 1 ? first.promise : second.promise), () => { }, memory());
    const older = home.open(); await Promise.resolve(); await Promise.resolve();
    const newer = home.retry(); await Promise.resolve();
    second.resolve(ok(snapshot("owner", { followers: { total: 2 } }))); await newer;
    first.resolve(ok(snapshot("owner", { followers: { total: 1 } }))); await older;
    const ready = home.state().snapshot;
    expect(ready.kind === "ready" && ready.data.followers?.total).toBe(2);
  });
  test("a finished connect shows the confirmation for the new account", async () => {
    const calls: string[] = [];
    const home = createHomeState(async name => { calls.push(name); return ok(snapshot("fresh")); }, () => { }, memory());
    await home.verified({ id: "fresh", displayName: "Fresh" });
    expect(home.state().status).toEqual({ kind: "connected", account: { id: "fresh", displayName: "Fresh" } });
    expect(calls).toEqual(["stream_machine_twitch_snapshot"]);
  });
  test("unavailable sections become quiet notes and clips show a plus when more exist", () => {
    expect(snapshotNotes(snapshot("a", { followers: null, unavailable: ["followers", "lastStream"] }))).toEqual([
      "Couldn't load follower count.", "Couldn't load last stream.",
    ]);
    expect(snapshotNotes(snapshot())).toEqual([]);
    expect(clipCountLabel({ count: 20, more: true, recent: [] })).toBe("20+ clips");
    expect(clipCountLabel({ count: 1, more: false, recent: [] })).toBe("1 clip");
  });
  test("corrupt cache entries are ignored", () => {
    const storage = memory(); storage.setItem(homeCacheKey, "{not json");
    expect(readCache(storage)).toBeNull();
    storage.setItem(homeCacheKey, JSON.stringify({ account: { id: 1 } }));
    expect(readCache(storage)).toBeNull();
  });
});

describe("suggestion carousel", () => {
  test("arrows disable at the ends and hide when everything fits", () => {
    expect(carouselState({ scrollLeft: 0, clientWidth: 400, scrollWidth: 400 })).toEqual({ overflow: false, canPrev: false, canNext: false });
    expect(carouselState({ scrollLeft: 0, clientWidth: 400, scrollWidth: 1000 })).toEqual({ overflow: true, canPrev: false, canNext: true });
    expect(carouselState({ scrollLeft: 300, clientWidth: 400, scrollWidth: 1000 })).toEqual({ overflow: true, canPrev: true, canNext: true });
    expect(carouselState({ scrollLeft: 599, clientWidth: 400, scrollWidth: 1000 })).toEqual({ overflow: true, canPrev: true, canNext: false });
  });
  test("scrolls one card width and clamps at the edges", () => {
    const metrics = { scrollLeft: 100, clientWidth: 400, scrollWidth: 1000 };
    expect(scrollTarget(metrics, 252, 1)).toBe(352);
    expect(scrollTarget(metrics, 252, -1)).toBe(0);
    expect(scrollTarget({ ...metrics, scrollLeft: 500 }, 252, 1)).toBe(600);
  });
  test("Try needs a host that supports messages and sends a plain user prompt", () => {
    expect(canTry({ standalone: true, messageSupported: true })).toBe(false);
    expect(canTry({ standalone: false, messageSupported: false })).toBe(false);
    expect(canTry({ standalone: false, messageSupported: true })).toBe(true);
    expect(tryLabel({ standalone: true, messageSupported: false })).toContain("ChatGPT");
    expect(tryLabel({ standalone: false, messageSupported: true })).toBe("");
    expect(messageParams("hello")).toEqual({ role: "user", content: [{ type: "text", text: "hello" }] });
  });
  test("cards are unique, prompted, and desktop-only cards are labeled", () => {
    expect(new Set(suggestions.map(card => card.id)).size).toBe(suggestions.length);
    expect(suggestions.every(card => card.prompt.length > 0 && card.title && card.description)).toBe(true);
    expect(suggestions.filter(card => card.desktopOnly).map(card => card.id)).toEqual(["overlay", "deck"]);
  });
});
