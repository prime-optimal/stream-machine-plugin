import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

const helper = resolve(import.meta.dir, "../scripts/release-plan.py");
const folders: string[] = [];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
const output = z.object({ changed: z.boolean(), version: z.string(), source: z.string(), boundary: z.string() });
const files = [".cz.toml", "package.json", "plugin.json", "src/version.ts", ".release-state.json", "docs/CHANGELOG.md"];

afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }); });

function git(folder: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: folder, env });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function fixture() {
  const folder = mkdtempSync(join(tmpdir(), "stream-machine-release-"));
  folders.push(folder);
  mkdirSync(join(folder, "src"));
  mkdirSync(join(folder, "docs"));
  writeFileSync(join(folder, ".cz.toml"), '[tool.commitizen]\nname = "cz_conventional_commits"\nversion = "0.2.0"\nversion_scheme = "semver"\ntag_format = "v$version"\nchangelog_file = "docs/CHANGELOG.md"\n');
  writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "fixture", version: "0.2.0", dependency: "0.2.0" }, null, 2) + "\n");
  writeFileSync(join(folder, "plugin.json"), '{"version":"0.2.0"}\n');
  writeFileSync(join(folder, "src/version.ts"), 'export const version = "0.2.0";\n');
  writeFileSync(join(folder, "docs/CHANGELOG.md"), "## Unreleased\n\n### Feat\n\n- stale draft\n\n## 0.2.0 (2026-01-01)\n\n- shipped feature\n");
  git(folder, "init", "--initial-branch=main");
  git(folder, "config", "user.name", "Release fixture");
  git(folder, "config", "user.email", "fixture@example.invalid");
  git(folder, "config", "commit.gpgsign", "false");
  git(folder, "config", "core.hooksPath", "/dev/null");
  git(folder, "add", ".cz.toml", "package.json", "plugin.json", "src/version.ts", "docs/CHANGELOG.md");
  git(folder, "commit", "-m", "feat: shipped feature");
  const baseline = git(folder, "rev-parse", "HEAD");
  writeFileSync(join(folder, ".release-state.json"), JSON.stringify({ schemaVersion: 1, releasedThrough: baseline }) + "\n");
  git(folder, "add", ".release-state.json");
  git(folder, "commit", "-m", "chore: record boundary");
  return folder;
}

function run(folder: string, mode: "preview" | "prepare") {
  const result = Bun.spawnSync(["uv", "run", helper, mode], { cwd: folder, env });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return output.parse(JSON.parse(result.stdout.toString()));
}

function snapshot(folder: string) {
  return files.map(file => readFileSync(join(folder, file), "utf8"));
}

test("preview is read-only; prepare is repeatable, preserves history, and creates no refs", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat(ui): new navigation");
  const head = git(folder, "rev-parse", "HEAD");
  const original = snapshot(folder);
  expect(run(folder, "preview")).toMatchObject({ changed: true, version: "0.3.0", source: head });
  expect(snapshot(folder)).toEqual(original);
  expect(run(folder, "prepare").version).toBe("0.3.0");
  const prepared = snapshot(folder);
  expect(run(folder, "prepare")).toMatchObject({ changed: false, version: "0.3.0", boundary: head });
  expect(snapshot(folder)).toEqual(prepared);
  expect(git(folder, "rev-parse", "HEAD")).toBe(head);
  expect(git(folder, "tag", "--list")).toBe("");
  expect(readFileSync(join(folder, "package.json"), "utf8")).toContain('"dependency": "0.2.0"');
  const log = readFileSync(join(folder, "docs/CHANGELOG.md"), "utf8");
  expect(log).toContain("new navigation");
  expect(log).toContain("## 0.2.0 (2026-01-01)");
  expect(log).not.toContain("stale draft");
}, 30_000);

test("release-only merge is a no-op; next fix uses only the next range", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat: first feature");
  run(folder, "prepare");
  git(folder, "add", ...files);
  git(folder, "commit", "-m", "chore(release): prepare 0.3.0");
  const prepared = snapshot(folder);
  expect(run(folder, "prepare")).toMatchObject({ changed: false, version: "0.3.0" });
  git(folder, "commit", "--allow-empty", "-m", "docs: explain feature");
  expect(run(folder, "prepare").changed).toBe(false);
  expect(snapshot(folder)).toEqual(prepared);
  git(folder, "commit", "--allow-empty", "-m", "fix: second change");
  expect(run(folder, "prepare")).toMatchObject({ changed: true, version: "0.3.1" });
  const log = readFileSync(join(folder, "docs/CHANGELOG.md"), "utf8");
  expect(log.split("first feature")).toHaveLength(2);
  expect(log).toContain("second change");
  expect(log).toContain("## 0.3.0");
  expect(log).toContain("## 0.3.1");
}, 30_000);

test("Commitizen handles breaking changes without custom bump rules", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat!: remove old API");
  expect(run(folder, "preview")).toMatchObject({ changed: true, version: "1.0.0" });
}, 30_000);

test("same-day releases remain newest first with v-prefixed tag configuration", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat: newest feature");
  const day = git(folder, "show", "-s", "--format=%cs", "HEAD");
  writeFileSync(join(folder, "docs/CHANGELOG.md"), `# Changelog\n\n## 0.2.0 (${day})\n\n- shipped feature\n`);
  run(folder, "prepare");
  const log = readFileSync(join(folder, "docs/CHANGELOG.md"), "utf8");
  expect(log).toStartWith(`# Changelog\n\n## 0.3.0 (${day})`);
  expect(log.indexOf("## 0.3.0")).toBeLessThan(log.indexOf("## 0.2.0"));
  expect(log).toContain("shipped feature");
}, 30_000);

test("Commitizen recognizes BREAKING CHANGE footers", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat: replace API", "-m", "BREAKING CHANGE: old API removed");
  expect(run(folder, "preview")).toMatchObject({ changed: true, version: "1.0.0" });
}, 30_000);

test("version disagreement and invalid boundary fail before any write", () => {
  const folder = fixture();
  git(folder, "commit", "--allow-empty", "-m", "feat: unreleased feature");
  writeFileSync(join(folder, "plugin.json"), '{"version":"9.9.9"}\n');
  const before = snapshot(folder);
  expect(() => run(folder, "prepare")).toThrow("Version mismatch");
  expect(snapshot(folder)).toEqual(before);
  writeFileSync(join(folder, "plugin.json"), '{"version":"0.2.0"}\n');
  writeFileSync(join(folder, ".release-state.json"), JSON.stringify({ schemaVersion: 1, releasedThrough: "0".repeat(40) }));
  const invalid = snapshot(folder);
  expect(() => run(folder, "prepare")).toThrow();
  expect(snapshot(folder)).toEqual(invalid);
}, 30_000);
