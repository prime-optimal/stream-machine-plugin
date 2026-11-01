import { afterEach, expect, test } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, open, realpath, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { readAudioSource, MAX_AUDIO_BYTES } from "../src/adapters/openai/audio-source";

const roots: string[] = [];
async function folder() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "sm-audio-")));
  roots.push(root);
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
function wav(dataBytes = 32) {
  const b = Buffer.alloc(44 + dataBytes);
  b.write("RIFF"); b.writeUInt32LE(b.length - 8, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(dataBytes, 40);
  return b;
}
function mp3() {
  const frame = Buffer.alloc(417);
  Buffer.from([0xff, 0xfb, 0x90, 0x00]).copy(frame);
  return Buffer.concat([frame, frame]);
}
function box(type: string, data: Buffer) {
  const header = Buffer.alloc(8); header.writeUInt32BE(data.length + 8); header.write(type, 4);
  return Buffer.concat([header, data]);
}
function mp4(handler = "soun") {
  const hdlr = Buffer.alloc(24); hdlr.write(handler, 8);
  return Buffer.concat([
    box("ftyp", Buffer.from("isom\0\0\0\0isommp42")),
    box("moov", box("trak", box("mdia", box("hdlr", hdlr)))),
    box("mdat", Buffer.from([1, 2, 3, 4])),
  ]);
}
async function fixture(name: string, bytes: Uint8Array) {
  const root = await folder(), path = join(root, name);
  await writeFile(path, bytes, { mode: 0o600 });
  return path;
}
async function fails(path: string, code: string) {
  await expect(readAudioSource(path)).rejects.toMatchObject({ code });
}

test("reads exact WAV bytes with source hash and name", async () => {
  const bytes = wav(), path = await fixture("spoken.WAV", bytes);
  const result = await readAudioSource(path);
  expect(result.bytes).toEqual(new Uint8Array(bytes));
  expect(result).toMatchObject({ format: "wav", mime: "audio/wav", name: "spoken.WAV", sha256: createHash("sha256").update(bytes).digest("hex") });
});
test("accepts framed MP3 and MP4 or M4A with declared audio", async () => {
  for (const [name, bytes, format] of [["a.mp3", mp3(), "mp3"], ["a.mp4", mp4(), "mp4"], ["a.m4a", mp4(), "m4a"]] satisfies [string, Buffer, Awaited<ReturnType<typeof readAudioSource>>["format"]][]) {
    expect((await readAudioSource(await fixture(name, bytes))).format).toBe(format);
  }
});
test("accepts ID3 metadata only with valid complete audio frames", async () => {
  const tag = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]);
  expect((await readAudioSource(await fixture("id3.mp3", Buffer.concat([tag, mp3()])))).format).toBe("mp3");
  await fails(await fixture("tag.mp3", tag), "AUDIO_INVALID_MEDIA");
});
test("rejects unsafe path syntax and unsupported extension", async () => {
  for (const path of ["relative.wav", "file:///tmp/a.wav", "/tmp/../a.wav", "/tmp/./a.wav", "/tmp/a\0.wav", "/tmp/a\n.wav"]) await fails(path, "INVALID_INPUT");
  await fails(await fixture("a.txt", wav()), "AUDIO_FORMAT_UNSUPPORTED");
});
test("rejects renamed text and malformed WAV declarations", async () => {
  await fails(await fixture("secret.wav", Buffer.from("not audio at all")), "AUDIO_INVALID_MEDIA");
  for (const change of [
    (b: Buffer) => b.writeUInt32LE(100000, 40),
    (b: Buffer) => b.writeUInt16LE(3, 20),
    (b: Buffer) => b.writeUInt32LE(2, 28),
    (b: Buffer) => b.writeUInt16LE(24, 34),
    (b: Buffer) => b.writeUInt32LE(31, 40),
  ]) {
    const bytes = wav(); change(bytes);
    await fails(await fixture("bad.wav", bytes), "AUDIO_INVALID_MEDIA");
  }
});
test("rejects truncated MP3, invalid headers and trailing data", async () => {
  const header = mp3(); header[1] = 0xe9;
  for (const bytes of [mp3().subarray(0, 600), header, Buffer.concat([mp3(), Buffer.from("secret")])]) {
    await fails(await fixture("bad.mp3", bytes), "AUDIO_INVALID_MEDIA");
  }
});
test("rejects MP4 without audio, truncated boxes and fake container", async () => {
  const badSize = mp4(); badSize.writeUInt32BE(0x7fffffff);
  for (const bytes of [mp4("vide"), mp4().subarray(0, 30), badSize, Buffer.from("ftyp isom soun mdat")]) {
    await fails(await fixture("bad.mp4", bytes), "AUDIO_INVALID_MEDIA");
  }
});
test("rejects excessive MP4 boxes at root and across nested containers", async () => {
  const tiny = box("free", Buffer.alloc(0));
  const many = (count: number) => Buffer.concat(Array.from({ length: count }, () => tiny));
  await fails(await fixture("many-root.mp4", Buffer.concat([mp4(), many(10_001)])), "AUDIO_INVALID_MEDIA");
  const handler = Buffer.alloc(24); handler.write("soun", 8);
  const nested = Buffer.concat([
    box("ftyp", Buffer.from("isom\0\0\0\0isommp42")),
    many(6_000),
    box("moov", Buffer.concat([many(5_000), box("trak", box("mdia", box("hdlr", handler)))])),
    box("mdat", Buffer.from([1, 2])),
  ]);
  await fails(await fixture("many-nested.mp4", nested), "AUDIO_INVALID_MEDIA");
  expect((await readAudioSource(await fixture("boundary.mp4", Buffer.concat([mp4(), many(9_994)])))).format).toBe("mp4");
});

