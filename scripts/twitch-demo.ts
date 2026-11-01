import { createInterface } from "node:readline";
import { z } from "zod";
import { createLocalTwitchRuntime } from "../src/auth/local-runtime";
import { TwitchFault } from "../src/auth/twitch";
const command = z.discriminatedUnion("action", [z.object({ action: z.literal("status") }), z.object({ action: z.literal("channel") }), z.object({ action: z.literal("preview"), title: z.string() }), z.object({ action: z.literal("apply"), previewId: z.string().uuid() }), z.object({ action: z.literal("exit") })]);
const runtime = createLocalTwitchRuntime();
if (!runtime) throw new Error("TWITCH_NOT_CONFIGURED: inject existing Twitch fnox secrets");
console.log(JSON.stringify(runtime.connect(true)));
const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  try {
    const input = command.parse(JSON.parse(line));
    if (input.action === "exit") break;
    if (input.action === "status") console.log(JSON.stringify(await runtime.titles.status()));
    if (input.action === "channel") console.log(JSON.stringify(await runtime.titles.channel()));
    if (input.action === "preview") { const p = await runtime.titles.preview(input.title); console.log(JSON.stringify({ ...p, approvalUrl: runtime.approvalUrl(p.previewId) })); }
    if (input.action === "apply") console.log(JSON.stringify(await runtime.titles.apply(input.previewId)));
  } catch (error) { console.log(JSON.stringify({ error: error instanceof TwitchFault ? error.code : "TWITCH_REQUEST_FAILED" })); }
}
lines.close();
runtime.close();
