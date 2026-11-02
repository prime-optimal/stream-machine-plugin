import { afterAll, expect, test } from "bun:test";
import { mkdtemp, readdir, realpath, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerMediaTools } from "../src/adapters/media/register";
import { MediaInfoService } from "../src/adapters/media/service";
import { TranscriptionService } from "../src/adapters/openai/transcription-service";
import { TwitchClipClient } from "../src/adapters/twitch/clips-client";
import { TwitchClipService } from "../src/adapters/twitch/clips-service";
import type { TwitchAccountProvider } from "../src/auth/twitch";

const root = await realpath(await mkdtemp(join(tmpdir(), "media-info-")));
afterAll(() => rm(root, { recursive: true, force: true }));
const clip = {
  id: "Clip-1", broadcaster_id: "123", broadcaster_name: "KLabFM", creator_id: "456", creator_name: "Fan", game_id: "509658", title: "Big play",
  url: "https://clips.twitch.tv/Clip-1", created_at: "2026-10-31T12:00:00Z", duration: 29.5, view_count: 7, thumbnail_url: "https://static-cdn.jtvnw.net/Clip-1.jpg",
};
function box(type: string, data: Buffer) {
  const header = Buffer.alloc(8); header.writeUInt32BE(data.length + 8); header.write(type, 4);
  return Buffer.concat([header, data]);
}
function mp4(handler = "soun") {
  const hdlr = Buffer.alloc(24); hdlr.write(handler, 8);
  return Buffer.concat([box("ftyp", Buffer.from("isom\0\0\0\0isommp42")), box("moov", box("trak", box("mdia", box("hdlr", hdlr)))), box("mdat", Buffer.from([1, 2, 3, 4]))]);
}
type Setup = { scopes?: string[]; metadata?: unknown; key?: string; file?: (path: string) => Promise<void>; openai?: Response };
function setup(options: Setup = {}) {
  const uploads: FormData[] = [];
  const downloads: string[] = [];
  const accounts: TwitchAccountProvider = { async withAccount(fn) {
    return fn({ account: { id: "123", login: "klabfm", displayName: "KLabFM", scopes: options.scopes ?? ["channel:manage:clips"] }, clientId: "client", accessToken: "TOKEN_SENTINEL" });
  } };
  const helix: typeof fetch = Object.assign(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("downloads")) return Response.json({ data: [{ clip_id: "Clip-1", landscape_download_url: "https://production.assets.clips.twitchcdn.net/x?sig=SIGNED_SENTINEL", portrait_download_url: null }] });
    return Response.json(options.metadata ?? { data: [clip] });
  }, { preconnect: fetch.preconnect });
  const writer = { async write() {
    const path = join(root, `${crypto.randomUUID()}.mp4`);
    await (options.file ?? (async target => { await writeFile(target, mp4(), { mode: 0o600 }); }))(path);
    downloads.push(path);
    return { id: "artifact", path, bytes: 4, sha256: "hash", completedAt: "now" };
  } };
  const transcription = new TranscriptionService({
    key: () => ("key" in options ? options.key : "KEY_SENTINEL"),
    fetcher: async (_url, init) => { uploads.push(init.body as FormData); return options.openai ?? Response.json({ text: "welcome to the stream" }); },
  });
  const clips = new TwitchClipService(accounts, new TwitchClipClient(helix), writer);
  return { service: new MediaInfoService(clips, transcription), clips, transcription, uploads, downloads };
}

test("details map authorized Twitch clip metadata without downloading or uploading", async () => {
  const s = setup();
  const result = await s.service.info({ clipId: "Clip-1" });
  expect(result).toEqual({
    mode: "live", transcript: { state: "not_requested" },
    details: {
      id: "Clip-1", broadcasterId: "123", broadcasterName: "KLabFM", creatorId: "456", creatorName: "Fan", gameId: "509658", title: "Big play",
      sourceUrl: "https://clips.twitch.tv/Clip-1", createdAt: "2026-10-31T12:00:00Z", durationSeconds: 29.5, viewCount: 7, thumbnailUrl: "https://static-cdn.jtvnw.net/Clip-1.jpg",
    },
  });
  expect(s.downloads).toHaveLength(0);
  expect(s.uploads).toHaveLength(0);
  expect(JSON.stringify(result)).not.toMatch(/TOKEN_SENTINEL|SIGNED_SENTINEL|KEY_SENTINEL/);
});

