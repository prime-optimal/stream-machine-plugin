import { homedir } from "node:os";
import { openDesktopBrowser } from "./desktop-browser";
import { findPluginListener } from "./callback-owner";
import { join } from "node:path";
import { LocalConnectionStore } from "./local-store";
import { TwitchClient, TwitchError } from "./upstream/client";
import { TwitchService } from "./upstream/service";
import { requestedTwitchScopes, twitchPermissions, twitchConsentDisclosure, requiredTwitchScopes } from "./permissions";
import { TwitchFault, type TwitchAccountProvider } from "./twitch";
import { TwitchTitleService } from "../adapters/twitch/service";
import { TwitchChannelClient } from "../adapters/twitch/client";
import { stateHash } from "./upstream/crypto";
const OWNER = "local-desktop-owner";
export const TWITCH_CALLBACK = "http://localhost:4017/api/twitch/callback";
function bindCallback(port: number, handler: (request: Request) => Response | Promise<Response>) {
  try { return Bun.serve({ hostname: "127.0.0.1", port, fetch: handler }); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") throw new TwitchFault("TWITCH_LOCAL_PORT_BUSY");
    throw error;
  }
}
async function portBusy(port: number): Promise<never> {
  throw new TwitchFault(await findPluginListener(port) === null ? "TWITCH_LOCAL_PORT_BUSY" : "TWITCH_LOCAL_PORT_PLUGIN");
}
const isPortBusy = (error: unknown) => error instanceof TwitchFault && error.code === "TWITCH_LOCAL_PORT_BUSY";
export async function preflightTwitch(environment: Record<string, string | undefined> = process.env, port = 4017) {
  if (!environment.TWITCH_CLIENT_ID || !environment.TWITCH_CLIENT_SECRET || !environment.TWITCH_TOKEN_ENCRYPTION_KEY) throw new TwitchFault("TWITCH_NOT_CONFIGURED");
  try { bindCallback(port, () => new Response(null, { status: 503 })).stop(true); }
  catch (error) { if (isPortBusy(error)) await portBusy(port); throw error; }
  return { mode: "live", status: "ready", callbackUrl: `http://localhost:${port}/api/twitch/callback` };
}
const htmlEscape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function createLocalTwitchRuntime(environment: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch, port = 4017, launchBrowser = openDesktopBrowser) {
  const ORIGIN = `http://localhost:${port}`;
  const callbackUrl = `${ORIGIN}/api/twitch/callback`;
  const clientId = environment.TWITCH_CLIENT_ID, clientSecret = environment.TWITCH_CLIENT_SECRET, encryptionSecret = environment.TWITCH_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !encryptionSecret) return undefined;
  const store = new LocalConnectionStore(environment.STREAM_MACHINE_TWITCH_STORE ?? join(homedir(), ".local/share/stream-machine/twitch.sqlite"));
  const client = new TwitchClient({ clientId, clientSecret, encryptionSecret, redirectUri: callbackUrl }, fetcher);
  const oauth = new TwitchService(store, client);
  const accounts: TwitchAccountProvider = {
    async withAccount(operation) {
      try {
        return await oauth.withAccessToken(OWNER, async (c, accessToken) => operation({ account: { id: c.twitchUserId, login: c.profile.login, displayName: c.profile.displayName, scopes: c.scopes }, clientId, accessToken }));
      } catch (error) {
        if (error instanceof TwitchFault) throw error;
        throw new TwitchFault(error instanceof TwitchError && error.code === "connection_required" ? "TWITCH_CONNECTION_REQUIRED" : "TWITCH_CONNECTION_UNAVAILABLE");
      }
    },
  };
  const titles = new TwitchTitleService(accounts, new TwitchChannelClient(fetcher));
  const approvalSession = crypto.randomUUID();
  const completions = new Map<string, { expiresAt: number; result: Promise<unknown> }>();
  const failures: ({ class: "TwitchError" | "Error"; code: string; status: number } | { class: "ApprovalGuard"; code: "approval_rejected"; status: 403; originIsSameOrigin: boolean; originIsNull: boolean; cookiePresent: boolean })[] = [];
  let server: ReturnType<typeof Bun.serve> | undefined;
  let idle: Timer | undefined;
  function touch() {
    clearTimeout(idle);
    idle = setTimeout(() => { server?.stop(true); server = undefined; }, 600_000);
    idle.unref();
  }
  const response = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'", ...headers } });
  function listen() {
    if (server) return touch();
    server = bindCallback(port, async request => {
      touch();
      const url = new URL(request.url);
      if (request.headers.get("host") !== `localhost:${port}`) return response("Invalid host", 403);
      try {
        if (url.pathname === "/connect" && request.method === "GET") {
          await titles.clear();
          const started = await oauth.begin(OWNER, false, url.searchParams.get("manage") === "1", url.searchParams.get("clips") === "1");
          return response("", 302, { Location: started.url, "Set-Cookie": `sm_twitch_state=${started.state}; HttpOnly; SameSite=Lax; Path=/api/twitch; Max-Age=600` });
        }
        if (url.pathname === "/api/twitch/callback" && request.method === "GET") {
          const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("sm_twitch_state="))?.slice(16) ?? null;
          const state = url.searchParams.get("state") ?? "";
          if (!cookie || cookie !== state || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw new TwitchError("invalid_state", 400);
          for (const [id, entry] of completions) if (entry.expiresAt <= Date.now()) completions.delete(id);
          const hash = await stateHash(state);
          let completion = completions.get(hash);
          if (!completion) {
            if (completions.size >= 20) throw new TwitchError("callback_busy", 429);
            completion = { expiresAt: Date.now() + 600000, result: oauth.complete(OWNER, state, cookie, url.searchParams.get("code"), url.searchParams.get("error")) };
            completions.set(hash, completion);
          }
          await completion.result;
          return response("", 302, { Location: `${ORIGIN}/connected`, "Set-Cookie": "sm_twitch_state=; HttpOnly; SameSite=Lax; Path=/api/twitch; Max-Age=0" });
        }
        if (url.pathname === "/connected" && request.method === "GET") return response("<h1>Twitch connected</h1><p>You can close this tab and return to Stream Machine.</p>");
        if (url.pathname === "/approve") {
          const id = url.searchParams.get("id") ?? "";
          if (request.method === "POST") {
            const originIsSameOrigin = request.headers.get("origin") === ORIGIN;
            const cookiePresent = request.headers.get("cookie")?.split(";").some(c => c.trim() === `sm_approval=${approvalSession}`) ?? false;
            if (!originIsSameOrigin || !cookiePresent) {
              failures.push({ class: "ApprovalGuard", code: "approval_rejected", status: 403, originIsSameOrigin, originIsNull: request.headers.get("origin") === "null", cookiePresent });
              if (failures.length > 10) failures.shift();
              return response("Couldn't approve. Go back to Stream Machine and try again.", 403);
            }
            await titles.approve(id);
            return response("<h1>Title approved</h1><p>You can close this tab and return to Stream Machine.</p>");
          }
          if (request.method !== "GET") return response("Method rejected", 405);
          const p = await titles.approvalDetails(id);
          return response(`<h1>Approve title change</h1><p>Account: ${htmlEscape(p.account)}</p><p>Current: ${htmlEscape(p.before)}</p><p>New: ${htmlEscape(p.after)}</p><form method="post"><button type="submit">Approve</button></form>`, 200, { "Referrer-Policy": "same-origin", "Set-Cookie": `sm_approval=${approvalSession}; HttpOnly; SameSite=Strict; Path=/approve; Max-Age=300` });
        }
        return response("Not found", 404);
      } catch (error) {
        failures.push(error instanceof TwitchError ? { class: "TwitchError", code: error.code, status: error.status } : { class: "Error", code: "local_callback_failed", status: 500 });
        if (failures.length > 10) failures.shift();
        return response("Couldn't connect to Twitch. Go back to Stream Machine and check the connection.", 400);
      }
    });
    server.unref();
    touch();
  }
  async function replacePluginListener() {
    const pid = await findPluginListener(port);
    if (pid === null) throw new TwitchFault("TWITCH_LOCAL_PORT_BUSY");
    process.kill(pid, "SIGTERM");
    for (let attempt = 0; attempt < 50; attempt++) {
      await Bun.sleep(100);
      try { return listen(); } catch (error) { if (!isPortBusy(error)) throw error; }
    }
    throw new TwitchFault("TWITCH_LOCAL_PORT_BUSY");
  }
  return {
    accounts, titles,
    diagnostics() { return failures.map(failure => ({ ...failure })); },
    async preflight() {
      return server ? { mode: "live", status: "ready", callbackUrl } : await preflightTwitch(environment, port);
    },
    async connect(_manage = false, _manageClips = false, openBrowser = false, replaceListener = false) {
      try { listen(); }
      catch (error) {
        if (!isPortBusy(error)) throw error;
        if (replaceListener) await replacePluginListener();
        else await portBusy(port);
      }
      const previous = await store.get(OWNER);
      const granted = previous?.scopes ?? [];
      if (openBrowser) {
        try { await launchBrowser(`${ORIGIN}/connect`); } catch { throw new TwitchFault("TWITCH_BROWSER_OPEN_FAILED"); }
      }
      return {
        browserRequested: openBrowser, mode: "live", connectUrl: `${ORIGIN}/connect`, callbackUrl,
        ...twitchPermissions(granted), requestedScopes: requestedTwitchScopes(granted),
        retainedScopes: granted.filter(scope => !requiredTwitchScopes.includes(scope)),
        disclosure: twitchConsentDisclosure, grantSource: "stored",
      };
    },
    approvalUrl(id: string) { listen(); return `${ORIGIN}/approve?id=${encodeURIComponent(id)}`; },
    close() { clearTimeout(idle); server?.stop(true); server = undefined; store.close(); },
  };
}
export type LocalTwitchRuntime = NonNullable<ReturnType<typeof createLocalTwitchRuntime>>;
