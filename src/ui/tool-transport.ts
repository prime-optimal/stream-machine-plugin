import { z } from "zod";

const resultSchema = z.object({ isError: z.boolean().optional(), structuredContent: z.unknown().optional(), content: z.unknown().optional() });
export type ToolResult = z.infer<typeof resultSchema>;
export type ToolRequest = (name: string, args?: Record<string, unknown>) => Promise<ToolResult>;

export function createToolRequest(options: {
  standalone: boolean;
  native: (input: { name: string; arguments: Record<string, unknown> }) => Promise<ToolResult>;
}): ToolRequest {
  return async (name, args = {}) => {
    if (!options.standalone) return resultSchema.parse(await options.native({ name, arguments: args }));
    const response = await fetch("/api/tool", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!response.ok) throw new Error(`Local demo server returned ${response.status}.`);
    return resultSchema.parse(await response.json());
  };
}
