import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, rename, unlink, type FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, parse, resolve, sep } from "node:path";
import { TwitchFault } from "../../auth/twitch";

type Limits = { maxBytes?: number; timeoutMs?: number };
export type ClipArtifact = { id: string; path: string; bytes: number; sha256: string; completedAt: string };
const clipDownloadHosts = ["production.assets.clips.twitchcdn.net", "d1ndex63qxojbr.cloudfront.net"];
export function validateClipDownloadUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new TwitchFault("CLIP_DOWNLOAD_URL_REJECTED"); }
  if (url.protocol !== "https:" || !clipDownloadHosts.includes(url.hostname) || url.username || url.password || url.port || url.hash) throw new TwitchFault("CLIP_DOWNLOAD_URL_REJECTED");
  return url;
}
async function privateDirectory(directory: string) {
  if (!isAbsolute(directory)) throw new TwitchFault("CLIP_DIRECTORY_UNSAFE");
  const target = resolve(directory);
  let current = parse(target).root;
  for (const part of target.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error; }
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new TwitchFault("CLIP_DIRECTORY_UNSAFE");
    if (current === target && (info.uid !== process.getuid?.() || (info.mode & 0o777) !== 0o700)) throw new TwitchFault("CLIP_DIRECTORY_UNSAFE");
    if ((info.mode & 0o022) && !(info.mode & 0o1000)) throw new TwitchFault("CLIP_DIRECTORY_UNSAFE");
  }
  return target;
}
export class ClipArtifactWriter {
  private active = false;
  constructor(private directory = process.env.STREAM_MACHINE_CLIP_DIR ?? join(homedir(), ".local/share/stream-machine/clips"), private fetcher: typeof fetch = fetch, private limits: Limits = {}) {}
  async write(value: string): Promise<ClipArtifact> {
    validateClipDownloadUrl(value);
    if (this.active) throw new TwitchFault("CLIP_DOWNLOAD_BUSY");
    this.active = true;
    const controller = new AbortController();
    const timeoutMs = this.limits.timeoutMs ?? 120000;
    const maxBytes = this.limits.maxBytes ?? 512 * 1024 * 1024;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new TwitchFault("CLIP_DOWNLOAD_TIMEOUT")); }, timeoutMs); });
    let partial: string | undefined;
    let file: FileHandle | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const directory = await Promise.race([privateDirectory(this.directory), deadline]);
      const response = await Promise.race([this.fetcher(value, { signal: controller.signal, redirect: "error" }), deadline]);
      if (response.status >= 300 && response.status < 400) throw new TwitchFault("CLIP_DOWNLOAD_REDIRECT_REJECTED");
      if ([401, 403, 404, 410].includes(response.status)) throw new TwitchFault("CLIP_DOWNLOAD_EXPIRED");
      if (!response.ok) throw new TwitchFault("CLIP_DOWNLOAD_FAILED");
      if (!response.body) throw new TwitchFault("CLIP_DOWNLOAD_EMPTY");
      reader = response.body.getReader();
      const length = response.headers.get("content-length");
      if (length !== null && !/^\d+$/.test(length)) throw new TwitchFault("CLIP_DOWNLOAD_INVALID_RESPONSE");
      if (length !== null && (!Number.isSafeInteger(Number(length)) || Number(length) > maxBytes)) throw new TwitchFault("CLIP_DOWNLOAD_TOO_LARGE");
      const id = randomUUID();
      const path = join(directory, `${id}.mp4`);
      partial = join(directory, `${id}.partial`);
      file = await open(partial, "wx", 0o600);
      const hash = createHash("sha256");
      let bytes = 0;
      while (true) {
        const chunk = await Promise.race([reader.read(), deadline]);
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maxBytes) throw new TwitchFault("CLIP_DOWNLOAD_TOO_LARGE");
        hash.update(chunk.value);
        let offset = 0;
        while (offset < chunk.value.byteLength) {
          const written = await file.write(chunk.value, offset, chunk.value.byteLength - offset);
          if (!written.bytesWritten) throw new TwitchFault("CLIP_DOWNLOAD_FAILED");
          offset += written.bytesWritten;
        }
        if (controller.signal.aborted) throw new TwitchFault("CLIP_DOWNLOAD_TIMEOUT");
      }
      if (!bytes) throw new TwitchFault("CLIP_DOWNLOAD_EMPTY");
      if (length !== null && bytes !== Number(length)) throw new TwitchFault("CLIP_DOWNLOAD_INVALID_RESPONSE");
      await file.sync(); await file.close(); file = undefined;
      if (controller.signal.aborted) throw new TwitchFault("CLIP_DOWNLOAD_TIMEOUT");
      await rename(partial, path); partial = undefined;
      return { id, path, bytes, sha256: hash.digest("hex"), completedAt: new Date().toISOString() };
    } catch (error) {
      if (controller.signal.aborted) throw new TwitchFault("CLIP_DOWNLOAD_TIMEOUT");
      if (error instanceof TwitchFault) throw error;
      throw new TwitchFault("CLIP_DOWNLOAD_FAILED");
    } finally {
      clearTimeout(timer); controller.abort();
      try { await reader?.cancel(); } catch {}
      try { await file?.close(); } finally { if (partial) await unlink(partial).catch(() => {}); this.active = false; }
    }
  }
}
