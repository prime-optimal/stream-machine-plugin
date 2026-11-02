------------------------------ MODULE Release ------------------------------
EXTENDS Naturals
VARIABLES phase, eligible, permitted, fresh, checksPass, remoteWritten,
          prCount, merged, consumed, tagged, published, autoApproved, autoMerged
vars == <<phase, eligible, permitted, fresh, checksPass, remoteWritten,
          prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Init == /\ phase = "Queued"
        /\ eligible \in BOOLEAN /\ permitted \in BOOLEAN
        /\ fresh \in BOOLEAN /\ checksPass \in BOOLEAN
        /\ remoteWritten = FALSE /\ prCount = 0
        /\ merged = FALSE /\ consumed = FALSE
        /\ tagged = FALSE /\ published = FALSE
        /\ autoApproved = FALSE /\ autoMerged = FALSE
NoRelease == /\ phase = "Queued" /\ ~eligible /\ phase' = "Noop"
             /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                            prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Prepare == /\ phase = "Queued" /\ eligible /\ phase' = "Prepared"
           /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                          prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Check == /\ phase = "Prepared" /\ checksPass /\ phase' = "Checked"
         /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                        prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
CheckFails == /\ phase = "Prepared" /\ ~checksPass /\ phase' = "CheckFailed"
              /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                             prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
PermissionBlocked == /\ phase = "Pushed" /\ ~permitted /\ phase' = "PermissionBlocked"
                     /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                                    prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Stale == /\ phase = "Checked" /\ ~fresh /\ phase' = "Stale"
         /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                        prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Push == /\ phase = "Checked" /\ fresh
        /\ phase' = "Pushed" /\ remoteWritten' = TRUE
        /\ UNCHANGED <<eligible, permitted, fresh, checksPass, prCount, merged,
                       consumed, tagged, published, autoApproved, autoMerged>>
OpenOrUpdate == /\ phase = "Pushed" /\ permitted /\ phase' = "Review" /\ prCount' = 1
                /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                               merged, consumed, tagged, published, autoApproved, autoMerged>>
ApiFailure == /\ phase = "Pushed" /\ phase' = "ApiFailed"
              /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                             prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Retry == /\ phase \in {"ApiFailed", "PermissionBlocked", "Review"} /\ phase' = "Prepared"
         /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                        prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
HumanMerge == /\ phase = "Review" /\ phase' = "Merged" /\ merged' = TRUE
              /\ consumed' = TRUE /\ eligible' = FALSE
              /\ UNCHANGED <<permitted, fresh, checksPass, remoteWritten,
                             prCount, tagged, published, autoApproved, autoMerged>>
RunAfterMerge == /\ phase = "Merged" /\ phase' = "Queued"
                 /\ UNCHANGED <<eligible, permitted, fresh, checksPass, remoteWritten,
                                prCount, merged, consumed, tagged, published, autoApproved, autoMerged>>
Wait == /\ phase \in {"Noop", "CheckFailed", "PermissionBlocked", "Stale"}
        /\ UNCHANGED vars
Next == NoRelease \/ Prepare \/ Check \/ CheckFails \/ PermissionBlocked \/ Stale
        \/ Push \/ OpenOrUpdate \/ ApiFailure \/ Retry \/ HumanMerge \/ RunAfterMerge \/ Wait
SinglePr == prCount \in 0..1
OnlyCheckedWrites == remoteWritten => (checksPass /\ fresh)
NoAutomaticRelease == ~tagged /\ ~published /\ ~autoApproved /\ ~autoMerged
BoundaryAfterHumanMerge == consumed = merged
NoReleaseLoop == consumed => ~eligible
=============================================================================
