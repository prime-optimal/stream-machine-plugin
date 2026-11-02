import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { withObs } from "../obs/client";
import type { SceneTile } from "./layout";

const sceneListSchema = z.object({ currentProgramSceneName: z.string().nullable().optional(), scenes: z.array(z.object({ sceneName: z.string(), sceneIndex: z.number() })) });
const screenshotSchema = z.object({ imageData: z.string().startsWith("data:image/png;base64,") });

export interface SceneReader { scenes(limit: number, names?: string[]): Promise<{ current: string | null; scenes: SceneTile[] }>; thumbnail(scene: string): Promise<string | undefined> }

export function thumbnailDirectory() {
  return join(homedir(), ".stream-machine", "streamdeck");
}

async function screenshot(request: (name: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>, scene: string) {
  const parsed = screenshotSchema.safeParse(await request("GetSourceScreenshot", { sourceName: scene, imageFormat: "png", imageWidth: 144 }).catch(() => undefined));
  if (!parsed.success) return undefined;
  const directory = thumbnailDirectory();
  await mkdir(directory, { recursive: true });
  const path = join(directory, `scene-${new Bun.CryptoHasher("sha256").update(scene).digest("hex").slice(0, 16)}.png`);
  await Bun.write(path, Buffer.from(parsed.data.imageData.split(",", 2)[1]!, "base64"));
  return path;
}

export const obsScenes: SceneReader = {
  scenes: (limit, names) => withObs(async (request) => {
    const list = sceneListSchema.parse(await request("GetSceneList"));
    const ordered = [...list.scenes].sort((a, b) => b.sceneIndex - a.sceneIndex);
    const missing = names?.filter((name) => !ordered.some((scene) => scene.sceneName === name)) ?? [];
    if (missing.length) throw new Error(`OBS scenes not found: ${missing.join(", ")}`);
    const selected = names ? names.map((name) => ordered.find((scene) => scene.sceneName === name)!) : ordered;
    const scenes: SceneTile[] = [];
    for (const scene of selected.slice(0, limit)) scenes.push({ name: scene.sceneName, image: await screenshot(request, scene.sceneName) });
    return { current: list.currentProgramSceneName ?? null, scenes };
  }),
  thumbnail: (scene) => withObs((request) => screenshot(request, scene)),
};
