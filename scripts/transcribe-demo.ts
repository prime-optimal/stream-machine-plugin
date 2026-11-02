import { createPreviewBridge } from "../src/preview-bridge";

if (process.argv.length !== 3) throw new Error("Usage: transcribe-demo.ts /canonical/path/audio.wav");
const bridge = await createPreviewBridge();
try {
  const result = await bridge.call({ name: "stream_machine_transcribe_audio", arguments: { path: process.argv[2] } });
  process.stdout.write(JSON.stringify(result.structuredContent, null, 2) + "\n");
  if (result.isError) process.exitCode = 1;
} finally { await bridge.close(); }
