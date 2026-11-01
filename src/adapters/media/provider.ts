import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isAbsolute, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { canonicalVideo, MEDIA_REVISION, MediaFault, mediaInput, metadata, payload, transcriptData, type MediaInput } from "./contracts";

export interface MediaConnection {
  call(name: "extract_info" | "get_transcript", args: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
  close(): Promise<void>;
}
export type MediaConnector = (signal: AbortSignal) => Promise<MediaConnection>;
const execute = promisify(execFile);

export function verifyLoopbackListeners(output: string, port: string) {
  const rows = output.trim().split("\n").slice(1);
  if (!rows.length || rows.some(row => row.trim().split(/\s+/).slice(-2).join(" ") !== `127.0.0.1:${Number(port)} (LISTEN)`)) {
    throw new MediaFault("MEDIA_PRIVATE_SERVICE_REQUIRED");
  }
}

export async function verifyPrivateService(port: string, signal: AbortSignal) {
  try {
    const result = await execute("lsof", ["-nP", `-iTCP:${Number(port)}`, "-sTCP:LISTEN"], { signal });
    verifyLoopbackListeners(result.stdout, port);
  } catch { throw new MediaFault("MEDIA_PRIVATE_SERVICE_REQUIRED"); }
}

export async function connectPrivateMedia(signal: AbortSignal): Promise<MediaConnection> {
  const source = process.env.STREAM_MACHINE_MEDIA_SOURCE;
  const port = process.env.STREAM_MACHINE_MEDIA_PORT;
  if (!source || !port) throw new MediaFault("MEDIA_PROVIDER_NOT_CONFIGURED");
  if (!isAbsolute(source) || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new MediaFault("MEDIA_CONFIGURATION_INVALID");
  }
  await verifyPrivateService(port, signal);
  const revision = await execute("git", ["-C", source, "rev-parse", "HEAD"], { signal });
  const status = await execute("git", ["-C", source, "status", "--porcelain", "--untracked-files=normal"], { signal });
  if (revision.stdout.trim() !== MEDIA_REVISION || status.stdout.trim()) throw new MediaFault("MEDIA_SOURCE_NOT_PINNED");
  const client = new Client({ name: "stream-machine-media", version: "0.2.0" });
  const transport = new StdioClientTransport({
    command: process.execPath, args: [join(source, "src/index.js")], cwd: source, stderr: "pipe",
    env: {
      PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "",
      ENABLE_SSE: "0", LOG_LEVEL: "error", YT_MEDIA_INFO_HOST: "127.0.0.1",
      YT_MEDIA_INFO_SERVICE_URL: `http://127.0.0.1:${Number(port)}`,
      YT_MEDIA_INFO_USERNAME: "", YT_MEDIA_INFO_PASSWORD: "", YT_MEDIA_INFO_API_KEY: "",
    },
  });
  transport.stderr?.on("data", () => {});
  try {
    await client.connect(transport, { signal, timeout: 60_000 });
    return {
      call: async (name, args, requestSignal) => {
        await verifyPrivateService(port, requestSignal);
        return client.callTool({ name, arguments: args }, undefined, { signal: requestSignal, timeout: 60_000 });
      },
      close: () => client.close(),
    };
  } catch {
    await transport.close();
    throw new MediaFault("MEDIA_PROVIDER_UNAVAILABLE");
  }
}

export class MediaInfoProvider {
  private connection: MediaConnection | undefined;
  private active: AbortController | undefined;
  private closed = false;
  private pending: Promise<unknown> | undefined;
  constructor(private readonly connect: MediaConnector = connectPrivateMedia, private readonly timeoutMs = 60_000) {}

  inspect(input: MediaInput) {
    const args = mediaInput.parse(input);
    if (this.closed) return Promise.reject(new MediaFault("MEDIA_PROVIDER_CLOSED"));
    if (this.active) return Promise.reject(new MediaFault("MEDIA_PROVIDER_BUSY"));
    const controller = new AbortController();
    this.active = controller;
    const operation = this.run(args, controller);
    this.pending = operation;
    return operation;
  }

  private async run(args: MediaInput, controller: AbortController) {
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      this.connection ??= await this.connect(controller.signal);
      controller.signal.throwIfAborted();
      const url = canonicalVideo(args.url);
      const info = metadata.parse(payload(await this.connection.call("extract_info", {
        url, include_raw: false, username: null, password: null,
      }, controller.signal)));
      if (canonicalVideo(info.url) !== url) throw new MediaFault("MEDIA_INVALID_RESPONSE");
      let transcript: { state: "not_requested" } | { state: "unavailable"; reason: string } |
        { state: "available"; language: string; text: string; truncated: boolean } = { state: "not_requested" };
      if (args.transcript) {
        try {
          const result = transcriptData.parse(payload(await this.connection.call("get_transcript", {
            url, language: "en", timestamps: false, username: null, password: null,
          }, controller.signal)));
          if (canonicalVideo(result.url) !== url) throw new MediaFault("MEDIA_INVALID_RESPONSE");
          transcript = { state: "available", language: result.language, text: result.full_text.slice(0, 100_000), truncated: result.full_text.length > 100_000 };
        } catch (error) {
          if (!(error instanceof MediaFault) || !["NO_SUBTITLES", "SUBTITLE_FETCH_FAILED"].includes(error.code)) throw error;
          transcript = { state: "unavailable", reason: error.code };
        }
      }
      controller.signal.throwIfAborted();
      return {
        originalUrl: args.url, canonicalUrl: url, source: "YouTube",
        provider: "yt-media-info-mcp", revision: MEDIA_REVISION,
        title: info.title, durationSeconds: info.duration_seconds ?? null,
        retrievedAt: new Date().toISOString(), transcript,
      };
    } catch (error) {
      await this.disconnect();
      if (controller.signal.aborted) throw new MediaFault("MEDIA_PROVIDER_TIMEOUT");
      throw error instanceof MediaFault ? error : new MediaFault("MEDIA_PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
      this.active = undefined;
    }
  }

  private async disconnect() {
    const connection = this.connection;
    this.connection = undefined;
    await connection?.close().catch(() => {});
  }

  async close() {
    this.closed = true;
    this.active?.abort();
    await this.pending?.catch(() => {});
    await this.disconnect();
  }
}
