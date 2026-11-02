import { expect, test } from "bun:test";
import { executeSceneAction } from "../src/adapters/obs/scenes";
import { mkdtemp, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serialize } from "../src/adapters/obs/queue";

function fake(options: { shared?: boolean; grouped?: boolean; malformed?: boolean } = {}) {
  const calls: { name: string; data: Record<string, unknown> }[] = [];
  const request = async (name: string, data: Record<string, unknown> = {}) => {
    calls.push({ name, data });
    if (name === "GetSceneList") return { currentProgramSceneName: "Live", scenes: [{ sceneName: "Live" }, { sceneName: "Draft" }] };
    if (name === "GetInputList") return { inputs: [{ inputName: "Existing", inputKind: "browser_source" }] };
    if (name === "GetGroupList") return { groups: options.grouped ? ["Group"] : [] };
    if (name === "GetGroupSceneItemList") return { sceneItems: [{ sourceName: "Existing" }] };
    if (name === "GetSceneItemList") {
      if (options.malformed) return {};
      return { sceneItems: data.sceneName === "Draft" || options.shared ? [{ sourceName: "Existing" }] : [] };
    }
    return {};
  };
  return { request, calls };
}

test("scene and browser creation use only requested OBS operations", async () => {
  const f = fake();
  await executeSceneAction("create_scene", { sceneName: "New" }, f.request);
  await executeSceneAction("create_browser_source", { sceneName: "Draft", inputName: "New browser", url: "https://example.com" }, f.request);
  expect(f.calls.map(call => call.name)).toEqual(["GetSceneList", "CreateScene", "GetSceneList", "GetInputList", "CreateInput"]);
  expect(f.calls.at(-1)?.data.inputSettings).toEqual({ is_local_file: false, url: "https://example.com", width: 800, height: 600 });
});

test("removal refuses program scene and shared or malformed inputs", async () => {
  for (const options of [{ shared: true }, { grouped: true }, { malformed: true }]) {
    const f = fake(options);
    await expect(executeSceneAction("remove_browser_source", { sceneName: "Draft", inputName: "Existing" }, f.request)).rejects.toThrow();
    expect(f.calls.some(call => call.name === "RemoveInput")).toBe(false);
  }
  const f = fake();
  await expect(executeSceneAction("remove_scene", { sceneName: "Live" }, f.request)).rejects.toThrow();
  expect(f.calls.some(call => call.name === "RemoveScene")).toBe(false);
});

test("removal deletes only explicitly named unshared inputs and non-program scenes", async () => {
  const f = fake();
  await executeSceneAction("remove_browser_source", { sceneName: "Draft", inputName: "Existing" }, f.request);
  await executeSceneAction("remove_scene", { sceneName: "Draft" }, f.request);
  expect(f.calls.filter(call => call.name.startsWith("Remove")).map(call => call.name)).toEqual(["RemoveInput", "RemoveScene"]);
  expect(f.calls.some(call => /SetCurrentProgramScene|Stream|Record/.test(call.name))).toBe(false);
});

test("invalid inputs fail before OBS requests", async () => {
  const f = fake();
  await expect(executeSceneAction("create_browser_source", { sceneName: "Draft", inputName: "Name", url: "file:///tmp/test" }, f.request)).rejects.toThrow();
  await expect(executeSceneAction("create_scene", { sceneName: "  " }, f.request)).rejects.toThrow();
  expect(f.calls).toEqual([]);
});

test("duplicate names and OBS errors do not report success", async () => {
  const f = fake();
  await expect(executeSceneAction("create_scene", { sceneName: "Draft" }, f.request)).rejects.toThrow();
  await expect(executeSceneAction("create_browser_source", { sceneName: "Draft", inputName: "Existing", url: "https://example.com" }, f.request)).rejects.toThrow();
  expect(f.calls.some(call => call.name === "CreateScene" || call.name === "CreateInput")).toBe(false);
  const calls: string[] = [];
  await expect(executeSceneAction("create_scene", { sceneName: "New" }, async (name) => {
    calls.push(name);
    if (name === "CreateScene") throw new Error("OBS rejected request");
    return { currentProgramSceneName: "Live", scenes: [{ sceneName: "Live" }] };
  })).rejects.toThrow("OBS rejected request");
  expect(calls).toEqual(["GetSceneList", "CreateScene"]);
});

test("local HTML source resolves an existing file before requesting OBS", async () => {
  const directory = await mkdtemp(join(tmpdir(), "obs-html-"));
  const file = join(directory, "overlay.html");
  try {
    await writeFile(file, "<html></html>");
    const f = fake();
    await executeSceneAction("create_browser_source", { sceneName: "Draft", inputName: "New", localFile: file }, f.request);
    expect(f.calls.at(-1)?.data.inputSettings).toEqual({ is_local_file: true, local_file: await realpath(file), width: 800, height: 600 });
    const invalid = fake();
    await expect(executeSceneAction("create_browser_source", { sceneName: "Draft", inputName: "New", localFile: join(directory, "missing.html") }, invalid.request)).rejects.toThrow();
    expect(invalid.calls).toEqual([]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("mutation queue runs one operation at a time and recovers after failure", async () => {
  const events: string[] = [];
  const first = serialize(async () => { events.push("first"); await Bun.sleep(10); events.push("first end"); throw new Error("rejected"); });
  const second = serialize(async () => { events.push("second"); });
  await expect(first).rejects.toThrow("rejected");
  await second;
  expect(events).toEqual(["first", "first end", "second"]);
});
