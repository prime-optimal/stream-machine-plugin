import { IgdbClient } from "./client";
import { GameFault } from "./http";
import { decimalId, TwitchGameClient, type AppCredentials } from "./twitch-games";
export class GameLookupService {
  private twitch: TwitchGameClient;
  private igdb: IgdbClient;
  constructor(credentials: AppCredentials, fetcher: typeof fetch = fetch, private now: () => number = Date.now) {
    this.twitch = new TwitchGameClient(credentials, fetcher, now);
    this.igdb = new IgdbClient(this.twitch, fetcher);
  }
  async lookup(twitchCategoryId: string) {
    if (!decimalId.safeParse(twitchCategoryId).success) throw new GameFault("INVALID_INPUT");
    const category = await this.twitch.category(twitchCategoryId);
    const game = await this.igdb.game(category.igdbId);
    return { ...category, game, sources: { twitch: `https://dev.twitch.tv/docs/api/reference/#get-games`, igdb: game.sourceUrl },
      providers: ["id.twitch.tv", "api.twitch.tv", "api.igdb.com"], retrievedAt: new Date(this.now()).toISOString() };
  }
}
export function createGameLookupService(env: { TWITCH_CLIENT_ID?: string; TWITCH_CLIENT_SECRET?: string } = { TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET }) {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return undefined;
  return new GameLookupService({ clientId: env.TWITCH_CLIENT_ID, clientSecret: env.TWITCH_CLIENT_SECRET });
}
