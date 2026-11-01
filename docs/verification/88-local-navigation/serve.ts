import { z } from "zod";
import { DemoWorkspace, toolResult, schemas } from "../../../src/domain";
import { requiredTwitchScopes, twitchPermissions, twitchConsentDisclosure } from "../../../src/auth/permissions";

const workspace = new DemoWorkspace();
const calls: string[] = [];
let mode = "missing";
const bodySchema = z.object({ name: z.string(), arguments: z.unknown().optional() });
const port = Number(process.env.UI_FIXTURE_PORT ?? 4388);
const origin = `http://127.0.0.1:${port}`;
const fallback = await Bun.build({ entrypoints: [`${import.meta.dir}/fallback-client.ts`], target: "browser" });
if (!fallback.success) throw new Error("Fallback fixture bundle failed.");
const script = await fallback.outputs[0].text();
Bun.serve({
  hostname: "127.0.0.1", port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== origin) return new Response("Invalid host", { status: 403 });
    if (url.pathname === "/calls") return Response.json(calls);
    if (url.pathname === "/mode") {
      const selected = url.searchParams.get("status");
      if (!["missing", "full", "fail", "slow"].includes(selected ?? "")) return new Response("Invalid fixture mode", { status: 400 });
      mode = selected ?? "missing"; return Response.json({ mode });
    }
    if (url.pathname === "/fallback.js") return new Response(script, { headers: { "Content-Type": "text/javascript" } });
    if (url.pathname === "/link-fallback") return new Response('<!doctype html><html><head><title>Synthetic host-link fallback</title></head><body><h1>Synthetic host-link fallback</h1><p>No host connection or real authorization runs.</p><div id="fixture"></div><script type="module" src="/fallback.js"></script></body></html>', { headers: { "Content-Type": "text/html" } });
    if (url.pathname === "/api/tool" && request.method === "POST") {
      if (request.headers.get("origin") !== origin) return new Response("Invalid origin", { status: 403 });
      const { name, arguments: args } = bodySchema.parse(await request.json());
      calls.push(name);
      if (Object.hasOwn(schemas, name)) return Response.json(toolResult(workspace, name, args ?? {}));
      if (name === "stream_machine_twitch_status") {
        const selected = mode;
        if (selected === "slow") await new Promise(resolve => setTimeout(resolve, 1200));
        if (selected === "fail") return Response.json({ isError: true, structuredContent: { error: { code: "TWITCH_CONNECTION_UNAVAILABLE" } } });
        const scopes = selected === "full" ? requiredTwitchScopes : ["channel:manage:broadcast"];
        return Response.json({ structuredContent: { twitch: { mode: "live", account: {
          id: "synthetic-owner", login: "synthetic_owner", displayName: "Synthetic owner", scopes,
        }, ...twitchPermissions(scopes) } } });
      }
      if (name === "stream_machine_twitch_connect") return Response.json({ structuredContent: { twitch: {
        mode: "live", connectUrl: "http://localhost:4017/connect", requestedScopes: requiredTwitchScopes,
        retainedScopes: [], disclosure: twitchConsentDisclosure,
      } } });
      return Response.json({ isError: true, structuredContent: { error: { code: "FIXTURE_BLOCKED_ACTION" } } });
    }
    if (url.pathname !== "/") return new Response("Not found", { status: 404 });
    const html = await Bun.file(`${import.meta.dir}/../../../dist/app.html`).text();
    return new Response(html.replace("<body>", '<body><aside role="note" style="background:#ffe8a3;color:#241900;padding:10px;text-align:center">SYNTHETIC QA ONLY · No real account, device, or provider actions</aside>'),
      { headers: { "Content-Type": "text/html", "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; frame-src 'none'; form-action 'none'" } });
  },
});
console.log(`Synthetic UI fixture at ${origin}/?preview=1; PID ${process.pid}`);
