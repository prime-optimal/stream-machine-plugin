import { z } from "zod";
import { withObs } from "./client";
import { serialize } from "./queue";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, extname } from "node:path";

const name = z.string().min(1).max(256).refine(value => value.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(value), "Invalid name");
const url = z.string().max(4096).refine(value => {
  try {
    const parsed = new URL(value);
    return !/[\x00-\x1f\x7f]/.test(value) && ["http:", "https:"].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch { return false; }
}, "Use an HTTP or HTTPS URL without credentials");
export const sceneSchema = z.strictObject({ sceneName: name });
const browserFields = { sceneName: name, inputName: name, width: z.number().int().min(1).max(8192).default(800), height: z.number().int().min(1).max(8192).default(600) };
export const createBrowserSchema = z.union([
  z.strictObject({ ...browserFields, url }),
  z.strictObject({ ...browserFields, localFile: z.string().max(4096).refine(value => isAbsolute(value) && extname(value).toLowerCase() === ".html" && !/[\x00-\x1f\x7f]/.test(value), "Use an absolute HTML file path") }),
]);
export const removeBrowserSchema = z.strictObject({ sceneName: name, inputName: name });
const sceneList = z.object({ currentProgramSceneName: z.string(), scenes: z.array(z.object({ sceneName: z.string() })) });
const inputList = z.object({ inputs: z.array(z.object({ inputName: z.string(), inputKind: z.string() })) });
const groups = z.object({ groups: z.array(z.string()) });
const items = z.object({ sceneItems: z.array(z.object({ sourceName: z.string() })) });
type Request = (name: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
type Operation = "create_scene" | "remove_scene" | "create_browser_source" | "remove_browser_source";

export async function executeSceneAction(action: Operation, input: unknown, request: Request) {
  const parsed = action === "create_browser_source" ? createBrowserSchema.parse(input) : action === "remove_browser_source" ? removeBrowserSchema.parse(input) : sceneSchema.parse(input);
  let localFile: string | undefined;
  if (action === "create_browser_source") {
    const create = createBrowserSchema.parse(input);
    if ("localFile" in create) {
      localFile = await realpath(create.localFile);
      if (extname(localFile).toLowerCase() !== ".html" || !(await stat(localFile)).isFile()) throw new Error("Local HTML file not found");
    }
  }
  const inventory = sceneList.parse(await request("GetSceneList"));
  const exists = inventory.scenes.some(scene => scene.sceneName === parsed.sceneName);
  if (action === "create_scene") {
    if (exists) throw new Error("Scene already exists");
    await request("CreateScene", { sceneName: parsed.sceneName });
  } else if (action === "remove_scene") {
    if (!exists) throw new Error("Scene not found");
    if (inventory.currentProgramSceneName === parsed.sceneName || inventory.scenes.length <= 1) throw new Error("Cannot remove the current or last scene");
    await request("RemoveScene", { sceneName: parsed.sceneName });
  } else {
    if (!exists) throw new Error("Scene not found");
    const browser = action === "create_browser_source" ? createBrowserSchema.parse(input) : removeBrowserSchema.parse(input);
    const inputInventory = inputList.parse(await request("GetInputList"));
    const existing = inputInventory.inputs.find(item => item.inputName === browser.inputName);
    if (action === "create_browser_source") {
      const create = createBrowserSchema.parse(input);
      if (existing) throw new Error("Input name already exists");
      const location = "url" in create ? { is_local_file: false, url: create.url } : { is_local_file: true, local_file: localFile };
      await request("CreateInput", { sceneName: create.sceneName, inputName: create.inputName, inputKind: "browser_source", inputSettings: { ...location, width: create.width, height: create.height }, sceneItemEnabled: true });
    } else {
      if (!existing || existing.inputKind !== "browser_source") throw new Error("Browser input not found");
      const groupNames = groups.parse(await request("GetGroupList")).groups;
      const references: string[] = [];
      for (const scene of inventory.scenes) {
        const list = items.parse(await request("GetSceneItemList", { sceneName: scene.sceneName }));
        for (const item of list.sceneItems) if (item.sourceName === browser.inputName) references.push(scene.sceneName);
      }
      for (const group of new Set(groupNames)) {
        const list = items.parse(await request("GetGroupSceneItemList", { sceneName: group }));
        for (const item of list.sceneItems) if (item.sourceName === browser.inputName) references.push("");
      }
      if (references.length !== 1 || references[0] !== browser.sceneName) throw new Error("Input is shared or its ownership is ambiguous");
      await request("RemoveInput", { inputName: browser.inputName });
    }
  }
  return { mode: "live", action, ...parsed, observedAt: new Date().toISOString() };
}

export function runSceneAction(action: Operation, input: unknown) {
  const schema = action === "create_browser_source" ? createBrowserSchema : action === "remove_browser_source" ? removeBrowserSchema : sceneSchema;
  const parsed = schema.parse(input);
  return serialize(() => withObs(request => executeSceneAction(action, parsed, request)));
}
