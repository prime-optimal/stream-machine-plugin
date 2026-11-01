import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTwitchClipTools } from "../src/adapters/twitch/clips-register";
import { TwitchClipService } from "../src/adapters/twitch/clips-service";
import { TwitchClipClient } from "../src/adapters/twitch/clips-client";
import { registerTwitchTools } from "../src/adapters/twitch/register";

test("Twitch assembly exposes strict clip tools without initializing OAuth", async () => {
  const server = new McpServer({ name: "clips", version: "1" });
  registerTwitchTools(server);
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toContain("stream_machine_twitch_clip");
    expect(tools.map(t => t.name)).toContain("stream_machine_twitch_download_clip");
    expect(tools.find(t => t.name === "stream_machine_twitch_download_clip")?.annotations?.readOnlyHint).toBe(false);
    expect(tools.find(t => t.name === "stream_machine_twitch_connect")?.inputSchema.properties).toHaveProperty("manageClips");
    for (const args of [{ clipId: "../bad" }, { clipId: "valid", destination: "/tmp/evil" }]) {
      const result = await client.callTool({ name: "stream_machine_twitch_download_clip", arguments: args });
      expect(result.isError).toBe(true);
    }
  } finally { await client.close(); await server.close(); }
});

test("clip tool returns public metadata through real in-memory MCP", async () => {
  const server = new McpServer({ name: "clip-result", version: "1" });
  const fake: typeof fetch = Object.assign(async () => Response.json({ data: [{ id: "Clip", broadcaster_id: "123", title: "Test", url: "https://clips.twitch.tv/Clip" }] }), { preconnect: fetch.preconnect });
  const service = new TwitchClipService({ async withAccount(fn) { return fn({ account: { id: "123", login: "test", displayName: "Test", scopes: [] }, clientId: "client", accessToken: "SECRET_SENTINEL" }); } }, new TwitchClipClient(fake));
  registerTwitchClipTools(server, () => undefined, service);
  const client = new Client({ name: "result", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const result = await client.callTool({ name: "stream_machine_twitch_clip", arguments: { clipId: "Clip" } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ twitch: { mode: "live", clip: { id: "Clip", broadcasterId: "123" } } });
    expect(JSON.stringify(result)).not.toContain("SECRET_SENTINEL");
  } finally { await client.close(); await server.close(); }
});
