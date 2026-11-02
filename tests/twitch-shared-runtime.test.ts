import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTwitchToolSet } from "../src/adapters/twitch/tool-register";
import type { TwitchToolRuntime } from "../src/adapters/twitch/tool-runtime";
import { TwitchTitleService } from "../src/adapters/twitch/service";
import { MemoryTitlePreviewStore } from "../src/adapters/twitch/title-preview-store";
import { TwitchChannelClient } from "../src/adapters/twitch/client";
import { TwitchFault, type TwitchAccountProvider } from "../src/auth/twitch";

function provider(id: string): TwitchAccountProvider {
  return { async withAccount(operation) {
    await Promise.resolve();
    return operation({ account: { id, login: id, displayName: id, scopes: ["channel:manage:broadcast"] }, clientId: "test-client", accessToken: "SECRET_SENTINEL" });
  } };
}

test("neutral registry binds each concurrent client to its runtime and rejects owner arguments", async () => {
  async function connect(id: string) {
    const accounts = provider(id);
    const runtime: TwitchToolRuntime = {
      accounts, titles: new TwitchTitleService(accounts),
      async preflight() { return { status: "ready", executionLocation: "hosted" }; },
      async connect() { return { connectUrl: "https://site.example/" }; },
      approvalUrl(previewId) { return `https://site.example/approve?id=${previewId}`; },
      async clip() { return { clip: { id: "Clip" } }; },
      async downloadClip() { throw new TwitchFault("TWITCH_LOCAL_EXECUTION_REQUIRED"); },
    };
    const server = new McpServer({ name: id, version: "test" });
    registerTwitchToolSet(server, () => runtime);
    const client = new Client({ name: "test", version: "test" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b); await client.connect(a);
    return { client, async close() { await client.close(); await server.close(); } };
  }
  const a = await connect("owner-a"), b = await connect("owner-b");
  try {
    const results = await Promise.all([a.client.callTool({ name: "stream_machine_twitch_status", arguments: {} }), b.client.callTool({ name: "stream_machine_twitch_status", arguments: {} })]);
    expect(results[0]?.structuredContent).toMatchObject({ twitch: { account: { id: "owner-a" } } });
    expect(results[1]?.structuredContent).toMatchObject({ twitch: { account: { id: "owner-b" } } });
    for (const ownerKey of ["ownerId", "userId", "accountId", "accessToken", "provider"]) {
      expect((await a.client.callTool({ name: "stream_machine_twitch_status", arguments: { [ownerKey]: "owner-b" } })).isError).toBe(true);
    }
    expect(JSON.stringify(results)).not.toContain("SECRET_SENTINEL");
    expect(await a.client.callTool({ name: "stream_machine_twitch_download_clip", arguments: { clipId: "Clip" } })).toMatchObject({ isError: true, structuredContent: { error: { code: "TWITCH_LOCAL_EXECUTION_REQUIRED" } } });
  } finally { await a.close(); await b.close(); }
});

test("separate service instances share preview approval and consume it once", async () => {
  const store = new MemoryTitlePreviewStore();
  let title = "Original", writes = 0;
  const fetcher: typeof fetch = Object.assign(async (_input: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "PATCH") { writes++; title = "Proposed"; return new Response(null, { status: 204 }); }
    return Response.json({ data: [{ broadcaster_id: "owner-a", broadcaster_login: "owner-a", broadcaster_name: "Owner A", title, game_id: "1", game_name: "Test" }] });
  }, { preconnect: fetch.preconnect });
  const first = new TwitchTitleService(provider("owner-a"), new TwitchChannelClient(fetcher), Date.now, store);
  const replica = new TwitchTitleService(provider("owner-a"), new TwitchChannelClient(fetcher), Date.now, store);
  const preview = await first.preview("Proposed");
  await replica.approve(preview.previewId);
  const result = await Promise.allSettled([first.apply(preview.previewId), replica.apply(preview.previewId)]);
  expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1);
  expect(writes).toBe(1);
  await expect(replica.apply(preview.previewId)).rejects.toThrow("PREVIEW_CONSUMED");
});

test("a second preview rechecks current title after acquiring the shared owner lease", async () => {
  let released: (() => void) | undefined;
  const firstReleased = new Promise<void>(resolve => { released = resolve; });
  class OrderedStore extends MemoryTitlePreviewStore {
    private acquisitions = 0;
    override async acquire(lease: string, now: number) {
      if (++this.acquisitions === 2) await firstReleased;
      return super.acquire(lease, now);
    }
    override async release(lease: string) { await super.release(lease); released?.(); }
  }
  const store = new OrderedStore();
  let title = "Original", writes = 0;
  const fetcher: typeof fetch = Object.assign(async (_input: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "PATCH") { writes++; title = "Proposed"; return new Response(null, { status: 204 }); }
    return Response.json({ data: [{ broadcaster_id: "owner-a", broadcaster_login: "owner-a", broadcaster_name: "Owner A", title, game_id: "1", game_name: "Test" }] });
  }, { preconnect: fetch.preconnect });
  const first = new TwitchTitleService(provider("owner-a"), new TwitchChannelClient(fetcher), Date.now, store);
  const second = new TwitchTitleService(provider("owner-a"), new TwitchChannelClient(fetcher), Date.now, store);
  const a = await first.preview("Proposed"), b = await second.preview("Proposed");
  await first.approve(a.previewId); await second.approve(b.previewId);
  const results = await Promise.allSettled([first.apply(a.previewId), second.apply(b.previewId)]);
  expect(writes).toBe(1);
  expect(results[0]?.status).toBe("fulfilled");
  expect(results[1]).toMatchObject({ status: "rejected", reason: { message: "PREVIEW_STALE" } });
});
