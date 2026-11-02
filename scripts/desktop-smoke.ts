import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { dirname, resolve } from "node:path";

const expected = {
  obs: ["stream_machine_obs_create_browser_source", "stream_machine_obs_create_scene", "stream_machine_obs_list_scenes", "stream_machine_obs_preflight", "stream_machine_obs_remove_browser_source", "stream_machine_obs_remove_scene", "stream_machine_obs_show_alert"],
  streamdeck: [
    "stream_machine_streamdeck_button_clear", "stream_machine_streamdeck_button_update", "stream_machine_streamdeck_inventory",
    "stream_machine_streamdeck_layout_apply", "stream_machine_streamdeck_layout_preview", "stream_machine_streamdeck_release",
  ],
  creative: ["stream_machine_creative_artifact", "stream_machine_creative_list", "stream_machine_creative_open", "stream_machine_creative_project", "stream_machine_creative_run", "stream_machine_creative_start"],
};

export async function verifyServer(path: string, kind: keyof typeof expected) {
  const absolutePath = resolve(path);
  const client = new Client({ name: "stream-machine-smoke", version: "0.1.0" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [absolutePath], cwd: dirname(absolutePath), stderr: "pipe" }), { timeout: 60_000 });
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), expected[kind]);
    if (kind === "creative") {
      const result = await client.callTool({ name: "stream_machine_creative_open", arguments: {} });
      assert.equal(result.isError, undefined);
      const resource = await client.readResource({ uri: "ui://stream-machine/creative-v1.html" });
      assert.equal(resource.contents[0]?.mimeType, "text/html;profile=mcp-app");
    }
    console.log(`PASS: ${kind} (${tools.length} tools)`);
  } finally { await client.close(); }
}
