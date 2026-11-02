---- MODULE LocalNavigation ----
EXTENDS Naturals
VARIABLES section, phase, revision, pendingRead, checkedRevision, allScopes,
          authenticated, urlReady, draft, explicitCalls, callsAtNavigation, lastEvent
vars == <<section, phase, revision, pendingRead, checkedRevision, allScopes,
          authenticated, urlReady, draft, explicitCalls, callsAtNavigation, lastEvent>>
Sections == {"home", "connections", "other"}
Init == /\ section = "home" /\ phase = "unchecked"
        /\ revision = 0 /\ pendingRead = 0 /\ checkedRevision = 0
        /\ allScopes = FALSE /\ authenticated = FALSE /\ urlReady = FALSE
        /\ draft = "retained draft" /\ explicitCalls = 0 /\ callsAtNavigation = 0
        /\ lastEvent = "open"
Navigate == /\ \E destination \in Sections: section' = destination
            /\ callsAtNavigation' = explicitCalls /\ lastEvent' = "navigate"
            /\ UNCHANGED <<phase, revision, pendingRead, checkedRevision, allScopes,
                            authenticated, urlReady, draft, explicitCalls>>
Check == /\ revision < 2 /\ pendingRead = 0
         /\ revision' = revision + 1 /\ pendingRead' = revision + 1
         /\ phase' = "checking" /\ authenticated' = FALSE /\ allScopes' = FALSE
         /\ explicitCalls' = explicitCalls + 1 /\ lastEvent' = "explicit check"
         /\ UNCHANGED <<section, checkedRevision, urlReady, draft, callsAtNavigation>>
Reconnect == /\ revision < 2
             /\ revision' = revision + 1 /\ phase' = "authorization"
             /\ authenticated' = FALSE /\ allScopes' = FALSE /\ urlReady' = TRUE
             /\ explicitCalls' = explicitCalls + 1 /\ lastEvent' = "explicit reconnect"
             /\ UNCHANGED <<section, pendingRead, checkedRevision, draft, callsAtNavigation>>
CurrentRead == /\ pendingRead # 0 /\ pendingRead = revision
               /\ \E granted \in BOOLEAN:
                    /\ allScopes' = granted
                    /\ phase' = IF granted THEN "verified" ELSE "missing"
               /\ authenticated' = TRUE /\ checkedRevision' = revision
               /\ pendingRead' = 0 /\ lastEvent' = "current read"
               /\ UNCHANGED <<section, revision, urlReady, draft, explicitCalls, callsAtNavigation>>
ReadFails == /\ pendingRead # 0 /\ pendingRead = revision
             /\ phase' = "failed" /\ pendingRead' = 0
             /\ authenticated' = FALSE /\ allScopes' = FALSE
             /\ lastEvent' = "read failed"
             /\ UNCHANGED <<section, revision, checkedRevision, urlReady, draft, explicitCalls, callsAtNavigation>>
StaleRead == /\ pendingRead # 0 /\ pendingRead # revision
             /\ pendingRead' = 0 /\ lastEvent' = "stale read ignored"
             /\ UNCHANGED <<section, phase, revision, checkedRevision, allScopes,
                             authenticated, urlReady, draft, explicitCalls, callsAtNavigation>>
Done == /\ revision = 2 /\ pendingRead = 0 /\ UNCHANGED vars
Next == Navigate \/ Check \/ Reconnect \/ CurrentRead \/ ReadFails \/ StaleRead \/ Done
TypeOK == /\ section \in Sections
          /\ phase \in {"unchecked", "checking", "authorization", "verified", "missing", "failed"}
          /\ revision \in 0..2 /\ pendingRead \in 0..2 /\ checkedRevision \in 0..2
          /\ allScopes \in BOOLEAN /\ authenticated \in BOOLEAN /\ urlReady \in BOOLEAN
          /\ explicitCalls \in 0..2 /\ callsAtNavigation \in 0..2
NavigationMakesNoCalls == lastEvent = "navigate" => explicitCalls = callsAtNavigation
DraftSurvives == draft = "retained draft"
ReadyRequiresCurrentAuthenticatedRead == phase = "verified" => authenticated /\ allScopes /\ checkedRevision = revision
UrlDoesNotVerify == phase = "authorization" => ~authenticated /\ ~allScopes
MissingScopesRemainHonest == phase = "missing" => authenticated /\ ~allScopes /\ checkedRevision = revision
StaleReadCannotVerify == lastEvent = "stale read ignored" => phase = "authorization" /\ ~authenticated
====
