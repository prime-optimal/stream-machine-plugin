import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { resolve, dirname } from "node:path";
import { z } from "zod";

const client = new Client({ name: "stream-machine-smoke", version: "0.1.0" });
const serverPath = process.argv[2] ?? resolve(import.meta.dir, "../dist/server.js");
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: dirname(serverPath), stderr: "pipe" });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 36);
  assert.ok(tools.some(tool => tool.name === "stream_machine_transcribe_audio" && tool.annotations?.readOnlyHint === false));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_clip"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_preflight" && tool.annotations?.readOnlyHint));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_download_clip"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_game_lookup"));
  assert.equal((await client.callTool({ name: "stream_machine_game_lookup", arguments: { twitchCategoryId: "invalid" } })).isError, true);
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_profile" && tool.annotations?.readOnlyHint));
  assert.ok(tools.some(tool => tool.name === "stream_machine_obs_show_alert"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_apply_title"));
  assert.ok(!tools.some(tool => /start_broadcast|stop_broadcast/.test(tool.name)));
  assert.ok(tools.some(tool => tool.name === "stream_machine_streaming_metric"));
  const metric = await client.callTool({
    name: "stream_machine_streaming_metric",
    arguments: {
      sourceLabel: "Synthetic stdio smoke report",
      exportedAt: "2026-11-01T12:00:00Z",
      rangeStart: "2026-11-01T10:00:00Z",
      rangeEnd: "2026-11-01T12:00:00Z",
      timezone: "America/Los_Angeles",
      coverage: [{ start: "2026-11-01T10:00:00Z", end: "2026-11-01T11:45:00Z" }],
      sessions: [
        { id: "a", start: "2026-11-01T10:00:00Z", end: "2026-11-01T11:30:00Z" },
        { id: "b", start: "2026-11-01T11:00:00Z", end: "2026-11-01T12:00:00Z" },
      ],
    },
  });
  assert.notEqual(metric.isError, true);
  const calculated = z.object({ metric: z.object({
    seconds: z.literal(6300), hours: z.literal(1.75),
    coveredSeconds: z.literal(6300), gapSeconds: z.literal(900),
    coverageStatus: z.literal("partial"),
    source: z.object({ authenticity: z.literal("User supplied; authenticity not independently verified") }),
    gaps: z.array(z.object({ start: z.string(), end: z.string() })),
  }) }).parse(metric.structuredContent);
  assert.deepEqual(calculated.metric.gaps, [{ start: "2026-11-01T11:45:00.000Z", end: "2026-11-01T12:00:00.000Z" }]);
  const open = await client.callTool({ name: "stream_machine_open", arguments: {} });
  assert.equal((open.structuredContent as { connection: { status: string } }).connection.status, "disconnected");
  const input = { recipeId: "prepare-channel", title: "Friday ranked sets", categoryId: "demo-street-fighter" };
  assert.equal((await client.callTool({ name: "stream_machine_preview", arguments: input })).isError, true);
  await client.callTool({ name: "stream_machine_connect_demo", arguments: {} });
  const preview = await client.callTool({ name: "stream_machine_preview", arguments: input });
  assert.equal((preview.structuredContent as { preview: { executable: boolean } }).preview.executable, false);
  const resources = await client.listResources();
  assert.equal(resources.resources.length, 1);
  const resource = await client.readResource({ uri: resources.resources[0].uri });
  assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
  assert.ok("text" in resource.contents[0] && resource.contents[0].text.includes("Stream Machine"));
  await client.callTool({ name: "stream_machine_reset", arguments: {} });
  assert.equal((await client.callTool({ name: "stream_machine_preview", arguments: input })).isError, true);
  console.log("PASS: 36 tools, 6300-second supplied-report metric, isolated mock lifecycle, UI resource, and explicit real adapters");
} finally { await client.close(); }
