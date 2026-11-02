import type { McpServer } from "@modelcontextprotocol/server";
import { createLocalTwitchRuntime, preflightTwitch, type LocalTwitchRuntime } from "../../auth/local-runtime";
import { TwitchFault, unavailableAccount, type TwitchAccountProvider } from "../../auth/twitch";
import { TwitchTitleService } from "./service";
import { TwitchClipService } from "./clips-service";
import { registerTwitchClipLibraryTool } from "./clips-register";
import { registerTwitchToolSet } from "./tool-register";
import type { TwitchToolRuntime } from "./tool-runtime";

export function registerTwitchTools(server: McpServer, runtime?: LocalTwitchRuntime) {
  let resolved = runtime;
  const getRuntime = () => { resolved ??= createLocalTwitchRuntime(); return resolved; };
  const accounts: TwitchAccountProvider = {
    withAccount(operation) { return (getRuntime()?.accounts ?? unavailableAccount).withAccount(operation); },
  };
  const unavailableTitles = new TwitchTitleService(unavailableAccount);
  const clips = new TwitchClipService(accounts);
  const tools: TwitchToolRuntime = {
      accounts,
      get titles() { return getRuntime()?.titles ?? unavailableTitles; },
      preflight: () => resolved?.preflight() ?? preflightTwitch(),
      async connect(manageBroadcast, manageClips, openBrowser, replacePluginListener) {
        const local = getRuntime();
        if (!local) throw new TwitchFault("TWITCH_NOT_CONFIGURED");
        return local.connect(manageBroadcast, manageClips, openBrowser, replacePluginListener);
      },
      approvalUrl(previewId) {
        const local = getRuntime();
        if (!local) throw new TwitchFault("TWITCH_NOT_CONFIGURED");
        return local.approvalUrl(previewId);
      },
      clip: clipId => clips.clip(clipId),
      downloadClip: clipId => clips.download(clipId),
  };
  registerTwitchToolSet(server, () => tools);
  registerTwitchClipLibraryTool(server, () => clips);
  return clips;
}
