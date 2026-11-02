import { z } from "zod";
import { clipIdSchema } from "../twitch/clips-client";

export const mediaInfoInput = z.object({
  clipId: clipIdSchema,
  transcript: z.boolean().default(false),
}).strict();

export const transcriptMessages: Record<string, string> = {
  TWITCH_SCOPE_REQUIRED: "Reconnect Twitch with the channel:manage:clips permission to download the clip audio.",
  CLIP_WRONG_BROADCASTER: "Only clips from the connected broadcaster can be downloaded for a transcript.",
  CLIP_FORMAT_UNAVAILABLE: "Twitch offers no downloadable video format for this clip.",
  CLIP_DOWNLOAD_BUSY: "Another clip download is active. Wait for it to finish.",
  CLIP_DOWNLOAD_EXPIRED: "The Twitch download link expired or was refused. Request the transcript again.",
  CLIP_DOWNLOAD_TOO_LARGE: "The clip file is too large to download.",
  CLIP_DOWNLOAD_TIMEOUT: "The clip download timed out.",
  TRANSCRIPT_UNAVAILABLE: "The clip transcript is unavailable.",
};
