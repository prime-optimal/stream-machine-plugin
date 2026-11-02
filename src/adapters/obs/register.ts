import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { alertTextSchema } from "./artifact";
import { obsListScenes, obsPreflight, obsShowAlert } from "./actions";
import { sceneSchema, createBrowserSchema, removeBrowserSchema, runSceneAction } from "./scenes";
export { obsListScenes, obsPreflight, obsShowAlert } from "./actions";

const empty = z.object({}).strict();
const show = z.object({ text: alertTextSchema.optional(), replay: z.boolean().optional() }).strict()
  .refine(input => input.replay === true || input.text !== undefined, "Provide text, or replay: true");
async function result(action: () => Promise<unknown>) {
  try {
    const data = await action();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: { obs: data } };
  } catch (error) {
    return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : "OBS action failed" }] };
  }
}
export function registerObsTools(server: McpServer) {
  server.registerTool("stream_machine_obs_create_scene", {
    description: "Create an empty OBS scene without selecting it.",
    inputSchema: sceneSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, input => result(() => runSceneAction("create_scene", input)));
  server.registerTool("stream_machine_obs_remove_scene", {
    description: "Remove a non-program OBS scene. This may remove scene references; never removes the current or last scene.",
    inputSchema: sceneSchema, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, input => result(() => runSceneAction("remove_scene", input)));
  server.registerTool("stream_machine_obs_create_browser_source", {
    description: "Create an enabled browser source from an HTTP(S) URL or an existing absolute local HTML file. Adding to the program scene changes visible content.",
    inputSchema: createBrowserSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, input => result(() => runSceneAction("create_browser_source", input)));
  server.registerTool("stream_machine_obs_remove_browser_source", {
    description: "Delete a browser source only if it has one direct reference in the named scene. Refuses shared or grouped sources.",
    inputSchema: removeBrowserSchema, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, input => result(() => runSceneAction("remove_browser_source", input)));
  server.registerTool("stream_machine_obs_preflight", {
    description: "Read running local OBS version, output state and scenes using obs-cli. No broadcast or recording changes.",
    inputSchema: empty, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, () => result(obsPreflight));
  server.registerTool("stream_machine_obs_list_scenes", {
    description: "List real scenes from running local OBS using obs-cli.",
    inputSchema: empty, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, () => result(obsListScenes));
  server.registerTool("stream_machine_obs_show_alert", {
    description: "Show finite 4-second text alert in Stream Machine Demo program scene, or replay saved text. Creates/updates dedicated browser source. Changes program scene; never changes broadcasting or recording.",
    inputSchema: show, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, input => result(() => obsShowAlert(input)));
}
