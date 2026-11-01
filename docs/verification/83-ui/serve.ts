const root = new URL("../../../", import.meta.url);
const bundle = await Bun.build({ entrypoints: [new URL("./client.ts", import.meta.url).pathname], target: "browser" });
if (!bundle.success || !bundle.outputs[0]) throw new Error("Mock UI bundle failed");
const javascript = await bundle.outputs[0].text();
const css = await Bun.file(new URL("src/ui/style.css", root)).text();
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Issue 83 mocked Twitch disclosure</title><link rel="stylesheet" href="/style.css"><style>body{margin:0;padding:24px}.live-grid{display:block}.live-card:not(:nth-child(3)){display:none}.live-card{max-width:1000px;margin:auto}.live-card p{overflow-wrap:anywhere}.live-result{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><p style="color:#ddd">MOCK VERIFICATION ONLY. No OAuth, tokens, or provider actions.</p><script type="module" src="/app.js"></script></body></html>`;
const server = Bun.serve({
  hostname: "127.0.0.1", port: 48383,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response(html, { headers: { "Content-Type": "text/html" } });
    if (path === "/app.js") return new Response(javascript, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/style.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response("No mock consent action is implemented", { status: 404 });
  },
});
console.log("Mock proof only: " + server.url);
function close() { server.stop(true); process.exit(0); }
process.on("SIGINT", close);
process.on("SIGTERM", close);
