import { z } from "zod";
import { withObs } from "../obs/client";
import type { SceneTile } from "./layout";

const sceneListSchema = z.object({ currentProgramSceneName: z.string().nullable().optional(), scenes: z.array(z.object({ sceneName: z.string(), sceneIndex: z.number() })) });

export interface SceneReader { scenes(limit: number, names?: string[]): Promise<{ current: string | null; scenes: SceneTile[] }> }

export const obsScenes: SceneReader = {
  scenes: (limit, names) => withObs(async (request) => {
    const list = sceneListSchema.parse(await request("GetSceneList"));
    const ordered = [...list.scenes].sort((a, b) => b.sceneIndex - a.sceneIndex);
    const missing = names?.filter((name) => !ordered.some((scene) => scene.sceneName === name)) ?? [];
    if (missing.length) throw new Error(`OBS scenes not found: ${missing.join(", ")}`);
    const selected = names ? names.map((name) => ordered.find((scene) => scene.sceneName === name)!) : ordered;
    return { current: list.currentProgramSceneName ?? null, scenes: selected.slice(0, limit).map((scene) => ({ name: scene.sceneName })) };
  }),
};
