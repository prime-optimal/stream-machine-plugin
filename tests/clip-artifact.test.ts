import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, stat, symlink, chmod, mkdir, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ClipArtifactWriter } from "../src/adapters/twitch/clip-artifact";
const url = "https://production.assets.clips.twitchcdn.net/test.mp4?signature=private";
const roots: string[] = [];
async function directory() { const root = await mkdtemp(join(await realpath(tmpdir()), "clip-artifact-")); roots.push(root); return join(root, "clips"); }
function fetcher(fn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch { return Object.assign(fn, { preconnect: fetch.preconnect }); }
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
test("writes private file and hash without credentials", async () => {
  const dir = await directory();
  const writer = new ClipArtifactWriter(dir, fetcher(async (input, init) => {
    expect(String(input)).toBe(url); expect(init?.redirect).toBe("error"); expect(init?.headers).toBeUndefined();
    return new Response("video", { headers: { "content-type": "video/mp4", "content-length": "5" } });
  }));
  const result = await writer.write(url);
  expect(result.bytes).toBe(5); expect(result.sha256).toBe(createHash("sha256").update("video").digest("hex"));
  expect(await readFile(result.path, "utf8")).toBe("video");
  expect((await stat(result.path)).mode & 0o777).toBe(0o600); expect((await stat(dir)).mode & 0o777).toBe(0o700);
  expect(await readdir(dir)).toEqual([`${result.id}.mp4`]); expect(JSON.stringify(result)).not.toContain("signature");
});
test("rejects unsafe URLs before fetch", async () => {
  let calls = 0;
  const writer = new ClipArtifactWriter(await directory(), fetcher(async () => { calls++; return new Response("video"); }));
  for (const unsafe of ["http://production.assets.clips.twitchcdn.net/a", "https://other.test/a", "https://user@production.assets.clips.twitchcdn.net/a", "https://production.assets.clips.twitchcdn.net:444/a", `${url}#fragment`]) await expect(writer.write(unsafe)).rejects.toThrow("CLIP_DOWNLOAD_URL_REJECTED");
  expect(calls).toBe(0);
});
test("cleans streamed oversized partial file", async () => {
  const dir = await directory();
  const writer = new ClipArtifactWriter(dir, fetcher(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(3)); c.enqueue(new Uint8Array(3)); c.close(); } }))), { maxBytes: 5 });
  await expect(writer.write(url)).rejects.toThrow("CLIP_DOWNLOAD_TOO_LARGE"); expect(await readdir(dir)).toEqual([]);
});
test("rejects length, expired links, redirects, and empty files", async () => {
  for (const [response, code] of [[new Response("a", { headers: { "content-length": "100" } }), "CLIP_DOWNLOAD_TOO_LARGE"], [new Response(null, { status: 403 }), "CLIP_DOWNLOAD_EXPIRED"], [new Response(null, { status: 302 }), "CLIP_DOWNLOAD_REDIRECT_REJECTED"], [new Response(null), "CLIP_DOWNLOAD_EMPTY"], [new Response("a", { headers: { "content-length": "bad" } }), "CLIP_DOWNLOAD_INVALID_RESPONSE"]] satisfies [Response, string][]) {
    const dir = await directory(); const writer = new ClipArtifactWriter(dir, fetcher(async () => response), { maxBytes: 5 });
    await expect(writer.write(url)).rejects.toThrow(code); expect(await readdir(dir)).toEqual([]);
  }
});
test("overall timeout cancels stalled body and removes partial", async () => {
  const dir = await directory(); let cancelled = false;
  const writer = new ClipArtifactWriter(dir, fetcher(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } }))), { timeoutMs: 20 });
  await expect(writer.write(url)).rejects.toThrow("CLIP_DOWNLOAD_TIMEOUT"); expect(cancelled).toBe(true); expect(await readdir(dir)).toEqual([]);
});
test("sanitizes network failure and excludes concurrent writes", async () => {
  const dir = await directory();
  const writer = new ClipArtifactWriter(dir, fetcher(async () => { throw new Error("secret-url"); }));
  await expect(writer.write(url)).rejects.toThrow("CLIP_DOWNLOAD_FAILED"); expect(await readdir(dir)).toEqual([]);
  let finish: ((value: Response) => void) | undefined;
  const busy = new ClipArtifactWriter(dir, fetcher(async () => new Promise<Response>(resolve => { finish = resolve; })));
  const pending = busy.write(url); await Bun.sleep(10);
  await expect(busy.write(url)).rejects.toThrow("CLIP_DOWNLOAD_BUSY"); finish?.(new Response("video")); await pending;
});
test("rejects truncated responses and removes interrupted streams", async () => {
  const dir = await directory();
  const truncated = new ClipArtifactWriter(dir, fetcher(async () => new Response("x", { headers: { "content-length": "2" } })));
  await expect(truncated.write(url)).rejects.toThrow("CLIP_DOWNLOAD_INVALID_RESPONSE"); expect(await readdir(dir)).toEqual([]);
  let pulls = 0;
  const broken = new ClipArtifactWriter(dir, fetcher(async () => new Response(new ReadableStream({ pull(c) { if (pulls++ === 0) c.enqueue(new Uint8Array([1])); else c.error(new Error("private signature")); } }))));
  await expect(broken.write(url)).rejects.toThrow("CLIP_DOWNLOAD_FAILED"); expect(await readdir(dir)).toEqual([]);
});
test("timeout bounds a stalled fetch without leaking partials", async () => {
  const dir = await directory();
  const writer = new ClipArtifactWriter(dir, fetcher(async () => new Promise<Response>(() => {})), { timeoutMs: 10 });
  await expect(writer.write(url)).rejects.toThrow("CLIP_DOWNLOAD_TIMEOUT"); expect(await readdir(dir)).toEqual([]);
});
test("rejects symlink directories and group-accessible target", async () => {
  const dir = await directory(); const parent = join(dir, ".."); await symlink(parent, dir);
  const writer = new ClipArtifactWriter(dir, fetcher(async () => new Response("video")));
  await expect(writer.write(url)).rejects.toThrow("CLIP_DIRECTORY_UNSAFE");
  await rm(dir); await mkdir(dir); await chmod(dir, 0o755);
  await expect(writer.write(url)).rejects.toThrow("CLIP_DIRECTORY_UNSAFE");
});
