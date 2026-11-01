import { z } from "zod";
import { CreativeError, type CreativeProvider } from "../design/provider";

export const VIDEO_FILE = "stream-machine-proof.mp4";
export const VIDEO_RECEIPT = "creative-video-task.json";
export async function startVideo(provider: CreativeProvider, project: string, requestId: string) {
  const compositionDir = `motion-source/${requestId}`;
  const setup = z.object({ files: z.array(z.string()) }).parse(await provider.api(`/api/projects/${encodeURIComponent(project)}/media/hyperframes/scaffold`, { compositionDir }));
  if (!setup.files.includes("gsap.min.js")) throw new CreativeError("CONTRACT_MISMATCH", "Existing composition setup did not provide bundled GSAP.");
  const original = z.string().parse(await provider.call("get_file", { project, path: `${compositionDir}/index.html` }));
  if (!original.includes('src="./gsap.min.js"') || !original.includes('data-duration="10"') || !original.includes('window.__timelines["main"] = tl;')) throw new CreativeError("CONTRACT_MISMATCH", "Existing composition setup contract changed.");
  const html = original.replace('data-duration="10"', 'data-duration="3"')
    .replace("</head>", `<meta name="od-motion-audio" content="silent"><link rel="alternate" type="video/mp4" href="../../${VIDEO_FILE}"></head>`)
    .replace("background: #000;", "background: #0b0b0f; font-family: Arial, system-ui, sans-serif;")
    .replace("    ></div>", '    ><div id="title" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ffb76b;font-size:112px;font-weight:700">STREAM MACHINE</div></div>')
    .replace('window.__timelines["main"] = tl;', 'tl.fromTo("#title",{opacity:0,y:32},{opacity:1,y:0,duration:0.55},0.1).to("#title",{opacity:0,y:-16,duration:0.45},2.5); window.__timelines["main"] = tl;');
  if (!html.includes('id="title"')) throw new CreativeError("CONTRACT_MISMATCH", "Existing composition root changed; no render submitted.");
  await provider.call("write_file", { project, path: `${compositionDir}/index.html`, content: html });
  const task = z.object({ taskId: z.string() }).parse(await provider.api(`/api/projects/${encodeURIComponent(project)}/media/generate`, { surface: "video", model: "hyperframes-html", compositionDir, output: VIDEO_FILE }));
  return { taskId: task.taskId, source: `${compositionDir}/index.html` };
}
