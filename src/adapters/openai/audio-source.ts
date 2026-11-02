import { constants, type Stats } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { basename, extname, isAbsolute, join, parse } from "node:path";
import { createHash } from "node:crypto";
import { TranscriptionFault } from "./transcription-contracts";

export const MAX_AUDIO_BYTES = 25_000_000;
const mimeTypes = { wav: "audio/wav", mp3: "audio/mpeg", mp4: "audio/mp4", m4a: "audio/mp4" };
type Format = keyof typeof mimeTypes;
const invalidMedia = () => { throw new TranscriptionFault("AUDIO_INVALID_MEDIA"); };
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new TranscriptionFault("TRANSCRIPTION_CANCELLED");
}
function formatFor(path: string): Format {
  const extension = extname(path).slice(1).toLowerCase();
  switch (extension) {
    case "wav": case "mp3": case "mp4": case "m4a": return extension;
    default: throw new TranscriptionFault("AUDIO_FORMAT_UNSUPPORTED");
  }
}
type PathEntry = { path: string; stat: Stats };
async function inspectPath(path: string, signal?: AbortSignal): Promise<PathEntry[]> {
  const root = parse(path).root;
  const entries: PathEntry[] = [];
  let current = root;
  for (const part of ["", ...path.slice(root.length).split("/")]) {
    checkAbort(signal);
    current = part ? join(current, part) : current;
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || (current !== path && !stat.isDirectory())) throw new TranscriptionFault("AUDIO_SOURCE_UNSAFE");
    entries.push({ path: current, stat });
  }
  return entries;
}
function sameIdentity(a: Stats, b: Stats) { return a.dev === b.dev && a.ino === b.ino; }
function sameFile(a: Stats, b: Stats) {
  return sameIdentity(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs && a.mode === b.mode && a.uid === b.uid;
}
function checkFile(stat: Stats) {
  if (!stat.isFile() || !process.getuid || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) throw new TranscriptionFault("AUDIO_SOURCE_UNSAFE");
  if (stat.size === 0) throw new TranscriptionFault("AUDIO_SOURCE_EMPTY");
  if (!Number.isSafeInteger(stat.size) || stat.size > MAX_AUDIO_BYTES) throw new TranscriptionFault("AUDIO_TOO_LARGE");
}
function validateWav(b: Buffer) {
  if (b.length < 44 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE" || b.readUInt32LE(4) + 8 !== b.length) invalidMedia();
  let offset = 12, alignment = 0, dataSize = 0, formats = 0, dataChunks = 0;
  while (offset < b.length) {
    if (offset + 8 > b.length) invalidMedia();
    const type = b.toString("ascii", offset, offset + 4), size = b.readUInt32LE(offset + 4), start = offset + 8;
    const end = start + size, next = end + (size % 2);
    if (end > b.length || next > b.length) invalidMedia();
    if (type === "fmt ") {
      if (++formats !== 1 || (size !== 16 && size !== 18)) invalidMedia();
      const channels = b.readUInt16LE(start + 2), rate = b.readUInt32LE(start + 4);
      alignment = b.readUInt16LE(start + 12);
      if (b.readUInt16LE(start) !== 1 || b.readUInt16LE(start + 14) !== 16 || channels === 0 || rate === 0 ||
          alignment !== channels * 2 || b.readUInt32LE(start + 8) !== rate * alignment ||
          (size === 18 && b.readUInt16LE(start + 16) !== 0)) invalidMedia();
    } else if (type === "data") {
      if (++dataChunks !== 1 || size === 0) invalidMedia();
      dataSize = size;
    }
    offset = next;
  }
  if (formats !== 1 || dataChunks !== 1 || alignment === 0 || dataSize % alignment !== 0) invalidMedia();
}
function validateMp3(b: Buffer) {
  let offset = 0, frames = 0;
  if (b.toString("ascii", 0, 3) === "ID3") {
    if (b.length < 10 || ![2, 3, 4].includes(b[3]) || b[4] === 0xff || b.subarray(6, 10).some(value => value > 127)) invalidMedia();
    const allowedFlags = b[3] === 2 ? 0xc0 : b[3] === 3 ? 0xe0 : 0xf0;
    if ((b[5] & ~allowedFlags) !== 0) invalidMedia();
    const size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9];
    const footer = b[3] === 4 && (b[5] & 0x10) !== 0;
    offset = 10 + size + (footer ? 10 : 0);
    if (offset > b.length || (footer && b.toString("ascii", offset - 10, offset - 7) !== "3DI")) invalidMedia();
  }
  const end = b.length >= 128 && b.toString("ascii", b.length - 128, b.length - 125) === "TAG" ? b.length - 128 : b.length;
  while (offset < end) {
    if (offset + 4 > end) invalidMedia();
    const a = b[offset], flags = b[offset + 1], rates = b[offset + 2], extra = b[offset + 3];
    const version = (flags >> 3) & 3, layer = (flags >> 1) & 3, bitrateIndex = rates >> 4, sampleIndex = (rates >> 2) & 3;
    if (a !== 0xff || (flags & 0xe0) !== 0xe0 || version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3 || (extra & 3) === 2) invalidMedia();
    const bitrates = version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const sampleRate = [44100, 48000, 32000][sampleIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const size = Math.floor((version === 3 ? 144 : 72) * bitrates[bitrateIndex] * 1000 / sampleRate) + ((rates >> 1) & 1);
    if (size < 4 || offset + size > end) invalidMedia();
    frames++; offset += size;
  }
  if (frames < 2 || offset !== end) invalidMedia();
}
const MAX_MP4_BOXES = 10_000;
type Box = { type: string; start: number; end: number };
function boxes(b: Buffer, start: number, end: number, budget: { remaining: number }): Box[] {
  const result: Box[] = [];
  let offset = start;
  while (offset < end) {
    if (budget.remaining-- <= 0 || offset + 8 > end) invalidMedia();
    let size = b.readUInt32BE(offset), header = 8;
    if (size === 1) {
      if (offset + 16 > end) invalidMedia();
      const extended = b.readBigUInt64BE(offset + 8);
      if (extended > BigInt(end - offset)) invalidMedia();
      size = Number(extended); header = 16;
    } else if (size === 0) size = end - offset;
    if (size < header || offset + size > end) invalidMedia();
    result.push({ type: b.toString("ascii", offset + 4, offset + 8), start: offset + header, end: offset + size });
    offset += size;
  }
  return result;
}
function validateMp4(b: Buffer) {
  const budget = { remaining: MAX_MP4_BOXES };
  const top = boxes(b, 0, b.length, budget);
  const ftyp = top.find(box => box.type === "ftyp");
  if (!ftyp || ftyp.end - ftyp.start < 8 || (ftyp.end - ftyp.start) % 4 !== 0 || !top.some(box => box.type === "mdat" && box.end > box.start)) invalidMedia();
  let audio = false;
  for (const movie of top.filter(box => box.type === "moov")) {
    for (const track of boxes(b, movie.start, movie.end, budget).filter(box => box.type === "trak")) {
      for (const media of boxes(b, track.start, track.end, budget).filter(box => box.type === "mdia")) {
        for (const handler of boxes(b, media.start, media.end, budget).filter(box => box.type === "hdlr")) {
          if (handler.end - handler.start < 24) invalidMedia();
          if (b.toString("ascii", handler.start + 8, handler.start + 12) === "soun") audio = true;
        }
      }
    }
  }
  if (!audio) invalidMedia();
}
export async function readAudioSource(path: string, signal?: AbortSignal) {
  try {
    checkAbort(signal);
    if (typeof path !== "string" || path.length > 4096 || !isAbsolute(path) || /[\x00-\x1f\x7f]/.test(path) || path.split("/").some(part => part === "." || part === "..") || path.endsWith("/") || path.includes("//")) throw new TranscriptionFault("INVALID_INPUT");
    const format = formatFor(path), entries = await inspectPath(path, signal);
    const original = entries.at(-1)?.stat;
    if (!original) throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
    checkFile(original); checkAbort(signal);
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const initial = await file.stat();
      checkFile(initial);
      if (!sameFile(original, initial)) throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
      const bytes = new Uint8Array(new ArrayBuffer(initial.size));
      let position = 0;
      while (position < bytes.length) {
        checkAbort(signal);
        const { bytesRead } = await file.read(bytes, position, Math.min(262144, bytes.length - position), position);
        if (bytesRead === 0) throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
        position += bytesRead;
      }
      checkAbort(signal);
      if (!sameFile(initial, await file.stat())) throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
      for (const entry of entries) {
        checkAbort(signal);
        const current = await lstat(entry.path);
        if (current.isSymbolicLink() || !sameIdentity(entry.stat, current) || (entry.path === path && !sameFile(initial, current))) throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
      }
      const buffer = Buffer.from(bytes.buffer);
      if (format === "wav") validateWav(buffer);
      else if (format === "mp3") validateMp3(buffer);
      else validateMp4(buffer);
      checkAbort(signal);
      return { bytes, format, mime: mimeTypes[format], sha256: createHash("sha256").update(bytes).digest("hex"), name: basename(path) };
    } finally { await file.close(); }
  } catch (error) {
    if (error instanceof TranscriptionFault) throw error;
    if (signal?.aborted) throw new TranscriptionFault("TRANSCRIPTION_CANCELLED");
    throw new TranscriptionFault("AUDIO_SOURCE_UNAVAILABLE");
  }
}
