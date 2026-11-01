import { createConnections } from "../../../src/ui/connections";
import { requiredTwitchScopes, twitchConsentDisclosure } from "../../../src/auth/permissions";
const view = createConnections({
  request: async () => ({ structuredContent: { twitch: { mode: "live", connectUrl: "http://localhost:4017/connect",
    requestedScopes: requiredTwitchScopes, retainedScopes: [], disclosure: twitchConsentDisclosure } } }),
  invalidateTitle: () => {},
  open: async () => ({ isError: true }),
});
document.querySelector("#fixture")?.append(view.element);
