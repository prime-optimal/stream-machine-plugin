import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createPreviewBridge } from "../src/preview-bridge";

test("preview bridge forwards the key only to its child server", async () => {
  const root = await mkdtemp(join(tmpdir(), "preview-key-test-"));
  const script = join(root, "server.ts");
  await writeFile(script, 'import { serveStdio } from ' + JSON.stringify(import.meta.resolve("@modelcontextprotocol/server/stdio")) +
    '; import { createServer } from ' + JSON.stringify(resolve(import.meta.dir, "../src/server.ts")) +
    '; serveStdio(() => createServer("<html/>"));');
  const original = process.env.OPENAI_API_KEY;
  try {
    for (const configured of [false, true]) {
      if (configured) process.env.OPENAI_API_KEY = "PREVIEW_KEY_SENTINEL";
      else delete process.env.OPENAI_API_KEY;
      const bridge = await createPreviewBridge(script);
      try {
        const result = await bridge.call({ name: "stream_machine_transcribe_audio", arguments: { path: "relative.wav" } });
        expect(result.structuredContent).toMatchObject({ error: { code: configured ? "INVALID_INPUT" : "OPENAI_NOT_CONFIGURED" } });
        expect(JSON.stringify(result)).not.toContain("PREVIEW_KEY_SENTINEL");
      } finally { await bridge.close(); }
    }
  } finally {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
    await rm(root, { recursive: true, force: true });
  }
});
