import { z } from "zod";
import { DemoWorkspace, toolResult, schemas } from "../../../src/domain";
import { requiredTwitchScopes, twitchConsentDisclosure, twitchPermissions } from "../../../src/auth/permissions";
import { siteOrigin } from "../../../src/site";

const workspace = new DemoWorkspace();
const calls: { name: string; arguments: unknown }[] = [];
let runtime: "hosted" | "local" = "hosted";
const origin = "http://127.0.0.1:4391";
const input = z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) });
const account = { id: "synthetic-owner", login: "synthetic_owner", displayName: "Synthetic Owner", scopes: [...requiredTwitchScopes] };

function tool(name: string, args: Record<string, unknown>) {
  if (name === "stream_machine_open" && runtime === "hosted") return { structuredContent: { runtime, siteOrigin }, content: [{ type: "text", text: "Synthetic hosted menu." }] };
  if (name === "stream_machine_open") {
    const result = toolResult(workspace, name, args);
    return { ...result, structuredContent: { ...result.structuredContent, runtime, siteOrigin } };
  }
  if (name === "stream_machine_twitch_status") return { structuredContent: { twitch: { mode: "live", account } } };
  if (name === "stream_machine_twitch_connect" && runtime === "hosted") {
    return { structuredContent: { twitch: { mode: "live", provider: "hosted", executionLocation: "hosted", connectionUrl: `${siteOrigin}/`, authorizationUrl: `${siteOrigin}/`,
      browserRequested: false, disclosure: twitchConsentDisclosure, ...twitchPermissions(account.scopes) } } };
  }
  if (Object.hasOwn(schemas, name)) return toolResult(workspace, name, args);
  return { isError: true, structuredContent: { error: { code: "SYNTHETIC_FIXTURE_UNSUPPORTED" } }, content: [{ type: "text", text: "Not served by this fixture." }] };
}

const server = Bun.serve({ hostname: "127.0.0.1", port: 4391, async fetch(request) {
  const url = new URL(request.url);
  if (url.origin !== origin) return new Response("Invalid host", { status: 403 });
  if (url.pathname === "/observations") return Response.json({ runtime, calls });
  if (url.pathname === "/scenario") {
    const next = url.searchParams.get("value");
    if (next !== "hosted" && next !== "local") return new Response("Invalid scenario", { status: 400 });
    runtime = next; calls.length = 0; return Response.json({ runtime });
  }
  if (url.pathname === "/api/tool" && request.method === "POST") {
    if (request.headers.get("origin") !== origin) return new Response("Invalid origin", { status: 403 });
    const body = input.parse(await request.json()); calls.push(body);
    return Response.json(tool(body.name, body.arguments));
  }
  if (url.pathname !== "/") return new Response("Not found", { status: 404 });
  const html = await Bun.file(new URL("../../../dist/app.html", import.meta.url)).text();
  return new Response(html.replace("<body>", '<body><aside role="note" style="background:#ffe8a3;color:#241900;padding:10px;text-align:center">SYNTHETIC QA · Stubbed tools · No Twitch account is connected</aside>'), {
    headers: { "content-type": "text/html", "cache-control": "no-store" },
  });
} });
console.log(`Synthetic hosted-menu UI: ${origin}/?preview=1 (switch runtime with ${origin}/scenario?value=hosted|local)`);
process.on("SIGINT", () => { server.stop(true); process.exit(0); });
process.on("SIGTERM", () => { server.stop(true); process.exit(0); });