test("rejects missing, empty and oversized files before media parsing", async () => {
  const root = await folder();
  await fails(join(root, "missing.wav"), "AUDIO_SOURCE_UNAVAILABLE");
  await fails(await fixture("empty.wav", Buffer.alloc(0)), "AUDIO_SOURCE_EMPTY");
  const path = await fixture("large.wav", wav()), handle = await open(path, "r+");
  try { await handle.truncate(MAX_AUDIO_BYTES + 1); } finally { await handle.close(); }
  await fails(path, "AUDIO_TOO_LARGE");
});
test("rejects final and ancestor symlinks, directories and FIFO without blocking", async () => {
  const root = await folder(), target = join(root, "real.wav");
  await writeFile(target, wav(), { mode: 0o600 });
  await symlink(target, join(root, "link.wav"));
  await fails(join(root, "link.wav"), "AUDIO_SOURCE_UNSAFE");
  await mkdir(join(root, "nested")); await writeFile(join(root, "nested/a.wav"), wav(), { mode: 0o600 });
  await symlink(join(root, "nested"), join(root, "alias"));
  await fails(join(root, "alias/a.wav"), "AUDIO_SOURCE_UNSAFE");
  await mkdir(join(root, "directory.wav")); await fails(join(root, "directory.wav"), "AUDIO_SOURCE_UNSAFE");
  const fifo = join(root, "pipe.wav");
  const proc = Bun.spawn(["mkfifo", fifo], { stdout: "ignore", stderr: "ignore" });
  expect(await proc.exited).toBe(0);
  await fails(fifo, "AUDIO_SOURCE_UNSAFE");
});
test("rejects group or world writable media", async () => {
  const path = await fixture("unsafe.wav", wav());
  await chmod(path, 0o666);
  await fails(path, "AUDIO_SOURCE_UNSAFE");
});

test("rejects another owner and unreadable file with sanitized failures", async () => {
  const path = await fixture("private.wav", wav());
  const getuid = process.getuid;
  if (!getuid) throw new Error("Unix ownership required for this test");
  process.getuid = () => getuid() + 1;
  try { await fails(path, "AUDIO_SOURCE_UNSAFE"); }
  finally { process.getuid = getuid; }
  await chmod(path, 0);
  try { await fails(path, "AUDIO_SOURCE_UNAVAILABLE"); }
  finally { await chmod(path, 0o600); }
});

test("cancellation before and during reading is sanitized", async () => {
  const path = await fixture("cancel.wav", wav(20_000_000));
  const before = new AbortController(); before.abort(new Error("PRIVATE_DETAIL"));
  await expect(readAudioSource(path, before.signal)).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED" });
  const during = new AbortController();
  const reading = readAudioSource(path, during.signal);
  queueMicrotask(() => during.abort(new Error("PRIVATE_DETAIL")));
  await expect(reading).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED" });
});
test("source modification during a bounded read is rejected", async () => {
  const path = await fixture("changing.wav", wav(24_000_000));
  let stamp = (await lstat(path)).mtimeMs + 1000;
  const pending: Promise<unknown>[] = [];
  const timer = setInterval(() => { stamp += 1000; pending.push(utimes(path, new Date(), new Date(stamp))); }, 1);
  try { await fails(path, "AUDIO_SOURCE_UNAVAILABLE"); }
  finally { clearInterval(timer); await Promise.all(pending); }
});
