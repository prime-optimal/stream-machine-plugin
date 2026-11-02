import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { CreativeController, startSchema } from "../src/adapters/design/controller";
import { CreativeJournal } from "../src/adapters/design/journal";
import { configuredProvider, type CreativeProvider } from "../src/adapters/design/provider";
import { composeHtml } from "../src/adapters/hyperframes/html";

const id = "34687798-1fa0-4a69-ae35-631a44a286c5";
function fixture() {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const files = new Map<string, string>();
  const provider: CreativeProvider = {
    async call(name, args) {
      calls.push({ name, args });
      if (name === "list_projects") return { projects: [{ id: "test-project", name: "Test" }] };
      if (name === "list_plugins") return { plugins: [{ id: "stream-overlay-authoring" }] };
      if (name === "list_skills") return { skills: [{ id: "hyperframes" }, { id: "video-hyperframes" }, { id: "design-consultation" }, { id: "unrelated" }] };
      if (name === "start_run") return { runId: "real-run" };
      if (name === "get_run") return { status: "succeeded", artifactPaths: ["weekend-camera-v1/index.html"] };
      if (name === "list_files") return { files: [{ name: "creative-html/unrelated/index.html", size: 100 }, { name: "weekend-camera-v1/index.html", size: 100 }] };
      if (name === "create_artifact") { const name = z.string().parse(args.name); if (name.endsWith(".json")) throw new Error("JSON metadata needs write_file"); files.set(name, z.string().parse(args.content)); return { ok: true }; }
      if (name === "write_file") { files.set(z.string().parse(args.path), z.string().parse(args.content)); return { ok: true }; }
      if (name === "get_file") return files.get(z.string().parse(args.path));
      if (name === "get_artifact") return { files: [{ name: args.entry, content: files.get(z.string().parse(args.entry)), mime: "text/html", binary: false }], truncated: false };
      throw new Error("Unexpected provider operation");
    },
  };
  const journal = new CreativeJournal(":memory:");
  return { controller: new CreativeController(provider, journal), journal, calls, files, provider };
}
describe("creative HTML reuse", () => {
  test("discovers both supported HyperFrames skill identifiers", async () => {
    const f = fixture();
    try { expect((await f.controller.list()).skills.map(skill => skill.id)).toEqual(["hyperframes", "video-hyperframes"]); }
    finally { f.journal.close(); }
  });
  test("server-only login derives Basic auth and explicit authorization wins", async () => {
    const keys = ["STREAM_MACHINE_DESIGN_AUTHORIZATION", "STREAM_MACHINE_DESIGN_USERNAME", "STREAM_MACHINE_DESIGN_PASSWORD"];
    const previous = keys.map(key => process.env[key]);
    const original = globalThis.fetch;
    const observed: string[] = [];
    globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method !== "POST") return new Response(null, { status: 405 });
      const request = z.object({ id: z.union([z.string(), z.number()]).optional(), method: z.string(), params: z.unknown().optional() }).parse(JSON.parse(String(init.body)));
      if (request.id === undefined) return new Response(null, { status: 202 });
      if (request.method === "initialize") {
        observed.push(new Headers(init.headers).get("Authorization") ?? "");
        const params = z.object({ protocolVersion: z.string() }).parse(request.params);
        return Response.json({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fixture", version: "1" } } });
      }
      return Response.json({ jsonrpc: "2.0", id: request.id, result: { content: [{ type: "text", text: '{"projects":[]}' }] } });
    }, { preconnect: original.preconnect });
    try {
      process.env.STREAM_MACHINE_DESIGN_USERNAME = "fixture-user";
      process.env.STREAM_MACHINE_DESIGN_PASSWORD = "fixture-password";
      delete process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION;
      await configuredProvider().call("list_projects", {});
      process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION = "Basic fixture-override";
      await configuredProvider().call("list_projects", {});
      expect(observed).toEqual([`Basic ${Buffer.from("fixture-user:fixture-password").toString("base64")}`, "Basic fixture-override"]);
    } finally {
      globalThis.fetch = original;
      keys.forEach((key, index) => { const value = previous[index]; if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    }
  });
  test("rejects retired recipe, credentials and long copy", () => {
    const input = { requestId: id, project: "test-project", recipe: "hyperframes-html" };
    expect(startSchema.safeParse({ ...input, authorization: "secret" }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, recipe: "video" }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, title: "x".repeat(49) }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, recipe: "brand-kit" }).success).toBe(false);
    expect(startSchema.safeParse({ ...input, brief: "ignored" }).success).toBe(false);
  });
  test("brand kit tracks one run and verifies the requested Markdown", async () => {
    const f = fixture();
    const input = { requestId: id, project: "test-project", recipe: "brand-kit", brief: "A warm creator brand" };
    try {
      const queued = await f.controller.start(input);
      expect(queued).toMatchObject({ status: "queued", file: `creative-brand/${id}/DESIGN.md` });
      expect(f.calls.find(call => call.name === "start_run")?.args).toMatchObject({ skill: "design-consultation", requestId: id });
      expect(await f.controller.start(input)).toEqual(queued);
      expect(f.calls.filter(call => call.name === "start_run")).toHaveLength(1);
      await expect(f.controller.run(id)).rejects.toThrow("Brand kit");
      f.files.set(`creative-brand/${id}/DESIGN.md`, "# Brand kit\n");
      expect((await f.controller.run(id)).status).toBe("succeeded");
      await expect(f.controller.start({ ...input, brief: "Changed" })).rejects.toThrow("different inputs");
    } finally { f.journal.close(); }
  });
  test("HTML composition keeps title safe and uses TwitchCon live driver", () => {
    const result = composeHtml('<img src=x onerror="alert(1)">');
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).toContain('window.overlay =');
    expect(result.source).toContain('gsap.timeline({paused:true})');
    expect(result.source).not.toContain('window.overlay =');
    expect(result.html).toContain('data-var-text="title"');
    expect([...result.html.matchAll(/src="(https:[^"]+)"/g)].map(match => match[1])).toEqual(["https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"]);
  });
  test("HTML artifact/source roundtrip completes without authoring run", async () => {
    const f = fixture();
    try {
      const result = await f.controller.start({ requestId: id, project: "test-project", recipe: "hyperframes-html", title: "HTML QA" });
      expect(result).toMatchObject({ status: "succeeded", file: `creative-html/${id}/index.html`, source: `creative-html/${id}/source.html` });
      expect(f.calls.filter(call => call.name === "create_artifact")).toHaveLength(2);
      expect(f.calls.filter(call => call.name === "write_file")).toHaveLength(1);
      expect(f.calls.some(call => call.name === "start_run")).toBe(false);
      const count = f.calls.length;
      expect(await f.controller.run(id)).toEqual(result);
      expect(f.calls).toHaveLength(count);
      expect((await f.controller.artifact("test-project", result.file ?? "")).files[0]?.content).toContain("HTML QA");
    } finally { f.journal.close(); }
  });
  test("same request writes once; changed inputs conflict", async () => {
    const f = fixture();
    try {
      const input = { requestId: id, project: "test-project", recipe: "hyperframes-html" };
      await Promise.all([f.controller.start(input), f.controller.start(input)]);
      expect(f.calls.filter(call => call.name === "create_artifact")).toHaveLength(2);
      await expect(f.controller.start({ ...input, title: "Different" })).rejects.toThrow("different inputs");
    } finally { f.journal.close(); }
  });
  test("lost write acknowledgment stays unknown without duplicate writes", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => { const result = await original(name, args); if (name === "create_artifact") throw new Error("lost"); return result; };
    try {
      const input = { requestId: id, project: "test-project", recipe: "hyperframes-html" };
      await expect(f.controller.start(input)).rejects.toThrow("lost");
      expect((await f.controller.start(input)).status).toBe("unknown");
      expect(f.calls.filter(call => call.name === "create_artifact")).toHaveLength(1);
    } finally { f.journal.close(); }
  });
  test("changed source readback cannot claim success", async () => {
    const f = fixture();
    const original = f.provider.call;
    f.provider.call = async (name, args) => name === "get_file" ? "changed" : original(name, args);
    try { await expect(f.controller.start({ requestId: id, project: "test-project", recipe: "hyperframes-html" })).rejects.toThrow("differs"); expect(f.journal.get(id)?.status).toBe("unknown"); }
    finally { f.journal.close(); }
  });
  test("overlay retains actual run entry and excludes unrelated project HTML", async () => {
    const f = fixture();
    try {
      await f.controller.start({ requestId: id, project: "test-project", recipe: "overlay" });
      expect(await f.controller.run(id)).toMatchObject({ runId: "real-run", status: "succeeded", file: "weekend-camera-v1/index.html" });
      expect(f.calls.find(call => call.name === "start_run")?.args.model).toBe("gpt-6.1-sol");
    } finally { f.journal.close(); }
  });
  test("legacy journal records retire with backup and unchanged UUID protection", () => {
    const directory = mkdtempSync(join(tmpdir(), "creative-journal-"));
    const path = join(directory, "state.sqlite");
    const database = new Database(path, { create: true });
    database.run("CREATE TABLE creative_operations (id TEXT PRIMARY KEY, hash TEXT NOT NULL, value TEXT NOT NULL)");
    database.run("INSERT INTO creative_operations VALUES (?,?,?)", [id, "old-hash", JSON.stringify({ requestId: id, project: "test-project", recipe: "video", status: "running", runId: "old-run", taskId: "old-task" })]);
    database.close();
    const journal = new CreativeJournal(path);
    try {
      const operation = journal.get(id);
      expect(operation).toMatchObject({ recipe: "hyperframes-html", status: "failed", failureCode: "LEGACY_RECIPE_RETIRED", legacy: { runId: "old-run", taskId: "old-task" } });
      expect(operation?.runId).toBeUndefined();
      expect(readdirSync(directory).some(name => name.startsWith("state.sqlite.before-html-"))).toBe(true);
      if (!operation) throw new Error("Missing migrated operation");
      expect(() => journal.reserve(operation, "new-hash")).toThrow("different inputs");
    } finally { journal.close(); rmSync(directory, { recursive: true, force: true }); }
  });
  test("source traversal rejected before provider request", async () => {
    const f = fixture();
    try { await expect(f.controller.artifact("test-project", "../secret")).rejects.toThrow("project-relative"); expect(f.calls).toHaveLength(0); }
    finally { f.journal.close(); }
  });
});