test("transcript uploads the downloaded clip audio to OpenAI and deletes the temporary file", async () => {
  const s = setup();
  const result = await s.service.info({ clipId: "Clip-1", transcript: true });
  expect(result.transcript).toMatchObject({ state: "available", provider: "openai", model: "gpt-transcribe", text: "welcome to the stream", audioBytes: mp4().length });
  expect(result.details.title).toBe("Big play");
  expect(s.uploads).toHaveLength(1);
  const file = s.uploads[0]?.get("file") as File;
  expect(file.name).toBe("audio.mp4");
  expect(s.uploads[0]?.get("model")).toBe("gpt-transcribe");
  expect(await Bun.file(s.downloads[0] ?? "").exists()).toBe(false);
  expect(JSON.stringify(result)).not.toMatch(/KEY_SENTINEL|SIGNED_SENTINEL|media-info-/);
});

test("missing OpenAI key keeps details and reports the transcript as unavailable", async () => {
  const s = setup({ key: undefined });
  const result = await s.service.info({ clipId: "Clip-1", transcript: true });
  expect(result.details.title).toBe("Big play");
  expect(result.transcript).toMatchObject({ state: "unavailable", code: "OPENAI_NOT_CONFIGURED" });
  expect(s.uploads).toHaveLength(0);
  expect(await Bun.file(s.downloads[0] ?? "").exists()).toBe(false);
});

test("clip without an audio track and oversized audio never reach OpenAI", async () => {
  const silent = setup({ file: path => writeFile(path, mp4("vide"), { mode: 0o600 }) });
  expect((await silent.service.info({ clipId: "Clip-1", transcript: true })).transcript).toMatchObject({ state: "unavailable", code: "AUDIO_INVALID_MEDIA" });
  const large = setup({ file: async path => { await writeFile(path, mp4(), { mode: 0o600 }); await truncate(path, 25_000_001); } });
  expect((await large.service.info({ clipId: "Clip-1", transcript: true })).transcript).toMatchObject({ state: "unavailable", code: "AUDIO_TOO_LARGE" });
  expect(silent.uploads.length + large.uploads.length).toBe(0);
  expect((await readdir(root)).filter(name => name.endsWith(".mp4"))).toHaveLength(0);
});

test("OpenAI rejection is reported without hiding clip details", async () => {
  const s = setup({ openai: new Response("denied", { status: 401 }) });
  expect((await s.service.info({ clipId: "Clip-1", transcript: true })).transcript).toMatchObject({ state: "unavailable", code: "OPENAI_AUTH_FAILED" });
});

test("missing clip permission or another broadcaster's clip returns details with the reason", async () => {
  const scope = setup({ scopes: [] });
  expect(await scope.service.info({ clipId: "Clip-1", transcript: true })).toMatchObject({ details: { id: "Clip-1" }, transcript: { state: "unavailable", code: "TWITCH_SCOPE_REQUIRED" } });
  const other = setup({ metadata: { data: [{ ...clip, broadcaster_id: "999" }] } });
  expect(await other.service.info({ clipId: "Clip-1", transcript: true })).toMatchObject({ details: { broadcasterId: "999" }, transcript: { state: "unavailable", code: "CLIP_WRONG_BROADCASTER" } });
  expect(scope.uploads.length + other.uploads.length).toBe(0);
});

test("unknown clips fail instead of returning an empty result", async () => {
  await expect(setup({ metadata: { data: [] } }).service.info({ clipId: "Clip-1", transcript: true })).rejects.toThrow("CLIP_NOT_FOUND");
  await expect(setup().service.info({ clipId: "../bad" })).rejects.toThrow();
});

async function connected(s: { service: MediaInfoService }) {
  const server = new McpServer({ name: "media", version: "1" });
  registerMediaTools(server, s.service);
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  return { client, async close() { await client.close(); await server.close(); } };
}

test("MCP tool returns structured details and rejects unknown input", async () => {
  const mcp = await connected(setup());
  try {
    const listed = (await mcp.client.listTools()).tools.find(tool => tool.name === "stream_machine_media_info");
    expect(listed?.annotations).toMatchObject({ readOnlyHint: false, openWorldHint: true, destructiveHint: false });
    const result = await mcp.client.callTool({ name: "stream_machine_media_info", arguments: { clipId: "Clip-1", transcript: true } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ media: { mode: "live", details: { title: "Big play" }, transcript: { state: "available", text: "welcome to the stream" } } });
    expect((await mcp.client.callTool({ name: "stream_machine_media_info", arguments: { clipId: "Clip-1", url: "https://example.com" } })).isError).toBe(true);
  } finally { await mcp.close(); }
});

test("MCP tool reports provider errors by code and never exposes secrets", async () => {
  const mcp = await connected(setup({ metadata: { data: [] } }));
  try {
    const result = await mcp.client.callTool({ name: "stream_machine_media_info", arguments: { clipId: "Clip-1" } });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ error: { code: "CLIP_NOT_FOUND" } });
    expect(JSON.stringify(result)).not.toMatch(/TOKEN_SENTINEL|KEY_SENTINEL/);
  } finally { await mcp.close(); }
});
