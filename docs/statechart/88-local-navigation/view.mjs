export const title = "Local navigation and explicit Twitch checks";
const labels = {
  unchecked: "Access not checked", checking: "Check Twitch access", authorization: "Authorization URL available",
  verified: "Authenticated account and all 12 grants verified", missing: "Authenticated account, missing grants", failed: "Check failed",
};
export const state = v => labels[v.phase];
export const step = action => ({
  Navigate: "select a section without a provider call", Check: "explicitly recheck access",
  Reconnect: "explicitly request a connection URL", CurrentRead: "current authenticated read returns",
  ReadFails: "current read fails", StaleRead: "ignore a read from before reconnect", Done: "bounded run ends",
})[action] ?? action;
