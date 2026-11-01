import { z } from "zod";
import { readAudioSource } from "./audio-source";
import { TranscriptionFault, transcriptionInput } from "./transcription-contracts";

export type TranscriptionFetch = (url: string, options: RequestInit) => Promise<Response>;
const endpoint = "https://api.openai.com/v1/audio/transcriptions";
const responseLimit = 1_048_576;
const transcriptResponse = z.object({ text: z.string().max(250_000) });
let reservation: symbol | undefined;

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new TranscriptionFault("TRANSCRIPTION_CANCELLED"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    work.then(
      value => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted && value instanceof Response) void value.body?.cancel().catch(() => {});
        resolve(value);
      },
      error => { signal.removeEventListener("abort", abort); reject(error); },
    );
  });
}

async function readResponse(response: Response, signal: AbortSignal) {
  const length = Number(response.headers.get("content-length"));
  if (length > responseLimit) {
    void response.body?.cancel().catch(() => {});
    throw new TranscriptionFault("OPENAI_RESPONSE_TOO_LARGE");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new TranscriptionFault("OPENAI_INVALID_RESPONSE");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > responseLimit) throw new TranscriptionFault("OPENAI_RESPONSE_TOO_LARGE");
      parts.push(chunk.value);
    }
    const bytes = Buffer.concat(parts);
    let data: unknown;
    try { data = JSON.parse(bytes.toString("utf8")); }
    catch { throw new TranscriptionFault("OPENAI_INVALID_RESPONSE"); }
    const result = transcriptResponse.safeParse(data);
    if (!result.success) throw new TranscriptionFault("OPENAI_INVALID_RESPONSE");
    return result.data.text;
  } finally {
    void reader.cancel().catch(() => {});
    try { reader.releaseLock(); } catch {}
  }
}

export class TranscriptionService {
  private closed = false;
  private active: AbortController | undefined;
  constructor(private options: { key?: () => string | undefined; fetcher?: TranscriptionFetch; timeoutMs?: number } = {}) {}

  close() {
    this.closed = true;
    this.active?.abort();
  }

  async transcribe(raw: unknown, signal?: AbortSignal) {
    const parsed = transcriptionInput.safeParse(raw);
    if (!parsed.success) throw new TranscriptionFault("INVALID_INPUT");
    if (this.closed || signal?.aborted) throw new TranscriptionFault("TRANSCRIPTION_CANCELLED");
    const key = (this.options.key ? this.options.key() : process.env.OPENAI_API_KEY)?.trim();
    if (!key) throw new TranscriptionFault("OPENAI_NOT_CONFIGURED");
    if (reservation) throw new TranscriptionFault("TRANSCRIPTION_BUSY");
    const ticket = Symbol();
    reservation = ticket;
    const controller = new AbortController();
    this.active = controller;
    let timeout = false;
    let submitted = false;
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(() => { timeout = true; controller.abort(); }, this.options.timeoutMs ?? 120_000);
    try {
      const source = await readAudioSource(parsed.data.path, controller.signal);
      if (controller.signal.aborted) throw new TranscriptionFault("TRANSCRIPTION_CANCELLED");
      const form = new FormData();
      form.set("file", new File([source.bytes], "audio." + source.format, { type: source.mime }));
      form.set("model", "gpt-transcribe");
      if (parsed.data.prompt) form.set("prompt", parsed.data.prompt);
      for (const keyword of parsed.data.keywords ?? []) form.append("keywords[]", keyword);
      for (const language of Intl.getCanonicalLocales(parsed.data.languages ?? [])) form.append("languages[]", language);
      submitted = true;
      const response = await abortable((this.options.fetcher ?? fetch)(endpoint, {
        method: "POST", headers: { Authorization: "Bearer " + key },
        body: form, redirect: "error", signal: controller.signal,
      }), controller.signal);
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new TranscriptionFault(response.status === 401 || response.status === 403 ? "OPENAI_AUTH_FAILED"
          : response.status === 429 ? "OPENAI_RATE_LIMITED" : "OPENAI_REQUEST_FAILED", response.status >= 500 || response.status === 408);
      }
      const text = await readResponse(response, controller.signal);
      return {
        mode: "live", provider: "openai", model: "gpt-transcribe", text,
        source: { name: source.name, bytes: source.bytes.byteLength, sha256: source.sha256, format: source.format },
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const code = timeout ? "TRANSCRIPTION_TIMEOUT" : controller.signal.aborted ? "TRANSCRIPTION_CANCELLED"
        : error instanceof TranscriptionFault ? error.code : "OPENAI_UNAVAILABLE";
      const ambiguous = ["TRANSCRIPTION_TIMEOUT", "TRANSCRIPTION_CANCELLED", "OPENAI_UNAVAILABLE", "OPENAI_INVALID_RESPONSE", "OPENAI_RESPONSE_TOO_LARGE"].includes(code);
      throw new TranscriptionFault(code, submitted && (ambiguous || (error instanceof TranscriptionFault && error.mayHaveBeenProcessed)));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      controller.abort();
      this.active = undefined;
      if (reservation === ticket) reservation = undefined;
    }
  }
}
