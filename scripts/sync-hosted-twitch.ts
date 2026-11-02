import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const target = process.argv[2];
if (!target) throw new Error("Usage: bun scripts/sync-hosted-twitch.ts <Site checkout>");
const site = resolve(target);
const hosting = await Bun.file(resolve(site, ".openai/hosting.json")).json();
if (hosting.project_id !== "appgprj_6ae8040442d481918f55ca79cca3b9b2") throw new Error("Unexpected Site project");
const paths = [
  "src/auth/twitch.ts", "src/auth/permissions.ts",
  "src/adapters/twitch/client.ts", "src/adapters/twitch/clips-client.ts", "src/adapters/twitch/clip-library.ts",
  "src/adapters/twitch/service.ts", "src/adapters/twitch/title-preview-store.ts",
  "src/adapters/twitch/tool-runtime.ts", "src/adapters/twitch/tool-register.ts",
];
const hashes: Record<string, string> = {};
for (const path of paths) {
  const source = await readFile(resolve(root, path), "utf8");
  const destination = resolve(site, "lib/stream-machine", path.slice(4));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, source);
  hashes[path] = createHash("sha256").update(source).digest("hex");
}
await writeFile(resolve(site, "lib/stream-machine/source.json"), JSON.stringify({
  repository: "https://github.com/prime-optimal/stream-machine-plugin", files: hashes,
}, null, 2) + "\n");
console.log(`Synchronized ${paths.length} Twitch modules; no desktop runtime copied.`);
