---- MODULE TwitchOnboarding ----
EXTENDS Naturals
VARIABLES phase, port, caller, explicitRequests, connectCalls, browserAttempts,
          authenticated, explicitCheck, portBeforeProbe, lastEvent
vars == <<phase, port, caller, explicitRequests, connectCalls, browserAttempts,
          authenticated, explicitCheck, portBeforeProbe, lastEvent>>

Ports == {"free", "busy", "owned"}
Phases == {"idle", "probeOnly", "probeForConnect", "ready", "readyToBind",
           "binding", "launching", "linkReady", "browserRequested", "browserFailed",
           "portBusy", "checking", "verified", "checkFailed"}
Init == /\ phase = "idle" /\ port \in Ports /\ caller = "none"
        /\ explicitRequests = 0 /\ connectCalls = 0 /\ browserAttempts = 0
        /\ authenticated = FALSE /\ explicitCheck = FALSE
        /\ portBeforeProbe = port /\ lastEvent = "open"

OnboardingCheck == /\ phase = "idle"
                   /\ phase' = "probeOnly" /\ portBeforeProbe' = port
                   /\ lastEvent' = "preflight requested"
                   /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck>>
UIClick == /\ phase \in {"idle", "ready", "portBusy"} /\ explicitRequests = 0
           /\ phase' = "probeForConnect" /\ caller' = "ui"
           /\ explicitRequests' = 1 /\ authenticated' = FALSE /\ explicitCheck' = FALSE
           /\ portBeforeProbe' = port /\ lastEvent' = "user requests browser"
           /\ UNCHANGED <<port, connectCalls, browserAttempts>>
ChatConnect == /\ phase \in {"idle", "ready", "portBusy"} /\ explicitRequests = 0
               /\ phase' = "binding" /\ caller' = "chat"
               /\ explicitRequests' = 1 /\ connectCalls' = 1
               /\ authenticated' = FALSE /\ explicitCheck' = FALSE
               /\ lastEvent' = "chat requests link"
               /\ UNCHANGED <<port, browserAttempts, portBeforeProbe>>
ProbeReady == /\ phase \in {"probeOnly", "probeForConnect"} /\ port \in {"free", "owned"}
              /\ phase' = IF phase = "probeForConnect" THEN "readyToBind" ELSE "ready"
              /\ lastEvent' = "preflight ready"
              /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
ProbeBusy == /\ phase \in {"probeOnly", "probeForConnect"} /\ port = "busy"
             /\ phase' = "portBusy" /\ lastEvent' = "preflight busy"
             /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
OtherProcessClaimsPort == /\ phase \in {"ready", "readyToBind"} /\ port = "free"
                          /\ port' = "busy" /\ lastEvent' = "other process claims port"
                          /\ UNCHANGED <<phase, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
BeginBind == /\ phase = "readyToBind" /\ connectCalls = 0
             /\ phase' = "binding" /\ connectCalls' = 1 /\ lastEvent' = "connection requested"
             /\ UNCHANGED <<port, caller, explicitRequests, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
BindReady == /\ phase = "binding" /\ port \in {"free", "owned"}
             /\ port' = "owned" /\ phase' = IF caller = "ui" THEN "launching" ELSE "linkReady"
             /\ lastEvent' = "callback listener ready"
             /\ UNCHANGED <<caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
BindBusy == /\ phase = "binding" /\ port = "busy"
            /\ phase' = "portBusy" /\ lastEvent' = "connection port busy"
            /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe>>
BrowserOpens == /\ phase = "launching"
                /\ phase' = "browserRequested" /\ browserAttempts' = browserAttempts + 1
                /\ lastEvent' = "browser request accepted"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, authenticated, explicitCheck, portBeforeProbe>>
BrowserFails == /\ phase = "launching"
                /\ phase' = "browserFailed" /\ browserAttempts' = browserAttempts + 1
                /\ lastEvent' = "browser request failed"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, authenticated, explicitCheck, portBeforeProbe>>
Recheck == /\ phase \in {"idle", "ready", "portBusy", "linkReady", "browserRequested", "browserFailed"}
           /\ phase' = "checking" /\ explicitCheck' = TRUE /\ authenticated' = FALSE
           /\ lastEvent' = "user rechecks access"
           /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, portBeforeProbe>>
ReadSucceeds == /\ phase = "checking"
                /\ phase' = "verified" /\ authenticated' = TRUE /\ lastEvent' = "authenticated read succeeds"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, explicitCheck, portBeforeProbe>>
ReadFails == /\ phase = "checking"
             /\ phase' = "checkFailed" /\ authenticated' = FALSE /\ lastEvent' = "authenticated read fails"
             /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, explicitCheck, portBeforeProbe>>
WaitForUser == /\ phase \in {"ready", "portBusy", "linkReady", "browserRequested", "browserFailed", "verified", "checkFailed"}
               /\ UNCHANGED vars

Next == OnboardingCheck \/ UIClick \/ ChatConnect \/ ProbeReady \/ ProbeBusy \/ OtherProcessClaimsPort
        \/ BeginBind \/ BindReady \/ BindBusy \/ BrowserOpens \/ BrowserFails \/ Recheck
        \/ ReadSucceeds \/ ReadFails \/ WaitForUser
TypeOK == /\ phase \in Phases /\ port \in Ports /\ caller \in {"none", "ui", "chat"}
          /\ explicitRequests \in 0..1 /\ connectCalls \in 0..1 /\ browserAttempts \in 0..1
          /\ authenticated \in BOOLEAN /\ explicitCheck \in BOOLEAN /\ portBeforeProbe \in Ports
ProbeDoesNotClaimPort == lastEvent \in {"preflight ready", "preflight busy"} => port = portBeforeProbe
BusyNeverOpensBrowser == phase = "portBusy" => browserAttempts = 0
BrowserRequiresOwnedListener == browserAttempts > 0 => port = "owned"
BrowserDoesNotVerify == phase \in {"launching", "linkReady", "browserRequested", "browserFailed", "portBusy"} => ~authenticated
VerifiedRequiresExplicitCheck == authenticated => explicitCheck /\ phase = "verified"
NoAutomaticRetry == browserAttempts <= connectCalls /\ connectCalls <= explicitRequests
ChatLinkDoesNotOpenBrowser == caller = "chat" => browserAttempts = 0
====
