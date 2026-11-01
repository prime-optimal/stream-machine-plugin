import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { z } from "zod";
import { commandSchema, workerRequest } from "./control";
import type { WorkerDependencies, WorkerFactory } from "./contracts";
import { privateDirectory, runWorker } from "./process";

const factorySchema = z.custom<WorkerFactory>(value => typeof value === "function");
const moduleSchema = z.object({ createWorkerDependencies: factorySchema });
const args = process.argv.slice(2);
const command = args[0];
function option(name: string) { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; }
const stateDir = resolve(option("--state-dir") ?? join(homedir(), ".local/state/stream-machine-worker"));
const socketPath = join(stateDir, "instance/control.sock");
const fixture = args.includes("--fixture");
const adapter = option("--adapter");

async function dependencies(): Promise<WorkerDependencies> {
  if (fixture && adapter) throw new Error("INVALID_MODE");
  if (fixture) return {
    source: { start: ({ onConnection }) => { onConnection("online"); } },
    preflight: async () => {},
    showAlert: async () => {},
  };
  if (!adapter) throw new Error("ADAPTER_REQUIRED");
  const module: unknown = await import(pathToFileURL(resolve(adapter)).href);
  return await moduleSchema.parse(module).createWorkerDependencies();
}

async function main() {
  if (fixture && adapter) throw new Error("INVALID_MODE");
  if (command === "run") { await runWorker({ stateDir, dependencies: await dependencies(), fixture }); return; }
  if (command === "start") {
    if (!fixture && !adapter) throw new Error("ADAPTER_REQUIRED");
    await privateDirectory(stateDir);
    const childArgs = [import.meta.path, "run", "--state-dir", stateDir, ...(fixture ? ["--fixture"] : ["--adapter", resolve(adapter ?? "")])];
    const child = spawn(process.execPath, childArgs, { detached: true, stdio: "ignore" });
    child.unref();
    for (let attempt = 0; attempt < 50; attempt++) {
      try { const result = await workerRequest(socketPath, { op: "status" }); process.stdout.write(JSON.stringify(result) + "\n"); return; }
      catch { await Bun.sleep(100); }
    }
    throw new Error("START_UNCONFIRMED_CHECK_STATUS");
  }
  let input: unknown = { op: command };
  if (command === "fixture") input = { op: command, event: { id: option("--id") ?? "fixture-1", type: "fixture.test", occurredAt: new Date().toISOString(), text: "Synthetic worker fixture" } };
  const request = commandSchema.parse(input);
  const result = await workerRequest(socketPath, request);
  process.stdout.write(JSON.stringify(result) + "\n");
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.main) main().catch(() => { process.stderr.write('{"ok":false,"error":"WORKER_COMMAND_FAILED"}\n'); process.exitCode = 1; });
