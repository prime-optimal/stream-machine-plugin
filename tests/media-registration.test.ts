import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerMediaTools } from "../src/adapters/media/register";
import { MediaInfoProvider } from "../src/adapters/media/provider";
import { MediaFault } from "../src/adapters/media/contracts";

test("real MCP advertises strict optional tool and sanitizes missing-provider faults", async () => {
  const server = new McpServer({ name: "media-test", version: "1" });
  let starts = 0;
  const provider = registerMediaTools(server, new MediaInfoProvider(async () => {
    starts++; throw new MediaFault("MEDIA_PROVIDER_NOT_CONFIGURED");
  }));
  const client = new Client({ name: "media-test-client", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(st); await client.connect(ct);
    const tools = await client.listTools();
    expect(tools.tools.map(tool => tool.name)).toEqual(["stream_machine_media_info"]);
    expect(starts).toBe(0);
    const invalid = await client.callTool({ name: "stream_machine_media_info", arguments: { url: "https://example.com" } });
    expect(invalid.isError).toBe(true); expect(starts).toBe(0);
    const result = await client.callTool({ name: "stream_machine_media_info", arguments: { url: "https://youtu.be/BaW_jenozKc" } });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({ error: { code: "MEDIA_PROVIDER_NOT_CONFIGURED" } });
  } finally { await provider.close(); await client.close(); await server.close(); }
});
