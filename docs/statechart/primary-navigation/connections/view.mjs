export const title = "Connections: verify access and resume the task";
const labels = {
  overview: "Connections overview", selected: "Provider needs a check", setup: "Follow setup or authorization",
  checking: "Check the required capability", ready: "Connection verified", failed: "Check failed",
  paused: "Setup paused", unsupported: "Unavailable in this host", returned: "Return to the chosen task",
};
export const state = (v) => labels[v.phase];
export const step = (action, from) => ({
  ChooseProvider: "choose a provider", OpenSetup: "open or resume setup",
  CheckExisting: "check connection [saved setup exists]", HostUnsupported: "host cannot reach this provider",
  SetupReturns: "save setup or return from authorization", ReadSucceeds: "authenticated capability read succeeds",
  ReadFails: "check fails or access is insufficient", Cancel: "pause setup",
  AccessRevoked: "access expires or is revoked",
  ReturnToTask: from.phase === "ready" ? "resume with verified access" : "return with setup still needed",
  Done: "task owns the next step",
})[action] ?? action;
