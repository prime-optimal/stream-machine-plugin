export const title = "Clips workspace";
const states = {
  connection: "Connect or recheck account", loading: "Load clips", list: "Browse clips",
  empty: "No clips found", loadError: "Clip lookup failed", details: "Inspect selected clip",
  preview: "Preview ready", playing: "Playing clip", downloading: "Download requested",
  saved: "File verified", refused: "Download refused", unknown: "Download outcome unknown",
};
export const state = (v) => states[v.phase];
const labels = {
  ConnectionVerified: "account check succeeds", ClipsFound: "clips found", NoClipsFound: "no matching clips",
  LookupFailed: "lookup fails", RetryLookup: "change lookup and retry", SelectClip: "select a clip",
  LoadVerifiedPreview: "load preview and verify media", PreviewUnavailable: "preview unavailable",
  PressPlay: "press Play", PausePlayback: "pause playback", ClosePreview: "close preview",
  PressDownload: "request download", DownloadVerified: "completed file verified",
  DownloadRefused: "request rejected with known reason", DownloadOutcomeUnknown: "acknowledgment lost after dispatch",
  ReviewDownloadResult: "review result and return", BackToClips: "back to clips",
  AccountChanged: "account changes or access expires", WaitForUser: "wait for user",
};
export const step = (action, from) => {
  if (action === "AccountChanged" && from.phase !== "playing") return null;
  return labels[action] ?? action;
};
