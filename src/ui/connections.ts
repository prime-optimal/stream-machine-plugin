import { z } from "zod";
import { requiredTwitchScopes, twitchConsentSummary, twitchPermissions } from "../auth/permissions";
import { siteOrigin as defaultSiteOrigin } from "../site";
import type { Runtime } from "./navigation";
import type { ToolRequest, ToolResult } from "./tool-transport";
import twitchConnectImage from "./twitch_login.png";

const accountSchema = z.object({
  id: z.string().min(1), login: z.string().min(1), displayName: z.string().min(1), scopes: z.array(z.string()),
});
const statusSchema = z.object({ twitch: z.object({ mode: z.literal("live"), account: accountSchema }) });
const connectSchema = z.object({ twitch: z.object({
  mode: z.literal("live"), connectUrl: z.string(), requestedScopes: z.array(z.string()),
  retainedScopes: z.array(z.string()), disclosure: z.string().min(1), browserRequested: z.boolean().default(false),
}) });
const hostedConnectSchema = z.object({ twitch: z.object({
  mode: z.literal("live"), connectionUrl: z.string(), authorizationUrl: z.string(), browserRequested: z.boolean().default(false),
  disclosure: z.string().min(1), requiredScopes: z.array(z.string()), grantedScopes: z.array(z.string()),
}) });
const preflightSchema = z.object({ twitch: z.object({ mode: z.literal("live"), status: z.literal("ready") }) });
const faultSchema = z.object({ error: z.object({ code: z.string() }) });
type Verified = { account: z.infer<typeof accountSchema>; checkedAt: string };
export type CheckState =
  | { kind: "not_checked" } | { kind: "checking"; previous: Verified | null }
  | { kind: "verified"; value: Verified } | { kind: "failed"; message: string; previous: Verified | null };
export type ConnectState =
  | { kind: "idle" } | { kind: "creating" }
  | { kind: "link"; url: string; requested: string[]; retained: string[]; disclosure: string; browserRequested: boolean }
  | { kind: "failed"; message: string; replaceable: boolean };
