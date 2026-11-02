import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";

const workflow = z.object({ jobs: z.object({ prepare: z.object({ steps: z.array(z.object({
  name: z.string().optional(), run: z.string().optional(),
})) }) }) }).parse(Bun.YAML.parse(await Bun.file(new URL("../.github/workflows/release-pr.yml", import.meta.url)).text()));
const guard = workflow.jobs.prepare.steps.find(step => step.name === "Reject stale source or foreign release branch")?.run;
if (!guard) throw new Error("Missing branch guard");
const source = "a".repeat(40);
const bot = { login: "github-actions[bot]" };
const safe = {
  author: bot, committer: bot, parents: [{ sha: source }],
  commit: { message: `chore(release): prepare 0.3.1\n\nRelease-Source: ${source}` },
  files: [{ filename: ".cz.toml" }, { filename: "docs/CHANGELOG.md" }],
};

function check(commit: unknown, prs: unknown = [], main = source) {
  const folder = mkdtempSync(join(tmpdir(), "release-guard-"));
  try {
    const gh = join(folder, "gh");
    writeFileSync(gh, `#!${process.execPath}\nconst url=process.argv[3]; const value=url.endsWith("/git/ref/heads/main")?process.env.MAIN:url.includes("/pulls?")?process.env.PRS:url.includes("/matching-refs/")?process.env.REFS:process.env.COMMIT; console.log(value);\n`);
    chmodSync(gh, 0o755);
    writeFileSync(join(folder, "git"), '#!/bin/sh\nif [ "$1" = merge-base ]; then [ "$3" = "$SOURCE" ]; else printf ".cz.toml\\ndocs/CHANGELOG.md\\n"; fi\n');
    chmodSync(join(folder, "git"), 0o755);
    return Bun.spawnSync(["bash", "-c", guard!], {
      env: { ...process.env, PATH: `${folder}:${process.env.PATH}`, SOURCE: source, GH_REPO: "owner/repo",
        MAIN: main, PRS: JSON.stringify(prs), REFS: JSON.stringify(commit ? [{ ref: "refs/heads/automation/release", object: { sha: "b".repeat(40) } }] : []),
        COMMIT: JSON.stringify(commit) },
    }).exitCode;
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

test("release guard accepts empty branch and bot orphan retry, rejects foreign state", () => {
  expect(check(null)).toBe(0);
  expect(check(safe)).toBe(0);
  expect(check({ ...safe, author: { login: "human" } })).not.toBe(0);
  expect(check({ ...safe, commit: { message: "chore: unrelated bot work" } })).not.toBe(0);
  expect(check({ ...safe, files: [{ filename: "src/server.ts" }] })).not.toBe(0);
  expect(check({ ...safe, parents: [{ sha: "c".repeat(40) }] })).not.toBe(0);
  expect(check({ ...safe, parents: [{ sha: "c".repeat(40) }], commit: { message: `chore(release): prepare 0.3.1\n\nRelease-Source: ${"c".repeat(40)}` } })).not.toBe(0);
  expect(check(safe, [{ user: bot, base: { ref: "main" }, head: { repo: { full_name: "owner/repo" } } }])).toBe(0);
  expect(check(safe, [{ user: { login: "human" }, base: { ref: "main" }, head: { repo: { full_name: "owner/repo" } } }])).not.toBe(0);
  expect(check(null, [], "c".repeat(40))).not.toBe(0);
});
