import { afterAll, expect, test } from "bun:test";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTranscriptionTool } from "../src/adapters/openai/transcription-register";
import { TranscriptionService } from "../src/adapters/openai/transcription-service";

const root = await realpath(await mkdtemp(join(tmpdir(), "transcribe-mcp-")));
const path = join(root, "fixture.wav");
const wav = Buffer.alloc(48);
wav.write("RIFF"); wav.writeUInt32LE(40, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(4, 40);
await writeFile(path, wav, { mode: 0o600 });
afterAll(() => rm(root, { recursive: true, force: true }));

async function connected(service: TranscriptionService) {
  const server = new McpServer({ name: "transcription", version: "1" });
  registerTranscriptionTool(server, service);
  server.server.onclose = () => service.close();
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  return { client, async close() { await client.close(); await server.close(); } };
}

test("MCP discovery stays lazy and advertises explicit external upload", async () => {
  let resolves = 0;
  const mcp = await connected(new TranscriptionService({ key: () => { resolves++; return undefined; } }));
  try {
    const tools = (await mcp.client.listTools()).tools;
    expect(resolves).toBe(0);
    expect(tools[0]?.name).toBe("stream_machine_transcribe_audio");
    expect(tools[0]?.annotations).toMatchObject({ readOnlyHint: false, openWorldHint: true, idempotentHint: false, destructiveHint: false });
    const absent = await mcp.client.callTool({ name: "stream_machine_transcribe_audio", arguments: { path } });
    expect(absent.isError).toBe(true);
    expect(absent.structuredContent).toMatchObject({ error: { code: "OPENAI_NOT_CONFIGURED", mayHaveBeenProcessed: false } });
    const invalid = await mcp.client.callTool({ name: "stream_machine_transcribe_audio", arguments: { path, model: "other" } });
    expect(invalid.isError).toBe(true);
    expect(resolves).toBe(1);
  } finally { await mcp.close(); }
});

test("MCP success returns transcript provenance without key or local directory", async () => {
  const mcp = await connected(new TranscriptionService({ key: () => "KEY_SENTINEL", fetcher: async () => Response.json({ text: "hello" }) }));
  try {
    const result = await mcp.client.callTool({ name: "stream_machine_transcribe_audio", arguments: { path } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ transcription: { model: "gpt-transcribe", text: "hello", source: { name: "fixture.wav" } } });
    expect(JSON.stringify(result)).not.toContain("KEY_SENTINEL");
    expect(JSON.stringify(result)).not.toContain(root);
  } finally { await mcp.close(); }
});

test("real MCP cancellation reaches the active service transport", async () => {
  const started = Promise.withResolvers<void>();
  const canceled = Promise.withResolvers<void>();
  const service = new TranscriptionService({ key: () => "KEY_SENTINEL", fetcher: async (_url, init) => {
    init.signal?.addEventListener("abort", () => canceled.resolve(), { once: true });
    started.resolve();
    return new Promise<Response>(() => {});
  } });
  const mcp = await connected(service);
  const signal = new AbortController();
  try {
    const call = mcp.client.callTool({ name: "stream_machine_transcribe_audio", arguments: { path } }, undefined, { signal: signal.signal });
    const observed = call.then(() => false, () => true);
    await started.promise;
    signal.abort();
    expect(await observed).toBe(true);
    await Promise.race([canceled.promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Cancellation not delivered")), 1000))]);
  } finally { await mcp.close(); }
});
