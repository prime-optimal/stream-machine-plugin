import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
process.chdir(root);
await mkdir("dist", { recursive: true });
const obs = await Bun.build({ entrypoints: ["src/obs-stdio.ts"], target: "bun", outdir: "dist", naming: "obs-server.js" });
if (!obs.success) throw new AggregateError(obs.logs, "OBS server build failed");
const inlinePng: Bun.BunPlugin = {
  name: "inline-png", setup(build) {
    build.onLoad({ filter: /\.png$/ }, async ({ path }) => ({ loader: "js", contents: `export default ${JSON.stringify(`data:image/png;base64,${Buffer.from(await Bun.file(path).arrayBuffer()).toString("base64")}`)};` }));
  }
};
const ui = await Bun.build({ entrypoints: ["src/ui/app.ts"], target: "browser", minify: true, plugins: [inlinePng] });
if (!ui.success) throw new AggregateError(ui.logs, "UI build failed");
const js = await ui.outputs.find(output => output.path.endsWith(".js"))!.text();
const creative = await Bun.build({ entrypoints: ["src/ui/creative-app.ts"], target: "browser", minify: true });
if (!creative.success) throw new AggregateError(creative.logs, "Creative UI build failed");
const creativeJs = await creative.outputs.find(output => output.path.endsWith(".js"))!.text();
const creativeCss = await Bun.file("src/ui/creative-style.css").text();
const creativeTemplate = await Bun.file("src/ui/creative-index.html").text();
const creativeHtml = creativeTemplate.replace("__CREATIVE_JS__", () => creativeJs.replace(/<\/script/gi, "<\\/script")).replace("__CREATIVE_CSS__", () => creativeCss);
if (/__CREATIVE_(JS|CSS)__/.test(creativeHtml)) throw new Error("Unresolved creative template marker");
await Bun.write("dist/creative-app.html", creativeHtml);
const creativeServer = await Bun.build({ entrypoints: ["src/creative-stdio.ts"], target: "bun", outdir: "dist", naming: "creative-server.js", define: { __STREAM_MACHINE_CREATIVE_HTML__: JSON.stringify(creativeHtml) } });
if (!creativeServer.success) throw new AggregateError(creativeServer.logs, "Creative server build failed");
const css = (await Bun.file("src/ui/style.css").text()) + "\n" + (await Bun.file("src/ui/widget-shell.css").text());
const template = await Bun.file("src/ui/index.html").text();
const html = template.replace("__APP_JS__", () => js.replace(/<\/script/gi, "<\\/script")).replace("__APP_CSS__", () => css);
if (/__APP_(JS|CSS)__/.test(html)) throw new Error("Unresolved UI template marker");
await Bun.write("dist/app.html", html);
const server = await Bun.build({ entrypoints: ["src/stdio.ts"], target: "bun", outdir: "dist", naming: "server.js", define: { __STREAM_MACHINE_HTML__: JSON.stringify(html) } });
if (!server.success) throw new AggregateError(server.logs, "Server build failed");
for (const [entry, name] of [["src/worker/main.ts", "worker.js"], ["src/demo-worker.ts", "demo-worker.js"], ["src/streamdeck-action.ts", "streamdeck-action.js"]]) {
  const build = await Bun.build({ entrypoints: [entry], target: "bun", outdir: "dist", naming: name });
  if (!build.success) throw new AggregateError(build.logs, `Worker build failed: ${name}`);
}
console.log("Built app, MCP server, worker, and live event adapter.");
