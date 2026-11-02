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
  assert.equal(tools.length, 7);
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    "stream_machine_obs_list_scenes", "stream_machine_obs_preflight", "stream_machine_obs_show_alert",
    "stream_machine_streamdeck_apply", "stream_machine_streamdeck_inventory", "stream_machine_streamdeck_preview", "stream_machine_streamdeck_release",
  ]);
  assert.ok(tools.some(tool => tool.name === "stream_machine_obs_show_alert"));
  assert.ok(!tools.some(tool => /start_broadcast|stop_broadcast/.test(tool.name)));
  console.log("PASS: 7 tools (OBS and Stream Deck only)");
} finally { await client.close(); }
