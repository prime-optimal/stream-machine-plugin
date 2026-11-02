import { expect, test } from "bun:test";
import { compareVersions, inspectRelease } from "../src/update/releases";
const release = { id: 1, tag_name: "v0.4.0", draft: false, prerelease: false, body: "Changes", assets: [{ id: 2, name: "stream-machine-0.4.0.tar.gz", size: 12, digest: `sha256:${"a".repeat(64)}` }] };
test("numeric versions prevent lexicographic updates and downgrades", () => {
  expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
  expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  expect(inspectRelease(release, "0.5.0").kind).toBe("running-newer");
  expect(() => compareVersions("1.0.0-beta", "1.0.0")).toThrow();
});
test("release reports notes and only permits unambiguous digest assets", () => {
  expect(inspectRelease(release).package?.sha256).toBe("a".repeat(64));
  expect(inspectRelease({ ...release, assets: [...release.assets, ...release.assets] }).package).toBeNull();
  expect(inspectRelease({ ...release, assets: [{ ...release.assets[0], digest: null }] }).package).toBeNull();
  expect(() => inspectRelease({ ...release, prerelease: true })).toThrow();
  expect(inspectRelease({ ...release, assets: [...release.assets, { id: 3, name: "other", size: 0 }] }).package).not.toBeNull();
  expect(inspectRelease({ ...release, assets: [...release.assets, { id: 3, name: "large", size: 999999999 }] }).package).not.toBeNull();
  expect(inspectRelease(release).reloadStatus).toContain("not been verified");
});

import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { verifyArchive, verifyDigest } from "../src/update/archive";
import { createHash } from "node:crypto";

test("digest rejects corruption and size mismatch", () => {
  const bytes = Buffer.from("package");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  expect(() => verifyDigest(bytes, { bytes: bytes.length, sha256 })).not.toThrow();
  expect(() => verifyDigest(bytes, { bytes: 1, sha256 })).toThrow();
  expect(() => verifyDigest(bytes, { bytes: bytes.length, sha256: "a".repeat(64) })).toThrow();
});
test("archive inspection accepts complete package and rejects wrong identity, root, and symlink", async () => {
  const directory = await mkdtemp(join(tmpdir(), "update-test-"));
  try {
    for (const path of ["plugin.json", ".codex-plugin/plugin.json", "dist/server.js", "mcp.json", ".mcp.json", "skills/self-update/SKILL.md"]) {
      const file = join(directory, "stream-machine", path);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, path.endsWith("plugin.json") ? JSON.stringify({ name: "stream-machine", version: "0.4.0" }) : "fixture");
    }
    const archive = join(directory, "package.tar.gz");
    await create({ cwd: directory, file: archive, gzip: true }, ["stream-machine"]);
    await expect(verifyArchive(archive, "0.4.0")).resolves.toBeUndefined();
    await expect(verifyArchive(archive, "0.5.0")).rejects.toThrow();
    await rm(join(directory, "stream-machine/dist/server.js"));
    await mkdir(join(directory, "stream-machine/dist/server.js"));
    await create({ cwd: directory, file: archive, gzip: true }, ["stream-machine"]);
    await expect(verifyArchive(archive, "0.4.0")).rejects.toThrow("Missing package file");
    await rm(join(directory, "stream-machine/dist/server.js"), { recursive: true });
    await symlink("/etc/passwd", join(directory, "stream-machine/dist/server.js"));
    await create({ cwd: directory, file: archive, gzip: true }, ["stream-machine"]);
    await expect(verifyArchive(archive, "0.4.0")).rejects.toThrow("Unsafe or duplicate");
    await writeFile(join(directory, "wrong-root"), "fixture");
    await create({ cwd: directory, file: archive, gzip: true }, ["wrong-root"]);
    await expect(verifyArchive(archive, "0.4.0")).rejects.toThrow();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

import { Header } from "tar";
import { gzipSync } from "node:zlib";
test("oversized entry aborts at header before missing body is read", async () => {
  const directory = await mkdtemp(join(tmpdir(), "update-limit-test-"));
  try {
    const header = new Header({ path: "stream-machine/huge", type: "File", size: 251 * 1024 * 1024 });
    const block = Buffer.alloc(512);
    header.encode(block);
    const file = join(directory, "huge.tar.gz");
    await writeFile(file, gzipSync(block));
    await expect(verifyArchive(file, "0.4.0")).rejects.toThrow("inspection limits");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
