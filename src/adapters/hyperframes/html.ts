import { z } from "zod";
import { CreativeError, type CreativeProvider } from "../design/provider";
import { LIVE_DRIVER } from "./live-driver";

export const HTML_PROVENANCE = {
  repository: "https://github.com/prime-optimal/stream-makeover",
  revision: "4e2bff85969550e3b2e94aed2fab7a6b8f2f62db",
  driver: "overlays/live/driver.js",
  driverSha256: "94b01676edd95c0f47cf968ae5d17842a1a8300ee7c2fbbd2555c422683ccf5b",
  build: "overlays/scripts/build-overlay.mjs",
  gsap: "3.14.2",
};

function attribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function composeHtml(title: string) {
  const variables = [
    { id: "title", type: "string", label: "Title", default: title, maxLength: 48 },
    { id: "primary", type: "color", label: "Accent", default: "#ffb76b" },
  ];
  const source = `<!doctype html>
<html lang="en" data-composition-variables="${attribute(JSON.stringify(variables))}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">
<title>Stream Machine HTML overlay</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:transparent;font-family:Arial,system-ui,sans-serif}
#card{position:absolute;left:96px;bottom:96px;min-width:620px;max-width:1500px;padding:32px 48px;background:#111b20;border-left:8px solid var(--primary,#ffb76b);color:#f4f7ef}
#title{font-size:56px;line-height:1.15;overflow-wrap:anywhere}#label{font-size:22px;letter-spacing:3px;color:var(--primary,#ffb76b);margin-bottom:12px}
</style></head><body>
<div id="root" data-composition-id="stream-machine-html" data-width="1920" data-height="1080" data-start="0" data-duration="4">
<section id="card"><p id="label">STREAM MACHINE / HTML DEMO</p><h1 id="title" data-var-text="title">${attribute(title)}</h1></section>
</div>
<script>
var tl=gsap.timeline({paused:true});
tl.fromTo("#card",{opacity:0,y:32},{opacity:1,y:0,duration:0.5,ease:"power3.out"},0.1).to("#card",{opacity:0,y:-16,duration:0.4},3.5);
window.__timelines=window.__timelines||{};window.__timelines["stream-machine-html"]=tl;
</script></body></html>`;
  return { source, html: source.replace('<meta charset="UTF-8">', `<meta charset="UTF-8"><script>\n${LIVE_DRIVER}</script>`) };
}

export async function authorHtml(provider: CreativeProvider, project: string, requestId: string, title: string) {
  const directory = `creative-html/${requestId}`;
  const file = `${directory}/index.html`;
  const source = `${directory}/source.html`;
  const composition = composeHtml(title);
  const files = [
    { name: source, content: composition.source },
    { name: `${directory}/source.json`, content: JSON.stringify({ schemaVersion: 1, recipe: "hyperframes-html", project, requestId, title, width: 1920, height: 1080, duration: 4, fonts: "system", provenance: HTML_PROVENANCE }, null, 2) },
    { name: file, content: composition.html },
  ];
  for (const item of files) {
    if (item.name.endsWith(".json")) await provider.call("write_file", { project, path: item.name, content: item.content });
    else await provider.call("create_artifact", { project, name: item.name, content: item.content });
  }
  for (const item of files) {
    const text = z.string().parse(await provider.call("get_file", { project, path: item.name }));
    if (text !== item.content) throw new CreativeError("ARTIFACT_MISMATCH", "Stored HTML/source differs from authored content; inspect isolated project before retrying.");
  }
  return { file, source };
}
