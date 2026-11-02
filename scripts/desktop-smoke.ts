import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { dirname } from "node:path";

const expected = {
  obs: ["stream_machine_obs_create_browser_source", "stream_machine_obs_create_scene", "stream_machine_obs_list_scenes", "stream_machine_obs_preflight", "stream_machine_obs_remove_browser_source", "stream_machine_obs_remove_scene", "stream_machine_obs_show_alert"],
  streamdeck: [
    "stream_machine_streamdeck_button_clear", "stream_machine_streamdeck_button_update", "stream_machine_streamdeck_inventory",
    "stream_machine_streamdeck_layout_apply", "stream_machine_streamdeck_layout_preview", "stream_machine_streamdeck_release",
  ],
};

export async function verifyServer(path: string, kind: keyof typeof expected) {
  const client = new Client({ name: "stream-machine-smoke", version: "0.1.0" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path], cwd: dirname(path), stderr: "pipe" }), { timeout: 60_000 });
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), expected[kind]);
    console.log(`PASS: ${kind} (${tools.length} tools)`);
  } finally { await client.close(); }
}
