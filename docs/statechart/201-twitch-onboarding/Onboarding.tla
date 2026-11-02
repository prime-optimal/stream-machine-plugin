--------------------------- MODULE Onboarding ---------------------------
EXTENDS Naturals
VARIABLES phase, attempts, pending, failed, media, seedCount, draft, approved, seedStatus
vars == <<phase, attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>

Init == /\ phase = "disconnected"
        /\ attempts = 0 /\ pending = FALSE /\ failed = FALSE
        /\ media = "none" /\ seedCount = 0 /\ draft = "empty"
        /\ approved = FALSE /\ seedStatus = "none"

Connect == /\ phase = "disconnected" /\ phase' = "connecting"
           /\ UNCHANGED <<attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>
ConsentFails == /\ phase = "connecting" /\ phase' = "required"
                /\ UNCHANGED <<attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>
VerifyAccount == /\ phase = "connecting" /\ phase' = "verified"
                 /\ UNCHANGED <<attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>
SeedDraft == /\ phase = "verified" /\ seedCount = 0
             /\ seedCount' = seedCount + 1 /\ draft' = "observed"
             /\ phase' = "enriching" /\ seedStatus' = "pending"
             /\ UNCHANGED <<attempts, pending, failed, media, approved>>
StartRequest == /\ phase = "enriching" /\ ~pending /\ attempts < 5
                /\ attempts' = attempts + 1 /\ pending' = TRUE
                /\ UNCHANGED <<phase, failed, media, seedCount, draft, approved, seedStatus>>
RequestSucceeds == /\ phase = "enriching" /\ pending
                   /\ pending' = FALSE /\ media' = "current"
                   /\ UNCHANGED <<phase, attempts, failed, seedCount, draft, approved, seedStatus>>
RequestFails == /\ phase = "enriching" /\ pending
               /\ pending' = FALSE /\ failed' = TRUE
               /\ UNCHANGED <<phase, attempts, media, seedCount, draft, approved, seedStatus>>
Finish == /\ phase = "enriching" /\ ~pending /\ attempts = 5
          /\ phase' = IF failed THEN "partial" ELSE "ready"
          /\ UNCHANGED <<attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>
StopEarly == /\ phase = "enriching" /\ ~pending /\ attempts > 0
             /\ phase' = "partial"
             /\ UNCHANGED <<attempts, pending, failed, media, seedCount, draft, approved, seedStatus>>
Invalidate == /\ phase \in {"verified", "enriching", "ready", "partial"}
              /\ phase' = "required" /\ media' = "none"
              /\ UNCHANGED <<attempts, pending, failed, seedCount, draft, approved, seedStatus>>
IgnoreLateReply == /\ phase = "required" /\ pending
                   /\ pending' = FALSE
                   /\ UNCHANGED <<phase, attempts, failed, media, seedCount, draft, approved, seedStatus>>
ApproveEdit == /\ phase \in {"ready", "partial"} /\ ~approved
               /\ approved' = TRUE /\ draft' = "user" /\ seedStatus' = "saved"
               /\ UNCHANGED <<phase, attempts, pending, failed, media, seedCount>>
MergeEvidence == /\ phase \in {"ready", "partial"}
                 /\ draft' = IF approved THEN draft ELSE "observed"
                 /\ UNCHANGED <<phase, attempts, pending, failed, media, seedCount, approved, seedStatus>>
SaveSeed == /\ phase \in {"enriching", "ready", "partial"} /\ seedStatus = "pending"
            /\ seedStatus' = "saved"
            /\ UNCHANGED <<phase, attempts, pending, failed, media, seedCount, draft, approved>>
FailSeed == /\ phase \in {"enriching", "ready", "partial"} /\ seedStatus = "pending"
            /\ seedStatus' = "failed"
            /\ UNCHANGED <<phase, attempts, pending, failed, media, seedCount, draft, approved>>
RetrySeed == /\ phase \in {"enriching", "ready", "partial"} /\ seedStatus = "failed"
             /\ seedStatus' = "pending"
             /\ UNCHANGED <<phase, attempts, pending, failed, media, seedCount, draft, approved>>
Reopen == /\ phase \in {"verified", "enriching", "ready", "partial"}
          /\ UNCHANGED vars
WaitForUser == /\ phase = "required" /\ ~pending /\ UNCHANGED vars

Next == Connect \/ ConsentFails \/ VerifyAccount \/ SeedDraft \/ StartRequest
        \/ RequestSucceeds \/ RequestFails \/ Finish \/ StopEarly \/ Invalidate
        \/ IgnoreLateReply \/ SaveSeed \/ FailSeed \/ RetrySeed \/ ApproveEdit \/ MergeEvidence \/ Reopen \/ WaitForUser

TypeOK == /\ phase \in {"disconnected", "connecting", "verified", "enriching", "ready", "partial", "required"}
          /\ attempts \in 0..5 /\ pending \in BOOLEAN /\ failed \in BOOLEAN
          /\ media \in {"none", "current"} /\ seedCount \in 0..1
          /\ draft \in {"empty", "observed", "user"} /\ approved \in BOOLEAN
          /\ seedStatus \in {"none", "pending", "failed", "saved"}
RequestBudget == attempts <= 5
CountBeforeDispatch == pending => attempts > 0
SeedOnce == seedCount <= 1
HomeHasDraft == phase \in {"ready", "partial"} => seedCount = 1
NoStaleMedia == phase = "required" => media = "none"
UserEditsSurvive == approved => draft = "user"
ConnectionBeforeEnrichment == phase = "enriching" => seedCount = 1
=============================================================================
