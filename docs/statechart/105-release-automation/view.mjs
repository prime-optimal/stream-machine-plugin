export const title = "Release preparation stops at human review";
const names = {
  Queued: "Main push or manual retry", Prepared: "Release files prepared locally",
  Checked: "Required checks passed", CheckFailed: "Required check failed",
  PermissionBlocked: "PR creation blocked after branch push", Stale: "Main changed before push",
  Pushed: "Release branch pushed", Review: "One release PR awaits review",
  ApiFailed: "PR API failed after branch push", Merged: "Human merged release PR",
  Noop: "No release needed"
};
export const state = v => names[v.phase];
const labels = {
  NoRelease: "Commitizen finds no bump", Prepare: "Commitizen prepares eligible range",
  Check: "Checks pass", CheckFails: "A check fails", PermissionBlocked: "Repository disallows PR creation",
  Stale: "Latest main differs from source", Push: "Push fixed release branch [source check passes]",
  OpenOrUpdate: "Create or update fixed PR", ApiFailure: "PR API request fails",
  Retry: "Retry from current main", HumanMerge: "Reviewer merges PR",
  RunAfterMerge: "Run after merge with consumed boundary", Wait: "Wait"
};
export const step = action => labels[action];
