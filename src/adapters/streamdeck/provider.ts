import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

const resultSchema = z.object({ isError: z.boolean().optional(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })) });

export const STREAMDECK_REVISION = "dd3e58da3199d0e1de8d6f43cb7595e54cfa5f76";
export interface DeckProvider {
  call(name: string, args?: Record<string, unknown>): Promise<string>;
  close(): Promise<void>;
}

export class UsbProvider implements DeckProvider {
  private client: Client | undefined;
  private connecting: Promise<Client> | undefined;
  private diagnostics = "";

  private connect() {
    if (!this.connecting) this.connecting = this.start();
    return this.connecting;
  }

  private async start() {
    const client = new Client({ name: "stream-machine-streamdeck", version: "0.1.0" });
    const source = process.env.STREAM_MACHINE_STREAMDECK_SOURCE ??
      `git+https://github.com/prime-optimal/streamdeck-mcp.git@${STREAMDECK_REVISION}`;
    const transport = new StdioClientTransport({
      command: "uv", args: ["tool", "run", "--python", "3.11", "--with", "mcp==1.25.0", "--from", source, "streamdeck-mcp-usb"],
      stderr: "pipe",
    });
    transport.stderr?.on("data", (chunk: Buffer) => {
      this.diagnostics = (this.diagnostics + chunk.toString()).slice(-4000);
    });
    try {
      await client.connect(transport, { timeout: 120_000 });
      this.client = client;
      return client;
    } catch (error) {
      await transport.close();
      this.connecting = undefined;
      throw this.withDiagnostics(error);
    }
  }

  private withDiagnostics(error: unknown) {
    const message = error instanceof Error ? error.message : "Provider failed";
    return new Error(`${message}${this.diagnostics ? `\nProvider diagnostics:\n${this.diagnostics.trim()}` : ""}`);
  }

  async call(name: string, args: Record<string, unknown> = {}) {
    const client = await this.connect();
    const result = resultSchema.parse(await client.callTool({ name, arguments: args }, undefined, { timeout: 20_000 })
      .catch((error: unknown) => { throw this.withDiagnostics(error); }));
    const text = result.content.flatMap((item) => item.type === "text" && item.text ? [item.text] : []).join("\n");
    if (result.isError || text.startsWith("❌") || text.startsWith("⚠️")) throw new Error(text);
    return text;
  }

  async close() {
    await this.client?.close();
    this.client = undefined;
    this.connecting = undefined;
  }
}
