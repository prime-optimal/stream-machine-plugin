import { version } from "../src/version";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { z } from "zod";
import { strict as assert } from "node:assert";

const root = resolve(process.argv[2] ?? "artifacts/package/stream-machine");
const manifest = await Bun.file(`${root}/plugin.json`).json();
const legacy = await Bun.file(`${root}/.codex-plugin/plugin.json`).json();
assert.equal(manifest.version, legacy.version);
assert.deepEqual(manifest.extensions["com.openai"].interface.defaultPrompt, legacy.interface.defaultPrompt);
const launch = z.object({ command: z.string(), args: z.array(z.string()), cwd: z.string() });
const config = z.object({ mcpServers: z.object({ "stream-machine-local": launch }) }).parse(await Bun.file(`${root}/mcp.json`).json());
const selected = config.mcpServers["stream-machine-local"];
const client = new Client({ name: "stream-machine-package-check", version });
try {
  await client.connect(new StdioClientTransport({
    command: selected.command,
    args: selected.args.map(value => value.replaceAll("${PLUGIN_ROOT}", root)),
    cwd: selected.cwd.replaceAll("${PLUGIN_ROOT}", root), stderr: "pipe",
  }), { timeout: 60_000 });
  const { tools } = await client.listTools();
  assert.equal(tools.length, 36);
  assert.ok(tools.some(tool => tool.name === "stream_machine_transcribe_audio" && tool.annotations?.readOnlyHint === false));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_profile" && tool.annotations?.readOnlyHint));
  assert.ok(tools.some(tool => tool.name === "stream_machine_game_lookup"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_clip"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_download_clip"));
  const result = await client.callTool({ name: "stream_machine_open", arguments: {} });
  assert.ok(!result.isError);
  const status = await client.callTool({ name: "stream_machine_twitch_status", arguments: {} });
  process.stdout.write(JSON.stringify({ packageVersion: manifest.version, tools: tools.length, fnoxLaunch: "passed", twitchConfigured: !status.isError }) + "\n");
} finally { await client.close(); }
