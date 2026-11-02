-------------------------- MODULE HostedMcp --------------------------
EXTENDS Naturals, Sequences, TLC
Users == {"A", "B"}
NoUser == "none"
Slots == 1..2
CONSTANT PreserveHeldLease
VARIABLE s
Base == [scenario |-> "", callers |-> <<"A", "B">>,
 suppliedOwner |-> <<FALSE, FALSE>>, requests |-> <<"Pending", "Pending">>,
 bound |-> <<NoUser, NoUser>>, observed |-> <<NoUser, NoUser>>,
 phase |-> "", previewOwner |-> "A", actor |-> NoUser,
 approved |-> FALSE, approvedBy |-> NoUser, consumed |-> FALSE, attempts |-> 0,
 connected |-> TRUE, fallback |-> FALSE, desktop |-> FALSE,
 failure |-> "none", localConfirmed |-> FALSE,
 lease |-> "none", firstActive |-> FALSE, secondActive |-> FALSE,
 changed |-> FALSE, replacementApproved |-> FALSE, secondStarted |-> FALSE]
Init ==
 \/ \E first \in {"A", NoUser}, a \in BOOLEAN, b \in BOOLEAN:
    s = [Base EXCEPT !.scenario = "Requests", !.callers = <<first, "B">>,
     !.suppliedOwner = <<a, b>>]
 \/ \E owner \in Users:
    s = [Base EXCEPT !.scenario = "Preview", !.previewOwner = owner,
     !.phase = "Preview ready"]
 \/ \E desktop \in BOOLEAN:
    s = [Base EXCEPT !.scenario = "Fallback", !.phase = "Hosted selected",
     !.desktop = desktop]
 \/ \E change \in {"reauthorize", "disconnect", "invalid_token", "clear"}:
    s = [Base EXCEPT !.scenario = "Held lease", !.failure = change,
     !.lease = "first", !.firstActive = TRUE]
Authorize == /\ s.scenario = "Requests"
 /\ \E i \in Slots:
  /\ s.requests[i] = "Pending"
  /\ s.callers[i] \in Users /\ ~s.suppliedOwner[i]
  /\ s' = [s EXCEPT !.requests[i] = "Authorized", !.bound[i] = s.callers[i]]
Reject == /\ s.scenario = "Requests"
 /\ \E i \in Slots:
  /\ s.requests[i] = "Pending"
  /\ (s.callers[i] = NoUser \/ s.suppliedOwner[i])
  /\ s' = [s EXCEPT !.requests[i] = "Rejected"]
ReadOwnConnection == /\ s.scenario = "Requests"
 /\ \E i \in Slots:
  /\ s.requests[i] = "Authorized"
  /\ s' = [s EXCEPT !.requests[i] = "Own account returned", !.observed[i] = s.bound[i]]
ApproveOwnPreview == /\ s.scenario = "Preview" /\ s.phase = "Preview ready"
 /\ s.connected
 /\ s' = [s EXCEPT !.phase = "Browser approved", !.actor = s.previewOwner, !.approved = TRUE, !.approvedBy = s.previewOwner]
RejectForeignPreview == /\ s.scenario = "Preview"
 /\ s.phase \in {"Preview ready", "Browser approved"}
 /\ \E who \in Users \ {s.previewOwner}:
  s' = [s EXCEPT !.phase = "Foreign preview rejected", !.actor = who]
ConsumeBeforeWrite == /\ s.scenario = "Preview" /\ s.phase = "Browser approved"
 /\ s.actor = s.previewOwner /\ s.connected /\ s.approved /\ ~s.consumed
 /\ s' = [s EXCEPT !.phase = "Preview consumed", !.consumed = TRUE]
WriteTitleOnce == /\ s.scenario = "Preview" /\ s.phase = "Preview consumed"
 /\ s' = [s EXCEPT !.phase = "Title write attempted", !.attempts = @ + 1]
WriteResult == /\ s.scenario = "Preview" /\ s.phase = "Title write attempted"
 /\ \E result \in {"Title verified", "Write outcome unknown"}:
   s' = [s EXCEPT !.phase = result]
RejectReplay == /\ s.scenario = "Preview"
 /\ s.phase \in {"Title verified", "Write outcome unknown"}
 /\ s.consumed
 /\ s' = [s EXCEPT !.phase = "Replay rejected"]
Disconnect == /\ s.scenario = "Preview"
 /\ s.phase \in {"Preview ready", "Browser approved"}
 /\ s' = [s EXCEPT !.phase = "Preview invalidated", !.connected = FALSE, !.approved = FALSE]
