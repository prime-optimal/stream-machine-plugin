import { createLiveDemos } from "../../../src/ui/live-demos";
import { requestedTwitchScopes, twitchPermissions, twitchConsentDisclosure } from "../../../src/auth/permissions";
import type { ToolRequest } from "../../../src/ui/tool-transport";

const granted = ["channel:manage:broadcast"];
const calls: string[] = [];
document.body.dataset.mockCalls = "[]";
document.body.dataset.errors = "[]";
function recordError(value: string) {
  const previous: unknown = JSON.parse(document.body.dataset.errors ?? "[]");
  const errors = Array.isArray(previous) ? previous.filter((item): item is string => typeof item === "string") : [];
  document.body.dataset.errors = JSON.stringify([...errors, value]);
}
window.addEventListener("error", event => recordError(event.message));
window.addEventListener("unhandledrejection", () => recordError("Unhandled promise rejection"));
const request: ToolRequest = async name => {
  calls.push(name);
  document.body.dataset.mockCalls = JSON.stringify(calls);
  const permissions = twitchPermissions(granted);
  if (name === "stream_machine_twitch_status") return { structuredContent: { twitch: {
    mode: "mock", account: { id: "mock-broadcaster", login: "mock_creator", displayName: "Mock creator", scopes: granted },
    ...permissions,
  } } };
  if (name === "stream_machine_twitch_connect") return { structuredContent: { twitch: {
    mode: "mock", ...permissions, requestedScopes: requestedTwitchScopes(granted),
    retainedScopes: [], disclosure: twitchConsentDisclosure, grantSource: "mock stored grants",
    connectUrl: "http://127.0.0.1:48383/mock-consent-do-not-open",
  } } };
  throw new Error("This proof allows only mock status and connect calls");
};
document.body.append(createLiveDemos(request));
