export const title = "Release publishing stops at every failed gate";
const remote = v => (v.published ? "release published" : v.draft ? "draft left behind"
  : v.tag === "other" ? "tag at another commit" : "nothing published");
const names = {
  Planned: "Plan found an unpublished version", HeadOk: "Release commit checked out",
  ChecksPassed: "Guards running", NoDraft: "Guards running", TagOk: "Guards running", Clean: "Guards running",
  Ready: "All guards passed", Published: "Release published with assets",
  UploadFailed: "Upload failed, draft left", Refused: "Guard refused, nothing written",
  ChecksFailed: "A check failed, nothing written", Stopped: "Already published, nothing written"
};
export const state = v => (v.phase === "Idle" ? `Waiting, ${remote(v)}` : names[v.phase]);
const labels = {
  PlanStops: "push or manual run finds the version published",
  PlanFindsWork: "push or manual run finds no published release",
  VerifyHeadPasses: "checkout matches the release commit", RefuseHead: "checkout is not the release commit",
  ChecksPass: "install, check, test, smoke, and package pass", ChecksFail: "a check, test, smoke, or package step fails",
  DraftGuardPasses: "no draft exists", RefuseDraft: "a draft release exists",
  TagGuardPasses: "tag is free or at the release commit", RefuseTag: "tag points to another commit",
  CleanGuardPasses: "worktree is clean", RefuseDirty: "worktree has changes",
  PackageGuardPasses: "both packages exist", RefuseMissing: "a package is missing",
  CreateSucceeds: "gh release create publishes", UploadFails: "an asset upload fails",
  RunEnds: "run ends", HumanDeletesDraft: "a human deletes the draft",
  HumanFixesTag: "a human removes the stray tag", Done: "no more runs"
};
export const step = action => labels[action];
