import { mkdir } from "node:fs/promises";
import { obsPreflight, obsShowAlert } from "../src/adapters/obs/register";
const directory = "docs/demos/obs-evidence";
await mkdir(directory, { recursive: true });
const before = await obsPreflight();
async function screenshot(name: string, scene = false) {
  const child = Bun.spawn(["obs-cli", scene ? "scene" : "source", "screenshot", scene ? "Stream Machine Demo" : "Stream Machine Alert", "-o", directory + "/" + name + ".png"], { stdout: "ignore", stderr: "pipe" });
  if (await child.exited !== 0) throw new Error("Screenshot failed");
}
const play = obsShowAlert({ text: "Stream Machine connected" });
await Bun.sleep(1500);
await screenshot("play");
await screenshot("program", true);
const played = await play;
await screenshot("idle");
const replay = obsShowAlert({ replay: true });
await Bun.sleep(1500);
await screenshot("replay");
const replayed = await replay;
await screenshot("replay-idle");
const after = await obsPreflight();
if (before.streaming !== after.streaming || before.recording !== after.recording) throw new Error("OBS output states changed");
const evidence = { before, played, replayed, after, screenshots: ["play.png", "program.png", "idle.png", "replay.png", "replay-idle.png"] };
await Bun.write(directory + "/live.json", JSON.stringify(evidence, null, 2) + "\n");
process.stdout.write("OBS play/replay screenshots captured; output states unchanged.\n");
