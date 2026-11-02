import { unlink } from "node:fs/promises";
import { TwitchFault } from "../../auth/twitch";
import { TranscriptionFault, transcriptionErrors } from "../openai/transcription-contracts";
import type { TranscriptionService } from "../openai/transcription-service";
import type { TwitchClipService } from "../twitch/clips-service";
import { mediaInfoInput, transcriptMessages } from "./contracts";

export type MediaTranscript =
  | { state: "not_requested" }
  | { state: "available"; provider: "openai"; model: string; text: string; audioBytes: number; transcribedAt: string }
  | { state: "unavailable"; code: string; message: string };

const downloadBlocked = new Set(["TWITCH_SCOPE_REQUIRED", "CLIP_WRONG_BROADCASTER", "CLIP_FORMAT_UNAVAILABLE"]);
const unavailable = (code: string, message = transcriptMessages[code] ?? transcriptMessages.TRANSCRIPT_UNAVAILABLE ?? ""): MediaTranscript => ({ state: "unavailable", code, message });

export class MediaInfoService {
  constructor(
    private clips: Pick<TwitchClipService, "clip" | "download">,
    private transcriber: Pick<TranscriptionService, "transcribe">,
    private remove: (path: string) => Promise<void> = unlink,
  ) {}

  async info(raw: unknown, signal?: AbortSignal) {
    const input = mediaInfoInput.parse(raw);
    if (!input.transcript) {
      const { clip } = await this.clips.clip(input.clipId);
      return { mode: "live", details: clip, transcript: { state: "not_requested" } satisfies MediaTranscript };
    }
    try {
      const downloaded = await this.clips.download(input.clipId);
      return { mode: "live", details: downloaded.clip, transcript: await this.transcribe(downloaded.artifact.path, signal) };
    } catch (error) {
      const recoverable = error instanceof TwitchFault && (downloadBlocked.has(error.code) || error.code.startsWith("CLIP_DOWNLOAD_") || error.code.startsWith("CLIP_DIRECTORY_"));
      if (!recoverable) throw error;
      const { clip } = await this.clips.clip(input.clipId);
      return { mode: "live", details: clip, transcript: unavailable(error.code) };
    }
  }

  private async transcribe(path: string, signal?: AbortSignal): Promise<MediaTranscript> {
    try {
      const result = await this.transcriber.transcribe({ path }, signal);
      return { state: "available", provider: "openai", model: result.model, text: result.text, audioBytes: result.source.bytes, transcribedAt: result.completedAt };
    } catch (error) {
      if (!(error instanceof TranscriptionFault)) throw error;
      return unavailable(error.code, transcriptionErrors[error.code]);
    } finally {
      await this.remove(path).catch(() => {});
    }
  }
}
