import { z } from "zod";
import { GameFault, request } from "./http";
export const decimalId = z.string().regex(/^[1-9][0-9]{0,19}$/);
export type AppCredentials = { clientId: string; clientSecret: string };
const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().int().positive(), token_type: z.literal("bearer") });
const categorySchema = z.object({ data: z.array(z.object({ id: decimalId, name: z.string().min(1), igdb_id: z.string() })).max(1) });
export class TwitchGameClient {
  private cached?: { token: string; expiresAt: number };
  private pending?: Promise<string>;
  constructor(private credentials: AppCredentials, private fetcher: typeof fetch = fetch, private now: () => number = Date.now) {}
  private async acquire() {
    const value = await request(this.fetcher, "https://id.twitch.tv/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.credentials.clientId, client_secret: this.credentials.clientSecret, grant_type: "client_credentials" }).toString(),
    });
    const parsed = tokenSchema.safeParse(value);
    if (!parsed.success) throw new GameFault("GAME_INVALID_RESPONSE");
    this.cached = { token: parsed.data.access_token, expiresAt: this.now() + parsed.data.expires_in * 1000 };
    return parsed.data.access_token;
  }
  private async token() {
    if (this.cached && this.cached.expiresAt > this.now() + 60000) return this.cached.token;
    this.pending ??= this.acquire();
    try { return await this.pending; } finally { this.pending = undefined; }
  }
  async withToken<T>(read: (access: { clientId: string; token: string }) => Promise<T>): Promise<T> {
    const token = await this.token();
    try { return await read({ clientId: this.credentials.clientId, token }); }
    catch (error) {
      if (!(error instanceof GameFault) || error.code !== "GAME_AUTH_REQUIRED") throw error;
      if (this.cached?.token === token) this.cached = undefined;
      const renewed = await this.token();
      return read({ clientId: this.credentials.clientId, token: renewed });
    }
  }
  async category(id: string) {
    if (!decimalId.safeParse(id).success) throw new GameFault("INVALID_INPUT");
    const value = await this.withToken(access => request(this.fetcher, `https://api.twitch.tv/helix/games?id=${id}`, {
      headers: { "Client-Id": access.clientId, Authorization: `Bearer ${access.token}` },
    }));
    const parsed = categorySchema.safeParse(value);
    if (!parsed.success) throw new GameFault("GAME_INVALID_RESPONSE");
    const category = parsed.data.data[0];
    if (!category) throw new GameFault("TWITCH_CATEGORY_NOT_FOUND");
    if (category.id !== id) throw new GameFault("GAME_INVALID_RESPONSE");
    if (!decimalId.safeParse(category.igdb_id).success) throw new GameFault("IGDB_MAPPING_UNAVAILABLE");
    return { twitchCategoryId: category.id, twitchCategoryName: category.name, igdbId: category.igdb_id };
  }
}
