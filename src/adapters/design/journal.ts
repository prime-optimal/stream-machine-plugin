import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync, writeFileSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { CreativeError } from "./provider";

const retiredSchema = z.object({ recipe: z.literal("video"), requestId: z.uuid(), project: z.string(), runId: z.string().optional(), taskId: z.string().optional(), source: z.string().optional(), file: z.string().optional() });
export const operationSchema = z.object({
  requestId: z.uuid(), project: z.string(), recipe: z.enum(["overlay", "hyperframes-html", "brand-kit"]),
  status: z.enum(["submitting", "queued", "running", "succeeded", "failed", "canceled", "unknown"]),
  runId: z.string().optional(), source: z.string().optional(),
  file: z.string().optional(), previewUrl: z.string().optional(),
  failureCode: z.literal("LEGACY_RECIPE_RETIRED").optional(),
  legacy: retiredSchema.optional(),
});
export type Operation = z.infer<typeof operationSchema>;

export class CreativeJournal {
  private db: Database;
  constructor(path?: string) {
    const directory = process.env.STREAM_MACHINE_CREATIVE_STATE_DIR ?? join(homedir(), ".local", "state", "stream-machine");
    if (!isAbsolute(directory)) throw new CreativeError("CONFIGURATION_REQUIRED", "Creative state directory must be absolute.");
    const file = path ?? join(directory, "creative.sqlite");
    if (file !== ":memory:") {
      if (!isAbsolute(file)) throw new CreativeError("CONFIGURATION_REQUIRED", "Creative database path must be absolute.");
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      if (!path) chmodSync(directory, 0o700);
    }
    this.db = new Database(file, { create: true });
    if (file !== ":memory:") chmodSync(file, 0o600);
    this.db.run("CREATE TABLE IF NOT EXISTS creative_operations (id TEXT PRIMARY KEY, hash TEXT NOT NULL, value TEXT NOT NULL)");
    const rows = z.array(z.object({ id: z.string(), value: z.string() })).parse(this.db.query("SELECT id,value FROM creative_operations").all());
    const retired = rows.filter(row => z.object({ recipe: z.string() }).parse(JSON.parse(row.value)).recipe === "video");
    if (retired.length && file !== ":memory:") writeFileSync(`${file}.before-html-${Date.now()}`, this.db.serialize(), { mode: 0o600 });
    this.db.transaction(() => {
      for (const row of retired) {
        const legacy = retiredSchema.parse(JSON.parse(row.value));
        const value: Operation = { requestId: legacy.requestId, project: legacy.project, recipe: "hyperframes-html", status: "failed", failureCode: "LEGACY_RECIPE_RETIRED", legacy };
        this.db.run("UPDATE creative_operations SET value=? WHERE id=?", [JSON.stringify(value), row.id]);
      }
    })();
  }
  get(id: string) {
    const row = z.object({ value: z.string() }).nullable().parse(this.db.query("SELECT value FROM creative_operations WHERE id=?").get(id));
    return row ? operationSchema.parse(JSON.parse(row.value)) : undefined;
  }
  reserve(operation: Operation, hash: string): { fresh: boolean; operation: Operation } {
    return this.db.transaction(() => {
      const row = z.object({ hash: z.string(), value: z.string() }).nullable().parse(this.db.query("SELECT hash,value FROM creative_operations WHERE id=?").get(operation.requestId));
      if (row) {
        if (row.hash !== hash) throw new CreativeError("IDEMPOTENCY_CONFLICT", "Request ID already belongs to different inputs.");
        return { fresh: false, operation: operationSchema.parse(JSON.parse(row.value)) };
      }
      this.db.run("INSERT INTO creative_operations VALUES (?,?,?)", [operation.requestId, hash, JSON.stringify(operation)]);
      return { fresh: true, operation };
    })();
  }
  save(operation: Operation) { this.db.run("UPDATE creative_operations SET value=? WHERE id=?", [JSON.stringify(operation), operation.requestId]); return operation; }
  close() { this.db.close(); }
}
