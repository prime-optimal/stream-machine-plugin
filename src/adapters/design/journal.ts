import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { CreativeError } from "./provider";

export const operationSchema = z.object({
  requestId: z.uuid(), project: z.string(), recipe: z.enum(["overlay", "video"]),
  status: z.enum(["submitting", "queued", "running", "succeeded", "failed", "canceled", "unknown"]),
  runId: z.string().optional(), taskId: z.string().optional(), source: z.string().optional(),
  file: z.string().optional(), previewUrl: z.string().optional(),
  failureCode: z.enum(["RENDERER_UNAVAILABLE", "RENDER_FAILED", "AUTHORING_INCOMPLETE"]).optional(),
});
export type Operation = z.infer<typeof operationSchema>;

export class CreativeJournal {
  private db: Database;
  constructor(path?: string) {
    const directory = process.env.STREAM_MACHINE_CREATIVE_STATE_DIR ?? join(homedir(), ".local", "state", "stream-machine");
    if (!isAbsolute(directory)) throw new CreativeError("CONFIGURATION_REQUIRED", "Creative state directory must be absolute.");
    if (path !== ":memory:") { mkdirSync(directory, { recursive: true, mode: 0o700 }); chmodSync(directory, 0o700); }
    this.db = new Database(path ?? join(directory, "creative.sqlite"), { create: true });
    if (!path) chmodSync(join(directory, "creative.sqlite"), 0o600);
    this.db.run("CREATE TABLE IF NOT EXISTS creative_operations (id TEXT PRIMARY KEY, hash TEXT NOT NULL, value TEXT NOT NULL)");
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
