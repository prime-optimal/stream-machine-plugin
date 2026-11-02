import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { fetchClipLibraryPage, safeClipThumbnail, type HelixGet } from "../src/adapters/twitch/clip-library";
import { TwitchClipClient } from "../src/adapters/twitch/clips-client";
import { registerTwitchClipLibraryTool } from "../src/adapters/twitch/clips-register";
import { TwitchClipService } from "../src/adapters/twitch/clips-service";
import { unavailableAccount, type TwitchAccess } from "../src/auth/twitch";

const account = { id: "123", login: "streamer", displayName: "Streamer" };
const access: TwitchAccess = { account: { ...account, scopes: [] }, clientId: "client", accessToken: "SECRET_SENTINEL" };
const clip = (id: string, extra: Record<string, unknown> = {}) => ({
  id, url: `https://clips.twitch.tv/${id}`, title: `Clip ${id}`, created_at: "2026-10-01T12:00:00Z",
  duration: 29.5, view_count: 7, creator_id: "9", creator_name: "Fan", game_id: "33214", video_id: "555", vod_offset: 120,
  thumbnail_url: "https://static-cdn.jtvnw.net/twitch-clips-thumbnails-prod/a.jpg", ...extra,
});
function helix(clips: unknown[], games: { id: string; name: string }[] = [], cursor?: string) {
  const calls: { path: string; params: URLSearchParams }[] = [];
  const get: HelixGet = async (path, params) => {
    calls.push({ path, params });
    return path === "clips" ? { data: clips, pagination: cursor ? { cursor } : {} } : { data: games.filter(game => params.getAll("id").includes(game.id)) };
  };
  return { get, calls };
}

test("passes cursor and date filters to Helix and returns the next cursor", async () => {
  const { get, calls } = helix([clip("A")], [{ id: "33214", name: "Fortnite" }], "NEXT");
  const page = await fetchClipLibraryPage(get, account, { cursor: "PREV", startedAt: "2026-10-01T00:00:00Z", endedAt: "2026-10-31T00:00:00+02:00" }, "local");
  const params = calls[0]!.params;
  expect(calls[0]!.path).toBe("clips");
  expect(Object.fromEntries(params)).toEqual({ broadcaster_id: "123", first: "24", after: "PREV", started_at: "2026-10-01T00:00:00Z", ended_at: "2026-10-31T00:00:00+02:00" });
  expect(page).toMatchObject({ account, cursor: "NEXT", storage: "local" });
  expect(page.items[0]).toEqual({
    id: "A", title: "Clip A", url: "https://clips.twitch.tv/A", createdAt: "2026-10-01T12:00:00Z", durationSeconds: 29.5, viewCount: 7,
    creator: { id: "9", name: "Fan" }, game: { id: "33214", name: "Fortnite" },
    thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-clips-thumbnails-prod/a.jpg", videoId: "555", vodOffsetSeconds: 120, stored: null,
  });
});

test("omits optional params, defaults first to 24 and bounds it to 1-100", async () => {
  const { get, calls } = helix([]);
  const page = await fetchClipLibraryPage(get, account, {}, "site");
  expect([...calls[0]!.params.keys()].sort()).toEqual(["broadcaster_id", "first"]);
  expect(page).toMatchObject({ items: [], cursor: null, storage: "site" });
  await fetchClipLibraryPage(get, account, { first: 100 }, "local");
  expect(calls[1]!.params.get("first")).toBe("100");
  for (const first of [0, 101, 1.5]) await expect(fetchClipLibraryPage(get, account, { first }, "local")).rejects.toThrow();
  await expect(fetchClipLibraryPage(get, account, { startedAt: "yesterday" }, "local")).rejects.toThrow();
  await expect(fetchClipLibraryPage(get, account, { extra: 1 } as never, "local")).rejects.toThrow();
  expect(calls.length).toBe(2);
});

test("normalizes missing creator, game, thumbnail, and VOD fields to null", async () => {
  const { get, calls } = helix([clip("B", { creator_id: "", creator_name: null, game_id: "", video_id: "", vod_offset: null, thumbnail_url: "" })]);
  const page = await fetchClipLibraryPage(get, account, {}, "local");
  expect(page.items[0]).toMatchObject({ creator: { id: null, name: null }, game: { id: null, name: null }, thumbnailUrl: null, videoId: null, vodOffsetSeconds: null });
  expect(calls.map(call => call.path)).toEqual(["clips"]);
});

