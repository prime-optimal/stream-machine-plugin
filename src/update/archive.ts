import { createHash } from "node:crypto";
import { mkdtemp, chmod, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReadEntry, Parser } from "tar";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { github, checkRelease } from "./releases";

const manifest = z.object({ name: z.literal("stream-machine"), version: z.string() });
export async function verifyArchive(file: string, expectedVersion: string) {
  const paths = new Set<string>();
  const files = new Set<string>();
  const manifests: string[] = [];
  const pending: Promise<void>[] = [];
  let expanded = 0;
  let inspectionError: unknown;
  const parser = new Parser({ strict: true, onReadEntry(entry: ReadEntry) {
    try {
    const path = entry.path.replace(/\/$/, "");
    expanded += entry.size;
    if (paths.size > 20_000 || expanded > 250 * 1024 * 1024) throw new Error("Archive exceeds inspection limits.");
    if (!path.startsWith("stream-machine/") && path !== "stream-machine") throw new Error("Unexpected archive root.");
    if (path.split("/").some(part => part === ".." || part === "." || /^(\.git|node_modules|\.env.*|fnox\.local\.toml|\.DS_Store|\._.*)$/.test(part))) throw new Error("Unsafe archive path.");
    if (!["File", "Directory"].includes(entry.type) || paths.has(path)) throw new Error("Unsafe or duplicate archive entry.");
    paths.add(path);
    if (entry.type === "File") files.add(path);
    if (["stream-machine/plugin.json", "stream-machine/.codex-plugin/plugin.json"].includes(path)) {
      if (entry.size > 64 * 1024) throw new Error("Manifest exceeds size limit.");
      pending.push(new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        entry.on("data", chunk => chunks.push(Buffer.from(chunk)));
        entry.on("error", reject);
        entry.on("end", () => { manifests.push(Buffer.concat(chunks).toString()); resolve(); });
      }));
    }
    entry.resume();
    } catch (error) { parser.abort(error instanceof Error ? error : new Error("Archive inspection failed.")); }
  } });
  parser.on("error", error => { inspectionError = error; });
  const completed = new Promise<void>(resolve => { parser.on("end", resolve); parser.on("abort", resolve); });
  const source = createReadStream(file, { highWaterMark: 16 * 1024 });
  try {
    for await (const chunk of source) { parser.write(chunk); if (inspectionError) throw inspectionError; }
    parser.end();
    await completed;
    if (inspectionError) throw inspectionError;
    await Promise.all(pending);
  } finally { source.destroy(); }
  if (inspectionError) throw inspectionError;
  if (manifests.length !== 2 || manifests.some(text => manifest.parse(JSON.parse(text)).version !== expectedVersion)) throw new Error("Archive plugin identity or version mismatch.");
  for (const path of ["dist/server.js", "mcp.json", ".mcp.json", "skills/self-update/SKILL.md"]) if (!files.has(`stream-machine/${path}`)) throw new Error(`Missing package file: ${path}`);
}
export function verifyDigest(bytes: Buffer, expected: { bytes: number; sha256: string }) {
  if (bytes.length !== expected.bytes || createHash("sha256").update(bytes).digest("hex") !== expected.sha256) throw new Error("Release archive size or SHA-256 mismatch.");
}
export async function prepareUpdate() {
  const candidate = await checkRelease();
  if (candidate.kind !== "available" || !candidate.package) throw new Error("No newer stable release with a SHA-256 verified package is available.");
  const bytes = await github(`releases/assets/${candidate.package.assetId}`, true);
  verifyDigest(bytes, candidate.package);
  const fresh = await checkRelease();
  if (JSON.stringify(fresh) !== JSON.stringify(candidate)) throw new Error("Release changed during download. Check again.");
  const directory = await mkdtemp(join(tmpdir(), "stream-machine-update-"));
  await chmod(directory, 0o700);
  const archive = join(directory, candidate.package.name);
  try {
    await writeFile(archive, bytes, { mode: 0o600 });
    await verifyArchive(archive, candidate.availableVersion);
    return { ...candidate, archive, verification: "SHA-256, size, paths, manifests, and required files verified. Rehash before upload.", reloadStatus: "Package prepared only. No saved release or host reload verified." };
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}
