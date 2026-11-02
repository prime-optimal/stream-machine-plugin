import type { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GameFault } from "./http";
import { createGameLookupService, type GameLookupService } from "./service";
import { decimalId } from "./twitch-games";
export function registerGameTools(server: McpServer, service?: GameLookupService) {
  let resolved = service;
  server.registerTool("stream_machine_game_lookup", {
    description: "Read a Twitch category's IGDB mapping, game details, and artwork reference directly from Twitch and IGDB. No streamer OAuth or mock fallback.",
    inputSchema: z.object({ twitchCategoryId: decimalId }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  }, async ({ twitchCategoryId }): Promise<CallToolResult> => {
    try {
      resolved ??= createGameLookupService();
      if (!resolved) throw new GameFault("IGDB_NOT_CONFIGURED");
      const game = await resolved.lookup(twitchCategoryId);
      return { content: [{ type: "text", text: JSON.stringify(game) }], structuredContent: { game } };
    } catch (error) {
      const code = error instanceof GameFault ? error.code : "GAME_PROVIDER_UNAVAILABLE";
      return { isError: true, content: [{ type: "text", text: code }], structuredContent: { error: { code } } };
    }
  });
}
