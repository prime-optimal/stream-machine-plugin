----------------------------- MODULE Clip -----------------------------
EXTENDS Naturals
VARIABLES phase, slot, granted, owned, credentials, partial, complete
vars == <<phase, slot, granted, owned, credentials, partial, complete>>
Init == /\ phase = "Idle" /\ slot = FALSE /\ granted = FALSE /\ owned = FALSE /\ credentials = FALSE /\ partial = FALSE /\ complete = FALSE
Start == /\ phase = "Idle" /\ phase' = "Authorizing" /\ slot' = TRUE /\ credentials' = TRUE /\ UNCHANGED <<granted, owned, partial, complete>>
Grant == /\ phase = "Authorizing" /\ phase' = "Resolving" /\ granted' = TRUE /\ UNCHANGED <<slot, owned, credentials, partial, complete>>
Resolve == /\ phase = "Resolving" /\ phase' = "Fetching" /\ owned' = TRUE /\ credentials' = FALSE /\ UNCHANGED <<slot, granted, partial, complete>>
Write == /\ phase = "Fetching" /\ phase' = "Writing" /\ partial' = TRUE /\ UNCHANGED <<slot, granted, owned, credentials, complete>>
Rename == /\ phase = "Writing" /\ phase' = "Complete" /\ partial' = FALSE /\ complete' = TRUE /\ UNCHANGED <<slot, granted, owned, credentials>>
Fail == /\ phase \in {"Authorizing", "Resolving", "Fetching", "Writing"} /\ phase' = "Failed" /\ credentials' = FALSE /\ partial' = FALSE /\ UNCHANGED <<slot, granted, owned, complete>>
Release == /\ phase \in {"Complete", "Failed"} /\ phase' = "Returned" /\ slot' = FALSE /\ UNCHANGED <<granted, owned, credentials, partial, complete>>
Busy == /\ slot /\ UNCHANGED vars
Done == /\ phase = "Returned" /\ UNCHANGED vars
Next == Start \/ Grant \/ Resolve \/ Write \/ Rename \/ Fail \/ Release \/ Busy \/ Done
Spec == Init /\ [][Next]_vars
AuthorizedFetch == phase \in {"Fetching", "Writing", "Complete"} => granted /\ owned /\ credentials = FALSE
PublishedOnlyComplete == complete => phase \in {"Complete", "Returned"}
NoPartialAfterHandledFailure == phase \in {"Failed", "Returned"} => partial = FALSE
SlotUntilReturn == (phase \notin {"Idle", "Returned"}) = slot
=============================================================================
