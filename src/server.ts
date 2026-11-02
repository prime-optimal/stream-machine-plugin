import { registerUpdateTools } from "./update/register";
import { version } from "./version";
import { McpServer } from "@modelcontextprotocol/server";
import { DemoWorkspace, schemas, toolResult, type ToolName } from "./domain";
import { registerObsTools } from "./adapters/obs/register";
import { registerStreamDeckTools } from "./adapters/streamdeck/register";
import { registerTwitchTools } from "./adapters/twitch/register";
import { registerCreativeTools } from "./adapters/design/register";
import { registerWorkerTools } from "./worker/register";
import { registerTranscriptionTool } from "./adapters/openai/transcription-register";

export const UI_URI = "ui://stream-machine/workspace-v4.html";
const descriptions: Record<ToolName, string> = {
  stream_machine_open: "Open Stream Machine live demo controls and a separate mock sample. Use provider checks for real connection status.",
  stream_machine_workspace: "Open Stream Machine live demos alongside the conversation, with a separate mock sample.",
  stream_machine_connect_demo: "Select a fictional Twitch account for mock previews. Does not authorize or contact Twitch.",
  stream_machine_list_recipes: "List available demo recipes and planned capabilities.",
  stream_machine_preview: "Preview title/category changes for fictional channel. Read-only, not executable; no Twitch requests.",
  stream_machine_reset: "Disconnect fictional account and reset process-local demo state.",
};

export function createServer(html: string) {
  const workspace = new DemoWorkspace();
  const server = new McpServer({ name: "stream-machine", version });
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
    }, async (args: unknown) => {
      const result = toolResult(workspace, name, args);
      if (name !== "stream_machine_open" && name !== "stream_machine_workspace") return result;
      return { ...result, content: [{ type: "text" as const, text: "Stream Machine workspace opened. The sample data is mock-only. Use the Twitch, OBS, Stream Deck, creative, and worker tools for real status and explicit actions." }] };
    });
  }
  registerUpdateTools(server);
  registerObsTools(server);
  const deck = registerStreamDeckTools(server);
  registerTwitchTools(server);
  registerCreativeTools(server);
  registerWorkerTools(server);
  const transcription = registerTranscriptionTool(server);
  server.server.onclose = () => { transcription.close(); void deck.close().catch(() => process.stderr.write("Stream Deck cleanup failed.\n")); };
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
