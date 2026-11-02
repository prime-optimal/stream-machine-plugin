import { version } from "./version";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { z } from "zod";

export const previewRequest = z.object({ name: z.string().min(1), arguments: z.record(z.string(), z.unknown()) }).strict();

export async function createPreviewBridge(serverPath = resolve(import.meta.dir, "../dist/server.js")) {
  const environment = getDefaultEnvironment();
  for (const name of ["OPENAI_API_KEY", "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_TOKEN_ENCRYPTION_KEY", "STREAM_MACHINE_DESIGN_AUTHORIZATION", "STREAM_MACHINE_DESIGN_USERNAME", "STREAM_MACHINE_DESIGN_PASSWORD", "STREAM_MACHINE_TWITCH_STORE", "STREAM_MACHINE_STREAMDECK_SOURCE"]) {
    const value = process.env[name];
    if (value) environment[name] = value;
  }
  const client = new Client({ name: "stream-machine-preview", version });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], env: environment, stderr: "pipe" });
  transport.stderr?.on("data", () => {});
  await client.connect(transport);
  const names = new Set((await client.listTools()).tools.map(tool => tool.name));
  return {
    names,
    async call(input: z.infer<typeof previewRequest>) {
      if (!names.has(input.name)) throw new Error("UNKNOWN_TOOL");
      return client.callTool(input, undefined, { timeout: 150_000 });
    },
    close: () => client.close(),
  };
}
