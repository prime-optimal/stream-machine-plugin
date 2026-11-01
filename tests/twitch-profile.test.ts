import { describe, expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TwitchChannelClient } from "../src/adapters/twitch/client";
import { TwitchTitleService } from "../src/adapters/twitch/service";
import { registerTwitchTools } from "../src/adapters/twitch/register";
import { unavailableAccount, type TwitchAccess, type TwitchAccountProvider } from "../src/auth/twitch";
import type { LocalTwitchRuntime } from "../src/auth/local-runtime";

const access: TwitchAccess = { account: { id: "123", login: "creator", displayName: "Creator", scopes: [] }, accessToken: "PROFILE_TOKEN_SENTINEL", clientId: "test-client" };
const user = { id: "123", login: "creator", display_name: "Creator", description: "Music 🎵", profile_image_url: "https://static-cdn.jtvnw.net/photo.png", offline_image_url: "" };
function fixture(reply: () => Response | Promise<Response> = () => Response.json({ data: [user] })) {
  let reads = 0;
  const fetcher: typeof fetch = Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    reads++;
    expect(String(input)).toBe("https://api.twitch.tv/helix/users");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${access.accessToken}`);
    expect(new Headers(init?.headers).get("Client-Id")).toBe(access.clientId);
    return reply();
  }, { preconnect: fetch.preconnect });
  const accounts: TwitchAccountProvider = { async withAccount(fn) { return fn(access); } };
  const titles = new TwitchTitleService(accounts, new TwitchChannelClient(fetcher));
  const runtime: LocalTwitchRuntime = { accounts, titles, diagnostics: () => [], connect() { throw new Error("Unexpected connect"); }, approvalUrl() { throw new Error("Unexpected approval"); }, close() {} };
  return { titles, runtime, reads: () => reads };
}
describe("Connected Twitch profile with fake external provider", () => {
  test("reads one current profile without extra scopes and excludes private fields", async () => {
    const f = fixture(() => Response.json({ data: [{ ...user, email: "private@example.test", view_count: 42 }] }));
    const result = await f.titles.profile();
    expect(result).toEqual({ mode: "live", source: "https://api.twitch.tv/helix/users", profile: { broadcasterId: "123", login: "creator", displayName: "Creator", description: "Music 🎵", profilePictureUrl: user.profile_image_url, offlinePlaceholderUrl: null } });
    expect(JSON.stringify(result)).not.toContain(access.accessToken);
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(f.reads()).toBe(1);
  });
  test("preserves empty description and distinguishes absent images", async () => {
    const f = fixture(() => Response.json({ data: [{ ...user, description: "", profile_image_url: "", offline_image_url: "https://static-cdn.jtvnw.net/offline.png" }] }));
    expect((await f.titles.profile()).profile).toMatchObject({ description: "", profilePictureUrl: null, offlinePlaceholderUrl: "https://static-cdn.jtvnw.net/offline.png" });
  });
  test("rejects a different account", async () => {
    await expect(fixture(() => Response.json({ data: [{ ...user, id: "other" }] })).titles.profile()).rejects.toThrow("TWITCH_WRONG_ACCOUNT");
  });
  test("rejects incomplete, malformed, and unsafe responses", async () => {
    for (const body of [{ data: [] }, { data: [user, user] }, { data: [{ ...user, description: null }] }, { data: [{ ...user, profile_image_url: undefined }] }, { data: [{ ...user, offline_image_url: "http://example.test/image" }] }, { data: [{ ...user, profile_image_url: "broken" }] }, { data: [{ ...user, login: "" }] }]) {
      await expect(fixture(() => Response.json(body)).titles.profile()).rejects.toThrow("TWITCH_INVALID_RESPONSE");
    }
    await expect(fixture(() => new Response("not json")).titles.profile()).rejects.toThrow("TWITCH_INVALID_RESPONSE");
  });
  test("sanitizes network and provider failures without retry", async () => {
    for (const [status, code] of [[401, "TWITCH_RECONNECT_REQUIRED"], [403, "TWITCH_SCOPE_REQUIRED"], [429, "TWITCH_RATE_LIMITED"], [500, "TWITCH_UNAVAILABLE"]] as const) {
      const f = fixture(() => new Response(access.accessToken, { status }));
      await expect(f.titles.profile()).rejects.toThrow(code);
      expect(f.reads()).toBe(1);
    }
    await expect(fixture(() => { throw new Error(access.accessToken); }).titles.profile()).rejects.toThrow("TWITCH_UNAVAILABLE");
    await expect(new TwitchTitleService(unavailableAccount).profile()).rejects.toThrow("TWITCH_NOT_CONFIGURED");
  });
  test("real MCP tool advertises read-only, rejects lookup args, and wraps profile errors", async () => {
    let limited = false;
    const f = fixture(() => limited ? new Response(access.accessToken, { status: 429 }) : Response.json({ data: [user] }));
    const server = new McpServer({ name: "profile-test", version: "0.1" });
    registerTwitchTools(server, f.runtime);
    const client = new Client({ name: "profile-test-client", version: "0.1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport); await client.connect(clientTransport);
      const tool = (await client.listTools()).tools.find(t => t.name === "stream_machine_twitch_profile");
      expect(tool?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(tool?.inputSchema.additionalProperties).toBe(false);
      const result = await client.callTool({ name: "stream_machine_twitch_profile", arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({ twitch: { mode: "live", profile: { broadcasterId: "123" } } });
      const invalid = await client.callTool({ name: "stream_machine_twitch_profile", arguments: { login: "other" } });
      expect(invalid.isError).toBe(true); expect(f.reads()).toBe(1);
      limited = true;
      const error = await client.callTool({ name: "stream_machine_twitch_profile", arguments: {} });
      expect(error).toMatchObject({ isError: true, structuredContent: { error: { code: "TWITCH_RATE_LIMITED" } } });
      expect(JSON.stringify(error)).not.toContain(access.accessToken);
    } finally { await client.close(); await server.close(); }
  });
});
