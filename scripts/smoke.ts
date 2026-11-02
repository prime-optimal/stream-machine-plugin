import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { resolve, dirname } from "node:path";

const servers = [
  { path: process.argv[2] ?? resolve(import.meta.dir, "../dist/server.js"), tools: [
    "stream_machine_obs_list_scenes", "stream_machine_obs_preflight", "stream_machine_obs_show_alert",
  ] },
  { path: resolve(import.meta.dir, "../dist/streamdeck.js"), tools: [
    "stream_machine_streamdeck_apply", "stream_machine_streamdeck_inventory", "stream_machine_streamdeck_preview", "stream_machine_streamdeck_release",
  ] },
];
for (const { path, tools: expected } of servers) {
  const client = new Client({ name: "stream-machine-smoke", version: "0.1.0" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path], cwd: dirname(path), stderr: "pipe" }));
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), expected);
    assert.ok(!tools.some(tool => /start_broadcast|stop_broadcast/.test(tool.name)));
    console.log(`PASS: ${path.split("/").pop()} lists ${tools.length} tools: ${expected.join(", ")}`);
  } finally { await client.close(); }
}
