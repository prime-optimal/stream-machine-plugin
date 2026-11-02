import { z } from "zod";
import type { ToolResult } from "./tool-transport";

const identitySchema = z.object({ twitch: z.object({ account: z.object({ id: z.string().min(1) }) }) });

export function createClipAccountStatus(changed: (accountId: string | null) => void) {
  let revision = 0;
  let accountId: string | null = null;
  return {
    invalidate() { revision++; accountId = null; },
    accountId: () => accountId,
    async read(request: () => Promise<ToolResult>): Promise<ToolResult> {
      const mine = ++revision;
      const result = await request();
      if (mine !== revision) return result;
      const identity = identitySchema.safeParse(result.structuredContent);
      accountId = !result.isError && identity.success ? identity.data.twitch.account.id : null;
      changed(accountId);
      return result;
    },
  };
}
