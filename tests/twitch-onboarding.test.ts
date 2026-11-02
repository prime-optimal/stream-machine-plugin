import { expect, test } from "bun:test";
import { createLocalTwitchRuntime } from "../src/auth/local-runtime";
import { createConnectionState } from "../src/ui/connections";
import { requiredTwitchScopes, twitchConsentDisclosure } from "../src/auth/permissions";

const environment = {
  TWITCH_CLIENT_ID: "synthetic-client", TWITCH_CLIENT_SECRET: "synthetic-secret",
  TWITCH_TOKEN_ENCRYPTION_KEY: btoa("x".repeat(32)), STREAM_MACHINE_TWITCH_STORE: ":memory:",
};
const forbidden: typeof fetch = Object.assign(async () => { throw Error("Provider requests forbidden"); }, { preconnect: fetch.preconnect });
function availablePort() {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("test") });
  const port = probe.port; probe.stop(true); return port;
}

test("onboarding checks callback availability without retaining a listener", () => {
  const port = availablePort();
  const runtime = createLocalTwitchRuntime(environment, forbidden, port);
  if (!runtime) throw Error("Runtime missing");
  try {
    expect(runtime.preflight()).toMatchObject({ mode: "live", status: "ready", callbackUrl: `http://localhost:${port}/api/twitch/callback` });
    const other = Bun.serve({ hostname: "127.0.0.1", port, fetch: () => new Response("unrelated") });
    try { expect(() => runtime.preflight()).toThrow("TWITCH_LOCAL_PORT_BUSY"); } finally { other.stop(true); }
    expect(runtime.preflight().status).toBe("ready");
  } finally { runtime.close(); }
});

test("second plugin runtime reports occupied callback port without altering its owner", async () => {
  const port = availablePort();
  const owner = createLocalTwitchRuntime(environment, forbidden, port);
  const other = createLocalTwitchRuntime(environment, forbidden, port);
  if (!owner || !other) throw Error("Runtime missing");
  try {
    await owner.connect();
    expect(owner.preflight().status).toBe("ready");
    expect(() => other.preflight()).toThrow("TWITCH_LOCAL_PORT_BUSY");
    await expect(other.connect()).rejects.toThrow("TWITCH_LOCAL_PORT_BUSY");
    expect((await owner.connect()).connectUrl).toBe(`http://localhost:${port}/connect`);
  } finally { other.close(); owner.close(); }
});

test("explicit UI authorization uses the local tool once and stays unverified", async () => {
  const calls: { name: string; args: unknown }[] = [];
  const model = createConnectionState(async (name, args) => {
    calls.push({ name, args });
    if (name.endsWith("preflight")) return { structuredContent: { twitch: { mode: "live", status: "ready" } } };
    return { structuredContent: { twitch: { mode: "live", connectUrl: "http://localhost:4017/connect",
      requestedScopes: requiredTwitchScopes, retainedScopes: [], disclosure: twitchConsentDisclosure, browserRequested: true } } };
  }, () => {}, () => {});
  await model.startConnect(true);
  expect(calls).toEqual([{ name: "stream_machine_twitch_preflight", args: undefined }, { name: "stream_machine_twitch_connect", args: { openBrowser: true } }]);
  expect(model.state().connect).toMatchObject({ kind: "link", browserRequested: true });
  expect(model.state().check.kind).toBe("not_checked");
});

test("disposal during preflight prevents a later browser request", async () => {
  const calls: string[] = [];
  let complete: (value: { structuredContent: { twitch: { mode: string; status: string } } }) => void = () => { throw Error("Pending preflight missing"); };
  const pending = new Promise<{ structuredContent: { twitch: { mode: string; status: string } } }>(resolve => { complete = resolve; });
  const model = createConnectionState(name => { calls.push(name); return pending; }, () => {}, () => {});
  const connecting = model.startConnect(true);
  model.dispose();
  complete({ structuredContent: { twitch: { mode: "live", status: "ready" } } });
  await connecting;
  expect(calls).toEqual(["stream_machine_twitch_preflight"]);
});

test("a successful old server response cannot claim an unrequested browser launch", async () => {
  const calls: string[] = [];
  const model = createConnectionState(async name => {
    calls.push(name);
    return name.endsWith("preflight") ? { structuredContent: { twitch: { mode: "live", status: "ready" } } } :
      { structuredContent: { twitch: { mode: "live", connectUrl: "http://localhost:4017/connect",
        requestedScopes: requiredTwitchScopes, retainedScopes: [], disclosure: twitchConsentDisclosure } } };
  }, () => {}, () => {});
  await model.startConnect(true);
  const state = model.state();
  expect(state.connect.kind === "failed" && state.connect.message).toContain("browser could not be opened");
  expect(state.check.kind).toBe("not_checked");
  expect(calls).toEqual(["stream_machine_twitch_preflight", "stream_machine_twitch_connect"]);
});
