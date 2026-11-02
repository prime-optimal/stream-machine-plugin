const labels = {
  idle: "Not checked",
  probeOnly: "Checking callback port",
  probeForConnect: "Checking callback port for authorization",
  ready: "Callback port available",
  readyToBind: "Ready to start authorization",
  binding: "Starting callback listener",
  launching: "Requesting authorization browser",
  linkReady: "Chat authorization link ready",
  browserRequested: "Browser requested, access not verified",
  browserFailed: "Browser could not be opened",
  linkStale: "Chat link ready, listener stopped after idle",
  requestedStale: "Browser requested, listener stopped after idle",
  failedStale: "Browser could not be opened, listener stopped after idle",
  portBusyPlugin: "Port held by another Stream Machine chat",
  portBusyForeign: "Port in use by another app",
  replaceStart: "Replace approved, starting listener",
  stopping: "Waiting for the other chat to release the port",
  checking: "Checking Twitch access",
  verified: "Account verified by explicit check",
  checkFailed: "Access not verified",
};
export const title = "Twitch authorization checks, approved replace, and idle release";
export function state(value) {
  if (value.phase === "replaceFailed") {
    return value.signals > 0 ? "Other chat did not release the port" : "Replace refused, nothing stopped";
  }
  return labels[value.phase];
}
const waiting = new Set(["idle", "ready", "portBusyPlugin", "portBusyForeign"]);
export function step(action, from, to) {
  const busy = to.phase === "portBusyPlugin" ? "a Stream Machine chat" : "another app";
  const labels = {
    OnboardingCheck: "onboarding checks the port",
    UIClick: "you choose Connect in the plugin",
    ChatConnect: from.phase === "idle" ? "chat requests a link without opening it" : null,
    ProbeReady: "port is available or owned by this session",
    ProbeBusy: `${busy} holds the port`,
    BindBusy: `${busy} holds the port at bind`,
    ApproveReplace: from.phase === "portBusyPlugin" ? "you approve stopping the other chat" : "chat sets the replace flag after you approve",
    ReplaceBindsFree: "the port is free, so no one is stopped",
    SendTerm: "the plugin sends one stop signal to the Stream Machine process",
    RefuseForeign: "the holder is not Stream Machine, so nothing is stopped",
    PluginExits: null,
    RetryBinds: "the freed port is bound within 5 seconds",
    RetryWaits: null,
    RetryGivesUp: "5 seconds pass and the port is still held",
    HolderChanges: "the other chat leaves or an app takes the port",
    IdleRelease: "10 minutes pass with no request",
    BrowserOpens: "desktop accepts the browser request",
    BrowserFails: "desktop rejects or times out",
    BeginBind: "the plugin requests authorization",
    BindReady: "the session owns the callback listener",
    Recheck: waiting.has(from.phase) ? null : "you recheck Twitch access",
    ReadSucceeds: "authenticated read succeeds",
    ReadFails: "authenticated read fails",
    WaitForUser: null,
  };
  if (action === "OtherProcessClaimsPort") return null;
  return action in labels ? labels[action] : action;
}
