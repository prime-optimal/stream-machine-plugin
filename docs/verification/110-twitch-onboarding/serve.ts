import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { DemoWorkspace, toolResult, schemas } from "../../../src/domain";
import { createLocalTwitchRuntime } from "../../../src/auth/local-runtime";
import { registerTwitchTools } from "../../../src/adapters/twitch/register";
import { TwitchFault } from "../../../src/auth/twitch";
import { z } from "zod";

const workspace = new DemoWorkspace(), calls: { name: string; arguments: unknown }[] = [];
let scenario = "ready", browserRequests = 0, providerRequests = 0;
const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("probe") });
const callbackPort = probe.port; probe.stop(true);
const fetcher: typeof fetch = Object.assign(async () => { providerRequests++; throw Error("Provider requests forbidden"); }, { preconnect: fetch.preconnect });
const runtime = createLocalTwitchRuntime({ TWITCH_CLIENT_ID: "synthetic-client", TWITCH_CLIENT_SECRET: "synthetic-secret",
  TWITCH_TOKEN_ENCRYPTION_KEY: btoa("x".repeat(32)), STREAM_MACHINE_TWITCH_STORE: ":memory:" }, fetcher, callbackPort, async () => {
  browserRequests++; if (scenario === "browser_failed") throw new TwitchFault("TWITCH_BROWSER_OPEN_FAILED");
});
if (!runtime) throw Error("Fixture runtime missing");
const connect = runtime.connect, preflight = runtime.preflight;
runtime.preflight = () => { if (scenario === "busy") throw new TwitchFault("TWITCH_LOCAL_PORT_BUSY"); return preflight(); };
runtime.connect = async (...args) => {
  const result = await connect(...args);
  return { ...result, connectUrl: "http://localhost:4017/connect", callbackUrl: "http://localhost:4017/api/twitch/callback" };
};
const mcp = new McpServer({ name: "synthetic-onboarding", version: "test" });
registerTwitchTools(mcp, runtime);
const client = new Client({ name: "synthetic-ui", version: "test" });
const [a, b] = InMemoryTransport.createLinkedPair();
await mcp.connect(b); await client.connect(a);
const origin = "http://127.0.0.1:4390";
const input = z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) });
const server = Bun.serve({ hostname: "127.0.0.1", port: 4390, async fetch(request) {
  const url = new URL(request.url);
  if (url.origin !== origin) return new Response("Invalid host", { status: 403 });
  if (url.pathname === "/observations") return Response.json({ scenario, calls, browserRequests, providerRequests });
  if (url.pathname === "/scenario") {
    const next = url.searchParams.get("value");
    if (!next || !["ready", "busy", "browser_failed"].includes(next)) return new Response("Invalid scenario", { status: 400 });
    scenario = next; return Response.json({ scenario });
  }
  if (url.pathname === "/api/tool" && request.method === "POST") {
    if (request.headers.get("origin") !== origin) return new Response("Invalid origin", { status: 403 });
    const body = input.parse(await request.json()); calls.push(body);
    return Response.json(Object.hasOwn(schemas, body.name) ? toolResult(workspace, body.name, body.arguments) : await client.callTool(body));
  }
  if (url.pathname !== "/") return new Response("Not found", { status: 404 });
  const html = await Bun.file(new URL("../../../dist/app.html", import.meta.url)).text();
  return new Response(html.replace("<body>", '<body><aside role="note" style="background:#ffe8a3;color:#241900;padding:10px;text-align:center">SYNTHETIC QA · Browser launcher stubbed · No Twitch requests or grants</aside>'), {
    headers: { "content-type": "text/html", "cache-control": "no-store" },
  });
} });
console.log("Synthetic onboarding UI: " + origin + "/?preview=1");
let closing = false;
async function close() {
  if (closing) return; closing = true;
  server.stop(true); await client.close(); await mcp.close(); runtime.close(); process.exit(0);
}
process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());
