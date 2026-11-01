import { expect, test } from "bun:test";
import { mkdtemp, rm, stat, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { workerRequest } from "../src/worker/control";
import { createConnection } from "node:net";

async function rawRequest(path: string, body: string) {
  return await new Promise<string>((resolve, reject) => {
    const socket = createConnection(path);
    let response = "";
    socket.setTimeout(2000, () => socket.destroy(new Error("TIMEOUT")));
    socket.once("connect", () => socket.write(body));
    socket.on("data", bytes => { response += bytes.toString(); });
    socket.once("end", () => resolve(response));
    socket.once("error", reject);
  });
}

test("detached worker survives launcher exit; owner-only IPC; stop cleans socket; restart paused with dedup", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "smwp-"));
  const socket = join(stateDir, "instance/control.sock");
  async function launch() {
    const child = Bun.spawn([process.execPath, "src/worker/main.ts", "start", "--fixture", "--state-dir", stateDir], { cwd: import.meta.dir + "/..", stdout: "pipe", stderr: "pipe" });
    expect(await child.exited).toBe(0);
    const output = JSON.parse(await new Response(child.stdout).text());
    expect(output).toMatchObject({ ok: true, status: { mode: "paused", fixture: true } });
  }
  const event = { id: "process-fixture", type: "fixture.test", occurredAt: new Date().toISOString(), text: "Synthetic test" };
  try {
    await launch();
    expect((await stat(socket)).mode & 0o777).toBe(0o600);
    expect((await stat(stateDir)).mode & 0o777).toBe(0o700);
    expect(await rawRequest(socket, '{"op":"arm","token":"unwanted"}\n')).toContain("CONTROL_FAILED");
    expect(await rawRequest(socket, "x".repeat(4097))).toContain("REQUEST_TOO_LARGE");
    expect(await workerRequest(socket, { op: "status" })).toMatchObject({ ok: true, status: { mode: "paused" } });
    await workerRequest(socket, { op: "arm" });
    expect(await workerRequest(socket, { op: "fixture", event })).toMatchObject({ ok: true, status: { succeeded: 1 } });
    await workerRequest(socket, { op: "pause" });
    expect(await workerRequest(socket, { op: "fixture", event: { ...event, id: "paused-event" } })).toMatchObject({ ok: true, status: { succeeded: 1, skipped: 1 } });
    await workerRequest(socket, { op: "stop" });
    for (let i = 0; i < 50 && await lstat(socket).catch(() => null); i++) await Bun.sleep(20);
    await expect(workerRequest(socket, { op: "status" })).rejects.toThrow("WORKER_UNAVAILABLE");
    await launch();
    await workerRequest(socket, { op: "arm" });
    expect(await workerRequest(socket, { op: "fixture", event })).toMatchObject({ ok: true, status: { succeeded: 0, duplicates: 1 } });
  } finally {
    await workerRequest(socket, { op: "stop" }).catch(() => {});
    for (let i = 0; i < 50 && await lstat(socket).catch(() => null); i++) await Bun.sleep(20);
    await rm(stateDir, { recursive: true, force: true });
  }
}, 20_000);
