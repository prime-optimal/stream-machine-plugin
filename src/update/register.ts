import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { checkRelease } from "./releases";
import { prepareUpdate } from "./archive";

export function registerUpdateTools(server: McpServer) {
  for (const [name, description, run, readOnly] of [
    ["stream_machine_update_check", "Check stable Stream Machine GitHub release, running version, release notes, and verified-package availability. Requires authenticated gh CLI for private repository. Does not update or reload.", checkRelease, true],
    ["stream_machine_update_prepare", "Download newer stable Stream Machine release into private temporary storage and verify SHA-256 and package identity. Does not install, publish, reload, or write plugin cache. Use self-update skill for guided Plugin Creator handoff.", prepareUpdate, false],
  ] as const) {
    server.registerTool(name, { description, inputSchema: z.object({}), annotations: { readOnlyHint: readOnly, destructiveHint: false, openWorldHint: true } }, async () => {
      try { const result = await run(); return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result }; }
      catch { return { isError: true, content: [{ type: "text" as const, text: "Update unavailable: no compatible stable release, GitHub access failed, or package verification failed. Check published assets and gh authentication. No plugin changed." }] }; }
    });
  }
}
