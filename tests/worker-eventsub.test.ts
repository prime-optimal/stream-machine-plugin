import { afterEach, expect, test } from "bun:test";
import { createTwitchEventSource, TWITCH_EVENTSUB_URL, type ChannelUpdateSubscription } from "../src/events/eventsub";
import type { WorkerEvent } from "../src/events/contracts";
import type { ConnectionState } from "../src/worker/contracts";

const cleanup: (() => void)[] = [];
afterEach(() => { for (const fn of cleanup.splice(0).reverse()) fn(); });
async function until(predicate: () => boolean, timeout = 3000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > deadline) throw new Error("TEST_TIMEOUT"); await Bun.sleep(5); }
}
function frame(type: string, payload: unknown, id = "message-one") {
  return JSON.stringify({ metadata: { message_id: id, message_type: type, message_timestamp: "2026-11-01T12:00:00.123456789Z" }, payload });
}
const welcome = (id: string, seconds = 10) => frame("session_welcome", { session: { id, keepalive_timeout_seconds: seconds } });
const subscription = { type: "channel.update", version: "2", condition: { broadcaster_user_id: "123" } } satisfies Omit<ChannelUpdateSubscription, "transport">;
const notification = (title = "New title", id = "update-one", userId = "123") => frame("notification", { subscription, event: { broadcaster_user_id: userId, title } }, id);

function setup(subscribe?: (request: ChannelUpdateSubscription, context: { signal: AbortSignal }) => Promise<unknown>) {
  const sockets: Bun.ServerWebSocket<undefined>[] = [];
  let incomingMessages = 0;
  const server = Bun.serve<undefined>({
    port: 0, hostname: "127.0.0.1",
    fetch(request, server) { if (server.upgrade(request)) return; return new Response("Not found", { status: 404 }); },
    websocket: { open(socket) { sockets.push(socket); }, message() { incomingMessages++; } },
  });
  cleanup.push(() => server.stop(true));
  const urls: string[] = [];
  const subscriptions: ChannelUpdateSubscription[] = [];
  const events: WorkerEvent[] = [];
  const states: ConnectionState[] = [];
  const abort = new AbortController();
  cleanup.push(() => abort.abort());
  const source = createTwitchEventSource({
    account: { userId: "123", login: "fixture" },
    connect(url) { urls.push(url); return new WebSocket(`ws://127.0.0.1:${server.port}`); },
    retryDelayMs: 20,
    subscribe: async (request, context) => { subscriptions.push(request); return await subscribe?.(request, context); },
  });
  source.start({ onEvent: async event => { events.push(event); }, onConnection: state => { states.push(state); }, signal: abort.signal });
  return { sockets, urls, subscriptions, events, states, abort, incoming: () => incomingMessages };
}

test("real local socket welcome subscribes channel.update v2 before online; validates broadcaster and normalizes title", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const h = setup(() => gate);
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("session-one"));
  await until(() => h.subscriptions.length === 1);
  expect(h.states).toEqual(["connecting"]);
  expect(h.subscriptions[0]).toEqual({ ...subscription, transport: { method: "websocket", session_id: "session-one" } });
  h.sockets[0].send(notification("Before subscription"));
  await Bun.sleep(10);
  expect(h.events).toHaveLength(0);
  release();
  await until(() => h.states.includes("online"));
  h.sockets[0].send(notification("Other channel", "other", "456"));
  h.sockets[0].send(notification("New\ntitle", "update-two"));
  await until(() => h.events.length === 1);
  expect(h.events[0]).toEqual({ id: "update-two", type: "channel.update", occurredAt: "2026-11-01T12:00:00.123456789Z", text: "Channel updated: New title" });
  expect(h.urls).toEqual([TWITCH_EVENTSUB_URL]);
  expect(h.incoming()).toBe(0);
});

test("server reconnect handoff preserves subscription and closes stale socket after new welcome", async () => {
  const h = setup();
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("session-one"));
  await until(() => h.states.includes("online"));
  const reconnect = "wss://eventsub.wss.twitch.tv/ws?reconnect=opaque-value";
  h.sockets[0].send(frame("session_reconnect", { session: { reconnect_url: reconnect } }));
  await until(() => h.sockets.length === 2);
  expect(h.sockets[0].readyState).toBe(WebSocket.OPEN);
  expect(h.states.at(-1)).toBe("reconnecting");
  h.sockets[1].send(welcome("session-two"));
  await until(() => h.states.at(-1) === "online" && h.sockets[0].readyState === WebSocket.CLOSED);
  h.sockets[0].send(notification("Stale", "stale"));
  h.sockets[1].send(notification("Transferred", "transferred"));
  await until(() => h.events.length === 1);
  expect(h.events[0].id).toBe("transferred");
  expect(h.subscriptions).toHaveLength(1);
  expect(h.urls[1]).toBe(reconnect);
});

test("keepalive resets deadline; silent disconnect opens fresh session and subscribes again", async () => {
  const h = setup();
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("session-one", 1));
  await until(() => h.states.includes("online"));
  await Bun.sleep(600);
  h.sockets[0].send(frame("session_keepalive", {}));
  await Bun.sleep(600);
  expect(h.sockets).toHaveLength(1);
  await until(() => h.sockets.length === 2);
  expect(h.states).toContain("offline");
  h.sockets[1].send(welcome("session-two"));
  await until(() => h.subscriptions.length === 2);
  expect(h.subscriptions[1].transport.session_id).toBe("session-two");
});

test("revocation closes source without reconnect; abort cancels connections and pending retry", async () => {
  const h = setup();
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("one"));
  await until(() => h.states.includes("online"));
  h.sockets[0].send(frame("revocation", { subscription: { ...subscription, status: "authorization_revoked" } }));
  await until(() => h.states.at(-1) === "revoked");
  await Bun.sleep(60);
  expect(h.sockets).toHaveLength(1);
  expect(h.sockets[0].readyState).toBe(WebSocket.CLOSED);

  const other = setup();
  await until(() => other.sockets.length === 1);
  other.sockets[0].close();
  await until(() => other.states.includes("offline"));
  other.abort.abort();
  await Bun.sleep(80);
  expect(other.sockets).toHaveLength(1);
});

test("subscription failure never reports online; untrusted reconnect URL rejected", async () => {
  const h = setup(async () => { throw new Error("secret token must not escape"); });
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("one"));
  await until(() => h.states.includes("offline"));
  h.abort.abort();
  expect(h.states).not.toContain("online");

  const other = setup();
  await until(() => other.sockets.length === 1);
  other.sockets[0].send(welcome("one"));
  await until(() => other.states.includes("online"));
  other.sockets[0].send(frame("session_reconnect", { session: { reconnect_url: "wss://attacker.example/ws" } }));
  await until(() => other.states.includes("offline"));
  other.abort.abort();
  expect(other.urls).toEqual([TWITCH_EVENTSUB_URL]);
});

test("abort cancels in-progress subscription request and prevents late online state", async () => {
  let cancelled = false;
  const h = setup(async (_, { signal }) => {
    await new Promise<void>((_, reject) => { signal.addEventListener("abort", () => { cancelled = true; reject(new Error("CANCELLED")); }, { once: true }); });
  });
  await until(() => h.sockets.length === 1);
  h.sockets[0].send(welcome("pending"));
  await until(() => h.subscriptions.length === 1);
  h.abort.abort();
  await until(() => cancelled);
  expect(h.states).not.toContain("online");
});