test("keeps only allowlisted HTTPS thumbnail hosts", () => {
  expect(safeClipThumbnail("https://clips-media-assets2.twitch.tv/x.jpg")).toBe("https://clips-media-assets2.twitch.tv/x.jpg");
  for (const value of ["http://static-cdn.jtvnw.net/a.jpg", "https://evil.example/a.jpg", "https://static-cdn.jtvnw.net.evil.example/a.jpg", "https://user@static-cdn.jtvnw.net/a.jpg", "https://static-cdn.jtvnw.net:8443/a.jpg", "not a url", "", null, undefined]) expect(safeClipThumbnail(value)).toBeNull();
});

test("looks up distinct games in one request of at most 100 IDs, and maps unknown IDs to null", async () => {
  const clips = Array.from({ length: 100 }, (_, index) => clip(`C${index}`, { game_id: String(index === 99 ? 1 : index + 1) }));
  const { get, calls } = helix(clips, [{ id: "1", name: "One" }, { id: "2", name: "Two" }]);
  const page = await fetchClipLibraryPage(get, account, { first: 100 }, "local");
  const gameCalls = calls.filter(call => call.path === "games");
  expect(gameCalls.length).toBe(1);
  expect(gameCalls[0]!.params.getAll("id").length).toBe(99);
  expect(new Set(gameCalls[0]!.params.getAll("id")).size).toBe(99);
  expect(page.items[0]!.game).toEqual({ id: "1", name: "One" });
  expect(page.items[1]!.game).toEqual({ id: "2", name: "Two" });
  expect(page.items[2]!.game).toEqual({ id: "3", name: null });
  expect(page.items[99]!.game).toEqual({ id: "1", name: "One" });
});

test("rejects malformed Helix data and clip pages off Twitch", async () => {
  await expect(fetchClipLibraryPage(async () => ({ data: "x" }), account, {}, "local")).rejects.toMatchObject({ code: "TWITCH_INVALID_RESPONSE" });
  const { get } = helix([clip("E", { url: "https://evil.example/E" })]);
  await expect(fetchClipLibraryPage(get, account, {}, "local")).rejects.toMatchObject({ code: "TWITCH_INVALID_RESPONSE" });
});

async function connect(service: TwitchClipService) {
  const server = new McpServer({ name: "library", version: "1" });
  registerTwitchClipLibraryTool(server, () => service);
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  return { server, client };
}

test("local tool returns a read-only library page with stored null over MCP", async () => {
  const requests: URL[] = [];
  const fake: typeof fetch = Object.assign(async (input: RequestInfo | URL) => {
    const url = new URL(String(input)); requests.push(url);
    return Response.json(url.pathname === "/helix/clips" ? { data: [clip("F")], pagination: { cursor: "C2" } } : { data: [{ id: "33214", name: "Fortnite" }] });
  }, { preconnect: fetch.preconnect });
  const service = new TwitchClipService({ withAccount: fn => fn(access) }, new TwitchClipClient(fake));
  const { server, client } = await connect(service);
  try {
    const listed = (await client.listTools()).tools.find(tool => tool.name === "stream_machine_clips_library");
    expect(listed?.annotations?.readOnlyHint).toBe(true);
    const result = await client.callTool({ name: "stream_machine_clips_library", arguments: { first: 5 } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ clips: { account, cursor: "C2", storage: "local", items: [{ id: "F", stored: null, game: { name: "Fortnite" } }] } });
    expect(requests[0]!.searchParams.get("first")).toBe("5");
    expect(JSON.stringify(result)).not.toContain("SECRET_SENTINEL");
    for (const args of [{ first: 0 }, { first: 101 }, { unknown: true }]) {
      expect((await client.callTool({ name: "stream_machine_clips_library", arguments: args })).isError).toBe(true);
    }
  } finally { await client.close(); await server.close(); }
});

test("local tool reports an unconnected account without calling Twitch", async () => {
  let called = false;
  const fake: typeof fetch = Object.assign(async () => { called = true; return Response.json({}); }, { preconnect: fetch.preconnect });
  const { server, client } = await connect(new TwitchClipService(unavailableAccount, new TwitchClipClient(fake)));
  try {
    const result = await client.callTool({ name: "stream_machine_clips_library", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({ error: { code: "TWITCH_NOT_CONFIGURED" } });
    expect(called).toBe(false);
  } finally { await client.close(); await server.close(); }
});
