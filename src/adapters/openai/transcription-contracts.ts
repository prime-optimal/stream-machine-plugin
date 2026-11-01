import { z } from "zod";

export const transcriptionInput = z.object({
  path: z.string().min(1).max(4096),
  prompt: z.string().min(1).max(4096).optional(),
  keywords: z.array(z.string().min(1).max(128).regex(/^[^<>\r\n]+$/)).min(1).max(64).optional(),
  languages: z.array(z.string().min(2).max(35)).min(1).max(16).optional(),
}).strict().superRefine((input, ctx) => {
  if (!input.languages) return;
  try {
    const canonical = Intl.getCanonicalLocales(input.languages);
    if (canonical.length !== input.languages.length) ctx.addIssue({ code: "custom", message: "Duplicate languages" });
  } catch { ctx.addIssue({ code: "custom", message: "Invalid language tags" }); }
});

export const transcriptionErrors = {
  INVALID_INPUT: "Use a supported absolute audio path and valid transcription options.",
  AUDIO_SOURCE_UNSAFE: "Use a regular file owned by you, without symlinks or shared write permissions.",
  AUDIO_SOURCE_UNAVAILABLE: "The audio file is unavailable or changed while it was read.",
  AUDIO_SOURCE_EMPTY: "Choose a nonempty audio file.",
  AUDIO_TOO_LARGE: "Audio must be at most 25,000,000 bytes. Prepare a smaller file first.",
  AUDIO_FORMAT_UNSUPPORTED: "Use PCM16 WAV, MP3, or an MP4/M4A container with an audio track.",
  AUDIO_INVALID_MEDIA: "The file does not match a supported audio structure.",
  OPENAI_NOT_CONFIGURED: "Configure OPENAI_API_KEY through fnox and restart the server.",
  TRANSCRIPTION_BUSY: "Another transcription is active. Wait for its result.",
  TRANSCRIPTION_TIMEOUT: "Transcription timed out. Do not retry automatically.",
  TRANSCRIPTION_CANCELLED: "Transcription was canceled. Do not retry automatically.",
  OPENAI_AUTH_FAILED: "OpenAI rejected access. Check the key and model access.",
  OPENAI_RATE_LIMITED: "OpenAI rate or quota limit reached. Check account limits before retrying.",
  OPENAI_REQUEST_FAILED: "OpenAI returned an unsuccessful transcription response.",
  OPENAI_UNAVAILABLE: "OpenAI could not be reached. Do not retry automatically.",
  OPENAI_RESPONSE_TOO_LARGE: "OpenAI returned a transcript beyond the response limit.",
  OPENAI_INVALID_RESPONSE: "OpenAI did not return a valid transcript.",
};

export class TranscriptionFault extends Error {
  constructor(readonly code: keyof typeof transcriptionErrors, readonly mayHaveBeenProcessed = false) {
    super(transcriptionErrors[code]);
    this.name = "TranscriptionFault";
  }
}