HostedFailure == /\ s.scenario = "Fallback" /\ s.phase = "Hosted selected"
 /\ \E reason \in {"unreachable", "server_error", "unconfigured", "denied", "cancelled", "unauthorized", "invalid_state", "revoked", "write_unknown"}:
   s' = [s EXCEPT !.phase = "Hosted failure", !.failure = reason]
ConfirmLocalFallback == /\ s.scenario = "Fallback" /\ s.phase = "Hosted failure"
 /\ s.desktop /\ s.failure \in {"unreachable", "server_error", "unconfigured"}
 /\ s' = [s EXCEPT !.phase = "Local fallback confirmed", !.localConfirmed = TRUE]
SelectLocal == /\ s.scenario = "Fallback" /\ s.phase = "Local fallback confirmed"
 /\ s' = [s EXCEPT !.phase = "Local fallback selected", !.fallback = TRUE]
StayHosted == /\ s.scenario = "Fallback" /\ s.phase = "Hosted failure"
 /\ s' = [s EXCEPT !.phase = "Hosted retry or stop"]
ChangeConnection == /\ s.scenario = "Held lease" /\ ~s.changed
 /\ s' = [s EXCEPT !.changed = TRUE,
    !.lease = IF PreserveHeldLease THEN @ ELSE "none"]
ApproveReplacement == /\ s.scenario = "Held lease" /\ s.changed /\ ~s.replacementApproved
 /\ s' = [s EXCEPT !.replacementApproved = TRUE]
BeginSecondApply == /\ s.scenario = "Held lease" /\ s.replacementApproved
 /\ ~s.secondStarted /\ s.lease = "none"
 /\ s' = [s EXCEPT !.secondStarted = TRUE, !.secondActive = TRUE, !.lease = "second"]
SettleFirstApply == /\ s.scenario = "Held lease" /\ s.changed /\ s.firstActive
 /\ s' = [s EXCEPT !.firstActive = FALSE,
    !.lease = IF @ = "first" THEN "none" ELSE @]
SettleSecondApply == /\ s.scenario = "Held lease" /\ s.secondActive
 /\ s' = [s EXCEPT !.secondActive = FALSE,
    !.lease = IF @ = "second" THEN "none" ELSE @]
Done == /\ (CASE s.scenario = "Requests" -> (\A i \in Slots: s.requests[i] \in {"Rejected", "Own account returned"})
             [] s.scenario = "Preview" -> s.phase \in {"Foreign preview rejected", "Replay rejected", "Preview invalidated"}
             [] s.scenario = "Held lease" -> (~s.firstActive /\ s.secondStarted /\ ~s.secondActive)
             [] OTHER -> s.phase \in {"Local fallback selected", "Hosted retry or stop"})
 /\ UNCHANGED s
Next == Authorize \/ Reject \/ ReadOwnConnection \/ ApproveOwnPreview
 \/ RejectForeignPreview \/ ConsumeBeforeWrite \/ WriteTitleOnce \/ WriteResult
 \/ RejectReplay \/ Disconnect \/ HostedFailure \/ ConfirmLocalFallback
 \/ SelectLocal \/ StayHosted \/ ChangeConnection \/ ApproveReplacement
 \/ BeginSecondApply \/ SettleFirstApply \/ SettleSecondApply \/ Done
Spec == Init /\ [][Next]_s
AuthenticatedBeforeRead == \A i \in Slots:
 s.observed[i] # NoUser => (s.callers[i] \in Users /\ ~s.suppliedOwner[i])
RequestOwnerNeverChanges == \A i \in Slots:
 s.bound[i] # NoUser => s.bound[i] = s.callers[i]
ReadOnlyOwnConnection == \A i \in Slots:
 s.observed[i] # NoUser => s.observed[i] = s.callers[i]
SelectorsCannotChooseOwner == \A i \in Slots:
 s.suppliedOwner[i] => (s.bound[i] = NoUser /\ s.observed[i] = NoUser)
OnlyOwnerCanApprove == s.approved => s.approvedBy = s.previewOwner
NoUnapprovedWrite == s.attempts > 0 => (s.approved /\ s.consumed /\ s.actor = s.previewOwner)
AtMostOneWrite == s.attempts <= 1
DisconnectedPreviewCannotWrite == ~s.connected => s.attempts = 0
LocalFallbackRequiresConfirmation == s.fallback => (s.desktop /\ s.localConfirmed)
NoFallbackAfterAuthOrWriteFailure == s.fallback => s.failure \in {"unreachable", "server_error", "unconfigured"}
NoConcurrentTitleWrites == ~(s.firstActive /\ s.secondActive)
HeldLeaseSurvivesConnectionChanges == s.firstActive => s.lease = "first"
=============================================================================
