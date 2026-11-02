export const title = "Contextual connection setup";
const states = {
  home: "Choose a task", disconnected: "Connection needed", setup: "Set up connection",
  testing: "Check connection", ready: "Ready to resume task", failed: "Check failed", canceled: "Setup paused; task saved",
};
export const state = (v) => states[v.phase];
const labels = {
  SelectIntent: "choose a task", OpenSetup: "open setup", StartTest: "test connection",
  ReadSucceeds: "authenticated read succeeds", ReadFails: "read fails or times out",
  Cancel: "cancel setup", LoseConnection: "connection lost or access revoked",
  IgnoreStaleResult: "ignore an old result", WaitForUser: "wait for user",
};
export const step = (action) => labels[action] ?? action;
