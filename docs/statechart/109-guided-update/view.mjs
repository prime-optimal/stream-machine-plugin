export const title = "Guided Stream Machine update";
export const state = v => v.phase;
export const step = action => ({Check:"Check finds newer release",Unavailable:"Check unavailable",Prepare:"Package checks pass",Reject:"Package checks fail",Submit:"Authorized Creator submission",Save:"Creator reports save",LostSaved:"Response lost",LostUnchanged:"Response lost",ReadAgain:"Read source before retry",Confirm:"Target release read back",Mismatch:"Target not verified",FreshHost:"Fresh host reports target",Done:"Finish"})[action] ?? action;
