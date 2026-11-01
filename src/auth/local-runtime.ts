import { homedir } from "node:os";
import { join } from "node:path";
import { LocalConnectionStore } from "./local-store";
import { TwitchClient, TwitchError } from "./upstream/client";
import { TwitchService } from "./upstream/service";
import { TwitchFault, type TwitchAccountProvider } from "./twitch";
import { TwitchTitleService } from "../adapters/twitch/service";
import { TwitchChannelClient } from "../adapters/twitch/client";
const OWNER = "local-desktop-owner";
export const TWITCH_CALLBACK = "http://localhost:4017/api/twitch/callback";
const htmlEscape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function createLocalTwitchRuntime(environment: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch, port = 4017) {
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
  let server: ReturnType<typeof Bun.serve> | undefined;
  const response = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'", ...headers } });
  function listen() {
    if (server) return;
    server = Bun.serve({ hostname: "127.0.0.1", port, async fetch(request) {
      const url = new URL(request.url);
      if (request.headers.get("host") !== `localhost:${port}`) return response("Invalid host", 403);
      try {
        if (url.pathname === "/connect" && request.method === "GET") {
          titles.clear();
          const started = await oauth.begin(OWNER, false, url.searchParams.get("manage") === "1");
          return response("", 302, { Location: started.url, "Set-Cookie": `sm_twitch_state=${started.state}; HttpOnly; SameSite=Lax; Path=/api/twitch; Max-Age=600` });
        }
        if (url.pathname === "/api/twitch/callback" && request.method === "GET") {
          const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("sm_twitch_state="))?.slice(16) ?? null;
          await oauth.complete(OWNER, url.searchParams.get("state") ?? "", cookie, url.searchParams.get("code"), url.searchParams.get("error"));
          return response("", 302, { Location: `${ORIGIN}/connected`, "Set-Cookie": "sm_twitch_state=; HttpOnly; SameSite=Lax; Path=/api/twitch; Max-Age=0" });
        }
        if (url.pathname === "/connected" && request.method === "GET") return response("<h1>Twitch connected</h1><p>Return to Stream Machine. No channel changes made.</p>");
        if (url.pathname === "/approve") {
          const id = url.searchParams.get("id") ?? "";
          if (request.method === "POST") {
            if (request.headers.get("origin") !== ORIGIN || !request.headers.get("cookie")?.split(";").some(c => c.trim() === `sm_approval=${approvalSession}`)) return response("Approval rejected", 403);
            titles.approve(id);
            return response("<h1>Title approved</h1><p>Return to Stream Machine to apply this exact preview.</p>");
          }
          if (request.method !== "GET") return response("Method rejected", 405);
          const p = titles.approvalDetails(id);
          return response(`<h1>Approve Twitch title</h1><p>Account: ${htmlEscape(p.account)}</p><p>Current: ${htmlEscape(p.before)}</p><p>Proposed: ${htmlEscape(p.after)}</p><form method="post"><button type="submit">Approve exact title change</button></form>`, 200, { "Set-Cookie": `sm_approval=${approvalSession}; HttpOnly; SameSite=Strict; Path=/approve; Max-Age=300` });
        }
        return response("Not found", 404);
      } catch { return response("Twitch request failed. Return to Stream Machine and try a fresh connection or preview.", 400); }
    } });
    server.unref();
  }
  return { accounts, titles, connect(manage = false) { listen(); return { mode: "live", connectUrl: `${ORIGIN}/connect${manage ? "?manage=1" : ""}`, callbackUrl, requiredScope: manage ? "channel:manage:broadcast" : "profile" }; }, approvalUrl(id: string) { listen(); return `${ORIGIN}/approve?id=${encodeURIComponent(id)}`; }, close() { server?.stop(true); store.close(); } };
}
export type LocalTwitchRuntime = NonNullable<ReturnType<typeof createLocalTwitchRuntime>>;
