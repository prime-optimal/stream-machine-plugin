import { describe, expect, test } from "bun:test";
import { CreativeController, startSchema } from "../src/adapters/design/controller";
import { CreativeJournal } from "../src/adapters/design/journal";
import { configuredProvider, DESIGN_ORIGIN, remoteProvider, type CreativeProvider } from "../src/adapters/design/provider";

const id = "34687798-1fa0-4a69-ae35-631a44a286c5";
function fixture() {
  const calls: string[] = [];
  const writes: string[] = [];
  const provider: CreativeProvider = {
    async call(name, args) {
      calls.push(name);
      if (name === "list_projects") return { projects: [{ id: "test-project", name: "Test" }] };
      if (name === "list_plugins") return { plugins: [{ id: "stream-overlay-authoring" }] };
      if (name === "start_run") return { runId: "real-run" };
      if (name === "get_run") return { status: "succeeded" };
      if (name === "list_files") return { files: [{ name: "weekend-camera-v1/index.html", size: 100 }, { name: "stream-machine-proof.mp4", size: 500 }, { name: "creative-video-task.json", size: 100 }] };
      if (name === "get_file") return args.path === "creative-video-task.json" ? JSON.stringify({ taskId: "real-task", status: "done" }) : '<head><script src="./gsap.min.js"></script></head><div data-duration="10"\n    ></div><script>window.__timelines["main"] = tl;</script>';
      if (name === "write_file") { if (typeof args.content === "string") writes.push(args.content); return { ok: true }; }
      throw new Error("Unexpected provider operation");
    },
    async api(path) {
      calls.push(path);
      if (path.endsWith("/scaffold")) return { files: ["index.html", "gsap.min.js", "hyperframes.json", "meta.json"] };
      if (path.endsWith("/generate")) return { taskId: "real-task" };
      return { tasks: [{ taskId: "real-task", status: "done", file: { name: "stream-machine-proof.mp4" } }] };
    },
  };
  const journal = new CreativeJournal(":memory:");
  return { controller: new CreativeController(provider, journal), journal, calls, writes, provider };
}
describe("creative provider boundary", () => {
  test("server-only login derives Basic auth while explicit authorization wins", async () => {
    const keys = ["STREAM_MACHINE_DESIGN_AUTHORIZATION", "STREAM_MACHINE_DESIGN_USERNAME", "STREAM_MACHINE_DESIGN_PASSWORD"];
    const previous = keys.map(key => process.env[key]);
    const original = globalThis.fetch;
    const observed: string[] = [];
    globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      observed.push(new Headers(init?.headers).get("Authorization") ?? "");
      return Response.json({ tasks: [] });
    }, { preconnect: original.preconnect });
    try {
      process.env.STREAM_MACHINE_DESIGN_USERNAME = "fixture-user";
      process.env.STREAM_MACHINE_DESIGN_PASSWORD = "fixture-password";
      delete process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION;
      await configuredProvider().api("/api/projects/test/media/tasks");
      process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION = "Basic fixture-override";
      await configuredProvider().api("/api/projects/test/media/tasks");
      expect(observed).toEqual([`Basic ${Buffer.from("fixture-user:fixture-password").toString("base64")}`, "Basic fixture-override"]);
    } finally {
      globalThis.fetch = original;
      keys.forEach((key, index) => { const value = previous[index]; if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    }
  });
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
  test("video uses supported motion-source root and daemon task without authoring process", async () => {
    const f = fixture();
    try {
      const result = await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      expect(result).toMatchObject({ taskId: "real-task", source: `motion-source/${id}/index.html` });
      expect(f.calls).not.toContain("start_run");
      expect(f.writes[0]).toContain('href="../../stream-machine-proof.mp4"');
      expect(f.calls.indexOf("write_file")).toBeLessThan(f.calls.findIndex(name => name.endsWith("/generate")));
      expect(await f.controller.run(id)).toMatchObject({ status: "succeeded", taskId: "real-task", file: "stream-machine-proof.mp4" });
    } finally { f.journal.close(); }
  });
  test("done task cannot claim missing or unrelated MP4", async () => {
    const f = fixture();
    const original = f.provider.api;
    f.provider.api = async (path, body) => path.includes("/media/tasks?") ? { tasks: [{ taskId: "real-task", status: "done", file: { name: "unrelated.mp4" } }] } : original(path, body);
    try {
      await f.controller.start({ requestId: id, project: "test-project", recipe: "video" });
      await expect(f.controller.run(id)).rejects.toThrow("expected nonempty MP4");
    } finally { f.journal.close(); }
  });
  test("outer run success cannot hide failed render receipt or claim MP4", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => name === "get_file"
      ? JSON.stringify({ taskId: "failed-task", status: "failed", result: { error: { message: "Open Design desktop frame renderer is unavailable" } } })
      : original(name, args);
    try {
      f.journal.reserve({ requestId: id, project: "test-project", recipe: "video", status: "queued", runId: "real-run" }, "legacy");
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
      f.journal.reserve({ requestId: id, project: "test-project", recipe: "video", status: "queued", runId: "real-run" }, "legacy");
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
