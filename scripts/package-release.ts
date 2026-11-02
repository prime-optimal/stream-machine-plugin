import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { verifyArchive, verifyDigest } from "../src/update/archive";
import { github } from "../src/update/releases";

const root = resolve(import.meta.dir, "..");
const tag = process.argv[2] ?? "latest";
const release = z.object({
  tag_name: z.string().regex(/^v\d+\.\d+\.\d+$/),
  assets: z.array(z.object({ id: z.number().int().positive(), name: z.string(), size: z.number().int().positive(), digest: z.string().nullable().optional() })),
}).parse(JSON.parse((await github(tag === "latest" ? "releases/latest" : `releases/tags/${tag}`)).toString()));
const version = release.tag_name.slice(1);
const output = join(root, "docs/packages");
await mkdir(output, { recursive: true });
for (const name of [`stream-machine-${version}.zip`, `stream-machine-${version}.tar.gz`]) {
  const asset = release.assets.find(item => item.name === name);
  const sha256 = asset?.digest?.match(/^sha256:([a-f0-9]{64})$/)?.[1];
  if (!asset || !sha256) throw new Error(`${release.tag_name} has no ${name} with a SHA-256 digest.`);
  const bytes = await github(`releases/assets/${asset.id}`, true);
  verifyDigest(bytes, { bytes: asset.size, sha256 });
  const target = join(output, name);
  const partial = `${target}.partial`;
  try {
    await writeFile(partial, bytes);
    if (name.endsWith(".tar.gz")) await verifyArchive(partial, version);
    await rename(partial, target);
  } catch (error) { await rm(partial, { force: true }); throw error; }
  console.log(`${target} (${asset.size} bytes, sha256 ${sha256})`);
}
