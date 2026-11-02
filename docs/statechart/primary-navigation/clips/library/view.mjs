export const title = "Save and play a clip";
const labels = { gallery: "Browsing gallery", details: "Clip details", saving: "Saving once to Site", starting: "Starting stored video", playing: "Playing saved clip", manual: "Saved; press Play", failed: "Save failed; retry available", unknown: "Save unconfirmed; reload library", closed: "Account changed; view closed" };
export const state = v => labels[v.phase];
export const step = (action, from) => {
  if (action === "AccountChanges" && from.phase !== "playing") return null;
  if (["Wait", "DuplicatePlay"].includes(action)) return null;
  return ({ SelectClip: "you select a clip", PlaySaved: "you press Play [already saved]", PlayUnsaved: "you press Play [unsaved Site clip]", SaveConfirmed: "Site confirms the stored URL", SaveFailed: "the save fails", SaveUnknown: "the save outcome is unknown", RetryKnownFailure: "you explicitly retry a known failure", PlaybackStarts: "the browser starts playback", AutoplayDenied: "the browser requires another click", PressVisiblePlay: "you press the visible Play button", LeaveDetail: "you leave or change the selected clip", AccountChanges: "the account changes" })[action] ?? action;
};
