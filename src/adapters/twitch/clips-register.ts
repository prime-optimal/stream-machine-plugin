import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { LocalTwitchRuntime } from "../../auth/local-runtime";
import { TwitchFault, unavailableAccount } from "../../auth/twitch";
import { TwitchClipService } from "./clips-service";
import { clipIdSchema } from "./clips-client";
import { clipLibraryInputSchema } from "./clip-library";
export function registerTwitchClipTools(server: McpServer, runtime: () => LocalTwitchRuntime | undefined, supplied?: TwitchClipService) {
  let resolved = supplied;
  const service = () => { resolved ??= new TwitchClipService(runtime()?.accounts ?? unavailableAccount); return resolved; };
  for (const download of [false, true]) {
    server.registerTool(download ? "stream_machine_twitch_download_clip" : "stream_machine_twitch_clip", {
      description: download ? "Download one connected broadcaster-owned Twitch clip through the official API to a private local file. Requires explicit clip permission. No mock fallback." : "Read real Twitch clip metadata by ID. No download or mock fallback.",
      inputSchema: z.object({ clipId: clipIdSchema }).strict(),
      annotations: { readOnlyHint: !download, destructiveHint: false, openWorldHint: true, idempotentHint: !download },
    }, async ({ clipId }) => {
      try {
        const result = download ? await service().download(clipId) : await service().clip(clipId);
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { twitch: result } };
      } catch (error) {
        const code = error instanceof TwitchFault ? error.code : "CLIP_UNAVAILABLE";
        return { isError: true, content: [{ type: "text", text: code }], structuredContent: { error: { code } } };
      }
    });
  }
}
export function registerTwitchClipLibraryTool(server: McpServer, service: () => TwitchClipService) {
  server.registerTool("stream_machine_clips_library", {
    description: "List the connected broadcaster's Twitch clips with full metadata, one page at a time. Pass the returned cursor for the next page. Local results never include Site storage state. Read-only, no mock fallback.",
    inputSchema: clipLibraryInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
  }, async input => {
    try {
      const clips = await service().library(input);
      return { content: [{ type: "text", text: JSON.stringify(clips) }], structuredContent: { clips } };
    } catch (error) {
      const code = error instanceof TwitchFault ? error.code : "CLIP_UNAVAILABLE";
      return { isError: true, content: [{ type: "text", text: code }], structuredContent: { error: { code } } };
    }
  });
}
