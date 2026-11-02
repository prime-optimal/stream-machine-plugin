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
const config = z.object({ mcpServers: z.object({ "stream-machine-desktop": launch, "stream-machine-streamdeck": launch }) }).parse(await Bun.file(`${root}/mcp.json`).json());
const expected = {
  "stream-machine-desktop": ["stream_machine_obs_list_scenes", "stream_machine_obs_preflight", "stream_machine_obs_show_alert"],
  "stream-machine-streamdeck": [
    "stream_machine_streamdeck_apply", "stream_machine_streamdeck_inventory", "stream_machine_streamdeck_preview", "stream_machine_streamdeck_release",
  ],
} as const;
for (const name of Object.keys(expected) as (keyof typeof expected)[]) {
  const selected = config.mcpServers[name];
  const client = new Client({ name: "stream-machine-package-check", version });
  try {
    await client.connect(new StdioClientTransport({
      command: selected.command,
      args: selected.args.map(value => value.replaceAll("${PLUGIN_ROOT}", root)),
      cwd: selected.cwd.replaceAll("${PLUGIN_ROOT}", root), stderr: "pipe",
    }), { timeout: 60_000 });
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), [...expected[name]]);
    process.stdout.write(JSON.stringify({ packageVersion: manifest.version, server: name, tools: tools.length, launch: "passed" }) + "\n");
  } finally { await client.close(); }
}
