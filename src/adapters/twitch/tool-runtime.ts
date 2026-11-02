import type { TwitchAccountProvider } from "../../auth/twitch";
import type { TwitchTitleService } from "./service";

export interface TwitchToolRuntime {
  accounts: TwitchAccountProvider;
  titles: TwitchTitleService;
  preflight(): Promise<object>;
  connect(manageBroadcast: boolean, manageClips: boolean, openBrowser: boolean, replacePluginListener: boolean): Promise<object>;
  approvalUrl(previewId: string): string;
  clip(clipId: string): Promise<object>;
  downloadClip(clipId: string): Promise<object>;
}
