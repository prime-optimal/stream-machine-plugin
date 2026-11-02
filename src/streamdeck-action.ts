import { z } from "zod";
import { withObs } from "./adapters/obs/client";

const specialInputs = z.object({ mic1: z.string().nullable().optional(), desktop1: z.string().nullable().optional() });
const [command, argument] = process.argv.slice(2);

try {
  await withObs(async (request) => {
    if (command === "scene" && argument) await request("SetCurrentProgramScene", { sceneName: argument });
    else if (command === "mic" || command === "desktop-audio") {
      const inputs = specialInputs.parse(await request("GetSpecialInputs"));
      const inputName = command === "mic" ? inputs.mic1 : inputs.desktop1;
      if (!inputName) throw new Error(`OBS has no ${command} input`);
      await request("ToggleInputMute", { inputName });
    } else if (command === "record") await request("ToggleRecord");
    else if (command === "stream") await request("ToggleStream");
    else throw new Error("Usage: streamdeck-action scene NAME | mic | desktop-audio | record | stream");
  });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Stream Deck action failed"}\n`);
  process.exit(1);
}
