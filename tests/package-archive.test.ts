import { afterEach, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { includePackagePath, validateArchiveEntries } from "../scripts/package-archive";

const source = resolve(import.meta.dir, "..");
const folders: string[] = [];
test("packaging excludes the independent Site checkout and its runtime state", () => {
  for (const path of ["docs/hosted-oauth-site", "docs/hosted-oauth-site/.git/config", "docs/hosted-oauth-site/node_modules/a", "docs/hosted-oauth-site/.wrangler/state"]) {
    expect(includePackagePath(source, join(source, path))).toBe(false);
  }
  expect(includePackagePath(source, join(source, "docs/hosted-mcp.md"))).toBe(true);
});
afterEach(async () => { for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true }); });

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "stream-machine-package-"));
  folders.push(root);
  for (const path of ["scripts", "docs/nested", "dist", "node_modules"]) {
    await mkdir(join(root, path), { recursive: true });
  }
  for (const file of ["plugin.json", "mcp.json", "fnox.toml"]) await cp(join(source, file), join(root, file));
  for (const file of await readdir(join(source, "scripts"))) {
    if (file === "package.ts" || file === "package-archive.ts") await cp(join(source, "scripts", file), join(root, "scripts", file));
  }
  for (const skill of ["onboarding", "preview-recipe", "self-update"]) {
    await mkdir(join(root, "skills", skill), { recursive: true });
    await writeFile(join(root, "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: Fixture\n---\nFixture\n`);
  }
  await writeFile(join(root, "docs/nested/guide.md"), "Fixture guide\n");
  await writeFile(join(root, "dist/server.js"), "Fixture server\n");
  return root;
}

test("packaging ignores Finder metadata before staging without changing source files", async () => {
  const root = await fixture();
  const metadata = ["docs/.DS_Store", "docs/nested/._guide.md", "skills/.DS_Store", "skills/onboarding/._SKILL.md", "dist/.DS_Store"];
  for (const path of metadata) await writeFile(join(root, path), "Finder metadata");
  const result = Bun.spawnSync([process.execPath, join(root, "scripts/package.ts")], { cwd: root });
  expect(result.stderr.toString()).not.toContain("Unexpected archive contents");
  expect(result.exitCode).toBe(0);
  for (const path of metadata) expect(await readFile(join(root, path), "utf8")).toBe("Finder metadata");
  for (const path of metadata) expect(await Bun.file(join(root, "artifacts/package/stream-machine", path)).exists()).toBe(false);
}, 30_000);

async function runPackage(root: string, extraEnv: Record<string, string> = {}) {
  return Bun.spawnSync([process.execPath, join(root, "scripts/package.ts")], { cwd: root, env: { ...process.env, ...extraEnv } });
}

async function snapshot(root: string, path = ""): Promise<[string, string][]> {
  const result: [string, string][] = [];
  for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
    const child = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await snapshot(root, child));
    else result.push([child, await readFile(join(root, child), "base64")]);
  }
  return result.sort(([a], [b]) => a.localeCompare(b));
}

test("real ZIP and tar.gz preserve the same root, hidden manifests, and file bytes", async () => {
  const root = await fixture();
  await mkdir(join(root, "docs/packages"));
  await writeFile(join(root, "docs/packages/stale.zip"), "Excluded previous archive");
  await mkdir(join(root, "docs/packages-guide"));
  await writeFile(join(root, "docs/packages-guide/guide.md"), "Keep sibling directory");
  expect((await runPackage(root)).exitCode).toBe(0);
  const { version } = await Bun.file(join(root, "plugin.json")).json();
  const archive = join(root, `docs/packages/stream-machine-${version}`);
  expect([...new Uint8Array(await Bun.file(archive + ".zip").arrayBuffer()).slice(0, 4)]).toEqual([80, 75, 3, 4]);
  const extracted = [];
  for (const extension of ["tar.gz", "zip"]) {
    const dir = join(root, "extracted-" + extension);
    await mkdir(dir);
    const args = extension === "zip" ? ["unzip", "-q", archive + ".zip", "-d", dir] : ["tar", "-xzf", archive + ".tar.gz", "-C", dir];
    expect(Bun.spawnSync(args).exitCode).toBe(0);
    expect(await readdir(dir)).toEqual(["stream-machine"]);
    extracted.push(await snapshot(join(dir, "stream-machine")));
  }
  const staged = await snapshot(join(root, "artifacts/package/stream-machine"));
  expect(extracted[0]).toEqual(staged);
  expect(extracted[1]).toEqual(staged);
  expect(staged.some(([path]) => path === ".codex-plugin/plugin.json")).toBe(true);
  expect(staged.some(([path]) => path === ".mcp.json")).toBe(true);
  expect(staged.some(([path]) => path === "docs/packages-guide/guide.md")).toBe(true);
  expect(staged.some(([path]) => path.startsWith("docs/packages/"))).toBe(false);
}, 30_000);

test("forbidden payload and missing archiver fail without leaving stale output pairs", async () => {
  for (const scenario of ["forbidden", "missing-tool"]) {
    const root = await fixture();
    const { version } = await Bun.file(join(root, "plugin.json")).json();
    await mkdir(join(root, "docs/packages"));
    const archives = ["tar.gz", "zip"].map(extension => join(root, `docs/packages/stream-machine-${version}.${extension}`));
    for (const path of archives) await writeFile(path, "Stale archive");
    if (scenario === "forbidden") await writeFile(join(root, "docs/.env"), "not a credential");
    const result = await runPackage(root, scenario === "missing-tool" ? { PATH: "/nonexistent" } : {});
    expect(result.exitCode).not.toBe(0);
    for (const path of archives) expect(await Bun.file(path).exists()).toBe(false);
  }
}, 30_000);

test("both archive listings use strict rejection checks", () => {
  expect(() => validateArchiveEntries(["stream-machine/", "stream-machine/.mcp.json", "stream-machine/docs/guide.md"])).not.toThrow();
  for (const path of [
    "outside/file", "/stream-machine/file", "stream-machine/../file", "stream-machine/./file",
    "stream-machine/node_modules/a", "stream-machine/.env", "stream-machine/.git/config",
    "stream-machine/.git", "stream-machine/docs/.DS_Store", "stream-machine/docs/._guide",
    "stream-machine/a\\b", "stream-machine/a\nb", "stream-machine//file",
  ]) expect(() => validateArchiveEntries([path])).toThrow("Unexpected archive contents");
  expect(() => validateArchiveEntries([])).toThrow();
  expect(() => validateArchiveEntries(["stream-machine/", "stream-machine/"])).toThrow();
});
