import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { workerRequest } from "../src/worker/control";
import { obsPreflight } from "../src/adapters/obs/register";
import { z } from "zod";

const directory = "docs/demos/event-evidence";
await mkdir(directory, { recursive: true });
const socket = join(homedir(), ".local/state/stream-machine-worker/instance/control.sock");
const observation = z.object({ ok: z.literal(true), status: z.object({ attempted: z.number(), succeeded: z.number() }).passthrough() });
const before = observation.parse(await workerRequest(socket, { op: "status" }));
const outputBefore = await obsPreflight();
let captured = false;
for (let attempt = 0; attempt < 180; attempt++) {
  const result = observation.parse(await workerRequest(socket, { op: "status" }));
  if (result.ok && result.status.attempted > before.status.attempted && !captured) {
    await Bun.sleep(900);
    for (const [kind, name, file] of [["source", "Stream Machine Alert", "event-alert.png"], ["scene", "Stream Machine Demo", "event-program.png"]]) {
      const shot = Bun.spawn(["obs-cli", kind, "screenshot", name, "-o", `${directory}/${file}`], { stdout: "ignore", stderr: "pipe" });
      if (await shot.exited !== 0) throw new Error("OBS screenshot failed");
    }
    captured = true;
  }
  if (result.ok && result.status.succeeded > before.status.succeeded) {
    const outputAfter = await obsPreflight();
    if (outputBefore.streaming !== outputAfter.streaming || outputBefore.recording !== outputAfter.recording) throw new Error("Broadcast state changed");
    await Bun.write(`${directory}/verification.json`, JSON.stringify({ mode: "live", before, after: result, outputBefore, outputAfter, captured, verifiedAt: new Date().toISOString(), hostConnection: "MCP client disconnected before title update" }, null, 2));
    process.stdout.write("PASS: real EventSub event reached detached worker and OBS; screenshots captured.\n");
    process.exit(0);
  }
  await Bun.sleep(250);
}
throw new Error("No successful real alert observed within the verification window");
