import { createConnection, createServer } from "node:net";
import { chmod } from "node:fs/promises";
import { z } from "zod";
import { workerEventSchema } from "../events/contracts";
import type { WorkerRuntime } from "./runtime";

export const commandSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.enum(["arm", "pause", "status", "stop"]) }),
  z.strictObject({ op: z.literal("fixture"), event: workerEventSchema }),
]);
export type WorkerCommand = z.infer<typeof commandSchema>;
const replySchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), status: z.unknown() }),
  z.strictObject({ ok: z.literal(false), error: z.string().max(64) }),
]);

export async function listenControl(options: { path: string; runtime: WorkerRuntime; fixture: boolean; onStop: () => Promise<void> }) {
  let clients = 0;
  const server = createServer(socket => {
    if (++clients > 8) { socket.destroy(); clients--; return; }
    socket.once("close", () => { clients--; });
    socket.on("error", () => {});
    socket.setTimeout(2000, () => socket.destroy());
    let input = "";
    let responded = false;
    socket.on("data", async bytes => {
      if (responded) return;
      input += bytes.toString("utf8");
      if (Buffer.byteLength(input) > 4096) { responded = true; socket.end('{"ok":false,"error":"REQUEST_TOO_LARGE"}\n'); return; }
      if (!input.includes("\n")) return;
      responded = true;
      socket.setTimeout(8000, () => socket.destroy());
      try {
        const command = commandSchema.parse(JSON.parse(input.trim()));
        let status;
        switch (command.op) {
          case "arm": status = await options.runtime.arm(); break;
          case "pause": status = options.runtime.pause(); break;
          case "status": status = options.runtime.status(); break;
          case "stop": status = await options.runtime.stop(); break;
          case "fixture":
            if (!options.fixture) throw new Error("FIXTURE_DISABLED");
            await options.runtime.receive(command.event);
            status = options.runtime.status();
            break;
        }
        socket.end(JSON.stringify({ ok: true, status }) + "\n");
        if (command.op === "stop") await options.onStop();
      } catch { socket.end('{"ok":false,"error":"CONTROL_FAILED"}\n'); }
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(options.path, () => { server.removeListener("error", reject); resolve(); }); });
  await chmod(options.path, 0o600);
  return server;
}

export async function workerRequest(path: string, command: WorkerCommand) {
  return await new Promise<z.infer<typeof replySchema>>((resolve, reject) => {
    const socket = createConnection(path);
    let response = "";
    socket.setTimeout(8000, () => socket.destroy(new Error("WORKER_TIMEOUT")));
    socket.once("connect", () => socket.write(JSON.stringify(command) + "\n"));
    socket.on("data", bytes => {
      response += bytes.toString("utf8");
      if (Buffer.byteLength(response) > 8192) socket.destroy(new Error("RESPONSE_TOO_LARGE"));
      if (response.includes("\n")) {
        try { resolve(replySchema.parse(JSON.parse(response.trim()))); }
        catch { reject(new Error("INVALID_RESPONSE")); }
        socket.destroy();
      }
    });
    socket.once("error", () => reject(new Error("WORKER_UNAVAILABLE")));
    socket.once("close", () => { if (!response.includes("\n")) reject(new Error("WORKER_UNAVAILABLE")); });
  });
}
