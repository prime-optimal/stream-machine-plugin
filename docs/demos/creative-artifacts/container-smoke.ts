import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { generateMedia } from "/app/apps/daemon/dist/media/index.js";
import { scaffoldHyperFramesComposition } from "/app/apps/daemon/dist/media/hyperframes-scaffold.js";

const root = await mkdtemp(join(tmpdir(), "od-hf-smoke-"));
const projectsRoot = join(root, "projects");
const projectId = "isolated-smoke";
const projectDir = join(projectsRoot, projectId);
await mkdir(projectDir, { recursive: true });
const compositionDir = ".hyperframes-cache/proof";
await scaffoldHyperFramesComposition({ projectDir, compositionDir });
const require = createRequire("/app/apps/daemon/package.json");
const gsap = await readFile(require.resolve("gsap/dist/gsap.min.js"), "utf8");
const source = join(projectDir, compositionDir, "index.html");
await writeFile(join(projectDir, compositionDir, "gsap.min.js"), gsap);
let html = await readFile(source, "utf8");
html = html.replace(/<script src="https:[^"]+"><\/script>/, '<script src="./gsap.min.js"></script>')
  .replaceAll("1920", "320").replaceAll("1080", "180")
  .replace('data-duration="10"', 'data-duration="1"')
  .replace("background: #000;", "background: #0b0b0f; font-family: sans-serif;")
  .replace("    ></div>", '    ><h1 id="title" style="position:absolute;left:16px;top:66px;color:#ffb76b;font-size:28px">STREAM MACHINE</h1></div>')
  .replace('window.__timelines["main"] = tl;', 'tl.fromTo("#title",{opacity:0,x:20},{opacity:1,x:0,duration:0.4},0).to("#title",{opacity:0,duration:0.2},0.8); window.__timelines["main"] = tl;');
await writeFile(source, html);
const result = await generateMedia({
  projectRoot: root, projectsRoot, projectId,
  surface: "video", model: "hyperframes-html", compositionDir,
  output: "proof.mp4", desktopFrameRenderer: null,
  onProgress: message => process.stdout.write(`${JSON.stringify({ progress: message })}\n`),
});
process.stdout.write(`${JSON.stringify({ result, output: join(projectDir, result.name) })}\n`);
await writeFile("/tmp/od-hf-smoke-output", join(projectDir, result.name));
