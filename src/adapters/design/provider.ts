import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

export const DESIGN_ORIGIN = "https://open-design-ssjzomvt.usw-1.sealos.app";
export interface CreativeProvider {
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
  api(path: string, body?: unknown): Promise<unknown>;
}

export class CreativeError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export function configuredProvider(): CreativeProvider {
  const authorization = process.env.STREAM_MACHINE_DESIGN_AUTHORIZATION;
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
        if (result.isError) throw new CreativeError("PROVIDER_FAILURE", `Existing service rejected ${name}; inspect provider project before retrying a submission.`);
        const content = z.array(z.object({ type: z.string(), text: z.string().optional() })).parse(result.content);
        const text = content.find(item => item.type === "text")?.text;
        if (!text) throw new CreativeError("CONTRACT_MISMATCH", "Existing service returned no JSON result.");
        if (name === "get_file") return text;
        return JSON.parse(text);
      } catch (error) {
        if (error instanceof CreativeError) throw error;
        throw new CreativeError("CONNECTION_UNAVAILABLE", "Existing service connection failed; local plugin transport and remote service health are separate checks. Submission outcome may be unknown.");
      } finally { await client.close().catch(() => {}); }
    },
    async api(path, body) {
      if (!path.startsWith("/api/") || path.includes("..")) throw new CreativeError("INVALID_INPUT", "Invalid internal service path.");
      try {
        const response = await fetch(`${DESIGN_ORIGIN}${path}`, {
          method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
          headers: { Authorization: authorization, Origin: DESIGN_ORIGIN, "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (!response.ok) throw new CreativeError(response.status === 401 ? "AUTHENTICATION_REQUIRED" : "PROVIDER_FAILURE", `Existing media service returned HTTP ${response.status}; response withheld.`);
        return await response.json();
      } catch (error) {
        if (error instanceof CreativeError) throw error;
        throw new CreativeError("CONNECTION_UNAVAILABLE", "Existing media service connection failed; inspect project before starting another task.");
      }
    },
  };
}
