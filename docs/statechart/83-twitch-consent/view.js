export const title = "Twitch product consent and retained grants";
const account = v => !v.connected ? "Disconnected" : v.missing.length ? "Connected with missing permissions" : "Connected with product permissions";
export const state = v => {
  if (v.phase === "pending") return "Consent pending";
  if (v.phase === "denied") return `Consent denied, ${account(v).toLowerCase()}`;
  if (v.phase === "incomplete") return `Incomplete grant rejected, ${account(v).toLowerCase()}`;
  return account(v);
};
export const step = (action, from) => {
  if (action === "DenyConsent") return `you deny consent [previously ${account(from).toLowerCase()}]`;
  if (action === "IncompleteGrant") return `Twitch omits a requested permission [previously ${account(from).toLowerCase()}]`;
  return ({
    BeginConsent: "request product permissions plus existing grants",
    AcceptValidatedGrant: "Twitch validates every requested grant",
    ValidateReducedGrant: "status validates current grants",
    Done: "keep current connection",
  })[action] ?? action;
};
export const group = v => v.phase === "pending" ? "pending" : v.connected && !v.missing.length ? "ready" : "attention";
export const colors = { pending: "blue", ready: "teal", attention: "orange" };