export const localConnectUrl = "http://localhost:4017/connect";
export function hostedConnectUrl(siteOrigin: string): string {
  return `${siteOrigin}/`;
}
export function connectionUrl(value: string, allowed: string): string {
  const url = new URL(value);
  const target = new URL(allowed);
  if (url.origin !== target.origin || url.pathname !== target.pathname ||
      url.username || url.password || url.search || url.hash) throw new Error("Unsafe connection URL rejected.");
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
        check = { kind: "failed", message: "Access not verified. Twitch may be unavailable or setup may be needed. Recheck or reconnect.", previous };
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
          connectionUrl(twitch.authorizationUrl, allowed);
          connect = { kind: "link", browserRequested: false, url: connectionUrl(twitch.connectionUrl, allowed), requested: twitch.requiredScopes,
            retained: twitch.grantedScopes.filter(scope => !requiredTwitchScopes.includes(scope)), disclosure: twitch.disclosure };
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
        connect = { kind: "link", browserRequested: twitch.browserRequested, url: connectionUrl(twitch.connectUrl, localConnectUrl), requested: twitch.requestedScopes,
          retained: twitch.retainedScopes, disclosure: twitch.disclosure };
      } catch (error) {
        if (disposed || revision !== attempt) return;
        const code = error instanceof Error ? error.message : "";
        const message = code === "TWITCH_LOCAL_PORT_PLUGIN" ? "Another Stream Machine chat is holding Twitch authorization port 4017. Close that chat, or stop it and connect here. Stopping it ends that chat's Stream Machine tools until its host restarts them." :
          code === "TWITCH_LOCAL_PORT_BUSY" ? "Twitch authorization port 4017 is in use by another app. Close that app, then try again." :
            code === "TWITCH_BROWSER_OPEN_FAILED" ? "The authorization browser could not be opened. Check your default browser, then try again. No automatic retry." :
              context().runtime === "hosted" ? "The Site connection is unavailable. Try again, or reopen Stream Machine." :
              "Connection URL unavailable. Check local Twitch setup before trying again.";
        connect = { kind: "failed", message, replaceable: code === "TWITCH_LOCAL_PORT_PLUGIN" };
      }
      notify();
    },
    dispose() { disposed = true; revision++; },
  };
}
export function createConnections(options: {
  request: ToolRequest; invalidateTitle: () => void; openLink: (url: string) => void; context: () => ConnectionContext;
}) {
  const element = document.createElement("div"); element.className = "connections-panel";
  const model = createConnectionState(options.request, render, options.invalidateTitle, options.context);
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
    const { runtime, siteOrigin } = options.context();
    const hosted = runtime === "hosted";
    const site = hostedConnectUrl(siteOrigin);
    const ownedFocus = element.contains(document.activeElement);
    if (!ownedFocus) returnFocus = null;
    else if (document.activeElement instanceof HTMLButtonElement) returnFocus = document.activeElement.dataset.action ?? null;
    element.replaceChildren();
    element.append(node("h2", "Twitch"));
    const body = hosted ? element : node("div", "");
    if (hosted) body.append(node("p", "Twitch runs on the hosted Stream Machine connection. Connect opens the Stream Machine Site, where you approve the permissions. Then return here and check access."));
    else {
      element.append(node("p", "Connect Twitch on the Stream Machine Site. The Site connection is hosted, so its status appears in the hosted Stream Machine menu, not in this desktop workspace."),
        siteLink("Open the Stream Machine Site", site));
      const fallback = node("details", ""); fallback.className = "fallback"; fallback.open = fallbackOpen;
      fallback.addEventListener("toggle", () => { fallbackOpen = fallback.open; });
      fallback.append(node("summary", "Use desktop fallback"),
        node("p", "Use this only if the hosted Site is unavailable. It runs Twitch authorization on this computer through port 4017 and stores the connection locally."), body);
      element.append(fallback);
    }
    const status = node("div", ""); status.tabIndex = -1;
    status.className = "live-result"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const value = check.kind === "verified" ? check.value : check.kind === "failed" || check.kind === "checking" ? check.previous : null;
    status.textContent = check.kind === "not_checked" ? "Not checked" : check.kind === "checking" ? "Checking access…" :
      check.kind === "failed" ? check.message : "Account verified by explicit check.";
    if (value) {
      const permissions = twitchPermissions(value.account.scopes);
      status.append(node("p", `${value.account.displayName} (@${value.account.login})`),
        node("p", `Last successful check: ${value.checkedAt}`));
      if (check.kind !== "verified") status.append(node("p", "Stale. Previous check does not establish current access."));
      status.append(node("p", permissions.missingScopes.length ?
        `${permissions.missingScopes.length} required permissions missing. Reconnect to request them, or expand permission details.` :
        "All 12 required permissions present. Each live action still requires its own checks and approval."));
    }
    body.append(status,
      action("Recheck Twitch access", () => void model.recheck(), check.kind === "checking" || connect.kind === "creating"),
      twitchConnect(() => void (hosted ? connectHosted() : model.startConnect(true)), connect.kind === "creating"));
    const disclosure = node("details", "");
    disclosure.append(node("summary", "Consent and exact required permissions"), node("p", twitchConsentSummary),
      node("p", "Existing grants are retained. Consent makes no channel change."), node("pre", requiredTwitchScopes.join("\n")));
    if (value) {
      const permissions = twitchPermissions(value.account.scopes);
      disclosure.append(node("p", `Granted: ${permissions.grantedScopes.join(", ") || "None"}`),
        node("p", `Missing: ${permissions.missingScopes.join(", ") || "None"}`));
    }
    body.append(disclosure);
    if (connect.kind === "creating") body.append(node("p", "Creating connection URL…"));
    if (connect.kind === "failed") {
      body.append(node("p", connect.message));
      if (connect.replaceable) body.append(action("Stop the other chat and connect", () => void model.startConnect(true, true)));
    }
    if (connect.kind === "link") {
      body.append(node("p", hosted ? "Opened the Stream Machine Site. Approve permissions there, then return and recheck Twitch access." :
        connect.browserRequested ? "Browser requested. Approve permissions in your browser, then return and recheck Twitch access." :
          "Connection ready. Select Connect with Twitch to open authorization, then return and recheck Twitch access."));
      if (hosted) body.append(siteLink("Open the Stream Machine Site again", connect.url));
      disclosure.append(node("p", connect.disclosure), node("p", `Requested: ${connect.requested.join(", ")}`),
        node("p", `Retained extra grants: ${connect.retained.join(", ") || "None"}`));
    }
    element.append(node("p", "Other connections are not available here yet."));
    if (ownedFocus) {
      const target = Array.from(element.querySelectorAll("button")).find(button => button.dataset.action === returnFocus);
      if (target && !target.disabled) target.focus();
      else status.focus();
    }
  }
  render();
  return { element, dispose: model.dispose, refresh: render };
}
