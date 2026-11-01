import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { z } from "zod";

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error("IGDB_NOT_CONFIGURED");
const gameResult = z.object({
  twitchCategoryId: z.literal("33214"), twitchCategoryName: z.string().min(1), igdbId: z.literal("1905"),
  game: z.object({ name: z.string().min(1), summary: z.string().optional(), releaseDate: z.string().optional(),
    genres: z.array(z.string()), artworkUrl: z.url(), sourceUrl: z.url() }),
  providers: z.array(z.string()), retrievedAt: z.string(),
});
const client = new Client({ name: "game-lookup-verification", version: "1" });
const transport = new StdioClientTransport({
  command: process.execPath, args: [resolve("dist/server.js")], stderr: "pipe",
  env: { PATH: process.env.PATH ?? "", TWITCH_CLIENT_ID: clientId, TWITCH_CLIENT_SECRET: clientSecret },
});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.ok(tools.some(tool => tool.name === "stream_machine_game_lookup"));
  const result = await client.callTool({ name: "stream_machine_game_lookup", arguments: { twitchCategoryId: "33214" } });
  assert.ok(!result.isError, "Lookup failed; inspect sanitized tool error code.");
  const data = z.object({ game: gameResult }).parse(result.structuredContent).game;
  const text = result.content;
  assert.ok(Array.isArray(text));
  assert.ok(JSON.stringify(text).includes(data.game.artworkUrl));
  const proof = { host: "MCP SDK Client over bundled stdio", runtime: Bun.version, toolCount: tools.length, ...data };
  await Bun.write("docs/verification/41-game-lookup.json", JSON.stringify(proof, null, 2) + "\n");
  process.stdout.write(JSON.stringify(proof) + "\n");
} finally { await client.close(); }
