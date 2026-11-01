import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve(import.meta.dir, "../scripts/check-staged-secrets.ts");
const roots: string[] = [];
const token = "ghp_" + "Ab9Cd8Ef7Gh6Ij5Kl4Mn3Op2Qr1St0Uv9Wx8";
const secret = `github_token = "${token}"\n`;
const reference = 'github_token = "op://vault/item/field"\n';
const env = {
  ...Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !key.startsWith("GIT_") && !key.startsWith("GITLEAKS_"))),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "staged-secrets-"));
  roots.push(root);
  function git(...args: string[]) {
    const result = spawnSync("git", args, { cwd: root, env });
    if (result.status !== 0) throw new Error("Fixture Git command failed");
    return result.stdout;
  }
  git("init", "-q");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-qm", "fixture");
  function write(path: string, content: string) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  function stage(path: string, content: string) { write(path, content); git("add", "-f", "--", path); }
  function snapshot() {
    const files: Record<string, string> = {};
    function visit(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) visit(path);
        else files[path] = readFileSync(path).toString("base64");
      }
    }
    visit(root);
    return files;
  }
  function check(code: number, extraEnv: Record<string, string> = {}) {
    const before = snapshot();
    const result = spawnSync(process.execPath, [script], { cwd: root, env: { ...env, ...extraEnv } });
    const output = Buffer.concat([result.stdout, result.stderr]).toString();
    expect(output.includes(token)).toBe(false);
    expect(result.status).toBe(code);
    expect(result.stderr.toString()).toBe("");
    expect(output).toBe(code === 0 ? "Staged secret check passed.\n" : code === 1
      ? "Staged secret check failed: secret detected.\n"
      : "Staged secret check failed: verification incomplete.\n");
    expect(snapshot()).toEqual(before);
  }
  return { root, git, write, stage, check };
}

test("empty and ordinary index", () => {
  const f = fixture(); f.check(0); f.stage("normal.txt", "ordinary text\n"); f.check(0);
});
test("synthetic token detected without leaking output", () => {
  const f = fixture(); f.stage("token.txt", secret); f.check(1);
});
test("fnox references committable, mixed reference and secret rejected", () => {
  const f = fixture(); f.stage("fnox.toml", reference); f.check(0);
  f.stage("fnox.toml", reference.trim() + " " + secret); f.check(1);
});
test("clean staged blob ignores unstaged secret", () => {
  const f = fixture(); f.stage("partial.txt", "clean\n"); f.write("partial.txt", secret); f.check(0);
});
test("staged secret ignores clean unstaged blob", () => {
  const f = fixture(); f.stage("partial.txt", secret); f.write("partial.txt", "clean\n"); f.check(1);
});
test("complete blob scanned including unchanged lines", () => {
  const f = fixture(); f.stage("old.txt", secret);
  f.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
  f.stage("old.txt", secret + "new line\n"); f.check(1);
});
test("renames, deletions, spaces and newlines", () => {
  const f = fixture(); f.stage("old.txt", "clean\n");
  f.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
  f.git("mv", "old.txt", "new name\n.txt"); f.check(0);
  f.stage("new name\n.txt", secret); f.check(1);
  f.git("rm", "-f", "new name\n.txt"); f.check(0);
});
test("ignored local credentials and encrypted caches rejected", () => {
  for (const path of ["fnox.local.toml", ".cache/fnox/cache", ".fnox/cache.age", ".env.local", "x/private.key", "credentials.json", "mise.local.toml"]) {
    const f = fixture(); f.write(".gitignore", path + "\n");
    f.stage(path, "encrypted or local fixture\n"); f.check(2);
  }
});
test("scanner cannot be disabled by inherited config or allow comments", () => {
  const f = fixture(); f.stage("token.txt", secret.trim() + " # gitleaks:allow\n");
  f.write(".gitleaksignore", "anything\n");
  f.check(1, { GITLEAKS_CONFIG: "/missing-config", GITLEAKS_CONFIG_TOML: "invalid" });
});
test("alternate index selects staged contents without changing either index", () => {
  const f = fixture(); f.stage("token.txt", secret);
  const alternate = join(f.root, "alternate-index");
  writeFileSync(alternate, readFileSync(join(f.root, ".git/index")));
  f.stage("token.txt", "clean\n");
  f.check(0); f.check(1, { GIT_INDEX_FILE: alternate });
});
test("unsupported index modes and unresolved conflicts fail closed", () => {
  const f = fixture(); f.stage("normal.txt", "clean\n");
  const oid = f.git("rev-parse", ":normal.txt").toString().trim();
  f.git("update-index", "--add", "--cacheinfo", `120000,${oid},link`); f.check(2);
  f.git("update-index", "--force-remove", "link");
  const conflict = spawnSync("git", ["update-index", "--index-info"], {
    cwd: f.root, env, input: `100644 ${oid} 1\tconflict.txt\n100644 ${oid} 2\tconflict.txt\n`,
  });
  expect(conflict.status).toBe(0); f.check(2);
});
test("scanner errors and missing binary fail closed without leaking diagnostics", () => {
  const f = fixture(); f.stage("clean.txt", "clean\n");
  const bin = join(f.root, "bin"); mkdirSync(bin);
  const gitPath = spawnSync("which", ["git"], { env }).stdout.toString().trim();
  f.write("bin/git", `#!/bin/sh\nexec '${gitPath}' "$@"\n`); chmodSync(join(bin, "git"), 0o755);
  f.check(2, { PATH: bin });
  f.write("bin/gitleaks", `#!/bin/sh\nprintf '%s' '${token}' >&2\nexit 2\n`);
  chmodSync(join(bin, "gitleaks"), 0o755); f.check(2, { PATH: bin });
});
