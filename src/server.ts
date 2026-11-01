import { McpServer } from "@modelcontextprotocol/server";
import { DemoWorkspace, schemas, toolResult, type ToolName } from "./domain";

export const UI_URI = "ui://stream-machine/workspace-v1.html";
const descriptions: Record<ToolName, string> = {
  stream_machine_open: "Open Stream Machine demo hub. Mock account state and capability catalog; no live Twitch access.",
  stream_machine_workspace: "Open current Stream Machine demo workspace alongside conversation.",
  stream_machine_connect_demo: "Select a fictional Twitch account for mock previews. Does not authorize or contact Twitch.",
  stream_machine_list_recipes: "List available demo recipes and planned capabilities.",
  stream_machine_preview: "Preview title/category changes for fictional channel. Read-only, not executable; no Twitch requests.",
  stream_machine_reset: "Disconnect fictional account and reset process-local demo state.",
};

export function createServer(html: string) {
  const workspace = new DemoWorkspace();
  const server = new McpServer({ name: "stream-machine", version: "0.1.0" });
  for (const name of Object.keys(schemas) as ToolName[]) {
    const entrypoints = name === "stream_machine_open" ? [{ type: "global" }] : name === "stream_machine_workspace" ? [{ type: "thread" }] : [];
    server.registerTool(name, {
      description: descriptions[name], inputSchema: schemas[name],
      annotations: {
        readOnlyHint: !["stream_machine_connect_demo", "stream_machine_reset"].includes(name),
        destructiveHint: false, openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: UI_URI, visibility: ["model", "app"] },
        "openai/ui": { entrypoints },
      },
    }, async (args: unknown) => toolResult(workspace, name, args));
  }
  server.registerResource("stream-machine-workspace", UI_URI, {
    mimeType: "text/html;profile=mcp-app",
  }, async () => ({
    contents: [{
      uri: UI_URI, mimeType: "text/html;profile=mcp-app", text: html,
      _meta: {
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
        "openai/ui": { preferredDisplayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] },
      },
    }],
  }));
  return server;
}
