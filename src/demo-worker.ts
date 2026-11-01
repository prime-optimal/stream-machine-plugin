import { createLocalTwitchRuntime } from "./auth/local-runtime";
import { obsPreflight, obsShowAlert } from "./adapters/obs/register";
import { createTwitchEventSource } from "./events/eventsub";
import type { WorkerDependencies } from "./worker/contracts";

export async function createWorkerDependencies(): Promise<WorkerDependencies> {
  const runtime = createLocalTwitchRuntime();
  if (!runtime) throw new Error("Twitch credentials are not configured through fnox.");
  const account = await runtime.accounts.withAccount(async ({ account }) => ({ userId: account.id, login: account.login }));
  const source = createTwitchEventSource({
    account,
    subscribe: async (request, { signal }) => runtime.accounts.withAccount(async ({ clientId, accessToken }) => {
      const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      });
      if (!response.ok) throw new Error(`EventSub subscription rejected (${response.status}).`);
    }),
  });
  return {
    source,
    preflight: async () => { await obsPreflight(); },
    showAlert: async ({ text, replay }) => obsShowAlert({ text, replay }),
  };
}
