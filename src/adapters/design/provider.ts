import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

export const DESIGN_ORIGIN = "https://open-design-ssjzomvt.usw-1.sealos.app";
export interface CreativeProvider { call(name: string, args: Record<string, unknown>): Promise<unknown>; }
export class CreativeError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
export function configuredProvider(): CreativeProvider {
  const username = process.env.STREAM_MACHINE_DESIGN_USERNAME;
  const password = process.env.STREAM_MACHINE_DESIGN_PASSWORD;
  const authorization = process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION || (username && password ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` : undefined);
  if (!authorization) throw new CreativeError("CONFIGURATION_REQUIRED", "Inject existing service authorization server-side through fnox; never supply credentials as tool input.");
  return remoteProvider(authorization);
}
export function remoteProvider(authorization: string): CreativeProvider {
  return {
    async call(name, args) {
      const client = new Client({ name: "stream-machine", version: "0.1.0" });
      try {
        await client.connect(new StreamableHTTPClientTransport(new URL(`${DESIGN_ORIGIN}/api/mcp`), {
          requestInit: { headers: { Authorization: authorization }, redirect: "error", signal: AbortSignal.timeout(30_000) },
        }));
        const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 30_000 });
        if (result.isError) throw new CreativeError("PROVIDER_FAILURE", `Existing service rejected ${name}; inspect project before retrying a write.`);
        const content = z.array(z.object({ type: z.string(), text: z.string().optional() })).parse(result.content);
        const text = content.filter(item => item.type === "text").at(-1)?.text;
        if (!text) throw new CreativeError("CONTRACT_MISMATCH", "Existing service returned no text result.");
        if (name === "get_file") return text;
        try { return JSON.parse(text); }
        catch { throw new CreativeError("CONTRACT_MISMATCH", "Existing service result is not JSON; raw diagnostics withheld."); }
      } catch (error) {
        if (error instanceof CreativeError) throw error;
        throw new CreativeError("CONNECTION_UNAVAILABLE", "Existing service connection failed; local plugin transport and remote service health are separate checks. Write outcome may be unknown.");
      } finally { await client.close().catch(() => {}); }
    },
  };
}
