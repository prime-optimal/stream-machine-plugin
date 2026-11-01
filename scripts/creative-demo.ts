import { z } from "zod";
import { CreativeController } from "../src/adapters/design/controller";
import { CreativeJournal } from "../src/adapters/design/journal";
import { configuredProvider, CreativeError } from "../src/adapters/design/provider";

const command = Bun.argv[2] ?? "list";
const journal = new CreativeJournal();
try {
  const controller = new CreativeController(configuredProvider(), journal);
  let result: unknown;
  if (command === "list") result = await controller.list();
  else if (command === "project") result = await controller.project(z.string().parse(Bun.argv[3]), z.string().parse(Bun.argv[4]));
  else if (command === "start") result = await controller.start({ project: Bun.argv[3], recipe: Bun.argv[4], requestId: Bun.argv[5] });
  else if (command === "run") result = await controller.run(z.uuid().parse(Bun.argv[3]));
  else if (command === "artifact") result = await controller.artifact(z.string().parse(Bun.argv[3]), z.string().parse(Bun.argv[4]));
  else throw new CreativeError("INVALID_INPUT", "Commands: list; project NAME ID; start PROJECT overlay|hyperframes-html UUID; run UUID; artifact PROJECT ENTRY");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify(error instanceof CreativeError ? { code: error.code, message: error.message } : { code: "CONTRACT_MISMATCH", message: "Creative contract validation failed; raw diagnostics withheld." })}\n`);
  process.exitCode = 1;
} finally { journal.close(); }
