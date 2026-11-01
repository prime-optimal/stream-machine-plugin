import { DemoWorkspace, toolResult } from "./domain";

const workspace = new DemoWorkspace();
const port = 4317;
const origin = `http://127.0.0.1:${port}`;
const server = Bun.serve({
  hostname: "127.0.0.1", port, maxRequestBodySize: 16_384,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("host") !== `127.0.0.1:${port}`) return new Response("Invalid host", { status: 403 });
    if (request.method === "GET" && url.pathname === "/") return new Response(Bun.file(new URL("../dist/app.html", import.meta.url)), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    if (request.method === "POST" && url.pathname === "/api/tool") {
      if (request.headers.get("origin") !== origin || !request.headers.get("content-type")?.startsWith("application/json")) return new Response("Same-origin JSON required", { status: 403 });
      try {
        const body = await request.json();
        if (typeof body?.name !== "string") return Response.json({ error: "Missing tool name" }, { status: 400 });
        return Response.json(toolResult(workspace, body.name, body.arguments), { headers: { "cache-control": "no-store" } });
      } catch {
        return Response.json({ error: "Invalid preview request" }, { status: 400 });
      }
    }
    return new Response("Not found", { status: 404 });
  },
});
console.log(`Stream Machine mock preview: ${origin}/?preview=1`);
process.on("SIGINT", () => { server.stop(); process.exit(0); });
