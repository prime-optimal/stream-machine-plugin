import { describe, expect, test } from "bun:test";
import { CreativeController, startSchema } from "../src/adapters/design/controller";
import { CreativeJournal } from "../src/adapters/design/journal";
import type { CreativeProvider } from "../src/adapters/design/provider";

const id = "34687798-1fa0-4a69-ae35-631a44a286c5";
const scaffold = '<div data-duration="10"\n    ></div><script>window.__timelines["main"] = tl;</script>';
function fixture() {
  const calls: string[] = [];
  const provider: CreativeProvider = {
    async call(name) {
      calls.push(name);
      if (name === "list_projects") return { projects: [{ id: "test-project", name: "Test" }] };
      if (name === "list_plugins") return { plugins: [{ id: "stream-overlay-authoring" }] };
      if (name === "start_run") return { runId: "real-run" };
      if (name === "get_run") return { status: "succeeded" };
      if (name === "get_file") return scaffold;
      if (name === "write_file") return { ok: true };
      throw new Error("Unexpected provider operation");
    },
    async api(path) {
      calls.push(path);
      if (path.endsWith("/scaffold")) return { files: [] };
      if (path.endsWith("/generate")) return { taskId: "real-task" };
      return { tasks: [{ taskId: "real-task", status: "done", file: { name: "proof.mp4" } }] };
    },
  };
  const journal = new CreativeJournal(":memory:");
  return { controller: new CreativeController(provider, journal), journal, calls, provider };
}
describe("creative provider boundary", () => {
  test("rejects unreviewed recipes, credentials and long copy", () => {
    const input = { requestId: id, project: "test-project", recipe: "overlay" };
    expect(startSchema.safeParse({ ...input, authorization: "secret" }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, recipe: "shell" }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, title: "x".repeat(49) }).success).toBe(false);
  });
  test("same request submits once; changed inputs conflict", async () => {
    const f = fixture();
    try {
      const input = { requestId: id, project: "test-project", recipe: "overlay" };
      const [first, second] = await Promise.all([f.controller.start(input), f.controller.start(input)]);
      expect(first.requestId).toBe(second.requestId);
      expect(f.calls.filter(name => name === "start_run")).toHaveLength(1);
      await expect(f.controller.start({ ...input, title: "Different" })).rejects.toThrow("different inputs");
      expect(await f.controller.run(id)).toMatchObject({ runId: "real-run", status: "succeeded" });
    } finally { f.journal.close(); }
  });
  test("lost submission acknowledgment remains unknown without retry", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => { if (name === "start_run") throw new Error("lost"); return original(name, args); };
    try {
      const input = { requestId: id, project: "test-project", recipe: "overlay" };
      await expect(f.controller.start(input)).rejects.toThrow("lost");
      expect((await f.controller.start(input)).status).toBe("unknown");
    } finally { f.journal.close(); }
  });
  test("video uses existing scaffold then daemon task and editable source", async () => {
    const f = fixture();
    try {
      const result = await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      expect(result).toMatchObject({ taskId: "real-task", source: `.hyperframes-cache/${id}/index.html` });
      expect(f.calls.indexOf("write_file")).toBeLessThan(f.calls.findIndex(name => name.endsWith("/generate")));
      expect(await f.controller.run(id)).toMatchObject({ status: "succeeded", file: "proof.mp4" });
    } finally { f.journal.close(); }
  });
  test("source traversal rejected before provider request", async () => {
    const f = fixture();
    try { await expect(f.controller.artifact("test-project", "../secret")).rejects.toThrow("project-relative"); expect(f.calls).toHaveLength(0); }
    finally { f.journal.close(); }
  });
});
