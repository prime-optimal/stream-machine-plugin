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
  portBusy: "Callback port in use",
  checking: "Checking Twitch access",
  verified: "Account verified by explicit check",
  checkFailed: "Access not verified",
};
export const title = "Twitch authorization checks and explicit browser request";
export const state = value => labels[value.phase];
export function step(action, from, to) {
  const labels = {
    OnboardingCheck: "onboarding checks the port",
    UIClick: "you choose Connect in the plugin",
    ChatConnect: "chat requests a link without opening it",
    ProbeReady: "port is available or owned by this session",
    ProbeBusy: "another process owns the port",
    OtherProcessClaimsPort: "another process claims the port after the check",
    BeginBind: "the plugin requests authorization",
    BindReady: "the session owns the callback listener",
    BindBusy: "another process owns the port at bind",
    BrowserOpens: "desktop accepts the browser request",
    BrowserFails: "desktop rejects or times out",
    Recheck: "you recheck Twitch access",
    ReadSucceeds: "authenticated read succeeds",
    ReadFails: "authenticated read fails",
    WaitForUser: null,
  };
  if (action === "OtherProcessClaimsPort") return null;
  return labels[action] ?? action;
}
