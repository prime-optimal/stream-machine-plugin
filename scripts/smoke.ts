import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { strict as assert } from "node:assert";
import { resolve, dirname } from "node:path";

const client = new Client({ name: "stream-machine-smoke", version: "0.1.0" });
const serverPath = process.argv[2] ?? resolve(import.meta.dir, "../dist/server.js");
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: dirname(serverPath), stderr: "pipe" });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 27);
  assert.ok(tools.some(tool => tool.name === "stream_machine_obs_show_alert"));
  assert.ok(tools.some(tool => tool.name === "stream_machine_twitch_apply_title"));
  assert.ok(!tools.some(tool => /start_broadcast|stop_broadcast/.test(tool.name)));
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
  console.log("PASS: 27 tools, isolated mock lifecycle, UI resource, and explicit real adapters");
} finally { await client.close(); }
