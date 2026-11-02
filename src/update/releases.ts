import { z } from "zod";
import { version } from "../version";

export const repository = "prime-optimal/stream-machine-plugin";
const stable = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const asset = z.object({ id: z.number().int().positive(), name: z.string(), size: z.number().int().nonnegative(), digest: z.string().nullable().optional() });
const release = z.object({ id: z.number().int(), tag_name: z.string(), draft: z.literal(false), prerelease: z.literal(false), body: z.string().nullable(), assets: z.array(asset) });
export function compareVersions(left: string, right: string) {
  const a = stable.parse(left).split(".").map(BigInt);
  const b = stable.parse(right).split(".").map(BigInt);
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1; }
  return 0;
}
export function inspectRelease(input: unknown, runningVersion = version) {
  const data = release.parse(input);
  const availableVersion = stable.parse(data.tag_name.replace(/^v/, ""));
  const matches = data.assets.filter(item => item.name === `stream-machine-${availableVersion}.tar.gz`);
  const archive = matches.length === 1 && matches[0].size > 0 && matches[0].size <= 100 * 1024 * 1024 ? matches[0] : undefined;
  const digest = archive?.digest?.match(/^sha256:([a-f0-9]{64})$/)?.[1];
  const comparison = compareVersions(availableVersion, runningVersion);
  return { runningVersion, availableVersion, changelog: data.body ?? "", releaseId: data.id,
    releaseUrl: `https://github.com/${repository}/releases/tag/${data.tag_name}`,
    kind: comparison > 0 ? "available" : comparison === 0 ? "current" : "running-newer",
    package: archive && digest ? { assetId: archive.id, name: archive.name, bytes: archive.size, sha256: digest } : null,
    reloadStatus: "Host reload has not been verified." };
}
export async function github(path: string, binary = false) {
  const proc = Bun.spawn(["gh", "api", `repos/${repository}/${path}`, "-H", `Accept: ${binary ? "application/octet-stream" : "application/vnd.github+json"}`], { stdout: "pipe", stderr: "ignore" });
  const timer = setTimeout(() => proc.kill(), binary ? 120_000 : 15_000);
  try {
    const response = new Response(proc.stdout);
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (!response.body) throw new Error("Missing GitHub response body.");
    const reader = response.body.getReader();
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.length;
      if (size > (binary ? 100 * 1024 * 1024 : 1024 * 1024)) { proc.kill(); throw new Error("GitHub response exceeds size limit."); }
      chunks.push(chunk);
    }
    if (await proc.exited !== 0) throw new Error("GitHub release unavailable. Check gh authentication and published stable release assets.");
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); }
}
export async function checkRelease() { return inspectRelease(JSON.parse((await github("releases/latest")).toString())); }
