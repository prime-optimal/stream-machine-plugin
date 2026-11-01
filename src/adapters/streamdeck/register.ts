import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { StreamDeckWorkspace, buttonInput } from "./workspace";

export function registerStreamDeckTools(server: McpServer) {
  const workspace = new StreamDeckWorkspace();
  const result = async (run: () => Promise<unknown>) => {
    try {
      const data = await run();
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: { provider: "streamdeck", data } };
    } catch (error) {
      return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Stream Deck operation failed" }] };
    }
  };
  server.registerTool("stream_machine_streamdeck_inventory", {
    description: "Read local USB Stream Deck inventory and saved USB pages. Does not claim USB or change profiles.", inputSchema: z.strictObject({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, () => result(() => workspace.inventory()));
  server.registerTool("stream_machine_streamdeck_preview", {
    description: "Preview one native open-URL button on a dedicated USB test page for a fresh Original 3×5 deck. No writes.", inputSchema: buttonInput,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args) => result(() => workspace.preview(args)));
  server.registerTool("stream_machine_streamdeck_apply", {
    description: "Apply reviewed preview to user's fresh blank USB deck. Claims USB, resets display, retains provider for button presses. Elgato app must be closed. No native profile edits. Requires user's setup authorization.",
    inputSchema: z.strictObject({ previewId: z.string().uuid() }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, ({ previewId }) => result(() => workspace.apply(previewId)));
  server.registerTool("stream_machine_streamdeck_release", {
    description: "Remove only this session's USB demo page, restore main page, and release USB ownership.",
    inputSchema: z.strictObject({}),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, () => result(async () => { await workspace.close(); return { released: true }; }));
  return workspace;
}
