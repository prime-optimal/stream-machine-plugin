import { z } from "zod";
import { requiredTwitchScopes, twitchPermissions } from "../auth/permissions";
import { siteOrigin as defaultSiteOrigin } from "../site";
import type { Runtime } from "./navigation";
import type { ToolRequest, ToolResult } from "./tool-transport";
import twitchConnectImage from "./twitch_login.png";

const accountSchema = z.object({
  id: z.string().min(1), login: z.string().min(1), displayName: z.string().min(1), scopes: z.array(z.string()),
});
const statusSchema = z.object({ twitch: z.object({ mode: z.literal("live"), account: accountSchema }) });
const connectSchema = z.object({
  twitch: z.object({
    mode: z.literal("live"), connectUrl: z.string(), requestedScopes: z.array(z.string()),
    retainedScopes: z.array(z.string()), disclosure: z.string().min(1), browserRequested: z.boolean().default(false),
  })
});
const hostedConnectSchema = z.object({
  twitch: z.object({
    mode: z.literal("live"), connectionUrl: z.string(), authorizationUrl: z.string(), browserRequested: z.boolean().default(false),
    disclosure: z.string().min(1), requiredScopes: z.array(z.string()), grantedScopes: z.array(z.string()),
  })
});
const preflightSchema = z.object({ twitch: z.object({ mode: z.literal("live"), status: z.literal("ready") }) });
const faultSchema = z.object({ error: z.object({ code: z.string() }) });
type Verified = { account: z.infer<typeof accountSchema>; checkedAt: string };
export type CheckState =
  | { kind: "not_checked" } | { kind: "checking"; previous: Verified | null }
  | { kind: "verified"; value: Verified } | { kind: "failed"; message: string; previous: Verified | null };
export type ConnectState =
  | { kind: "idle" } | { kind: "creating" }
  | { kind: "link"; url: string; browserRequested: boolean }
  | { kind: "failed"; message: string; replaceable: boolean };
