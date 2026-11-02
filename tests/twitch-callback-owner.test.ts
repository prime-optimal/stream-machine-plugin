import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalTwitchRuntime } from "../src/auth/local-runtime";

const environment = {
  TWITCH_CLIENT_ID: "synthetic-client", TWITCH_CLIENT_SECRET: "synthetic-secret",
  TWITCH_TOKEN_ENCRYPTION_KEY: btoa("x".repeat(32)), STREAM_MACHINE_TWITCH_STORE: ":memory:"
};
const forbidden: typeof fetch = Object.assign(async () => { throw Error("Provider requests forbidden"); }, { preconnect: fetch.preconnect });
const supported = (process.platform === "darwin" || process.platform === "linux") && Bun.which("lsof") !== null;
const cleanup: (() => void)[] = [];
afterEach(() => { for (const step of cleanup.splice(0)) step(); });

async function holder(name: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "stream-machine-owner-")));
  cleanup.push(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "plugin.json"), JSON.stringify({ name }));
  writeFileSync(join(root, "dist/server.js"), `const s = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("held") }); console.log(s.port);`);
  const child = Bun.spawn([process.execPath, join(root, "dist/server.js")], { cwd: root, stdout: "pipe", stderr: "ignore" });
  cleanup.push(() => child.kill("SIGKILL"));
  const reader = child.stdout.getReader();
  const port = Number(new TextDecoder().decode((await reader.read()).value).trim());
  reader.releaseLock();
  return { child, port };
}

test.skipIf(!supported)("approved Connect stops a verified Stream Machine listener and takes the port", async () => {
  const { child, port } = await holder("stream-machine");
  const runtime = createLocalTwitchRuntime(environment, forbidden, port);
  if (!runtime) throw Error("Runtime missing");
  try {
    await expect(runtime.preflight()).rejects.toThrow("TWITCH_LOCAL_PORT_PLUGIN");
    await expect(runtime.connect()).rejects.toThrow("TWITCH_LOCAL_PORT_PLUGIN");
    expect(child.exitCode).toBeNull();
    expect((await runtime.connect(false, false, false, true)).connectUrl).toBe(`http://localhost:${port}/connect`);
    expect(await child.exited).not.toBe(0);
    expect((await fetch(`http://127.0.0.1:${port}/connect`)).status).toBe(403);
  } finally { runtime.close(); }
});

test.skipIf(!supported)("approved Connect never stops a listener that is not Stream Machine", async () => {
  const { child, port } = await holder("other-app");
  const runtime = createLocalTwitchRuntime(environment, forbidden, port);
  if (!runtime) throw Error("Runtime missing");
  try {
    await expect(runtime.connect(false, false, false, true)).rejects.toThrow("TWITCH_LOCAL_PORT_BUSY");
    expect(child.exitCode).toBeNull();
    expect(await (await fetch(`http://127.0.0.1:${port}`)).text()).toBe("held");
  } finally { runtime.close(); }
});
