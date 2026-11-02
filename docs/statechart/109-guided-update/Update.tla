----------------------------- MODULE Update -----------------------------
EXTENDS TLC
VARIABLES phase, saved, running, verified
vars == <<phase, saved, running, verified>>
Init == /\ phase = "unchecked" /\ saved = FALSE /\ running = FALSE /\ verified = FALSE
Check == /\ phase = "unchecked" /\ phase' = "available"
         /\ UNCHANGED <<saved, running, verified>>
Unavailable == /\ phase = "unchecked" /\ phase' = "unavailable"
               /\ UNCHANGED <<saved, running, verified>>
Prepare == /\ phase = "available" /\ phase' = "prepared"
           /\ UNCHANGED <<saved, running, verified>>
Reject == /\ phase = "available" /\ phase' = "rejected"
          /\ UNCHANGED <<saved, running, verified>>
Submit == /\ phase = "prepared" /\ phase' = "submitted"
          /\ UNCHANGED <<saved, running, verified>>
Save == /\ phase = "submitted" /\ phase' = "readback"
        /\ saved' = TRUE /\ UNCHANGED <<running, verified>>
LostSaved == /\ phase = "submitted" /\ phase' = "unknown"
             /\ saved' = TRUE /\ UNCHANGED <<running, verified>>
LostUnchanged == /\ phase = "submitted" /\ phase' = "unknown"
                 /\ saved' = FALSE /\ UNCHANGED <<running, verified>>
ReadAgain == /\ phase = "unknown" /\ phase' = "readback"
             /\ UNCHANGED <<saved, running, verified>>
Confirm == /\ phase = "readback" /\ saved
           /\ phase' = "reload pending" /\ verified' = TRUE
           /\ UNCHANGED <<saved, running>>
Mismatch == /\ phase = "readback" /\ ~saved
            /\ phase' = "conflict" /\ UNCHANGED <<saved, running, verified>>
FreshHost == /\ phase = "reload pending" /\ phase' = "running target"
             /\ running' = TRUE /\ UNCHANGED <<saved, verified>>
Done == /\ phase \in {"unavailable", "rejected", "conflict", "running target"}
        /\ UNCHANGED vars
Next == Check \/ Unavailable \/ Prepare \/ Reject \/ Submit \/ Save
        \/ LostSaved \/ LostUnchanged \/ ReadAgain \/ Confirm \/ Mismatch
        \/ FreshHost \/ Done
Spec == Init /\ [][Next]_vars
VerifiedMeansSaved == verified => saved
ReloadRequiresReadback == (phase = "reload pending") => (verified /\ ~running)
RunningRequiresHost == running => (phase = "running target" /\ verified)
UnknownIsUnverified == (phase = "unknown") => ~verified
=============================================================================
