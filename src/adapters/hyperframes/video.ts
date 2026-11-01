import { z } from "zod";
import type { CreativeProvider } from "../design/provider";

export const VIDEO_FILE = "stream-machine-proof.mp4";
export const VIDEO_RECEIPT = "creative-video-task.json";
export async function startVideo(provider: CreativeProvider, project: string, requestId: string) {
  const compositionDir = `.hyperframes-cache/${requestId}`;
  const run = z.object({ runId: z.string() }).parse(await provider.call("start_run", {
    project, skill: "hyperframes", requestId, agent: "codex", model: "gpt-6.1-sol",
    prompt: `Pipeline QA only, autonomous approval granted. Use installed HyperFrames skill's OpenDesign integration fast path. Run od media scaffold with composition-dir ${compositionDir}; edit ONLY generated index.html directly on filesystem. Fixed 3-second1920x1080 silent title card: dark #0b0b0f, Arial/system sans, warm #ffb76b, text STREAM MACHINE centered; fade/slide in, hold, fade out using scaffold paused GSAP timeline. No images, audio, external asset generation or original commissioning. Existing scaffold supplies GSAP. Dispatch with od media generate --surface video --model hyperframes-html --composition-dir ${compositionDir} --output ${VIDEO_FILE}. Immediately persist returned taskId, compositionDir and output filename to ${VIDEO_RECEIPT}. Follow SAME task via od media wait until terminal, never render directly or resubmit. Include final task status in receipt. Keep editable source hidden. Do not use MCP write_file for hidden sources: deployed route normalizes leading dot. Do not invoke another OpenDesign workflow. Do not change deployment, dependencies, credentials or configuration. Return exact MP4 and source paths; report failures truthfully.`,
  }));
  return { runId: run.runId, source: `${compositionDir}/index.html` };
}
