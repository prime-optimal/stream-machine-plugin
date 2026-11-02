import { TwitchFault, type TwitchAccountProvider } from "../../auth/twitch";
import { CLIP_SCOPE } from "../../auth/upstream/service";
import { ClipArtifactWriter } from "./clip-artifact";
import { TwitchClipClient, clipIdSchema } from "./clips-client";
import { fetchClipLibraryPage, type ClipLibraryInput } from "./clip-library";
let downloading = false;
export class TwitchClipService {
  constructor(private accounts: TwitchAccountProvider, private client = new TwitchClipClient(), private writer: Pick<ClipArtifactWriter, "write"> = new ClipArtifactWriter()) {}
  private validate(id: string) { if (!clipIdSchema.safeParse(id).success) throw new TwitchFault("INVALID_CLIP_ID"); }
  async clip(clipId: string) {
    this.validate(clipId);
    return this.accounts.withAccount(async access => ({ mode: "live", clip: await this.client.read(access, clipId) }));
  }
  async library(input: ClipLibraryInput) {
    return this.accounts.withAccount(access => fetchClipLibraryPage((path, params) => this.client.get(access, path, params), access.account, input, "local"));
  }
  async download(clipId: string) {
    this.validate(clipId);
    if (downloading) throw new TwitchFault("CLIP_DOWNLOAD_BUSY");
    downloading = true;
    try {
      const { clip, format, url } = await this.accounts.withAccount(async access => {
        if (!access.account.scopes.includes(CLIP_SCOPE)) throw new TwitchFault("TWITCH_SCOPE_REQUIRED");
        const clip = await this.client.read(access, clipId);
        if (clip.broadcasterId !== access.account.id) throw new TwitchFault("CLIP_WRONG_BROADCASTER");
        return { clip, ...await this.client.download(access, clipId) };
      });
      const artifact = await this.writer.write(url);
      return { mode: "live", clip, format, artifact };
    } finally { downloading = false; }
  }
}
