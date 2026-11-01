export const title = "Assets: create, inspect, and export";
const labels = {
  browse: "Browse assets and recipes", draft: "Review asset draft", setup: "Connect design service",
  running: "Generation running", unknown: "Outcome unknown", checking: "Check original job",
  ready: "Asset ready", failed: "Generation failed", exported: "Asset exported",
};
export const state = (v) => v.phase === "ready" && v.previewed ? "Preview open" : labels[v.phase];
const steps = {
  ChooseRecipe: "choose a recipe", OpenExisting: "open a completed asset", OpenSetup: "set up connection [connection needed]",
  SetupVerified: "connection verified", Generate: "choose Generate [connection ready]", Completes: "artifact confirmed",
  Fails: "generation fails", ResponseLost: "response is lost", CheckOriginal: "check original job",
  FoundRunning: "job still running", FoundComplete: "artifact confirmed", FoundFailed: "job failed",
  CheckUnavailable: "status unavailable", OpenPreview: "open safe preview", Export: "choose Export",
  Revise: "start a revised draft", Wait: "wait for user",
};
export const step = (action) => steps[action] ?? action;
