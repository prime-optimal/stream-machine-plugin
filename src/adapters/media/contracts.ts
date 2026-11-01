import { z } from "zod";

export const MEDIA_REVISION = "e584553cb5be972b87711de0d191f2489e7ff8fb";
export class MediaFault extends Error {
  constructor(readonly code: string) { super(code); }
}
export function canonicalVideo(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname)) throw new MediaFault("INVALID_INPUT");
  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) :
    url.pathname === "/watch" ? url.searchParams.get("v") :
    /^\/(shorts|embed)\//.test(url.pathname) ? url.pathname.split("/")[2] : null;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new MediaFault("INVALID_INPUT");
  return `https://www.youtube.com/watch?v=${id}`;
}
export const mediaInput = z.object({
  url: z.string().max(2048).url().refine(value => {
    try { canonicalVideo(value); return true; } catch { return false; }
  }),
  transcript: z.boolean().default(false),
}).strict();
export type MediaInput = z.infer<typeof mediaInput>;
const envelope = z.object({
  isError: z.boolean().optional(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});
export function payload(result: unknown) {
  const parsed = envelope.parse(result);
  const text = parsed.content.filter(item => item.type === "text").map(item => item.text ?? "").join("\n");
  if (text.length > 2_000_000) throw new MediaFault("MEDIA_INVALID_RESPONSE");
  const value: unknown = JSON.parse(text);
  if (parsed.isError) {
    const error = z.object({ code: z.string() }).safeParse(value);
    if (error.success && ["NO_SUBTITLES", "SUBTITLE_FETCH_FAILED"].includes(error.data.code)) {
      throw new MediaFault(error.data.code);
    }
    throw new MediaFault("MEDIA_PROVIDER_UNAVAILABLE");
  }
  return value;
}
export const metadata = z.object({
  url: z.string(), title: z.string().min(1).max(2000),
  duration_seconds: z.number().finite().nonnegative().nullable().optional(),
});
export const transcriptData = z.object({
  url: z.string(), language: z.string().min(1).max(100), full_text: z.string().min(1),
});
