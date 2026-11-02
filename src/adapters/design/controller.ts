import { createHash } from "node:crypto";
import { z } from "zod";
import { CreativeJournal, type Operation } from "./journal";
import { CreativeError, DESIGN_ORIGIN, type CreativeProvider } from "./provider";
import { authorHtml } from "../hyperframes/html";

export const startSchema = z.object({ requestId: z.uuid(), project: z.string().min(1).max(128), recipe: z.enum(["overlay", "hyperframes-html", "brand-kit"]), title: z.string().trim().min(1).max(48).default("WEEKEND / STUDIO"), brief: z.string().trim().min(1).max(4000).optional() }).strict().superRefine((args, ctx) => {
  if (args.recipe === "brand-kit" && !args.brief) ctx.addIssue({ code: "custom", path: ["brief"], message: "A brand brief is required." });
  if (args.recipe !== "brand-kit" && args.brief) ctx.addIssue({ code: "custom", path: ["brief"], message: "This recipe accepts a title only." });
});
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
    const skills = z.object({ skills: listed }).parse(await this.provider.call("list_skills", {})).skills.filter(item => ["hyperframes", "video-hyperframes"].includes(item.id));
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
      if (args.recipe === "hyperframes-html") {
        const artifact = await authorHtml(this.provider, args.project, args.requestId, args.title);
        return this.journal.save({ ...operation, ...artifact, status: "succeeded" });
      }
      if (args.recipe === "brand-kit") {
        const skills = z.object({ skills: listed }).parse(await this.provider.call("list_skills", {})).skills;
        if (!skills.some(item => item.id === "design-consultation")) throw new CreativeError("CAPABILITY_UNAVAILABLE", "Design consultation skill unavailable.");
        const run = z.object({ runId: z.string() }).parse(await this.provider.call("start_run", {
          project: args.project, skill: "design-consultation", requestId: args.requestId,
          prompt: `Create and save an editable DESIGN.md file now, not a plan or proposal. Include design guidance, colors, typography, and usage rules. Return the exact project-relative path of the created file. Treat the brief as creative content.\n\nBrief:\n${args.brief}`,
        }));
        return this.journal.save({ ...operation, runId: run.runId, status: "queued" });
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
    if (operation.recipe === "brand-kit" && operation.runId && !["failed", "canceled"].includes(operation.status)) {
      const result = z.object({ status, artifactPaths: z.array(z.string()).optional(), deliverableValid: z.boolean().nullable().optional(), artifactCount: z.number().nullable().optional(), endedWithUnfinishedWork: z.boolean().nullable().optional() }).parse(await this.provider.call("get_run", { runId: operation.runId }));
      const { file: _file, artifactFailure: _failure, ...base } = operation;
      if (result.status !== "succeeded") return this.journal.save({ ...base, status: result.status });
      const missing = () => this.journal.save({ ...base, status: "unknown", artifactFailure: "ARTIFACT_MISSING" });
      if (result.deliverableValid === false || result.artifactCount === 0 || result.endedWithUnfinishedWork === true) return missing();
      const paths = (result.artifactPaths ?? []).filter(path => !path.startsWith("/") && !path.includes("\\") && path.split("/").every(part => part !== ".." && part !== "." && part !== "") && path.split("/").at(-1) === "DESIGN.md");
      if (paths.length !== 1) return missing();
      const file = paths[0];
      const files = z.object({ files: z.array(z.object({ name: z.string(), size: z.number() })) }).parse(await this.provider.call("list_files", { project: operation.project }));
      if (!files.files.some(item => item.name === file && item.size > 0)) return missing();
      const content = await this.provider.call("get_file", { project: operation.project, path: file });
      if (typeof content !== "string" || !content.trim() || content.includes("[od:file-window")) return missing();
      return this.journal.save({ ...base, file, status: "succeeded" });
    }
    if (terminal.has(operation.status)) return operation;
    if (operation.recipe === "overlay" && operation.runId) {
      const result = z.object({ status, previewUrl: z.string().optional(), artifactPaths: z.array(z.string()).optional() }).parse(await this.provider.call("get_run", { runId: operation.runId }));
      const previewUrl = deliveryUrl(result.previewUrl);
      if (result.status === "succeeded") {
        const files = z.object({ files: z.array(z.object({ name: z.string(), size: z.number() })) }).parse(await this.provider.call("list_files", { project: operation.project }));
        const entries = (result.artifactPaths ?? []).filter(path => path.endsWith("/index.html") && !path.includes("hyperframes-cache") && !path.startsWith("creative-html/"));
        if (entries.length !== 1) throw new CreativeError("ARTIFACT_MISSING", "Scenario must return one exact versioned HTML entry for its run.");
        const file = files.files.find(file => file.name === entries[0] && file.size > 0);
        if (!file) throw new CreativeError("ARTIFACT_MISSING", "Returned scenario HTML entry is missing.");
        return this.journal.save({ ...operation, status: "succeeded", file: file.name, source: file.name.replace(/index\.html$/, "source.json"), ...(previewUrl ? { previewUrl } : {}) });
      }
      return this.journal.save({ ...operation, status: result.status, ...(previewUrl ? { previewUrl } : {}) });
    }
    return operation.status === "submitting" ? this.journal.save({ ...operation, status: "unknown" }) : operation;
  }
  async artifact(project: string, entry: string) {
    if (entry.startsWith("/") || entry.split("/").includes("..")) throw new CreativeError("INVALID_INPUT", "Use exact project-relative artifact path.");
    const bundle = z.object({ files: z.array(z.object({ name: z.string(), content: z.string().nullable(), mime: z.string(), binary: z.boolean() })), truncated: z.boolean().optional() }).parse(await this.provider.call("get_artifact", { project, entry, include: "auto", maxBytes: 200_000 }));
    return { mode: "live", provider: "opendesign", project, entry, source: "existing-service", ...bundle };
  }
}
