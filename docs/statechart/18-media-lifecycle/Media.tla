----------------------------- MODULE Media -----------------------------
EXTENDS Naturals
VARIABLES phase, active, connection, closed, started
vars == <<phase, active, connection, closed, started>>
Init == /\ phase = "Idle" /\ active = FALSE /\ connection = FALSE /\ closed = FALSE /\ started = FALSE
Inspect == /\ phase = "Idle" /\ phase' = "Connecting" /\ active' = TRUE /\ started' = TRUE /\ UNCHANGED <<connection, closed>>
Connect == /\ phase = "Connecting" /\ phase' = "Calling" /\ connection' = TRUE /\ UNCHANGED <<active, closed, started>>
Success == /\ phase = "Calling" /\ phase' = "Ready" /\ active' = FALSE /\ UNCHANGED <<connection, closed, started>>
Reuse == /\ phase = "Ready" /\ phase' = "Calling" /\ active' = TRUE /\ UNCHANGED <<connection, closed, started>>
Failure == /\ phase \in {"Connecting", "Calling"} /\ phase' = "Idle" /\ active' = FALSE /\ connection' = FALSE /\ UNCHANGED <<closed, started>>
CloseIdle == /\ phase \in {"Idle", "Ready"} /\ phase' = "Closed" /\ closed' = TRUE /\ connection' = FALSE /\ UNCHANGED <<active, started>>
CloseActive == /\ phase \in {"Connecting", "Calling"} /\ phase' = "Aborting" /\ closed' = TRUE /\ UNCHANGED <<active, connection, started>>
FinishAbort == /\ phase = "Aborting" /\ phase' = "Closed" /\ active' = FALSE /\ connection' = FALSE /\ UNCHANGED <<closed, started>>
Busy == /\ active /\ UNCHANGED vars
Done == /\ phase = "Closed" /\ UNCHANGED vars
Next == Inspect \/ Connect \/ Success \/ Reuse \/ Failure \/ CloseIdle \/ CloseActive \/ FinishAbort \/ Busy \/ Done
Spec == Init /\ [][Next]_vars
LazyStart == ~started => active = FALSE /\ connection = FALSE
OneOperation == active = (phase \in {"Connecting", "Calling", "Aborting"})
ClosePreventsReuse == closed => phase \in {"Aborting", "Closed"}
ClosedDisconnects == phase = "Closed" => active = FALSE /\ connection = FALSE
=============================================================================
