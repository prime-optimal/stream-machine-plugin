export type GameFaultCode = "INVALID_INPUT" | "IGDB_NOT_CONFIGURED" | "GAME_AUTH_REQUIRED" | "GAME_RATE_LIMITED" | "GAME_PROVIDER_UNAVAILABLE" | "GAME_INVALID_RESPONSE" | "TWITCH_CATEGORY_NOT_FOUND" | "IGDB_MAPPING_UNAVAILABLE" | "IGDB_GAME_NOT_FOUND";
export class GameFault extends Error {
  constructor(readonly code: GameFaultCode) { super(code); }
}
export async function request(fetcher: typeof fetch, url: string, init: RequestInit) {
  try {
    const response = await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new GameFault(response.status === 401 ? "GAME_AUTH_REQUIRED" : response.status === 429 ? "GAME_RATE_LIMITED" : "GAME_PROVIDER_UNAVAILABLE");
    const value: unknown = await response.json();
    return value;
  } catch (error) {
    if (error instanceof GameFault) throw error;
    throw new GameFault("GAME_PROVIDER_UNAVAILABLE");
  }
}
