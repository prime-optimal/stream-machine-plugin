import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CreativeController, startSchema } from "./controller";
import { CreativeJournal } from "./journal";
import { configuredProvider, CreativeError } from "./provider";

export function registerCreativeTools(server: McpServer) {
  let controller: CreativeController | undefined;
  const get = () => controller ??= new CreativeController(configuredProvider(), new CreativeJournal());
  async function invoke(action: (value: CreativeController) => Promise<unknown>) {
    try {
      const result = { mode: "live", result: await action(get()) };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
      const failure = error instanceof CreativeError ? { code: error.code, message: error.message } : { code: "CONTRACT_MISMATCH", message: "Creative provider result failed validation; raw diagnostics withheld." };
      return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(failure) }], structuredContent: failure };
    }
  }
  const annotations = (readOnlyHint: boolean) => ({ readOnlyHint, destructiveHint: false, openWorldHint: true });
  server.registerTool("stream_machine_creative_list", { description: "Read real projects, installed streaming scenarios and HyperFrames skill from existing service.", inputSchema: z.object({}).strict(), annotations: annotations(true) }, () => invoke(c => c.list()));
  server.registerTool("stream_machine_creative_project", { description: "Create isolated creative demo project on existing service.", inputSchema: z.object({ name: z.string().min(1).max(100), id: z.string().regex(/^stream-machine-[A-Za-z0-9._-]+$/).max(128) }).strict(), annotations: annotations(false) }, args => invoke(c => c.project(args.name, args.id)));
  server.registerTool("stream_machine_creative_start", { description: "Run one installed static HTML overlay recipe or fixed three-second HyperFrames MP4 through existing service. Preserve request ID on retry; no Twitch or OBS action.", inputSchema: startSchema, annotations: annotations(false) }, args => invoke(c => c.start(args)));
  server.registerTool("stream_machine_creative_run", { description: "Read original run/task status without submitting another job. Unknown outcome requires provider inspection.", inputSchema: z.object({ requestId: z.uuid() }).strict(), annotations: annotations(true) }, args => invoke(c => c.run(args.requestId)));
  server.registerTool("stream_machine_creative_artifact", { description: "Retrieve bounded editable text artifact and source provenance. MP4 is a rendered video; HTML overlays remain interactive browser sources.", inputSchema: z.object({ project: z.string().min(1).max(128), entry: z.string().min(1).max(256) }).strict(), annotations: annotations(true) }, args => invoke(c => c.artifact(args.project, args.entry)));
}
