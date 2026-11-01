import { mkdir, lstat, rm } from "node:fs/promises";
import { join } from "node:path";
import { EventLedger } from "../events/ledger";
import type { WorkerDependencies } from "./contracts";
import { listenControl } from "./control";
import { WorkerRuntime } from "./runtime";

export async function privateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0) throw new Error("STATE_DIRECTORY_UNSAFE");
}

export async function runWorker(options: { stateDir: string; dependencies: WorkerDependencies; fixture?: boolean }) {
  await privateDirectory(options.stateDir);
  const lock = join(options.stateDir, "instance");
  const socketPath = join(lock, "control.sock");
  if (Buffer.byteLength(socketPath) > 100) throw new Error("SOCKET_PATH_TOO_LONG");
  await mkdir(lock, { mode: 0o700 });
  let ledger: EventLedger;
  try { ledger = await EventLedger.open(join(options.stateDir, "events.jsonl")); }
  catch { await rm(lock, { recursive: true }); throw new Error("LEDGER_UNAVAILABLE"); }
  const runtime = new WorkerRuntime(options.dependencies, ledger, options.fixture);
  let stopping = false;
  let server: Awaited<ReturnType<typeof listenControl>> | undefined;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await runtime.stop();
    server?.close();
    await ledger.close();
    await rm(lock, { recursive: true, force: true });
    process.exit(0);
  };
  try {
    server = await listenControl({ path: socketPath, runtime, fixture: options.fixture ?? false, onStop: shutdown });
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    await runtime.start();
    return { runtime, shutdown };
  } catch {
    await ledger.close();
    await rm(lock, { recursive: true, force: true });
    throw new Error("WORKER_START_FAILED");
  }
}
