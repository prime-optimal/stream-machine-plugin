import type { McpServer } from "@modelcontextprotocol/server";
import { TranscriptionFault, transcriptionErrors, transcriptionInput } from "./transcription-contracts";
import { TranscriptionService } from "./transcription-service";

export function registerTranscriptionTool(server: McpServer, service = new TranscriptionService()) {
  server.registerTool("stream_machine_transcribe_audio", {
    description: "Transcribe one explicitly selected local audio file using OpenAI gpt-transcribe. Uploads the audio to OpenAI and may incur charges; requires user intent to upload that file. Supports bounded WAV, MP3, and audio MP4/M4A files. No URL fetching, media metadata, timestamps, or automatic retries.",
    inputSchema: transcriptionInput,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
  }, async (input, context) => {
    try {
      const result = await service.transcribe(input, context.mcpReq.signal);
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { transcription: result } };
    } catch (error) {
      const fault = error instanceof TranscriptionFault ? error : new TranscriptionFault("OPENAI_UNAVAILABLE");
      return {
        isError: true, content: [{ type: "text", text: fault.code + ": " + transcriptionErrors[fault.code] }],
        structuredContent: { error: { code: fault.code, message: transcriptionErrors[fault.code], mayHaveBeenProcessed: fault.mayHaveBeenProcessed } },
      };
    }
  });
  return service;
}
