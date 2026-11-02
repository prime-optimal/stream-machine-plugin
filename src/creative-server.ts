import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { registerCreativeTools } from "./adapters/design/register";
import { version } from "./version";

export const CREATIVE_URI = "ui://stream-machine/creative-v1.html";
export function createCreativeServer(html: string) {
  const server = new McpServer({ name: "stream-machine-creative", version });
  registerCreativeTools(server);
  server.registerTool("stream_machine_creative_open", {
    description: "Open the desktop creative workspace. Does not start a generation.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: CREATIVE_URI, visibility: ["model", "app"] }, "openai/ui": { entrypoints: [{ type: "thread" }] } },
  }, async () => ({ content: [{ type: "text" as const, text: "Creative workspace opened on desktop." }], structuredContent: { runtime: "creative-desktop" } }));
  server.registerResource("stream-machine-creative", CREATIVE_URI, { mimeType: "text/html;profile=mcp-app" }, async () => ({
    contents: [{ uri: CREATIVE_URI, mimeType: "text/html;profile=mcp-app", text: html, _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } }, "openai/ui": { preferredDisplayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] } } }],
  }));
  return server;
}
