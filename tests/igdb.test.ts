import { expect, test } from "bun:test";
import { GameLookupService, createGameLookupService } from "../src/adapters/igdb/service";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerGameTools } from "../src/adapters/igdb/register";

const credentials = { clientId: "fixture-client", clientSecret: "fixture-secret" };
const category = { data: [{ id: "33214", name: "Fortnite", igdb_id: "1905" }] };
const game = [{ id: 1905, name: "Fortnite", summary: "Fixture summary", first_release_date: 1500940800,
  genres: [{ name: "Shooter" }], cover: { image_id: "co_fixture" }, url: "https://www.igdb.com/games/fortnite" }];
function fixture(options: { category?: unknown; game?: unknown; status?: number; failAt?: string; invalidJson?: boolean } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (options.failAt && url.includes(options.failAt)) {
      return new Response(options.invalidJson ? "not json" : "provider fixture-secret Bearer fixture-token", { status: options.status ?? 503 });
    }
    return Response.json(url.includes("oauth2") ? { access_token: "fixture-token", token_type: "bearer", expires_in: 3600 }
      : url.includes("helix") ? (options.category ?? category) : (options.game ?? game));
  }, { preconnect: fetch.preconnect });
  return { calls, fetcher };
}
test("maps distinct IDs, returns sourced artwork and fixed query without credentials", async () => {
  const { calls, fetcher } = fixture();
  const result = await new GameLookupService(credentials, fetcher, () => 0).lookup("33214");
  expect(result.igdbId).toBe("1905");
  expect(result.twitchCategoryId).toBe("33214");
  expect(result.game.artworkUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co_fixture.jpg");
  expect(result.game.genres).toEqual(["Shooter"]);
  expect(result.retrievedAt).toBe("1970-01-01T00:00:00.000Z");
  expect(calls.map(call => call.url)).toEqual(["https://id.twitch.tv/oauth2/token", "https://api.twitch.tv/helix/games?id=33214", "https://api.igdb.com/v4/games"]);
  expect(calls[2]?.init?.body).toBe("fields name,summary,first_release_date,genres.name,cover.image_id,url; where id = 1905; limit 1;");
  for (const call of calls) { expect(call.init?.redirect).toBe("error"); expect(call.init?.signal).toBeInstanceOf(AbortSignal); }
  expect(JSON.stringify(result)).not.toContain("fixture-secret");
  expect(JSON.stringify(result)).not.toContain("fixture-token");
});
test.each(["", "0", "01", "-1", "1; limit 10;", "１２", "1.5", "123456789012345678901"])("rejects invalid ID %s before network", async id => {
  const { calls, fetcher } = fixture();
  await expect(new GameLookupService(credentials, fetcher).lookup(id)).rejects.toThrow("INVALID_INPUT");
  expect(calls).toHaveLength(0);
});
test.each([
  [{ data: [] }, "TWITCH_CATEGORY_NOT_FOUND"],
  [{ data: [{ id: "33214", name: "Fortnite", igdb_id: "" }] }, "IGDB_MAPPING_UNAVAILABLE"],
  [{ data: [{ id: "33214", name: "Fortnite", igdb_id: "1; fields *;" }] }, "IGDB_MAPPING_UNAVAILABLE"],
  [{ data: [{ id: "1905", name: "Wrong", igdb_id: "1905" }] }, "GAME_INVALID_RESPONSE"],
  [{ unexpected: true }, "GAME_INVALID_RESPONSE"],
])("rejects missing or invalid mapping", async (value, code) => {
  const { fetcher, calls } = fixture({ category: value });
  await expect(new GameLookupService(credentials, fetcher).lookup("33214")).rejects.toThrow(String(code));
  expect(calls.some(call => call.url.includes("igdb.com"))).toBe(false);
});
test.each([
  [[], "IGDB_GAME_NOT_FOUND"],
  [[{ ...game[0], id: 33214 }], "GAME_INVALID_RESPONSE"],
  [[{ ...game[0], cover: { image_id: "../evil" } }], "GAME_INVALID_RESPONSE"],
  [[{ ...game[0], url: "https://evil.example/game" }], "GAME_INVALID_RESPONSE"],
  [[{ ...game[0], id: 9007199254740992 }], "GAME_INVALID_RESPONSE"],
])("rejects invalid game response", async (value, code) => {
  await expect(new GameLookupService(credentials, fixture({ game: value }).fetcher).lookup("33214")).rejects.toThrow(String(code));
});
test("missing optional details stay absent", async () => {
  const value = [{ id: 1905, name: "Fortnite", url: "https://www.igdb.com/games/fortnite" }];
  const result = await new GameLookupService(credentials, fixture({ game: value }).fetcher).lookup("33214");
  expect(result.game.artworkUrl).toBeUndefined();
  expect(result.game.releaseDate).toBeUndefined();
  expect(result.game.genres).toEqual([]);
});
test.each([401, 403, 429, 500])("sanitizes provider status %s and bounds retries", async status => {
  const { fetcher, calls } = fixture({ failAt: "igdb.com", status });
  const code = status === 401 ? "GAME_AUTH_REQUIRED" : status === 429 ? "GAME_RATE_LIMITED" : "GAME_PROVIDER_UNAVAILABLE";
  await expect(new GameLookupService(credentials, fetcher).lookup("33214")).rejects.toThrow(code);
  expect(calls.filter(call => call.url.includes("igdb.com"))).toHaveLength(status === 401 ? 2 : 1);
});
test("shares concurrent token acquisition and refreshes before expiry", async () => {
  let now = 0;
  const { fetcher, calls } = fixture();
  const service = new GameLookupService(credentials, fetcher, () => now);
  await Promise.all([service.lookup("33214"), service.lookup("33214")]);
  expect(calls.filter(call => call.url.includes("oauth2"))).toHaveLength(1);
  now = 3540001;
  await service.lookup("33214");
  expect(calls.filter(call => call.url.includes("oauth2"))).toHaveLength(2);
});
test("one 401 renews token and succeeds", async () => {
  let rejected = false;
  const base = fixture();
  const fetcher: typeof fetch = Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes("helix") && !rejected) { rejected = true; return new Response("", { status: 401 }); }
    return base.fetcher(input, init);
  }, { preconnect: fetch.preconnect });
  expect((await new GameLookupService(credentials, fetcher).lookup("33214")).game.name).toBe("Fortnite");
  expect(base.calls.filter(call => call.url.includes("oauth2"))).toHaveLength(2);
});
test("malformed JSON and network errors do not leak provider text", async () => {
  const fetcher: typeof fetch = Object.assign(async () => { throw new Error("fixture-secret"); }, { preconnect: fetch.preconnect });
  await expect(new GameLookupService(credentials, fetcher).lookup("33214")).rejects.toThrow("GAME_PROVIDER_UNAVAILABLE");
  await expect(new GameLookupService(credentials, fixture({ failAt: "igdb.com", invalidJson: true, status: 200 }).fetcher).lookup("33214")).rejects.toThrow("GAME_PROVIDER_UNAVAILABLE");
});
test("configuration absent does not create runtime", () => { expect(createGameLookupService({})).toBeUndefined(); });
test("real MCP registration lists and calls isolated module", async () => {
  const server = new McpServer({ name: "igdb-test", version: "1" });
  registerGameTools(server, new GameLookupService(credentials, fixture().fetcher));
  const client = new Client({ name: "igdb-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const tools = await client.listTools();
    expect(tools.tools.map(tool => tool.name)).toEqual(["stream_machine_game_lookup"]);
    expect(tools.tools[0]?.annotations?.readOnlyHint).toBe(true);
    const result = await client.callTool({ name: "stream_machine_game_lookup", arguments: { twitchCategoryId: "33214" } });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result)).toContain("1905");
    const bad = await client.callTool({ name: "stream_machine_game_lookup", arguments: { twitchCategoryId: "1; evil" } });
    expect(bad.isError).toBe(true);
  } finally { await client.close(); await server.close(); }
});
