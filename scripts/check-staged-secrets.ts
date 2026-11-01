import { spawnSync } from "node:child_process";

const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };

function git(args: string[]): Buffer {
  const result = spawnSync("git", ["--no-optional-locks", ...args], {
    env, maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error("Git failed");
  return result.stdout;
}

function protectedPath(path: string): boolean {
  return path.split("/").some(part =>
    /^\.env/i.test(part) || /\.(pem|key)$/i.test(part) ||
    /credentials|service[-_]?account/i.test(part) ||
    /^(fnox\.local\.toml|\.?mise\.local\.toml)$/i.test(part) ||
    /^(\.cache|\.fnox|\.aws|\.ssh|\.gnupg|\.config|\.omp|\.claude|\.codex|\.cursor|\.opencode|\.ruff_cache|\.pytest_cache|\.mypy_cache|\.tox|\.next|\.turbo|node_modules|\.venv)$/i.test(part));
}

function check(): number {
  const paths = git(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--no-renames", "-z", "--"])
    .toString("utf8").split("\0").filter(Boolean);
  if (git(["ls-files", "--unmerged", "-z"]).length) return 2;
  if (paths.some(protectedPath)) return 2;
  let detected = false;
  let incomplete = false;
  for (const path of paths) {
    const entries = git(["ls-files", "--stage", "-z", "--", `:(literal)${path}`])
      .toString("utf8").split("\0").filter(Boolean);
    const entry = entries[0];
    const match = entry && /^(100644|100755) ([a-f0-9]+) 0\t/.exec(entry);
    if (entries.length !== 1 || !match) { incomplete = true; continue; }
    const blob = git(["cat-file", "blob", match[2]]);
    const scannerEnv = Object.fromEntries(Object.entries(env)
      .filter(([key]) => !key.startsWith("GITLEAKS_")));
    const scan = spawnSync("gitleaks", ["stdin", "--redact=100", "--no-banner",
      "--ignore-gitleaks-allow", "--gitleaks-ignore-path", "/dev/null",
      "--exit-code", "1", "--timeout", "30"], {
      env: { ...scannerEnv, GITLEAKS_CONFIG_TOML: "[extend]\nuseDefault = true\n" },
      input: blob, maxBuffer: 1024 * 1024, timeout: 35000,
    });
    if (scan.error || (scan.status !== 0 && scan.status !== 1)) incomplete = true;
    else if (scan.status === 1) detected = true;
  }
  return detected ? 1 : incomplete ? 2 : 0;
}

let code: number;
try { code = check(); } catch { code = 2; }
process.stdout.write(code === 0 ? "Staged secret check passed.\n" : code === 1
  ? "Staged secret check failed: secret detected.\n"
  : "Staged secret check failed: verification incomplete.\n");
process.exitCode = code;
