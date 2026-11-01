export const title = "Transcription request lifecycle";
const labels = { idle: "Ready for explicit request", validating: "Check local audio", validated: "Audio ready to upload", uploading: "Upload once", reading: "Read bounded transcript", cleanup: "Finish and release request slot", closed: "All service instances closed" };
export const state = v => labels[v.phase];
const steps = {
  Begin: "request transcription [key available, service open, slot free]",
  SourceValid: "file checks pass", SourceRejected: "file checks fail",
  Dispatch: "send validated audio", ResponseArrives: "response arrives", HttpRefused: "OpenAI rejects request",
  TranscriptAccepted: "transcript accepted", UncertainFailure: "result unavailable after dispatch",
  Cleanup: "clear local request resources", CloseIdle: "close idle service", RejectOrWait: "reject or wait",
};
export const step = (action, from, to) => {
  if (action === "Cleanup") return to.phase === "closed" ? "release slot [all services closed]" : "release slot [an open service remains]";
  if (action === "CloseIdle") return to.phase === "closed" ? "close last open service" : "close an idle service";
  if (action === "Cancel") return from.submitted ? "cancel or time out [may have been processed]" : "cancel or time out [nothing uploaded]";
  if (action === "CloseOwner") return from.submitted ? "close service [may have been processed]" : "close service [nothing uploaded]";
  return steps[action] ?? action;
};
