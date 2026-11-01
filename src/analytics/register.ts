import type { McpServer } from "@modelcontextprotocol/server";
import { broadcastReportSchema, calculateBroadcastDuration } from "./broadcast-duration";

export function registerAnalyticsTools(server: McpServer) {
  server.registerTool("stream_machine_streaming_metric", {
    description: "Calculate observed broadcast duration from an explicitly user-supplied interval report. No provider fetch or authenticity verification.",
    inputSchema: broadcastReportSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input: unknown) => {
    try {
      const metric = calculateBroadcastDuration(input);
      return { content: [{ type: "text" as const, text: JSON.stringify(metric) }], structuredContent: { metric } };
    } catch {
      return { isError: true, content: [{ type: "text" as const, text: "INVALID_REPORT" }], structuredContent: { error: { code: "INVALID_REPORT" } } };
    }
  });
}
