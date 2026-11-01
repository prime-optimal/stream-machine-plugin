import type { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createLocalTwitchRuntime, type LocalTwitchRuntime } from "../../auth/local-runtime";
import { TwitchFault, unavailableAccount } from "../../auth/twitch";
import { TwitchTitleService } from "./service";
import { registerTwitchClipTools } from "./clips-register";
export function registerTwitchTools(server: McpServer, runtime?: LocalTwitchRuntime) {
  let resolved = runtime;
  const getRuntime = () => { resolved ??= createLocalTwitchRuntime(); return resolved; };
  registerTwitchClipTools(server, getRuntime);
  const service = () => getRuntime()?.titles ?? new TwitchTitleService(unavailableAccount);
  const definitions = {
    stream_machine_twitch_status: { schema: z.object({}).strict(), description: "Validate real local Twitch connection and show account and scopes. No mock fallback." },
    stream_machine_twitch_connect: { schema: z.object({ manageBroadcast: z.boolean().default(false), manageClips: z.boolean().default(false) }).strict(), description: "Start reused TwitchCon OAuth in local browser. Request broadcast or clip scopes only when explicitly requested; preserve existing permissions." },
    stream_machine_twitch_channel: { schema: z.object({}).strict(), description: "Read connected broadcaster's real current title and category." },
    stream_machine_twitch_preview_title: { schema: z.object({ title: z.string().min(1).max(280) }).strict(), description: "Preview exact connected-account title change, no write. Open returned approval URL to approve in browser." },
    stream_machine_twitch_apply_title: { schema: z.object({ previewId: z.string().uuid() }).strict(), description: "Apply browser-approved exact preview to connected broadcaster, recheck scope/current title and read back. Live mutation." },
  };
  for (const [name, definition] of Object.entries(definitions)) {
    server.registerTool(name, { description: definition.description, inputSchema: definition.schema, annotations: { readOnlyHint: !["stream_machine_twitch_apply_title", "stream_machine_twitch_connect"].includes(name), destructiveHint: false, openWorldHint: true } }, async (input: unknown): Promise<CallToolResult> => {
      try {
        const args = definition.schema.parse(input);
        let result: object;
        if (name === "stream_machine_twitch_connect") {
          const local = getRuntime(); if (!local) throw new TwitchFault("TWITCH_NOT_CONFIGURED");
          result = local.connect("manageBroadcast" in args && args.manageBroadcast, "manageClips" in args && args.manageClips);
        } else if (name === "stream_machine_twitch_preview_title" && "title" in args) {
          const preview = await service().preview(args.title);
          result = { ...preview, approvalUrl: getRuntime()?.approvalUrl(preview.previewId) };
        } else if (name === "stream_machine_twitch_apply_title" && "previewId" in args) result = await service().apply(args.previewId);
        else if (name === "stream_machine_twitch_channel") result = await service().channel();
        else result = await service().status();
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { twitch: result } };
      } catch (error) {
        const code = error instanceof TwitchFault ? error.code : error instanceof z.ZodError ? "INVALID_INPUT" : "TWITCH_UNAVAILABLE";
        return { isError: true, content: [{ type: "text", text: code }], structuredContent: { error: { code } } };
      }
    });
  }
}
