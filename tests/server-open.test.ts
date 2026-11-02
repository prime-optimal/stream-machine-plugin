import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { siteOrigin } from "../src/site";

test.skip("local server reports its runtime and exposes only the workspace as a thread entrypoint (tool commented out for #159)", async () => {
  const server = createServer("<html></html>");
  const client = new Client({ name: "open-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const { tools } = await client.listTools();
    const entrypoints = (name: string) => {
      const meta = tools.find(tool => tool.name === name)?._meta?.["openai/ui"];
      return meta && typeof meta === "object" && "entrypoints" in meta ? meta.entrypoints : undefined;
    };
    expect(entrypoints("stream_machine_open")).toEqual([]);
    expect(entrypoints("stream_machine_workspace")).toEqual([{ type: "thread" }]);
    const result = await client.callTool({ name: "stream_machine_open", arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ runtime: "local", siteOrigin, mode: "mock", connection: { status: "disconnected" } });
  } finally { await client.close(); await server.close(); }
});
