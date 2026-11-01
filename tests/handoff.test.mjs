import { test, expect } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/check-handoff.sh", import.meta.url));
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.invalid",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.invalid",
};

test("handoff checks real Git states without changing files, index, or refs", () => {
  const root = mkdtempSync(join(tmpdir(), "stream-machine-handoff-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const check = (status, message) => {
    const before = {
      head: git("rev-parse", "HEAD"),
      refs: git("show-ref"),
      index: readFileSync(join(root, ".git/index")),
      file: readFileSync(join(root, "file.txt")),
      status: git("status", "--porcelain=v1", "--untracked-files=all"),
    };
    const result = spawnSync("bash", [script], { cwd: root, env, encoding: "utf8" });
    expect(result.status).toBe(status);
    expect(result.stdout + result.stderr).toContain(message);
    expect(git("rev-parse", "HEAD")).toBe(before.head);
    expect(git("show-ref")).toBe(before.refs);
    expect(readFileSync(join(root, ".git/index"))).toEqual(before.index);
    expect(readFileSync(join(root, "file.txt"))).toEqual(before.file);
    expect(git("status", "--porcelain=v1", "--untracked-files=all")).toBe(before.status);
  };

  try {
    git("init", "-b", "task");
    writeFileSync(join(root, "file.txt"), "base\n");
    git("add", "file.txt");
    git("commit", "-m", "test: initial");
    const base = git("rev-parse", "HEAD");
    check(1, "No upstream");
    git("remote", "add", "origin", join(root, "unused-remote"));
    git("update-ref", "refs/remotes/origin/task", base);
    git("branch", "--set-upstream-to=origin/task");
    check(0, "Handoff ready");
    writeFileSync(join(root, ".git/info/exclude"), "cache.txt\n");
    writeFileSync(join(root, "cache.txt"), "ignored\n");
    check(0, "Handoff ready");
    git("config", "branch.task.remote", ".");
    check(1, "remote-tracking branch");
    git("config", "branch.task.remote", "origin");

    writeFileSync(join(root, "file.txt"), "changed\n");
    check(1, "changes remain");
    git("add", "file.txt");
    check(1, "changes remain");
    git("commit", "-m", "test: second");
    const second = git("rev-parse", "HEAD");
    check(1, "Unpushed commits: 1");
    git("update-ref", "refs/remotes/origin/task", second);
    check(0, "Handoff ready");

    writeFileSync(join(root, "untracked.txt"), "local\n");
    check(1, "changes remain");
    rmSync(join(root, "untracked.txt"));
    git("reset", "--hard", base);
    check(1, "Upstream commits missing locally: 1");
    git("reset", "--hard", second);
    git("checkout", "--detach");
    check(1, "HEAD is detached");
    git("checkout", "task");
    git("update-ref", "-d", "refs/remotes/origin/task");
    check(1, "upstream");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
