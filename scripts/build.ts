import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
process.chdir(root);
await mkdir("dist", { recursive: true });
const ui = await Bun.build({ entrypoints: ["src/ui/app.ts"], target: "browser", minify: true });
if (!ui.success) throw new AggregateError(ui.logs, "UI build failed");
const js = await ui.outputs.find(output => output.path.endsWith(".js"))!.text();
const css = await Bun.file("src/ui/style.css").text();
const template = await Bun.file("src/ui/index.html").text();
const html = template.replace("__APP_JS__", () => js.replace(/<\/script/gi, "<\\/script")).replace("__APP_CSS__", () => css);
if (/__APP_(JS|CSS)__/.test(html)) throw new Error("Unresolved UI template marker");
await Bun.write("dist/app.html", html);
const server = await Bun.build({ entrypoints: ["src/stdio.ts"], target: "bun", outdir: "dist", naming: "server.js", define: { __STREAM_MACHINE_HTML__: JSON.stringify(html) } });
if (!server.success) throw new AggregateError(server.logs, "Server build failed");
console.log("Built dist/app.html and bundled dist/server.js");
