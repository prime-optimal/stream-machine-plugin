import { z } from "zod";
import { GameFault, request } from "./http";
import { decimalId, TwitchGameClient } from "./twitch-games";
const gameSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), name: z.string().min(1),
  summary: z.string().optional(), first_release_date: z.number().int().min(0).max(253402300799).optional(),
  genres: z.array(z.object({ name: z.string().min(1) })).optional(),
  cover: z.object({ image_id: z.string().regex(/^[a-zA-Z0-9_]+$/) }).optional(),
  url: z.url().refine(value => { const url = new URL(value); return url.protocol === "https:" && url.hostname === "www.igdb.com" && !url.username && !url.password && !url.port; }),
});
export class IgdbClient {
  constructor(private app: TwitchGameClient, private fetcher: typeof fetch = fetch) {}
  async game(id: string) {
    if (!decimalId.safeParse(id).success) throw new GameFault("INVALID_INPUT");
    const value = await this.app.withToken(access => request(this.fetcher, "https://api.igdb.com/v4/games", {
      method: "POST", headers: { "Client-ID": access.clientId, Authorization: `Bearer ${access.token}`, "Content-Type": "text/plain" },
      body: `fields name,summary,first_release_date,genres.name,cover.image_id,url; where id = ${id}; limit 1;`,
    }));
    const parsed = z.array(gameSchema).max(1).safeParse(value);
    if (!parsed.success) throw new GameFault("GAME_INVALID_RESPONSE");
    const game = parsed.data[0];
    if (!game) throw new GameFault("IGDB_GAME_NOT_FOUND");
    if (String(game.id) !== id) throw new GameFault("GAME_INVALID_RESPONSE");
    return {
      name: game.name, ...(game.summary === undefined ? {} : { summary: game.summary }),
      ...(game.first_release_date === undefined ? {} : { releaseDate: new Date(game.first_release_date * 1000).toISOString() }),
      genres: game.genres?.map(genre => genre.name) ?? [],
      ...(game.cover ? { artworkUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` } : {}),
      sourceUrl: game.url,
    };
  }
}
