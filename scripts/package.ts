import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { createPackageArchives, includePackagePath } from "./package-archive";

const root = resolve(import.meta.dir, "..");
process.chdir(root);
const manifest = await Bun.file("plugin.json").json();
if (manifest.name !== "stream-machine" || manifest.extensions["com.openai"].interface.shortDescription.length > 30) throw new Error("Invalid plugin identity/listing");
const config = await Bun.file("mcp.json").json();
if (Object.keys(config.mcpServers).join() !== "stream-machine,stream-machine-obs,stream-machine-streamdeck") throw new Error("Unexpected provider enabled");
for (const bundle of ["obs-server.js", "server.js", "streamdeck-action.js"]) if (!await Bun.file(`dist/${bundle}`).exists()) throw new Error(`Missing local bundle: ${bundle}`);
for (const skill of ["onboarding", "preview-recipe", "self-update"]) {
  const text = await Bun.file(`skills/${skill}/SKILL.md`).text();
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error(`Missing frontmatter: ${skill}`);
  const parsed = Bun.YAML.parse(frontmatter[1]) as { name: string; description: string };
  if (parsed.name !== skill || !parsed.description) throw new Error(`Invalid skill: ${skill}`);
}
const staging = join(root, "artifacts/package/stream-machine");
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
for (const path of ["plugin.json", "mcp.json", "skills", "dist", "docs/setup.md"]) {
  await mkdir(dirname(join(staging, path)), { recursive: true });
  await cp(join(root, path), join(staging, path), { recursive: true, filter: includePackagePath });
}
await mkdir(join(staging, ".codex-plugin"), { recursive: true });
const openai = manifest.extensions["com.openai"];
await Bun.write(join(staging, ".codex-plugin/plugin.json"), JSON.stringify({
  name: manifest.name, version: manifest.version, description: manifest.description,
  author: manifest.author, repository: manifest.repository, keywords: manifest.keywords,
  interface: { ...openai.interface, category: openai.interface.category ?? "Other" },
  extensions: { "com.openai": { onboardingSkill: openai.onboardingSkill } },
  skills: "./skills", mcpServers: "./.mcp.json",
}, null, 2));
await Bun.write(join(staging, ".mcp.json"), JSON.stringify({ mcpServers: config.mcpServers }, null, 2));
const packageDirs: string[] = [];
for (const name of await readdir("node_modules")) {
  if (name.startsWith(".")) continue;
  if (name.startsWith("@")) for (const child of await readdir(join("node_modules", name))) packageDirs.push(`${name}/${child}`);
  else packageDirs.push(name);
}
const notices: string[] = ["Third-party dependency notices. Bundled runtime/UI dependencies and development dependency notices retained.\n"];
for (const name of packageDirs.sort()) {
  const folder = join("node_modules", name);
  const pkg = await Bun.file(join(folder, "package.json")).json();
  notices.push(`\n=== ${pkg.name}@${pkg.version} (${typeof pkg.license === "string" ? pkg.license : "see package license"}) ===\n`);
  for (const file of await readdir(folder)) {
    if (/^(licen[sc]e|notice|copying)(\.|$)/i.test(file)) {
      try { notices.push(await readFile(join(folder, file), "utf8")); } catch { }
    }
  }
}
await Bun.write(join(staging, "THIRD_PARTY_NOTICES.txt"), notices.join("\n"));
await mkdir(join(root, "docs/packages"), { recursive: true });
const result = await createPackageArchives({
  parent: join(root, "artifacts/package"), output: join(root, "docs/packages"), version: manifest.version,
});
console.log(`${result.archives.join("\n")}\n${result.entries} inspected entries per archive; manifests and skill frontmatter parsed.`);
