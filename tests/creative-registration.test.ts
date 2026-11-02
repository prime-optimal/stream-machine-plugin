import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { registerCreativeTools } from "../src/adapters/design/register";

test("real MCP registration advertises five HTML creative tools without connecting provider", async () => {
  const server = new McpServer({ name: "creative-test", version: "0.1" });
  registerCreativeTools(server);
  const client = new Client({ name: "creative-test-client", version: "0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.listTools();
    expect(result.tools.map(tool => tool.name).sort()).toEqual(["stream_machine_creative_artifact", "stream_machine_creative_list", "stream_machine_creative_project", "stream_machine_creative_run", "stream_machine_creative_start"]);
    const start = result.tools.find(tool => tool.name === "stream_machine_creative_start");
    const schema = z.object({ properties: z.object({ recipe: z.object({ enum: z.array(z.string()) }) }) }).parse(start?.inputSchema);
    expect(schema.properties.recipe.enum).toEqual(["overlay", "hyperframes-html", "brand-kit"]);
  } finally { await client.close(); await server.close(); }
});
