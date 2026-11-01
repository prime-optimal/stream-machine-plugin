import { z } from "zod";
import type { CreativeProvider } from "../design/provider";

export const VIDEO_FILE = "stream-machine-proof.mp4";
export async function startVideo(provider: CreativeProvider, project: string, requestId: string) {
  const compositionDir = `.hyperframes-cache/${requestId}`;
  await provider.api(`/api/projects/${encodeURIComponent(project)}/media/hyperframes/scaffold`, { compositionDir });
  const scaffold = z.string().parse(await provider.call("get_file", { project, path: `${compositionDir}/index.html` }));
  const html = scaffold
    .replace('data-duration="10"', 'data-duration="3"')
    .replace("background: #000;", "background: #0b0b0f; font-family: Arial, sans-serif;")
    .replace('    ></div>', '    ><h1 id="title" style="position:absolute;left:140px;top:420px;color:#ffb76b;font-size:96px">STREAM MACHINE</h1></div>')
    .replace('window.__timelines["main"] = tl;', 'tl.fromTo("#title", {opacity:0,x:80}, {opacity:1,x:0,duration:0.7}, 0).to("#title", {x:30,duration:1}, 1).to("#title", {opacity:0,duration:0.5}, 2.5); window.__timelines["main"] = tl;');
  if (!html.includes('id="title"') || !html.includes('data-duration="3"')) throw new Error("Scaffold contract changed");
  await provider.call("write_file", { project, path: `${compositionDir}/index.html`, content: html });
  const task = z.object({ taskId: z.string() }).parse(await provider.api(`/api/projects/${encodeURIComponent(project)}/media/generate`, {
    surface: "video", model: "hyperframes-html", compositionDir, output: VIDEO_FILE,
  }));
  return { taskId: task.taskId, source: `${compositionDir}/index.html`, file: VIDEO_FILE };
}
