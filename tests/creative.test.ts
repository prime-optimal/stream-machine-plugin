import { describe, expect, test } from "bun:test";
import { CreativeController, startSchema } from "../src/adapters/design/controller";
import { CreativeJournal } from "../src/adapters/design/journal";
import { DESIGN_ORIGIN, remoteProvider, type CreativeProvider } from "../src/adapters/design/provider";

const id = "34687798-1fa0-4a69-ae35-631a44a286c5";
function fixture() {
  const calls: string[] = [];
  const provider: CreativeProvider = {
    async call(name) {
      calls.push(name);
      if (name === "list_projects") return { projects: [{ id: "test-project", name: "Test" }] };
      if (name === "list_plugins") return { plugins: [{ id: "stream-overlay-authoring" }] };
      if (name === "start_run") return { runId: "real-run" };
      if (name === "get_run") return { status: "succeeded" };
      if (name === "list_files") return { files: [{ name: "weekend-camera-v1/index.html", size: 100 }, { name: "stream-machine-proof.mp4", size: 500 }, { name: "creative-video-task.json", size: 100 }] };
      if (name === "get_file") return JSON.stringify({ taskId: "real-task", status: "done" });
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
  test("existing reverse proxy receives its configured Origin on media requests", async () => {
    const original = globalThis.fetch;
    const observed: { origin: string | null } = { origin: null };
    globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      observed.origin = new Headers(init?.headers).get("Origin");
      return Response.json({ tasks: [] });
    }, { preconnect: original.preconnect });
    try { await remoteProvider("Basic test-only").api("/api/projects/test/media/tasks"); expect(observed.origin).toBe(DESIGN_ORIGIN); }
    finally { globalThis.fetch = original; }
  });
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
  test("video commissions existing skill and preserves its render task receipt", async () => {
    const f = fixture();
    try {
      const result = await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      expect(result).toMatchObject({ runId: "real-run", source: `.hyperframes-cache/${id}/index.html` });
      expect(f.calls.filter(name => name === "start_run")).toHaveLength(1);
      expect(await f.controller.run(id)).toMatchObject({ status: "succeeded", taskId: "real-task" });
    } finally { f.journal.close(); }
  });
  test("outer run success cannot hide failed render receipt or claim MP4", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => name === "get_file"
      ? JSON.stringify({ taskId: "failed-task", status: "failed", result: { error: { message: "Open Design desktop frame renderer is unavailable" } } })
      : original(name, args);
    try {
      await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      const result = await f.controller.run(id);
      expect(result).toMatchObject({ status: "failed", failureCode: "RENDERER_UNAVAILABLE", taskId: "failed-task" });
      expect(result.file).toBeUndefined();
    } finally { f.journal.close(); }
  });
  test("no-output authoring success is failed without attempting nonexistent receipt", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => name === "list_files" ? { files: [] } : original(name, args);
    try {
      await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      expect(await f.controller.run(id)).toMatchObject({ status: "failed", failureCode: "AUTHORING_INCOMPLETE" });
      expect(f.calls).not.toContain("get_file");
    } finally { f.journal.close(); }
  });
  test("unusable localhost delivery URL is omitted", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => name === "get_run" ? { status: "succeeded", previewUrl: "http://127.0.0.1:7456/private" } : original(name, args);
    try {
      await f.controller.start({ requestId: id, project: "test-project", recipe: "overlay" });
      const result = await f.controller.run(id);
      expect(result.previewUrl).toBeUndefined();
      expect(result.file).toBe("weekend-camera-v1/index.html");
    } finally { f.journal.close(); }
  });
  test("source traversal rejected before provider request", async () => {
    const f = fixture();
    try { await expect(f.controller.artifact("test-project", "../secret")).rejects.toThrow("project-relative"); expect(f.calls).toHaveLength(0); }
    finally { f.journal.close(); }
  });
});
