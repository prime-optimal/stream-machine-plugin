import { createHash } from "node:crypto";
import { z } from "zod";
import { CreativeJournal, type Operation } from "./journal";
import { CreativeError, DESIGN_ORIGIN, type CreativeProvider } from "./provider";
import { startVideo, VIDEO_FILE, VIDEO_RECEIPT } from "../hyperframes/video";

export const startSchema = z.object({ requestId: z.uuid(), project: z.string().min(1).max(128), recipe: z.enum(["overlay", "video"]), title: z.string().trim().min(1).max(48).default("WEEKEND / STUDIO") }).strict();
const listed = z.array(z.object({ id: z.string(), name: z.string().optional(), title: z.string().optional() }));
const status = z.enum(["queued", "running", "succeeded", "failed", "canceled"]);
const terminal = new Set(["succeeded", "failed", "canceled"]);
function deliveryUrl(input: string | undefined) {
  if (!input) return undefined;
  try { const url = new URL(input); return url.origin === DESIGN_ORIGIN && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

export class CreativeController {
  constructor(readonly provider: CreativeProvider, readonly journal: CreativeJournal) {}
  async list() {
    const projects = z.object({ projects: listed }).parse(await this.provider.call("list_projects", {})).projects;
    const scenarios = z.object({ plugins: listed }).parse(await this.provider.call("list_plugins", {})).plugins.filter(item => ["stream-alert-authoring", "stream-overlay-authoring"].includes(item.id));
    const skills = z.object({ skills: listed }).parse(await this.provider.call("list_skills", {})).skills.filter(item => item.id === "hyperframes");
    return { mode: "live", provider: "opendesign", projects, scenarios, skills };
  }
  async project(name: string, id: string) {
    const result = z.object({ project: z.object({ id: z.string(), name: z.string() }) }).parse(await this.provider.call("create_project", { name, id }));
    return { mode: "live", project: result.project };
  }
  async start(input: unknown) {
    const args = startSchema.parse(input);
    const hash = createHash("sha256").update(JSON.stringify(args)).digest("hex");
    const reserved = this.journal.reserve({ requestId: args.requestId, project: args.project, recipe: args.recipe, status: "submitting" }, hash);
    if (!reserved.fresh) return reserved.operation;
    const operation = reserved.operation;
    try {
      const projects = z.object({ projects: listed }).parse(await this.provider.call("list_projects", {})).projects;
      if (!projects.some(item => item.id === args.project)) throw new CreativeError("PROJECT_NOT_FOUND", "Choose exact project ID from creative list.");
      if (args.recipe === "video") {
        const task = await startVideo(this.provider, args.project, args.requestId);
        return this.journal.save({ ...operation, ...task, status: "queued" });
      }
      const scenarios = z.object({ plugins: listed }).parse(await this.provider.call("list_plugins", {})).plugins;
      if (!scenarios.some(item => item.id === "stream-overlay-authoring")) throw new CreativeError("CAPABILITY_UNAVAILABLE", "Installed overlay scenario unavailable.");
      const run = z.object({ runId: z.string() }).parse(await this.provider.call("start_run", {
        project: args.project, plugin: "stream-overlay-authoring", requestId: args.requestId, agent: "codex", model: "gpt-6.1-sol",
        inputs: { variant: "camera-frame", title: args.title, style: "technical", copy: "Independent sessions · camera one", motion: "static", synthetic: true },
        prompt: "Pipeline QA: reuse bundled accepted camera-frame fixture and existing builder. System fonts only. Autonomous approval granted. Preserve all outputs. Build one offline versioned overlay and package; no original asset commissioning. Return exact HTML entry and source paths. No OBS operations.",
      }));
      return this.journal.save({ ...operation, runId: run.runId, status: "queued" });
    } catch (error) {
      this.journal.save({ ...operation, status: "unknown" });
      throw error;
    }
  }
  async run(requestId: string): Promise<Operation> {
    const operation = this.journal.get(requestId);
    if (!operation) throw new CreativeError("OPERATION_NOT_FOUND", "No creative operation for this request ID.");
    if (terminal.has(operation.status)) return operation;
    if (operation.runId) {
      const result = z.object({ status, previewUrl: z.string().optional() }).parse(await this.provider.call("get_run", { runId: operation.runId }));
      const previewUrl = deliveryUrl(result.previewUrl);
      if (operation.recipe === "video" && result.status === "succeeded") {
        const text = z.string().parse(await this.provider.call("get_file", { project: operation.project, path: VIDEO_RECEIPT }));
        const receipt = z.object({ taskId: z.string(), status: z.string(), result: z.object({ error: z.object({ message: z.string() }).optional() }).optional() }).parse(JSON.parse(text));
        if (!["done", "succeeded"].includes(receipt.status)) {
          const { file: _unconfirmed, ...known } = operation;
          return this.journal.save({ ...known, taskId: receipt.taskId, status: "failed", failureCode: receipt.result?.error?.message.includes("desktop frame renderer is unavailable") ? "RENDERER_UNAVAILABLE" : "RENDER_FAILED" });
        }
        const files = z.object({ files: z.array(z.object({ name: z.string(), size: z.number() })) }).parse(await this.provider.call("list_files", { project: operation.project }));
        if (!files.files.some(file => file.name === VIDEO_FILE && file.size > 0)) throw new CreativeError("ARTIFACT_MISSING", "Render receipt reports success but MP4 file is missing.");
        return this.journal.save({ ...operation, taskId: receipt.taskId, status: "succeeded", file: VIDEO_FILE });
      }
      if (operation.recipe === "overlay" && result.status === "succeeded") {
        const files = z.object({ files: z.array(z.object({ name: z.string(), size: z.number() })) }).parse(await this.provider.call("list_files", { project: operation.project }));
        const file = files.files.find(file => file.name.endsWith("/index.html") && !file.name.includes("hyperframes-cache") && file.size > 0);
        if (!file) throw new CreativeError("ARTIFACT_MISSING", "Scenario completed but no versioned HTML artifact was returned.");
        return this.journal.save({ ...operation, status: "succeeded", file: file.name, source: file.name.replace(/index\.html$/, "source.json"), ...(previewUrl ? { previewUrl } : {}) });
      }
      return this.journal.save({ ...operation, status: result.status, ...(previewUrl ? { previewUrl } : {}) });
    }
    if (operation.taskId) {
      const result = z.object({ tasks: z.array(z.object({ taskId: z.string(), status: z.enum(["queued", "running", "done", "failed", "interrupted"]), file: z.object({ name: z.string() }).nullable().optional() })) }).parse(await this.provider.api(`/api/projects/${encodeURIComponent(operation.project)}/media/tasks?includeDone=1`));
      const task = result.tasks.find(item => item.taskId === operation.taskId);
      if (!task) throw new CreativeError("CONTRACT_MISMATCH", "Returned media task missing from project; keep original task ID.");
      return this.journal.save({ ...operation, status: task.status === "done" ? "succeeded" : task.status === "interrupted" ? "failed" : task.status, ...(task.file ? { file: task.file.name } : {}) });
    }
    return operation.status === "submitting" ? this.journal.save({ ...operation, status: "unknown" }) : operation;
  }
  async artifact(project: string, entry: string) {
    if (entry.startsWith("/") || entry.split("/").includes("..")) throw new CreativeError("INVALID_INPUT", "Use exact project-relative artifact path.");
    const bundle = z.object({ files: z.array(z.object({ name: z.string(), content: z.string().nullable(), mime: z.string(), binary: z.boolean() })), truncated: z.boolean().optional() }).parse(await this.provider.call("get_artifact", { project, entry, include: "auto", maxBytes: 200_000 }));
    return { mode: "live", provider: "opendesign", project, entry, source: "existing-service", ...bundle };
  }
}
