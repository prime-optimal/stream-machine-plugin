export const title = "Hosted Twitch calls and explicit local fallback";
export const state = ({s}) => {
  if (s.scenario === "Held lease") {
    let label;
    if (s.firstActive && s.secondActive) label = "Concurrent title writes";
    else if (!s.changed) label = "First title write pending";
    else if (s.firstActive) label = s.replacementApproved ? (s.lease === "first" ? "New apply waits for first write" : "New apply can overlap first write") : (s.lease === "first" ? "Connection changed, first write pending" : "Connection changed, lease missing");
    else if (s.secondActive) label = "New title write pending";
    else if (s.secondStarted) label = "Both writes settled";
    else label = s.replacementApproved ? "First write settled, lease released" : "First settled, new preview pending";
    return ["Reconnect during apply", label];
  }
  if (s.scenario !== "Requests") return [s.scenario === "Preview" ? "Title approval" : "Connection route", s.phase];
  const requests = Object.values(s.requests);
  if (requests.every(p => ["Rejected", "Own account returned"].includes(p))) return ["Caller isolation", "Both requests finished"];
  if (requests.some(p => p === "Own account returned")) return ["Caller isolation", "One caller sees own account"];
  if (requests.some(p => p === "Authorized")) return ["Caller isolation", "Each request keeps its caller"];
  return ["Caller isolation", "Requests under validation"];
};
export const step = action => ({
  Authorize: "Bind this request to its Sites caller",
  Reject: "Reject missing identity or an owner selector",
  ReadOwnConnection: "Read this caller's Twitch connection",
  ApproveOwnPreview: "Approve exact title in the owner's browser",
  RejectForeignPreview: "Another caller requests this preview",
  ConsumeBeforeWrite: "Claim the approved preview once",
  WriteTitleOnce: "Attempt one Twitch title change",
  WriteResult: "Read back title or report unknown outcome",
  RejectReplay: "Reject another apply of the consumed preview",
  Disconnect: "Disconnect before applying the preview",
  HostedFailure: "Classify hosted failure",
  ConfirmLocalFallback: "Confirm local account [reachable desktop and eligible failure]",
  SelectLocal: "Select the confirmed local fallback",
  StayHosted: "Retry hosted or stop",
  ChangeConnection: "Change or clear the connection",
  ApproveReplacement: "Approve a new preview after reconnect",
  BeginSecondApply: "Start the new apply [lease available]",
  SettleFirstApply: "Settle the first write and release its matching lease",
  SettleSecondApply: "Settle the new write and release its matching lease",
  Done: "Finish",
})[action] ?? action;
