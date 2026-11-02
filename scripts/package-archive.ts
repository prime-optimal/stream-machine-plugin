import { lstat, readdir, rm } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

export function includePackagePath(root: string, source: string) {
  const path = relative(root, source).split(sep).join("/");
  return path !== "docs/packages" && !path.startsWith("docs/packages/") &&
    path !== "docs/hosted-oauth-site" && !path.startsWith("docs/hosted-oauth-site/") &&
    basename(source) !== ".DS_Store" && !basename(source).startsWith("._");
}

export function validateArchiveEntries(entries: string[]) {
  if (!entries.length || new Set(entries).size !== entries.length || entries.some(path =>
    !path.startsWith("stream-machine/") ||
    /node_modules|\.env|\.git\/|\.DS_Store|\/\._/.test(path) ||
    /[\\\r\n\0]/.test(path) ||
    path.replace(/\/$/, "").split("/").some(part => !part || part === "." || part === ".." || part === ".git")
  )) throw new Error("Unexpected archive contents");
}

async function inventory(parent: string, path = "stream-machine/"): Promise<string[]> {
  const stat = await lstat(join(parent, path));
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) throw new Error(`Unsupported package entry: ${path}`);
  const entries = [path];
  for (const name of (await readdir(join(parent, path))).sort()) {
    const child = path + name;
    const info = await lstat(join(parent, child));
    entries.push(...await inventory(parent, child + (info.isDirectory() ? "/" : "")));
  }
  return entries;
}

async function command(args: string[], cwd: string) {
  const child = Bun.spawn(args, { cwd, env: { ...process.env, COPYFILE_DISABLE: "1" }, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (exit !== 0) throw new Error(`${args[0]} failed (${exit}): ${stderr}`);
  return stdout;
}

export async function createPackageArchives(options: { parent: string; output: string; version: string }) {
  const { parent, output, version } = options;
  const archives = ["tar.gz", "zip"].map(extension => join(output, `stream-machine-${version}.${extension}`));
  try {
    await Promise.all(archives.map(path => rm(path, { force: true })));
    const expected = (await inventory(parent)).sort();
    validateArchiveEntries(expected);
    await command(["tar", "-czf", archives[0], "-C", parent, "stream-machine"], parent);
    await command(["zip", "-rq", "-X", archives[1], "stream-machine"], parent);
    const listings = [
      await command(["tar", "-tzf", archives[0]], parent),
      await command(["unzip", "-Z1", archives[1]], parent),
    ];
    await command(["unzip", "-tqq", archives[1]], parent);
    for (const listing of listings) {
      const entries = listing.trimEnd().split("\n");
      validateArchiveEntries(entries);
      if (JSON.stringify(entries.sort()) !== JSON.stringify(expected)) throw new Error("Archive payload differs from staging");
    }
    return { archives, entries: expected.length };
  } catch (error) {
    await Promise.all(archives.map(path => rm(path, { force: true })));
    throw error;
  }
}
