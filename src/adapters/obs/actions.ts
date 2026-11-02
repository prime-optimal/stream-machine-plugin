import { join } from "node:path";
import { z } from "zod";
import { withObs } from "./client";
import { installAlert, obsDataDirectory, obsAlertSchema } from "./artifact";
import { serialize } from "./queue";

export const OBS_DEMO_SCENE = "Stream Machine Demo";
export const OBS_ALERT_SOURCE = "Stream Machine Alert";
const scenesSchema = z.array(z.object({ sceneName: z.string(), sceneUuid: z.string(), sceneIndex: z.number() }));
const cliInfoSchema = z.object({ obs: z.object({ version: z.string(), websocket_version: z.string() }), video: z.object({ base_resolution: z.string() }) });
async function cli(args: string[]) {
  const child = Bun.spawn(["obs-cli", "-H", "localhost", "-P", "4455", "-j", ...args], { stdout: "pipe", stderr: "ignore" });
  const timeout = setTimeout(() => child.kill(), 5000);
  try {
    const output = await new Response(child.stdout).text();
    if (await child.exited !== 0) throw new Error("obs-cli failed; check running OBS and local WebSocket");
    return output.trim();
  } finally { clearTimeout(timeout); }
}
export async function obsListScenes() {
  const scenes = scenesSchema.parse(JSON.parse(await cli(["scene", "list"])));
  return { mode: "live", endpoint: "localhost:4455", scenes, observedAt: new Date().toISOString() };
}
export async function obsPreflight() {
  const [infoText, scene, stream, record, inventory] = await Promise.all([
    cli(["info"]), cli(["scene", "current"]), cli(["stream", "status"]), cli(["record", "status"]), obsListScenes(),
  ]);
  const info = cliInfoSchema.parse(JSON.parse(infoText));
  if (!["started", "stopped"].includes(stream) || !["started", "stopped"].includes(record)) throw new Error("Unknown OBS output state");
  return { ...inventory, provider: "obs-cli", obsVersion: info.obs.version, websocketVersion: info.obs.websocket_version,
    resolution: info.video.base_resolution, currentProgramScene: scene, streaming: stream === "started", recording: record === "started" };
}
const inputSchema = z.object({ inputs: z.array(z.object({ inputName: z.string(), inputKind: z.string() })) });
const sceneListSchema = z.object({ scenes: z.array(z.object({ sceneName: z.string() })) });
const itemsSchema = z.object({ sceneItems: z.array(z.object({ sourceName: z.string(), sceneItemId: z.number() })) });
const lastSchema = z.object({ text: z.string() });
export function obsShowAlert(input: { text?: string; replay?: boolean }) {
  const parsed = obsAlertSchema.parse(input.replay ? { action: "replay" } : { action: "play", text: input.text });
  return serialize(async () => {
    const preflight = await obsPreflight();
    const statePath = join(obsDataDirectory(), "last-alert.json");
    const text = parsed.action === "play" ? parsed.text : lastSchema.parse(await Bun.file(statePath).json().catch(() => { throw new Error("No saved OBS alert to replay"); })).text;
    const artifactPath = await installAlert(text);
    const result = await withObs(async request => {
      const scenes = sceneListSchema.parse(await request("GetSceneList"));
      if (!scenes.scenes.some(scene => scene.sceneName === OBS_DEMO_SCENE)) await request("CreateScene", { sceneName: OBS_DEMO_SCENE });
      const inputs = inputSchema.parse(await request("GetInputList"));
      const existing = inputs.inputs.find(item => item.inputName === OBS_ALERT_SOURCE);
      const settings = { is_local_file: true, local_file: artifactPath, width: 800, height: 300, shutdown: false, restart_when_active: false };
      if (existing && existing.inputKind !== "browser_source") throw new Error("Demo source name occupied by non-browser input");
      if (!existing) await request("CreateInput", { sceneName: OBS_DEMO_SCENE, inputName: OBS_ALERT_SOURCE, inputKind: "browser_source", inputSettings: settings, sceneItemEnabled: true });
      else await request("SetInputSettings", { inputName: OBS_ALERT_SOURCE, inputSettings: settings, overlay: true });
      let items = itemsSchema.parse(await request("GetSceneItemList", { sceneName: OBS_DEMO_SCENE }));
      if (!items.sceneItems.some(item => item.sourceName === OBS_ALERT_SOURCE)) {
        await request("CreateSceneItem", { sceneName: OBS_DEMO_SCENE, sourceName: OBS_ALERT_SOURCE, sceneItemEnabled: true });
        items = itemsSchema.parse(await request("GetSceneItemList", { sceneName: OBS_DEMO_SCENE }));
      }
      const item = items.sceneItems.find(item => item.sourceName === OBS_ALERT_SOURCE);
      if (!item) throw new Error("OBS did not create demo scene item");
      await request("SetSceneItemEnabled", { sceneName: OBS_DEMO_SCENE, sceneItemId: item.sceneItemId, sceneItemEnabled: true });
      await request("SetSceneItemTransform", { sceneName: OBS_DEMO_SCENE, sceneItemId: item.sceneItemId, sceneItemTransform: { positionX: 560, positionY: 390, scaleX: 1, scaleY: 1, alignment: 5 } });
      await request("SetCurrentProgramScene", { sceneName: OBS_DEMO_SCENE });
      await request("PressInputPropertiesButton", { inputName: OBS_ALERT_SOURCE, propertyName: "refreshnocache" });
      return { mode: "live", action: parsed.action, scene: OBS_DEMO_SCENE, source: OBS_ALERT_SOURCE, artifactPath, text,
        refreshAcknowledged: true, visibility: "unverified", durationMs: 4000, previousProgramScene: preflight.currentProgramScene,
        observedAt: new Date().toISOString() };
    });
    await Bun.write(statePath, JSON.stringify({ text }), { mode: 0o600 });
    await Bun.sleep(4250);
    return result;
  });
}
