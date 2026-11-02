import { registerUpdateTools } from "./update/register";
import { version } from "./version";
import { McpServer } from "@modelcontextprotocol/server";
import { DemoWorkspace, schemas, toolResult, type ToolName } from "./domain";
import { registerObsTools } from "./adapters/obs/register";
import { registerStreamDeckTools } from "./adapters/streamdeck/register";
import { registerTwitchTools } from "./adapters/twitch/register";
import { registerCreativeTools } from "./adapters/design/register";
import { registerWorkerTools } from "./worker/register";
import { registerGameTools } from "./adapters/igdb/register";
import { registerTranscriptionTool } from "./adapters/openai/transcription-register";
import { registerAnalyticsTools } from "./analytics/register";
import { registerMediaTools } from "./adapters/media/register";
import { MediaInfoService } from "./adapters/media/service";
import { siteOrigin } from "./site";

export const UI_URI = "ui://stream-machine/workspace-v4.html";
const descriptions: Record<ToolName, string> = {
  stream_machine_open: "Return the desktop workspace runtime, the Site origin, and a separate mock sample. Use provider checks for real connection status.",
  stream_machine_workspace: "Open the desktop device workspace: OBS, Stream Deck, creative, worker, and local Twitch fallback. Hosted Twitch uses the hosted server's stream_machine_open.",
  stream_machine_connect_demo: "Select a fictional Twitch account for mock previews. Does not authorize or contact Twitch.",
  stream_machine_list_recipes: "List available demo recipes and planned capabilities.",
  stream_machine_preview: "Preview title/category changes for fictional channel. Read-only, not executable; no Twitch requests.",
  stream_machine_reset: "Disconnect fictional account and reset process-local demo state.",
};

export function createServer(html: string) {
  const workspace = new DemoWorkspace();
  const server = new McpServer({ name: "stream-machine", version });
  for (const name of Object.keys(schemas) as ToolName[]) {
    const entrypoints = name === "stream_machine_workspace" ? [{ type: "thread" }] : [];
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
      if (result.isError) return result;
      return {
        ...result,
        structuredContent: { ...result.structuredContent, runtime: "local" as const, siteOrigin },
        content: [{ type: "text" as const, text: "Stream Machine desktop workspace opened. The sample data is mock-only. Use the Twitch, OBS, Stream Deck, creative, and worker tools for real status and explicit actions." }],
      };
    });
  }
  registerUpdateTools(server);
  registerObsTools(server);
  const deck = registerStreamDeckTools(server);
  const clips = registerTwitchTools(server);
  registerCreativeTools(server);
  registerWorkerTools(server);
  registerGameTools(server);
  registerAnalyticsTools(server);
  const transcription = registerTranscriptionTool(server);
  registerMediaTools(server, new MediaInfoService(clips, transcription));
  server.server.onclose = () => { transcription.close(); void deck.close().catch(() => process.stderr.write("Stream Deck cleanup failed.\n")); };
  server.registerResource("stream-machine-workspace", UI_URI, {
    mimeType: "text/html;profile=mcp-app",
  }, async () => ({
    contents: [{
      uri: UI_URI, mimeType: "text/html;profile=mcp-app", text: html,
      _meta: {
        ui: { csp: { connectDomains: [], resourceDomains: [siteOrigin, "https://static-cdn.jtvnw.net", "https://clips-media-assets2.twitch.tv"] } },
        "openai/ui": { preferredDisplayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] },
      },
    }],
  }));
  return server;
}