export const localConnectUrl = "http://localhost:4017/connect";
export function hostedConnectUrl(siteOrigin: string): string {
  return `${siteOrigin}/connect`;
}
export function connectionUrl(value: string, allowed: string, ownerParam = false): string {
  const url = new URL(value);
  const target = new URL(allowed);
  const owner = ownerParam && [...url.searchParams.keys()].join() === "owner" && url.searchParams.get("owner");
  if (url.origin !== target.origin || url.pathname !== target.pathname ||
    url.username || url.password || (url.search && !owner) || url.hash) throw new Error("Unsafe connection URL rejected.");
  return url.href;
}
function fault(result: ToolResult) {
  const parsed = faultSchema.safeParse(result.structuredContent);
  if (parsed.success) throw new Error(parsed.data.error.code);
  if (result.isError) throw new Error("TWITCH_UNAVAILABLE");
}
export type ConnectionContext = { runtime: Runtime; siteOrigin: string };
const localContext = (): ConnectionContext => ({ runtime: "local", siteOrigin: defaultSiteOrigin });
export function createConnectionState(request: ToolRequest, changed: () => void, invalidateTitle: () => void, context: () => ConnectionContext = localContext) {
  let check: CheckState = { kind: "not_checked" };
  let connect: ConnectState = { kind: "idle" };
  let revision = 0;
  let disposed = false;
  let previous: Verified | null = null;
  function notify() { if (!disposed) changed(); }
  return {
    state: () => ({ check, connect }),
    async recheck() {
      if (disposed || connect.kind === "creating") return;
      const attempt = ++revision;
      check = { kind: "checking", previous }; notify();
      try {
        const result = await request("stream_machine_twitch_status");
        if (disposed || revision !== attempt) return;
        fault(result);
        const { twitch } = statusSchema.parse(result.structuredContent);
        if (previous && previous.account.id !== twitch.account.id) invalidateTitle();
        previous = { account: twitch.account, checkedAt: new Date().toISOString() };
        check = { kind: "verified", value: previous };
      } catch {
        if (disposed || revision !== attempt) return;
        check = { kind: "failed", message: "Couldn't check your Twitch connection. Try again, or reconnect.", previous };
      }
      notify();
    },
    async startConnect(openBrowser = false, replacePluginListener = false) {
      if (disposed || connect.kind === "creating") return;
      const attempt = ++revision;
      invalidateTitle(); check = { kind: "not_checked" }; previous = null;
      connect = { kind: "creating" }; notify();
      try {
        const where = context();
        if (where.runtime === "hosted") {
          const hostedResult = await request("stream_machine_twitch_connect");
          if (disposed || revision !== attempt) return;
          fault(hostedResult);
          const { twitch } = hostedConnectSchema.parse(hostedResult.structuredContent);
          if (!requiredTwitchScopes.every(scope => twitch.requiredScopes.includes(scope))) throw new Error("Incomplete consent response.");
          const allowed = hostedConnectUrl(where.siteOrigin);
          connectionUrl(twitch.authorizationUrl, allowed, true);
          connect = { kind: "link", browserRequested: false, url: connectionUrl(twitch.connectionUrl, allowed, true) };
          notify();
          return;
        }
        if (openBrowser && !replacePluginListener) {
          const preflight = await request("stream_machine_twitch_preflight");
          if (disposed || revision !== attempt) return;
          fault(preflight); preflightSchema.parse(preflight.structuredContent);
        }
        const result = await request("stream_machine_twitch_connect", openBrowser ? { openBrowser: true, ...(replacePluginListener && { replacePluginListener: true }) } : undefined);
        if (disposed || revision !== attempt) return;
        fault(result);
        const { twitch } = connectSchema.parse(result.structuredContent);
        if (!requiredTwitchScopes.every(scope => twitch.requestedScopes.includes(scope))) throw new Error("Incomplete consent response.");
        if (openBrowser && !twitch.browserRequested) throw new Error("TWITCH_BROWSER_OPEN_FAILED");
        connect = { kind: "link", browserRequested: twitch.browserRequested, url: connectionUrl(twitch.connectUrl, localConnectUrl) };
      } catch (error) {
        if (disposed || revision !== attempt) return;
        const code = error instanceof Error ? error.message : "";
        const message = code === "TWITCH_LOCAL_PORT_PLUGIN" ? "Another Stream Machine chat is using port 4017. Close that chat, or stop it and connect here. Stopping it turns off Stream Machine in that chat." :
          code === "TWITCH_LOCAL_PORT_BUSY" ? "Another app is using port 4017. Close it, then try again." :
            code === "TWITCH_BROWSER_OPEN_FAILED" ? "Couldn't open your browser. Check your default browser, then try again." :
              context().runtime === "hosted" ? "Couldn't reach the Stream Machine Site. Try again, or reopen Stream Machine." :
                "Couldn't start the Twitch connection. Check your local Twitch setup, then try again.";
        connect = { kind: "failed", message, replaceable: code === "TWITCH_LOCAL_PORT_PLUGIN" };
      }
      notify();
    },
    dispose() { disposed = true; revision++; },
  };
}
export function createConnections(options: {
  request: ToolRequest; invalidateTitle: () => void; openLink: (url: string) => void; context: () => ConnectionContext;
  onVerified?: (account: { id: string; displayName: string }) => void;
}) {
  const element = document.createElement("div"); element.className = "connections-panel";
  let announced = "";
  function changed() {
    render();
    const { check } = model.state();
    if (check.kind !== "verified" || check.value.checkedAt === announced) return;
    announced = check.value.checkedAt;
    options.onVerified?.(check.value.account);
  }
  const model = createConnectionState(options.request, changed, options.invalidateTitle, options.context);
  let fallbackOpen = false;
  let returnFocus: string | null = null;
  function node<K extends keyof HTMLElementTagNameMap>(tag: K, text: string) {
    const child = document.createElement(tag); child.textContent = text; return child;
  }
  function action(label: string, run: () => void, disabled = false) {
    const button = node("button", label); button.type = "button"; button.className = "live-button";
    button.dataset.action = label; button.disabled = disabled; button.addEventListener("click", run); return button;
  }
  function twitchConnect(run: () => void, disabled: boolean) {
    const button = action("", run, disabled); button.className = "twitch-connect-button"; button.dataset.action = "twitch-connect";
    const image = node("img", ""); image.src = twitchConnectImage; image.alt = "Connect with Twitch"; image.width = 170; image.height = 32;
    button.append(image); return button;
  }
  function siteLink(label: string, href: string) {
    const link = node("a", label); link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; link.className = "site-link";
    link.addEventListener("click", event => { event.preventDefault(); options.openLink(href); });
    return link;
  }
  async function connectHosted() {
    await model.startConnect();
    const { connect } = model.state();
    if (connect.kind === "link") options.openLink(connect.url);
  }
  function render() {
    const { check, connect } = model.state();
    const { runtime } = options.context();
    const hosted = runtime === "hosted";
    const ownedFocus = element.contains(document.activeElement);
    if (!ownedFocus) returnFocus = null;
    else if (document.activeElement instanceof HTMLButtonElement) returnFocus = document.activeElement.dataset.action ?? null;
    element.replaceChildren();
    element.append(node("h2", "Twitch"));
    const body = hosted ? element : node("div", "");
    if (!hosted) {
      element.append(node("p", "Connect Twitch from the Stream Machine menu in ChatGPT."));
      const fallback = node("details", ""); fallback.className = "fallback"; fallback.open = fallbackOpen;
      fallback.addEventListener("toggle", () => { fallbackOpen = fallback.open; });
      fallback.append(node("summary", "Connect on this computer instead"),
        node("p", "Use this only if the Stream Machine Site is down. The connection is stored on this computer."), body);
      element.append(fallback);
    }
    const status = node("div", ""); status.tabIndex = -1;
    status.className = "live-result"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    status.textContent = check.kind === "not_checked" ? "Not checked" : check.kind === "checking" ? "Checking…" :
      check.kind === "failed" ? check.message : `Connected as ${check.value.account.displayName} (@${check.value.account.login})`;
    if (check.kind === "verified" && twitchPermissions(check.value.account.scopes).missingScopes.length) {
      status.append(node("p", "Some permissions are missing. Reconnect to grant them."));
    }
    body.append(status,
      action("Check connection", () => void model.recheck(), check.kind === "checking" || connect.kind === "creating"),
      twitchConnect(() => void (hosted ? connectHosted() : model.startConnect(true)), connect.kind === "creating"));
    if (connect.kind === "creating") body.append(node("p", "Connecting…"));
    if (connect.kind === "failed") {
      body.append(node("p", connect.message));
      if (connect.replaceable) body.append(action("Stop the other chat and connect", () => void model.startConnect(true, true)));
    }
    if (connect.kind === "link") {
      body.append(node("p", "Finish connecting in your browser, then come back and check the connection."));
      if (hosted) body.append(siteLink("Reopen the connection page", connect.url));
    }
    if (ownedFocus) {
      const target = Array.from(element.querySelectorAll("button")).find(button => button.dataset.action === returnFocus);
      if (target && !target.disabled) target.focus();
      else status.focus();
    }
  }
  render();
  return { element, dispose: model.dispose, refresh: render };
}
