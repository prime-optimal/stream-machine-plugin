import { afterAll, expect, test } from "bun:test";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TranscriptionService, type TranscriptionFetch } from "../src/adapters/openai/transcription-service";
import { TranscriptionFault } from "../src/adapters/openai/transcription-contracts";

const root = await realpath(await mkdtemp(join(tmpdir(), "transcription-test-")));
const path = join(root, "spoken.wav");
const wav = Buffer.alloc(48);
wav.write("RIFF"); wav.writeUInt32LE(40, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(4, 40);
await writeFile(path, wav, { mode: 0o600 });
afterAll(() => rm(root, { recursive: true, force: true }));
const key = "SYNTHETIC_KEY_SENTINEL";
const success: TranscriptionFetch = async () => Response.json({ text: "The blue lantern is ready.", languages: ["en"] });
const make = (fetcher: TranscriptionFetch = success, timeoutMs = 1000) => new TranscriptionService({ key: () => key, fetcher, timeoutMs });


test("late fetch responses are disposed after timeout", async () => {
  const response = Promise.withResolvers<Response>();
  const started = Promise.withResolvers<void>();
  const disposed = Promise.withResolvers<void>();
  const service = make(async () => { started.resolve(); return response.promise; }, 25);
  const pending = service.transcribe({ path });
  await started.promise;
  await expect(pending).rejects.toMatchObject({ code: "TRANSCRIPTION_TIMEOUT" });
  response.resolve(new Response(new ReadableStream({ cancel() { disposed.resolve(); } })));
  const outcome = await Promise.race([disposed.promise.then(() => true), Bun.sleep(50).then(() => false)]);
  expect(outcome).toBe(true);
});

test("sends one bounded multipart request with exact model and plural hints", async () => {
  let calls = 0;
  const service = make(async (url, init) => {
    calls++;
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.method).toBe("POST"); expect(init.redirect).toBe("error");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer " + key);
    expect(headers.has("content-type")).toBe(false);
    const form = await new Response(init.body).formData();
    expect(form.get("model")).toBe("gpt-transcribe");
    expect(form.getAll("keywords[]")).toEqual(["Stream Machine"]);
    expect(form.getAll("languages[]")).toEqual(["en"]);
    expect(form.has("language")).toBe(false);
    expect(form.has("response_format")).toBe(false);
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    if (!(file instanceof File)) throw new Error("Expected uploaded file");
    expect(file.name).toBe("audio.wav");
    expect(Buffer.from(await file.arrayBuffer())).toEqual(wav);
    return Response.json({ text: "hello", invented: "ignored" });
  });
  const result = await service.transcribe({ path, keywords: ["Stream Machine"], languages: ["en"] });
  expect(calls).toBe(1);
  expect(result).toMatchObject({ mode: "live", provider: "openai", model: "gpt-transcribe", text: "hello", source: { name: "spoken.wav", bytes: 48, format: "wav" } });
  expect(result.source.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(result)).not.toContain(key);
  expect(JSON.stringify(result)).not.toContain(root);
  expect(result).not.toHaveProperty("languages");
});

test("missing key and invalid schema fail before network and file access", async () => {
  let calls = 0;
  const service = new TranscriptionService({ key: () => undefined, fetcher: async () => { calls++; return Response.json({}); } });
  await expect(service.transcribe({ path: "/missing.wav" })).rejects.toMatchObject({ code: "OPENAI_NOT_CONFIGURED" });
  for (const input of [{ path, url: "https://example.com" }, { path, language: "en" }, { path, keywords: ["<bad>"] }, { path, languages: ["en", "en"] }, { path, languages: ["not_valid"] }]) {
    await expect(service.transcribe(input)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  }
  expect(calls).toBe(0);
});

test("sanitizes HTTP errors without echoing provider bodies or retrying", async () => {
  for (const [status, code] of [[401, "OPENAI_AUTH_FAILED"], [403, "OPENAI_AUTH_FAILED"], [429, "OPENAI_RATE_LIMITED"], [400, "OPENAI_REQUEST_FAILED"], [500, "OPENAI_REQUEST_FAILED"]] satisfies [number, string][]) {
    let calls = 0;
    const service = make(async () => { calls++; return new Response(key, { status }); });
    try { await service.transcribe({ path }); throw new Error("Expected refusal"); }
    catch (error) {
      expect(error).toBeInstanceOf(TranscriptionFault);
      expect(error).toMatchObject({ code, mayHaveBeenProcessed: status >= 500 });
      expect(String(error)).not.toContain(key);
    }
    expect(calls).toBe(1);
  }
});

test("empty speech stays empty; invalid or excessive responses fail honestly", async () => {
  expect((await make(async () => Response.json({ text: "" })).transcribe({ path })).text).toBe("");
  for (const body of ["not json", "{}", JSON.stringify({ text: 1 })]) {
    await expect(make(async () => new Response(body)).transcribe({ path })).rejects.toMatchObject({ code: "OPENAI_INVALID_RESPONSE", mayHaveBeenProcessed: true });
  }
  await expect(make(async () => new Response("x".repeat(1_048_577), { headers: { "Content-Length": "1" } })).transcribe({ path })).rejects.toMatchObject({ code: "OPENAI_RESPONSE_TOO_LARGE" });
});

test("network failure is uncertain and never retried; reservation is released", async () => {
  let calls = 0;
  const service = make(async () => { calls++; throw new Error(key); });
  await expect(service.transcribe({ path })).rejects.toMatchObject({ code: "OPENAI_UNAVAILABLE", mayHaveBeenProcessed: true });
  expect(calls).toBe(1);
  expect((await make().transcribe({ path })).text).toContain("blue");
});

test("reservation spans services, timeout aborts, and another operation can follow", async () => {
  let requests = 0;
  const service = make(async () => { requests++; return new Promise<Response>(() => {}); }, 30);
  const pending = service.transcribe({ path });
  await expect(make().transcribe({ path })).rejects.toMatchObject({ code: "TRANSCRIPTION_BUSY" });
  await expect(pending).rejects.toMatchObject({ code: "TRANSCRIPTION_TIMEOUT" });
  expect(requests).toBe(1);
  expect((await make().transcribe({ path })).text).toContain("blue");
});

test("cancellation and shutdown prevent late uploads and abort response reads", async () => {
  let calls = 0;
  const stopped = make(async () => { calls++; return Response.json({ text: "bad" }); });
  const signal = AbortSignal.abort();
  await expect(stopped.transcribe({ path }, signal)).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED" });
  stopped.close();
  await expect(stopped.transcribe({ path })).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED" });
  expect(calls).toBe(0);

  const started = Promise.withResolvers<void>();
  const service = make(async () => { started.resolve(); return new Response(new ReadableStream({ start() {} })); });
  const pending = service.transcribe({ path });
  await started.promise;
  service.close();
  await expect(pending).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED", mayHaveBeenProcessed: true });
  expect((await make().transcribe({ path })).text).toContain("blue");
});

test("request cancellation aborts an in-flight transport", async () => {
  const abort = new AbortController();
  const begin = Promise.withResolvers<void>();
  let observed: AbortSignal | null | undefined;
  const service = make(async (_url, init) => { observed = init.signal; begin.resolve(); return new Promise<Response>(() => {}); });
  const pending = service.transcribe({ path }, abort.signal);
  await begin.promise; abort.abort();
  await expect(pending).rejects.toMatchObject({ code: "TRANSCRIPTION_CANCELLED" });
  expect(observed?.aborted).toBe(true);
});
