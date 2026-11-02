import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLocalTwitchRuntime, preflightTwitch } from "../src/auth/local-runtime";
import { registerTwitchTools } from "../src/adapters/twitch/register";
import { TwitchFault } from "../src/auth/twitch";

const environment = { TWITCH_CLIENT_ID: "synthetic-client", TWITCH_CLIENT_SECRET: "synthetic-secret",
  TWITCH_TOKEN_ENCRYPTION_KEY: btoa("x".repeat(32)), STREAM_MACHINE_TWITCH_STORE: ":memory:" };
const forbidden: typeof fetch = Object.assign(async () => { throw Error("Provider requests forbidden"); }, { preconnect: fetch.preconnect });
function portNumber() {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("probe") });
  const port = probe.port; probe.stop(true); return port;
}

test("real MCP preserves link-only inputs and launches once only on explicit opt-in", async () => {
  const port = portNumber(), launched: string[] = [];
  let fail = false;
  const runtime = createLocalTwitchRuntime(environment, forbidden, port, async url => {
    launched.push(url); if (fail) throw Error("PRIVATE_ERROR_SENTINEL");
  });
  if (!runtime) throw Error("Runtime missing");
  const server = new McpServer({ name: "onboarding", version: "test" });
  registerTwitchTools(server, runtime);
  const client = new Client({ name: "onboarding-test", version: "test" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const check = await client.callTool({ name: "stream_machine_twitch_preflight", arguments: {} });
    expect(check.structuredContent).toMatchObject({ twitch: { mode: "live", status: "ready" } });
    const invalid = await client.callTool({ name: "stream_machine_twitch_preflight", arguments: { port: 9999 } });
    expect(invalid.isError).toBe(true);
    const link = await client.callTool({ name: "stream_machine_twitch_connect", arguments: {} });
    expect(link.structuredContent).toMatchObject({ twitch: { connectUrl: `http://localhost:${port}/connect`, browserRequested: false } });
    expect(launched).toEqual([]);
    const opened = await client.callTool({ name: "stream_machine_twitch_connect", arguments: { openBrowser: true } });
    expect(opened.structuredContent).toMatchObject({ twitch: { browserRequested: true } });
    expect(launched).toEqual([`http://localhost:${port}/connect`]);
    fail = true;
    const failed = await client.callTool({ name: "stream_machine_twitch_connect", arguments: { openBrowser: true } });
    expect(failed).toMatchObject({ isError: true, structuredContent: { error: { code: "TWITCH_BROWSER_OPEN_FAILED" } } });
    expect(JSON.stringify(failed)).not.toContain("PRIVATE_ERROR_SENTINEL");
    expect(launched).toHaveLength(2);
  } finally { await client.close(); await server.close(); runtime.close(); }
});

test("preflight and bind race reject foreign listeners without browser launch", async () => {
  const port = portNumber();
  expect(preflightTwitch(environment, port).status).toBe("ready");
  let launched = 0;
  const blocker = Bun.serve({ hostname: "127.0.0.1", port, fetch: () => new Response("foreign") });
  const runtime = createLocalTwitchRuntime(environment, forbidden, port, async () => { launched++; });
  if (!runtime) throw Error("Runtime missing");
  const server = new McpServer({ name: "busy", version: "test" });
  registerTwitchTools(server, runtime);
  const client = new Client({ name: "busy-test", version: "test" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    for (const name of ["stream_machine_twitch_preflight", "stream_machine_twitch_connect"]) {
      const result = await client.callTool({ name, arguments: name.endsWith("connect") ? { openBrowser: true } : {} });
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: "TWITCH_LOCAL_PORT_BUSY" } } });
    }
    expect(launched).toBe(0);
    expect((await fetch(`http://127.0.0.1:${port}`)).status).toBe(200);
  } finally { await client.close(); await server.close(); runtime.close(); blocker.stop(true); }
});

test("missing setup fails before probing any callback port", () => {
  expect(() => preflightTwitch({}, 0)).toThrow(new TwitchFault("TWITCH_NOT_CONFIGURED"));
});
