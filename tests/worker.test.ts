import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventLedger } from "../src/events/ledger";
import { WorkerRuntime } from "../src/worker/runtime";
import type { WorkerDependencies } from "../src/worker/contracts";

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const fn of cleanup.splice(0).reverse()) await fn(); });
const event = (id = "one") => ({ id, type: "fixture.test", occurredAt: new Date().toISOString(), text: "Fixture" });
async function setup(options: { alert?: WorkerDependencies["showAlert"]; preflight?: WorkerDependencies["preflight"] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "smw-"));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  const ledger = await EventLedger.open(join(dir, "events.jsonl"));
  cleanup.push(() => ledger.close());
  let calls = 0;
  const runtime = new WorkerRuntime({
    source: { start: ({ onConnection }) => { onConnection("online"); } },
    preflight: options.preflight ?? (async () => {}),
    showAlert: options.alert ?? (async () => { calls++; }),
  }, ledger, true);
  await runtime.start();
  return { runtime, ledger, dir, calls: () => calls };
}

describe("worker admission and lifecycle", () => {
  test("starts paused; explicit arm admits once; duplicate and paused events never replay", async () => {
    const { runtime, calls } = await setup();
    await runtime.receive(event());
    expect(calls()).toBe(0);
    await runtime.arm();
    await runtime.receive(event());
    await runtime.receive(event());
    expect(calls()).toBe(1);
    expect(runtime.status().duplicates).toBe(1);
    runtime.pause();
    await runtime.receive(event("paused"));
    await runtime.arm();
    expect(calls()).toBe(1);
  });
  test("one action slot drops concurrent events instead of queuing", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const { runtime } = await setup({ alert: () => gate });
    await runtime.arm();
    const first = runtime.receive(event());
    await runtime.receive(event("two"));
    expect(runtime.status().skipped).toBe(1);
    release();
    await first;
    expect(runtime.status().attempted).toBe(1);
  });
  test("pause during readiness cannot arm later", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const { runtime } = await setup({ preflight: () => gate });
    const arming = runtime.arm();
    runtime.pause();
    release();
    await expect(arming).rejects.toThrow("ARM_FAILED");
    expect(runtime.status().mode).toBe("paused");
  });
  test("pause during disk reservation blocks new OBS request", async () => {
    const { runtime, calls } = await setup();
    await runtime.arm();
    const receiving = runtime.receive(event());
    runtime.pause();
    await receiving;
    expect(calls()).toBe(0);
    await runtime.arm();
    await runtime.receive(event());
    expect(calls()).toBe(0);
    expect(runtime.status().duplicates).toBe(1);
  });
  test("disconnect pauses; reconnect requires rearm", async () => {
    const { runtime, calls } = await setup();
    await runtime.arm();
    runtime.connection("reconnecting");
    runtime.connection("online");
    await runtime.receive(event());
    expect(runtime.status().mode).toBe("paused");
    expect(calls()).toBe(0);
  });
  test("failed action remains consumed after rearm", async () => {
    let calls = 0;
    const { runtime } = await setup({ alert: async () => { calls++; throw new Error("secret provider response"); } });
    await runtime.arm();
    await runtime.receive(event());
    expect(runtime.status()).toMatchObject({ mode: "paused", error: "ALERT_FAILED" });
    expect(JSON.stringify(runtime.status())).not.toContain("secret");
    await runtime.arm();
    await runtime.receive(event());
    expect(calls).toBe(1);
  });
  test("stale, future, malformed events never dispatch", async () => {
    const { runtime, calls } = await setup();
    await runtime.arm();
    await runtime.receive({ ...event(), occurredAt: new Date(0).toISOString() });
    await runtime.receive({ ...event(), occurredAt: new Date(Date.now() + 90_000).toISOString() });
    await runtime.receive({ ...event(), token: "must not enter domain" });
    expect(calls()).toBe(0);
  });
});

describe("durable event reservation", () => {
  test("restart preserves hashed reservations and starts paused", async () => {
    const { runtime, dir } = await setup();
    await runtime.arm();
    await runtime.receive(event("private-event-id"));
    const ledger = await EventLedger.open(join(dir, "events.jsonl"));
    cleanup.push(() => ledger.close());
    expect(await ledger.reserve("private-event-id")).toBe("duplicate");
    expect(await readFile(join(dir, "events.jsonl"), "utf8")).not.toContain("private-event-id");
    const restarted = new WorkerRuntime({ source: { start: () => {} }, preflight: async () => {}, showAlert: async () => {} }, ledger);
    expect(restarted.status().mode).toBe("paused");
  });
  test("corrupt ledger and capacity fail closed", async () => {
    const { dir } = await setup();
    const path = join(dir, "corrupt");
    await writeFile(path, "partial", { mode: 0o600 });
    await expect(EventLedger.open(path)).rejects.toThrow("LEDGER_CORRUPT");
    const bounded = await EventLedger.open(join(dir, "small"), 1);
    cleanup.push(() => bounded.close());
    await bounded.reserve("one");
    await expect(bounded.reserve("two")).rejects.toThrow("LEDGER_FULL");
  });
});
