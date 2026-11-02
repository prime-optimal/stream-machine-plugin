import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const dryRun = process.argv.includes("--dry-run");

function run(command: string[]) {
  const result = Bun.spawnSync(command, { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(`${command.slice(0, 3).join(" ")} failed: ${result.stderr.toString().trim()}`);
  return { stdout: result.stdout.toString().trim() };
}

function repository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = run(["git", "remote", "get-url", "origin"]).stdout;
  const match = url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot read the GitHub repository from origin: ${url}`);
  return match[1];
}

function releaseNotes(changelog: string, version: string) {
  const lines = changelog.split("\n");
  const start = lines.findIndex(line => line.startsWith(`## ${version} (`));
  if (start < 0) throw new Error(`docs/CHANGELOG.md has no section for ${version}`);
  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, next < 0 ? undefined : next).join("\n").trim() + "\n";
}

function tagCommit(repo: string, tag: string) {
  const refs = JSON.parse(run(["gh", "api", `repos/${repo}/git/matching-refs/tags/${tag}`]).stdout);
  const ref = refs.find((entry: { ref: string }) => entry.ref === `refs/tags/${tag}`);
  if (!ref) return null;
  if (ref.object.type === "commit") return ref.object.sha as string;
  return JSON.parse(run(["gh", "api", `repos/${repo}/git/tags/${ref.object.sha}`]).stdout).object.sha as string;
}

function existingRelease(repo: string, tag: string) {
  const pages = JSON.parse(run(["gh", "api", "--paginate", "--slurp", `repos/${repo}/releases?per_page=100`]).stdout);
  return pages.flat().find((release: { tag_name: string }) => release.tag_name === tag) as { draft: boolean; html_url: string } | undefined;
}

const { version } = await Bun.file(join(root, "plugin.json")).json();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid plugin.json version: ${version}`);
const tag = `v${version}`;
const commit = run(["git", "log", "-1", "--format=%H", `-S"version": "${version}"`, "--", "plugin.json"]).stdout;
if (!commit) throw new Error(`No commit introduced version ${version} in plugin.json`);
const head = run(["git", "rev-parse", "HEAD"]).stdout;
const repo = repository();
const release = existingRelease(repo, tag);
const taggedCommit = tagCommit(repo, tag);
const notes = releaseNotes(await Bun.file(join(root, "docs/CHANGELOG.md")).text(), version);
const assets = await Promise.all(["zip", "tar.gz"].map(async extension => {
  const path = join(root, "docs/packages", `stream-machine-${version}.${extension}`);
  const file = Bun.file(path);
  return { path, exists: await file.exists(), bytes: (await file.exists()) ? file.size : 0 };
}));
const published = Boolean(release && !release.draft);
const plan = { repo, version, tag, commit, head, published, draft: Boolean(release?.draft), taggedCommit, assets, notes };

if (dryRun) {
  console.log(JSON.stringify(plan, null, 2));
} else if (published) {
  console.log(`${tag} is already published: ${release!.html_url}`);
} else {
  if (release?.draft) throw new Error(`A draft release for ${tag} exists. Delete or publish it, then rerun.`);
  if (taggedCommit && taggedCommit !== commit) throw new Error(`Tag ${tag} points to ${taggedCommit}, not release commit ${commit}`);
  if (head !== commit) throw new Error(`HEAD ${head} is not release commit ${commit}. Check out the release commit and run mise run package.`);
  if (run(["git", "status", "--porcelain"]).stdout) throw new Error("The worktree has changes. Publish from a clean checkout.");
  const missing = assets.filter(asset => !asset.exists).map(asset => asset.path);
  if (missing.length) throw new Error(`Missing packages: ${missing.join(", ")}. Run mise run package.`);
  const scratch = await mkdtemp(join(tmpdir(), "stream-machine-release-"));
  try {
    const notesFile = join(scratch, "notes.md");
    await Bun.write(notesFile, notes);
    run(["gh", "release", "create", tag, ...assets.map(asset => asset.path), "--repo", repo, "--target", commit,
      "--title", tag, "--notes-file", notesFile]);
    const created = existingRelease(repo, tag);
    if (!created || created.draft) throw new Error(`GitHub did not publish ${tag}`);
    console.log(`Published ${tag} at ${commit}: ${created.html_url}`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
