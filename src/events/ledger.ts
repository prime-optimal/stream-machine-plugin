import { createHash } from "node:crypto";
import { open, lstat } from "node:fs/promises";
import { z } from "zod";

const recordSchema = z.strictObject({ version: z.literal(1), key: z.string().regex(/^[a-f0-9]{64}$/) });

export class EventLedger {
  private keys = new Set<string>();
  constructor(private file: Awaited<ReturnType<typeof open>>, private capacity: number) {}

  static async open(path: string, capacity = 10_000) {
    const info = await lstat(path).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw new Error("LEDGER_UNAVAILABLE");
    });
    if (info && (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || info.uid !== process.getuid?.() || info.size > 1_000_000)) throw new Error("LEDGER_UNSAFE");
    const file = await open(path, "a+", 0o600);
    const ledger = new EventLedger(file, capacity);
    try {
      const contents = await file.readFile("utf8");
      if (contents && !contents.endsWith("\n")) throw new Error("LEDGER_CORRUPT");
      for (const line of contents.split("\n").filter(Boolean)) {
        const record = recordSchema.parse(JSON.parse(line));
        if (ledger.keys.has(record.key)) throw new Error("LEDGER_CORRUPT");
        ledger.keys.add(record.key);
      }
      if (ledger.keys.size > capacity) throw new Error("LEDGER_FULL");
      return ledger;
    } catch {
      await file.close();
      throw new Error("LEDGER_CORRUPT");
    }
  }

  get size() { return this.keys.size; }
  get full() { return this.keys.size >= this.capacity; }

  async reserve(id: string): Promise<"reserved" | "duplicate"> {
    const key = createHash("sha256").update(id).digest("hex");
    if (this.keys.has(key)) return "duplicate";
    if (this.full) throw new Error("LEDGER_FULL");
    this.keys.add(key);
    await this.file.appendFile(JSON.stringify({ version: 1, key }) + "\n");
    await this.file.sync();
    return "reserved";
  }

  async close() { await this.file.close(); }
}
