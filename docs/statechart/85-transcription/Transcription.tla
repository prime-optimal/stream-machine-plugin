---- MODULE Transcription ----
EXTENDS Naturals, FiniteSets
VARIABLES phase, active, owner, closed, keyReady, sourceReady, submitted, sends, outcome, uncertain
vars == <<phase, active, owner, closed, keyReady, sourceReady, submitted, sends, outcome, uncertain>>
Services == {1, 2}
Init == /\ phase = "idle" /\ active = {} /\ owner = 0 /\ closed = {}
        /\ keyReady = FALSE /\ sourceReady = FALSE /\ submitted = FALSE
        /\ sends = 0 /\ outcome = "none" /\ uncertain = FALSE
Begin == /\ phase = "idle" /\ active = {}
         /\ \E caller \in Services \ closed:
              /\ owner' = caller /\ active' = {caller}
         /\ phase' = "validating" /\ keyReady' = TRUE /\ sourceReady' = FALSE
         /\ submitted' = FALSE /\ sends' = 0 /\ outcome' = "none" /\ uncertain' = FALSE
         /\ UNCHANGED closed
SourceValid == /\ phase = "validating" /\ phase' = "validated" /\ sourceReady' = TRUE
               /\ UNCHANGED <<active, owner, closed, keyReady, submitted, sends, outcome, uncertain>>
SourceRejected == /\ phase = "validating" /\ phase' = "cleanup" /\ outcome' = "refused"
                  /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends, uncertain>>
Dispatch == /\ phase = "validated" /\ keyReady /\ sourceReady /\ owner \notin closed /\ sends = 0
            /\ phase' = "uploading" /\ submitted' = TRUE /\ sends' = 1
            /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, outcome, uncertain>>
ResponseArrives == /\ phase = "uploading" /\ phase' = "reading"
                   /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends, outcome, uncertain>>
HttpRefused == /\ phase = "uploading" /\ phase' = "cleanup" /\ outcome' = "refused"
               /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends, uncertain>>
TranscriptAccepted == /\ phase = "reading" /\ phase' = "cleanup" /\ outcome' = "success"
                      /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends, uncertain>>
UncertainFailure == /\ phase \in {"uploading", "reading"} /\ phase' = "cleanup"
                    /\ outcome' = "uncertain" /\ uncertain' = TRUE
                    /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends>>
Cancel == /\ phase \in {"validating", "validated", "uploading", "reading"}
          /\ phase' = "cleanup" /\ outcome' = IF submitted THEN "uncertain" ELSE "canceled"
          /\ uncertain' = submitted
          /\ UNCHANGED <<active, owner, closed, keyReady, sourceReady, submitted, sends>>
CloseOwner == /\ phase \in {"validating", "validated", "uploading", "reading"}
              /\ closed' = closed \cup {owner} /\ phase' = "cleanup"
              /\ outcome' = IF submitted THEN "uncertain" ELSE "canceled"
              /\ uncertain' = submitted
              /\ UNCHANGED <<active, owner, keyReady, sourceReady, submitted, sends>>
Cleanup == /\ phase = "cleanup" /\ phase' = IF closed = Services THEN "closed" ELSE "idle"
           /\ active' = {} /\ owner' = 0 /\ keyReady' = FALSE /\ sourceReady' = FALSE
           /\ submitted' = FALSE /\ sends' = 0 /\ outcome' = "none" /\ uncertain' = FALSE
           /\ UNCHANGED closed
CloseIdle == /\ phase = "idle" /\ \E caller \in Services \ closed: closed' = closed \cup {caller}
             /\ phase' = IF closed' = Services THEN "closed" ELSE "idle"
             /\ UNCHANGED <<active, owner, keyReady, sourceReady, submitted, sends, outcome, uncertain>>
RejectOrWait == /\ UNCHANGED vars
Next == Begin \/ SourceValid \/ SourceRejected \/ Dispatch \/ ResponseArrives \/ HttpRefused
        \/ TranscriptAccepted \/ UncertainFailure \/ Cancel \/ CloseOwner \/ Cleanup \/ CloseIdle \/ RejectOrWait
TypeOK == /\ phase \in {"idle", "validating", "validated", "uploading", "reading", "cleanup", "closed"}
          /\ active \subseteq Services /\ owner \in Services \cup {0} /\ closed \subseteq Services
          /\ keyReady \in BOOLEAN /\ sourceReady \in BOOLEAN /\ submitted \in BOOLEAN
          /\ sends \in {0, 1} /\ outcome \in {"none", "refused", "success", "canceled", "uncertain"}
          /\ uncertain \in BOOLEAN
OneLocalOperation == Cardinality(active) <= 1
ReservationMatchesOwner == (phase \in {"idle", "closed"} => active = {} /\ owner = 0)
                           /\ (phase \notin {"idle", "closed"} => active = {owner})
UploadRequiresChecks == submitted => keyReady /\ sourceReady /\ sends = 1
OneSendPerInvocation == sends <= 1
CancellationBeforeUpload == outcome = "canceled" => ~submitted /\ sends = 0
UncertaintyIsHonest == (uncertain <=> outcome = "uncertain") /\ (uncertain => submitted)
SuccessRequiresSubmission == outcome = "success" => submitted /\ sourceReady
ClosedIsTerminal == phase = "closed" => closed = Services /\ active = {} /\ ~submitted
ClosedOwnerDoesNotRun == phase \in {"validating", "validated", "uploading", "reading"} => owner \notin closed
====
