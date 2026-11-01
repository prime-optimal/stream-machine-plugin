import { z } from "zod";
import type { WorkerDependencies } from "../worker/contracts";

export const TWITCH_EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";
export type ChannelUpdateSubscription = {
  type: "channel.update";
  version: "2";
  condition: { broadcaster_user_id: string };
  transport: { method: "websocket"; session_id: string };
};

const messageSchema = z.object({
  metadata: z.object({ message_id: z.string().min(1).max(256), message_type: z.enum(["session_welcome", "session_keepalive", "session_reconnect", "notification", "revocation"]), message_timestamp: z.iso.datetime() }),
  payload: z.unknown(),
});
const welcomeSchema = z.object({ session: z.object({ id: z.string().min(1).max(256), keepalive_timeout_seconds: z.number().int().min(1).max(600) }) });
const reconnectSchema = z.object({ session: z.object({ reconnect_url: z.string().max(4096) }) });
const subscriptionSchema = z.object({ type: z.literal("channel.update"), version: z.literal("2"), condition: z.object({ broadcaster_user_id: z.string() }) });
const notificationSchema = z.object({ subscription: subscriptionSchema, event: z.object({ broadcaster_user_id: z.string(), title: z.string().max(280) }) });
const revocationSchema = z.object({ subscription: subscriptionSchema });
const accountSchema = z.object({ userId: z.string().regex(/^\d+$/) });

type Connection = { socket: WebSocket; abort: AbortController; welcomed: boolean; subscribed: boolean; transfer: boolean; closed: boolean; timeoutMs: number; timer?: ReturnType<typeof setTimeout> };

export function createTwitchEventSource(options: {
  account: { userId: string; login?: string };
  subscribe: (request: ChannelUpdateSubscription, context: { signal: AbortSignal }) => Promise<unknown>;
  connect?: (url: string) => WebSocket;
  retryDelayMs?: number;
}): WorkerDependencies["source"] {
  const account = accountSchema.parse(options.account);
  const connect = options.connect ?? (url => new WebSocket(url));
  const retryDelayMs = Math.max(10, options.retryDelayMs ?? 1000);
  let started = false;

  return {
    start({ onEvent, onConnection, signal }) {
      if (started) throw new Error("SOURCE_ALREADY_STARTED");
      started = true;
      let stopped = signal.aborted;
      let active: Connection | null = null;
      let pending: Connection | null = null;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let failures = 0;

      function close(connection: Connection | null) {
        if (!connection || connection.closed) return;
        connection.closed = true;
        connection.abort.abort();
        clearTimeout(connection.timer);
        try { connection.socket.close(); } catch {}
      }
      function stop() {
        stopped = true;
        clearTimeout(retry);
        close(active);
        close(pending);
        active = pending = null;
        signal.removeEventListener("abort", stop);
      }
      function retryFresh() {
        if (stopped || retry) return;
        onConnection("offline");
        const delay = Math.min(30_000, retryDelayMs * 2 ** Math.min(failures++, 5));
        retry = setTimeout(() => { retry = undefined; if (!stopped) { onConnection("reconnecting"); open(TWITCH_EVENTSUB_URL, false); } }, delay);
      }
      function lost(connection: Connection) {
        if (stopped || connection.closed) return;
        close(connection);
        if (connection === pending) {
          close(active);
          active = pending = null;
          retryFresh();
        } else if (connection === active) {
          active = null;
          if (!pending) retryFresh();
        }
      }
      function resetTimer(connection: Connection) {
        clearTimeout(connection.timer);
        connection.timer = setTimeout(() => lost(connection), connection.timeoutMs);
      }
      function current(connection: Connection) { return !stopped && !connection.closed && (connection === active || connection === pending); }

      async function message(connection: Connection, data: unknown) {
        if (!current(connection)) return;
        try {
          if (typeof data !== "string" || Buffer.byteLength(data) > 65_536) throw new Error("INVALID_MESSAGE");
          const envelope = messageSchema.parse(JSON.parse(data));
          switch (envelope.metadata.message_type) {
            case "session_welcome": {
              if (connection.welcomed) throw new Error("DUPLICATE_WELCOME");
              const { session } = welcomeSchema.parse(envelope.payload);
              connection.welcomed = true;
              connection.timeoutMs = session.keepalive_timeout_seconds * 1000;
              resetTimer(connection);
              if (!connection.transfer) await options.subscribe({ type: "channel.update", version: "2", condition: { broadcaster_user_id: account.userId }, transport: { method: "websocket", session_id: session.id } }, { signal: connection.abort.signal });
              if (!current(connection)) return;
              connection.subscribed = true;
              if (connection === pending) {
                const previous = active;
                active = connection;
                pending = null;
                close(previous);
              }
              failures = 0;
              onConnection("online");
              break;
            }
            case "session_keepalive":
              if (!connection.welcomed) throw new Error("WELCOME_REQUIRED");
              resetTimer(connection);
              break;
            case "notification": {
              if (connection !== active || !connection.subscribed) return;
              const payload = notificationSchema.parse(envelope.payload);
              if (payload.subscription.condition.broadcaster_user_id !== account.userId || payload.event.broadcaster_user_id !== account.userId) return;
              resetTimer(connection);
              const title = payload.event.title.replace(/[\u0000-\u001f\u007f]/g, " ");
              await onEvent({ id: envelope.metadata.message_id, type: "channel.update", occurredAt: envelope.metadata.message_timestamp, text: `Channel updated: ${title || "(untitled)"}` });
              break;
            }
            case "session_reconnect": {
              if (connection !== active || !connection.subscribed || pending) return;
              const { session } = reconnectSchema.parse(envelope.payload);
              const url = new URL(session.reconnect_url);
              if (url.protocol !== "wss:" || url.hostname !== "eventsub.wss.twitch.tv" || url.port || url.username || url.password) throw new Error("INVALID_RECONNECT_URL");
              onConnection("reconnecting");
              open(session.reconnect_url, true);
              break;
            }
            case "revocation": {
              const payload = revocationSchema.parse(envelope.payload);
              if (payload.subscription.condition.broadcaster_user_id !== account.userId) return;
              onConnection("revoked");
              stop();
              break;
            }
          }
        } catch { lost(connection); }
      }

      function open(url: string, transfer: boolean) {
        if (stopped) return;
        let socket: WebSocket;
        try { socket = connect(url); }
        catch { close(active); active = null; retryFresh(); return; }
        const connection: Connection = { socket, abort: new AbortController(), welcomed: false, subscribed: false, transfer, closed: false, timeoutMs: 10_000 };
        if (transfer) pending = connection; else active = connection;
        resetTimer(connection);
        socket.addEventListener("message", event => { void message(connection, event.data); });
        socket.addEventListener("close", () => lost(connection));
        socket.addEventListener("error", () => lost(connection));
      }

      if (stopped) return;
      signal.addEventListener("abort", stop, { once: true });
      onConnection("connecting");
      open(TWITCH_EVENTSUB_URL, false);
    },
  };
}
