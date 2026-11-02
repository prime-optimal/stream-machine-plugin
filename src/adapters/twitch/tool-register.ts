import { z } from "zod";
import { TwitchFault } from "../../auth/twitch";
import { clipIdSchema } from "./clips-client";
import type { TwitchToolRuntime } from "./tool-runtime";

type TwitchToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent: { twitch: object } | { error: { code: string } };
  isError?: boolean;
};

const definitions = {
  stream_machine_twitch_preflight: { schema: z.object({}).strict(), description: "Check the selected Twitch provider configuration before onboarding. Does not authorize Twitch or change the channel." },
  stream_machine_twitch_status: { schema: z.object({}).strict(), description: "Validate the selected real Twitch connection and show account and scopes. No mock fallback." },
  stream_machine_twitch_connect: { schema: z.object({ manageBroadcast: z.boolean().default(false), manageClips: z.boolean().default(false), openBrowser: z.boolean().default(false), replacePluginListener: z.boolean().default(false) }).strict(), description: "Get the selected provider's Twitch connection URL. Review the returned permission disclosure before consent. Hosted requests return a Site URL. Local openBrowser and replacePluginListener require explicit user authorization; replacement stops only a verified Stream Machine plugin process. Legacy permission flags cannot reduce required permissions." },
  stream_machine_twitch_channel: { schema: z.object({}).strict(), description: "Read the connected broadcaster's real current title and category." },
  stream_machine_twitch_profile: { schema: z.object({}).strict(), description: "Read the connected account description, profile photo URL, and offline video-player image URL. The offline image is not a profile banner or header. No write." },
  stream_machine_twitch_preview_title: { schema: z.object({ title: z.string().min(1).max(280) }).strict(), description: "Preview the exact connected-account title change, without writing. Open the returned approval URL to approve in a browser." },
  stream_machine_twitch_apply_title: { schema: z.object({ previewId: z.string().uuid() }).strict(), description: "Apply the browser-approved exact preview to the connected broadcaster. Recheck scope and current title, then read back. Live mutation." },
  stream_machine_twitch_clip: { schema: z.object({ clipId: clipIdSchema }).strict(), description: "Read real Twitch clip metadata by ID. No download or mock fallback." },
  stream_machine_twitch_download_clip: { schema: z.object({ clipId: clipIdSchema }).strict(), description: "Download one connected broadcaster-owned Twitch clip through the selected provider. Requires explicit clip permission. No mock fallback." },
};

export function createTwitchToolDefinitions(getRuntime: () => TwitchToolRuntime) {
  return Object.entries(definitions).map(([name, definition]) => ({
    name, ...definition,
    annotations: { readOnlyHint: !["stream_machine_twitch_apply_title", "stream_machine_twitch_connect", "stream_machine_twitch_download_clip"].includes(name), destructiveHint: false, openWorldHint: true },
    async execute(input: unknown): Promise<TwitchToolResult> {
      try {
        const args = definition.schema.parse(input);
        const runtime = getRuntime();
        let result: object;
        if (name === "stream_machine_twitch_preflight") result = await runtime.preflight();
        else if (name === "stream_machine_twitch_connect" && "manageBroadcast" in args) result = await runtime.connect(args.manageBroadcast, args.manageClips, args.openBrowser, args.replacePluginListener);
        else if (name === "stream_machine_twitch_preview_title" && "title" in args) {
          const preview = await runtime.titles.preview(args.title);
          result = { ...preview, approvalUrl: runtime.approvalUrl(preview.previewId) };
        } else if (name === "stream_machine_twitch_apply_title" && "previewId" in args) result = await runtime.titles.apply(args.previewId);
        else if (name === "stream_machine_twitch_channel") result = await runtime.titles.channel();
        else if (name === "stream_machine_twitch_profile") result = await runtime.titles.profile();
        else if (name === "stream_machine_twitch_clip" && "clipId" in args) result = await runtime.clip(args.clipId);
        else if (name === "stream_machine_twitch_download_clip" && "clipId" in args) result = await runtime.downloadClip(args.clipId);
        else result = await runtime.titles.status();
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { twitch: result } };
      } catch (error) {
        const unavailable = name.endsWith("_clip") ? "CLIP_UNAVAILABLE" : "TWITCH_UNAVAILABLE";
        const code = error instanceof TwitchFault ? error.code : error instanceof z.ZodError ? "INVALID_INPUT" : unavailable;
        return { isError: true, content: [{ type: "text", text: code }], structuredContent: { error: { code } } };
      }
    },
  }));
}

type TwitchToolDefinition = ReturnType<typeof createTwitchToolDefinitions>[number];
type TwitchToolRegistrar = {
  registerTool(name: string, config: { description: string; inputSchema: TwitchToolDefinition["schema"]; annotations: TwitchToolDefinition["annotations"] }, execute: TwitchToolDefinition["execute"]): unknown;
};

export function registerTwitchToolSet(server: TwitchToolRegistrar, getRuntime: () => TwitchToolRuntime) {
  for (const definition of createTwitchToolDefinitions(getRuntime)) {
    server.registerTool(definition.name, { description: definition.description, inputSchema: definition.schema, annotations: definition.annotations }, definition.execute);
  }
}
