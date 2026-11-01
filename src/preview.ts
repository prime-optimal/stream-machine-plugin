import { createPreviewBridge, previewRequest } from "./preview-bridge";

const bridge = await createPreviewBridge();
const port = Number(process.env.STREAM_MACHINE_PREVIEW_PORT ?? "4318");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid preview port");
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
        const parsed = previewRequest.safeParse(await request.json());
        if (!parsed.success || !bridge.names.has(parsed.data.name)) return Response.json({ error: "Unknown tool or invalid request" }, { status: 400 });
        return Response.json(await bridge.call(parsed.data), { headers: { "cache-control": "no-store" } });
      } catch {
        return Response.json({ error: "Tool request failed. Inspect provider status before retrying a write." }, { status: 502 });
      }
    }
    return new Response("Not found", { status: 404 });
  },
});
process.stdout.write(`Stream Machine live demos: ${origin}/?preview=1\n`);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server.stop(true);
  await bridge.close();
  process.exit(0);
}
process.on("SIGINT", () => { void close(); });
process.on("SIGTERM", () => { void close(); });
