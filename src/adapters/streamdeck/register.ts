import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { StreamDeckWorkspace, buttonInput, clearInput, layoutInput, releaseInput } from "./workspace";

export async function streamDeckResult(run: () => Promise<unknown>) {
  try {
    const data = await run();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: { provider: "streamdeck", data } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stream Deck operation failed";
    return {
      isError: true, content: [{ type: "text" as const, text: message }], structuredContent: {
        provider: "streamdeck", error: { code: "STREAMDECK_PROVIDER_ERROR", message },
      }
    };
  }
}

export function registerStreamDeckTools(server: McpServer) {
  const workspace = new StreamDeckWorkspace();
  const result = streamDeckResult;
  const local = { destructiveHint: false, openWorldHint: false };
  server.registerTool("stream_machine_streamdeck_inventory", {
    description: "Read local USB Stream Deck inventory and saved USB pages. Does not claim USB or change profiles.", inputSchema: z.strictObject({}),
    annotations: { readOnlyHint: true, ...local },
  }, () => result(() => workspace.inventory()));
  server.registerTool("stream_machine_streamdeck_layout_preview", {
    description: "Preview a one-page streamer layout for an Original 3×5 deck: one text button per OBS scene (up to 5), mic and desktop audio mute, record, go live, and Twitch links. Reads OBS scenes. No deck writes.",
    inputSchema: layoutInput, annotations: { readOnlyHint: true, ...local },
  }, (args) => result(() => workspace.previewLayout(args)));
  server.registerTool("stream_machine_streamdeck_layout_apply", {
    description: "Apply a reviewed layout preview to the user's USB deck. Claims USB, replaces the deck display, and keeps this server running to handle presses. Quit the Elgato app first. Requires the user's authorization.",
    inputSchema: z.strictObject({ previewId: z.string().uuid() }), annotations: { readOnlyHint: false, ...local },
  }, ({ previewId }) => result(() => workspace.applyLayout(previewId)));
  server.registerTool("stream_machine_streamdeck_button_update", {
    description: "Replace one button on the applied layout: an OBS scene switch, mic or desktop audio mute, record, go live, or an HTTP(S) link. Verifies the stored button.",
    inputSchema: buttonInput, annotations: { readOnlyHint: false, ...local },
  }, (args) => result(() => workspace.updateButton(args)));
  server.registerTool("stream_machine_streamdeck_button_clear", {
    description: "Clear one button on the applied layout and verify it is empty.",
    inputSchema: clearInput, annotations: { readOnlyHint: false, ...local },
  }, (args) => result(() => workspace.clearButton(args)));
  server.registerTool("stream_machine_streamdeck_release", {
    description: "Release USB ownership and reset the deck. With deleteLayout, also delete the saved stream-machine layout page.",
    inputSchema: releaseInput, annotations: { readOnlyHint: false, ...local },
  }, (args) => result(() => workspace.release(args)));
  return workspace;
}
