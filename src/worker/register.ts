import type { McpServer } from "@modelcontextprotocol/server";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { workerRequest } from "./control";

export function registerWorkerTools(server: McpServer, options: { stateDir?: string } = {}) {
  const socket = join(options.stateDir ?? join(homedir(), ".local/state/stream-machine-worker"), "instance/control.sock");
  for (const op of ["status", "arm", "pause", "stop"] satisfies ("status" | "arm" | "pause" | "stop")[]) {
    server.registerTool(`stream_machine_worker_${op}`, {
      description: `${op} independently running local Stream Machine worker. Arm enables the configured event-to-OBS action. Pause blocks new actions; already-started requests may complete. Start worker separately from terminal.`,
      inputSchema: z.strictObject({}),
      annotations: { readOnlyHint: op === "status", destructiveHint: false, openWorldHint: false },
    }, async () => {
      try {
        const result = await workerRequest(socket, { op });
        return { isError: !result.ok, content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
      } catch {
        const result = { error: "WORKER_UNAVAILABLE", message: "Start worker from terminal; keep desktop awake and worker running." };
        return { isError: true, content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
      }
    });
  }
}
