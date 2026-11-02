---- MODULE Onboarding ----
EXTENDS Naturals, FiniteSets
VARIABLES phase, intent, active, pending, verified, authenticated, staleAccepted
vars == <<phase, intent, active, pending, verified, authenticated, staleAccepted>>
Init == /\ phase = "home" /\ intent = "none" /\ active = 0
        /\ pending = {} /\ verified = 0 /\ authenticated = FALSE
        /\ staleAccepted = FALSE
SelectIntent == /\ phase = "home" /\ phase' = "disconnected" /\ intent' = "clips"
                /\ UNCHANGED <<active, pending, verified, authenticated, staleAccepted>>
OpenSetup == /\ phase \in {"disconnected", "canceled", "failed"}
             /\ phase' = "setup"
             /\ UNCHANGED <<intent, active, pending, verified, authenticated, staleAccepted>>
StartTest == /\ phase = "setup"
             /\ \E token \in {1, 2} \ pending:
                /\ phase' = "testing" /\ active' = token
                /\ pending' = pending \cup {token} /\ verified' = 0
                /\ authenticated' = FALSE
             /\ UNCHANGED <<intent, staleAccepted>>
ReadSucceeds == /\ phase = "testing" /\ active \in pending
                /\ phase' = "ready" /\ pending' = pending \ {active}
                /\ verified' = active /\ authenticated' = TRUE
                /\ UNCHANGED <<intent, active, staleAccepted>>
ReadFails == /\ phase = "testing" /\ active \in pending
            /\ phase' = "failed" /\ pending' = pending \ {active}
            /\ active' = 0 /\ verified' = 0 /\ authenticated' = FALSE
            /\ UNCHANGED <<intent, staleAccepted>>
Cancel == /\ phase \in {"setup", "testing", "failed"}
          /\ phase' = "canceled" /\ active' = 0 /\ verified' = 0
          /\ authenticated' = FALSE
          /\ UNCHANGED <<intent, pending, staleAccepted>>
LoseConnection == /\ phase \in {"ready", "testing"}
                  /\ phase' = "disconnected" /\ active' = 0
                  /\ verified' = 0 /\ authenticated' = FALSE
                  /\ UNCHANGED <<intent, pending, staleAccepted>>
IgnoreStaleResult == /\ \E token \in pending \ {active}:
                          pending' = pending \ {token}
                     /\ UNCHANGED <<phase, intent, active, verified, authenticated>>
                     /\ staleAccepted' = (phase' = "ready" /\ phase # "ready")
WaitForUser == /\ phase \in {"home", "disconnected", "canceled", "failed", "ready"}
               /\ UNCHANGED vars
Next == SelectIntent \/ OpenSetup \/ StartTest \/ ReadSucceeds \/ ReadFails
        \/ Cancel \/ LoseConnection \/ IgnoreStaleResult \/ WaitForUser
TypeOK == /\ phase \in {"home", "disconnected", "setup", "testing", "ready", "failed", "canceled"}
          /\ intent \in {"none", "clips"} /\ active \in {0, 1, 2}
          /\ pending \subseteq {1, 2} /\ verified \in {0, 1, 2}
          /\ authenticated \in BOOLEAN /\ staleAccepted \in BOOLEAN
ReadyRequiresVerifiedRead == phase = "ready" => authenticated /\ verified = active /\ active # 0
IntentSurvivesSetup == phase # "home" => intent = "clips"
DisconnectInvalidatesReady == phase \in {"disconnected", "canceled", "failed"} => ~authenticated /\ verified = 0
StaleResultsNeverAccepted == ~staleAccepted
====
