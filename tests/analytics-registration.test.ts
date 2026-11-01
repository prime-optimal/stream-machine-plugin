import { expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAnalyticsTools } from "../src/analytics/register";

 test("MCP report calculation runs without provider or server assembly", async () => {
  const server = new McpServer({ name: "analytics-test", version: "1" });
  registerAnalyticsTools(server);
  const client = new Client({ name: "analytics-client", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const tools = await client.listTools();
    expect(tools.tools.map(tool => tool.name)).toEqual(["stream_machine_streaming_metric"]);
    const report = { sourceLabel: "Synthetic", exportedAt: "2026-11-01T12:00:00Z", rangeStart: "2026-11-01T10:00:00Z", rangeEnd: "2026-11-01T12:00:00Z", timezone: "UTC", coverage: [], sessions: [] };
    const result = await client.callTool({ name: "stream_machine_streaming_metric", arguments: report });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ metric: { seconds: 0, gapSeconds: 7200, coverageStatus: "partial" } });
    const invalid = await client.callTool({ name: "stream_machine_streaming_metric", arguments: { ...report, timezone: "invalid" } });
    expect(invalid.isError).toBe(true);
  } finally { await client.close(); await server.close(); }
});
