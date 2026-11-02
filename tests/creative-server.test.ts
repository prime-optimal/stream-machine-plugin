import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCreativeServer, CREATIVE_URI } from "../src/creative-server";

test("creative server exposes its own widget and tools without connecting to provider", async () => {
  const server = createCreativeServer("<html>creative fixture</html>");
  const client = new Client({ name: "creative-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual(["stream_machine_creative_artifact", "stream_machine_creative_list", "stream_machine_creative_open", "stream_machine_creative_project", "stream_machine_creative_run", "stream_machine_creative_start"]);
    expect(tools.find(tool => tool.name === "stream_machine_creative_open")?._meta?.ui).toEqual({ resourceUri: CREATIVE_URI, visibility: ["model", "app"] });
    const opened = await client.callTool({ name: "stream_machine_creative_open", arguments: {} });
    expect(opened.structuredContent).toEqual({ runtime: "creative-desktop" });
    const resource = await client.readResource({ uri: CREATIVE_URI });
    expect(resource.contents[0]).toMatchObject({ uri: CREATIVE_URI, mimeType: "text/html;profile=mcp-app", text: "<html>creative fixture</html>" });
  } finally { await client.close(); await server.close(); }
});
