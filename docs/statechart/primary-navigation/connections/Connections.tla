---- MODULE Connections ----
EXTENDS Naturals
VARIABLES phase, requestedTask, returnTarget, credentialsReady,
          authenticatedRead, capabilityVerified, returnedReady, liveOutput, originalOutput
vars == <<phase, requestedTask, returnTarget, credentialsReady,
          authenticatedRead, capabilityVerified, returnedReady, liveOutput, originalOutput>>
Init == /\ phase = "overview"
        /\ requestedTask \in {"clips", "assets"}
        /\ returnTarget = "none"
        /\ credentialsReady \in BOOLEAN
        /\ authenticatedRead = FALSE /\ capabilityVerified = FALSE
        /\ returnedReady = FALSE
        /\ originalOutput \in {"live", "idle"} /\ liveOutput = originalOutput
ChooseProvider == /\ phase = "overview" /\ phase' = "selected"
                  /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady,
                                 authenticatedRead, capabilityVerified, returnedReady, liveOutput, originalOutput>>
OpenSetup == /\ phase \in {"selected", "failed", "paused"} /\ phase' = "setup"
             /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
             /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady, returnedReady, liveOutput, originalOutput>>
CheckExisting == /\ phase \in {"selected", "ready"} /\ credentialsReady
                 /\ phase' = "checking" /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
                 /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady, returnedReady, liveOutput, originalOutput>>
HostUnsupported == /\ phase = "selected" /\ phase' = "unsupported"
                   /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady,
                                  authenticatedRead, capabilityVerified, returnedReady, liveOutput, originalOutput>>
SetupReturns == /\ phase = "setup" /\ phase' = "checking" /\ credentialsReady' = TRUE
                /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
                /\ UNCHANGED <<requestedTask, returnTarget, returnedReady, liveOutput, originalOutput>>
ReadSucceeds == /\ phase = "checking" /\ credentialsReady
                /\ phase' = "ready" /\ authenticatedRead' = TRUE /\ capabilityVerified' = TRUE
                /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady, returnedReady, liveOutput, originalOutput>>
ReadFails == /\ phase = "checking" /\ phase' = "failed"
            /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
            /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady, returnedReady, liveOutput, originalOutput>>
Cancel == /\ phase \in {"setup", "checking", "failed"} /\ phase' = "paused"
          /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
          /\ UNCHANGED <<requestedTask, returnTarget, credentialsReady, returnedReady, liveOutput, originalOutput>>
AccessRevoked == /\ phase = "ready" /\ phase' = "selected" /\ credentialsReady' = FALSE
                 /\ authenticatedRead' = FALSE /\ capabilityVerified' = FALSE
                 /\ UNCHANGED <<requestedTask, returnTarget, returnedReady, liveOutput, originalOutput>>
ReturnToTask == /\ phase \in {"ready", "paused", "unsupported"}
                /\ phase' = "returned" /\ returnTarget' = requestedTask
                /\ returnedReady' = (phase = "ready")
                /\ UNCHANGED <<requestedTask, credentialsReady, authenticatedRead, capabilityVerified, liveOutput, originalOutput>>
Done == /\ phase = "returned" /\ UNCHANGED vars
Next == ChooseProvider \/ OpenSetup \/ CheckExisting \/ HostUnsupported \/ SetupReturns
        \/ ReadSucceeds \/ ReadFails \/ Cancel \/ AccessRevoked \/ ReturnToTask \/ Done
TypeOK == /\ phase \in {"overview", "selected", "setup", "checking", "ready", "failed", "paused", "unsupported", "returned"}
          /\ requestedTask \in {"clips", "assets"} /\ returnTarget \in {"none", "clips", "assets"}
          /\ credentialsReady \in BOOLEAN /\ authenticatedRead \in BOOLEAN
          /\ capabilityVerified \in BOOLEAN /\ returnedReady \in BOOLEAN
          /\ liveOutput \in {"live", "idle"} /\ originalOutput \in {"live", "idle"}
ReadyRequiresVerifiedCapability == phase = "ready" => credentialsReady /\ authenticatedRead /\ capabilityVerified
SetupDoesNotProveAccess == phase \in {"selected", "setup", "checking", "failed", "paused", "unsupported"} => ~capabilityVerified
ReturnKeepsTask == phase = "returned" => returnTarget = requestedTask
ReturnedStatusIsHonest == returnedReady => authenticatedRead /\ capabilityVerified
ChecksPreserveLiveOutput == liveOutput = originalOutput
====
