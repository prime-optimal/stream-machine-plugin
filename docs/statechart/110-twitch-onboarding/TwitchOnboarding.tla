---- MODULE TwitchOnboarding ----
EXTENDS Naturals
VARIABLES phase, port, caller, explicitRequests, connectCalls, browserAttempts,
          authenticated, explicitCheck, portBeforeProbe, lastEvent,
          approved, signals, signalTarget, retries
vars == <<phase, port, caller, explicitRequests, connectCalls, browserAttempts,
          authenticated, explicitCheck, portBeforeProbe, lastEvent,
          approved, signals, signalTarget, retries>>

\* free: nobody listens. self: this session listens. plugin: another verified
\* Stream Machine process listens. foreign: any other process listens.
Ports == {"free", "self", "plugin", "foreign"}
Holders == {"plugin", "foreign"}
MaxRetries == 2
BusyPhases == {"portBusyPlugin", "portBusyForeign", "replaceFailed"}
IdlePhases == {"linkReady", "browserRequested", "browserFailed"}
StalePhases == {"linkStale", "requestedStale", "failedStale"}
StaleOf(p) == CASE p = "linkReady" -> "linkStale"
                [] p = "browserRequested" -> "requestedStale"
                [] p = "browserFailed" -> "failedStale"
Phases == {"idle", "probeOnly", "probeForConnect", "ready", "readyToBind",
           "binding", "launching", "linkReady", "browserRequested", "browserFailed",
           "portBusyPlugin", "portBusyForeign", "replaceStart", "stopping", "replaceFailed",
           "checking", "verified", "checkFailed"} \cup StalePhases
Init == /\ phase = "idle" /\ port \in Ports /\ caller = "none"
        /\ explicitRequests = 0 /\ connectCalls = 0 /\ browserAttempts = 0
        /\ authenticated = FALSE /\ explicitCheck = FALSE
        /\ portBeforeProbe = port /\ lastEvent = "open"
        /\ approved = FALSE /\ signals = 0 /\ signalTarget = "none" /\ retries = 0

BindTarget == IF caller = "ui" THEN "launching" ELSE "linkReady"

OnboardingCheck == /\ phase = "idle"
                   /\ phase' = "probeOnly" /\ portBeforeProbe' = port
                   /\ lastEvent' = "preflight requested"
                   /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, approved, signals, signalTarget, retries>>
UIClick == /\ phase \in {"idle", "ready", "portBusyPlugin", "portBusyForeign"} /\ explicitRequests = 0
           /\ phase' = "probeForConnect" /\ caller' = "ui"
           /\ explicitRequests' = 1 /\ authenticated' = FALSE /\ explicitCheck' = FALSE
           /\ portBeforeProbe' = port /\ lastEvent' = "user requests browser"
           /\ UNCHANGED <<port, connectCalls, browserAttempts, approved, signals, signalTarget, retries>>
ChatConnect == /\ phase \in {"idle", "ready", "portBusyPlugin", "portBusyForeign"} /\ explicitRequests = 0
               /\ phase' = "binding" /\ caller' = "chat"
               /\ explicitRequests' = 1 /\ connectCalls' = 1
               /\ authenticated' = FALSE /\ explicitCheck' = FALSE
               /\ lastEvent' = "chat requests link"
               /\ UNCHANGED <<port, browserAttempts, portBeforeProbe, approved, signals, signalTarget, retries>>
ProbeReady == /\ phase \in {"probeOnly", "probeForConnect"} /\ port \in {"free", "self"}
              /\ phase' = IF phase = "probeForConnect" THEN "readyToBind" ELSE "ready"
              /\ lastEvent' = "preflight ready"
              /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
ProbeBusy == /\ phase \in {"probeOnly", "probeForConnect"} /\ port \in Holders
             /\ phase' = IF port = "plugin" THEN "portBusyPlugin" ELSE "portBusyForeign"
             /\ lastEvent' = "preflight busy"
             /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
OtherProcessClaimsPort == /\ phase \in {"ready", "readyToBind", "stopping"} /\ port = "free"
                          /\ port' \in Holders /\ lastEvent' = "other process claims port"
                          /\ UNCHANGED <<phase, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
BeginBind == /\ phase = "readyToBind" /\ connectCalls = 0
             /\ phase' = "binding" /\ connectCalls' = 1 /\ lastEvent' = "connection requested"
             /\ UNCHANGED <<port, caller, explicitRequests, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
BindReady == /\ phase = "binding" /\ port \in {"free", "self"}
             /\ port' = "self" /\ phase' = BindTarget
             /\ lastEvent' = "callback listener ready"
             /\ UNCHANGED <<caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
BindBusy == /\ phase = "binding" /\ port \in Holders
            /\ phase' = IF port = "plugin" THEN "portBusyPlugin" ELSE "portBusyForeign"
            /\ lastEvent' = "connection port busy"
            /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
\* The Connect button for a plugin holder is the UI path. A chat reaches replace
\* only by calling the tool with replacePluginListener after you approve it.
ApproveReplace == /\ \/ phase = "portBusyPlugin" /\ caller \in {"ui", "chat"}
                     \/ phase = "portBusyForeign" /\ caller = "chat"
                  /\ explicitRequests = 1
                  /\ phase' = "replaceStart" /\ approved' = TRUE
                  /\ explicitRequests' = explicitRequests + 1 /\ connectCalls' = connectCalls + 1
                  /\ authenticated' = FALSE /\ explicitCheck' = FALSE
                  /\ lastEvent' = "user approves replacing the other chat"
                  /\ UNCHANGED <<port, caller, browserAttempts, portBeforeProbe, signals, signalTarget, retries>>
ReplaceBindsFree == /\ phase = "replaceStart" /\ approved /\ port = "free"
                    /\ port' = "self" /\ phase' = BindTarget
                    /\ lastEvent' = "callback listener ready"
                    /\ UNCHANGED <<caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
SendTerm == /\ phase = "replaceStart" /\ approved /\ port = "plugin"
            /\ phase' = "stopping" /\ signals' = signals + 1 /\ signalTarget' = port /\ retries' = 0
            /\ lastEvent' = "stop signal sent to plugin process"
            /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved>>
RefuseForeign == /\ phase = "replaceStart" /\ port = "foreign"
                 /\ phase' = "replaceFailed" /\ lastEvent' = "replace refused, holder is not Stream Machine"
                 /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
PluginExits == /\ phase = "stopping" /\ port = "plugin"
               /\ port' = "free" /\ lastEvent' = "plugin process exits"
               /\ UNCHANGED <<phase, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
RetryBinds == /\ phase = "stopping" /\ port = "free"
              /\ port' = "self" /\ phase' = BindTarget
              /\ lastEvent' = "callback listener ready"
              /\ UNCHANGED <<caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
RetryWaits == /\ phase = "stopping" /\ port \in Holders /\ retries < MaxRetries
              /\ retries' = retries + 1 /\ lastEvent' = "bind retry fails"
              /\ UNCHANGED <<phase, port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget>>
RetryGivesUp == /\ phase = "stopping" /\ port \in Holders /\ retries = MaxRetries
                /\ phase' = "replaceFailed" /\ lastEvent' = "retry limit reached"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
HolderChanges == /\ phase = "portBusyPlugin" /\ port = "plugin"
                 /\ port' \in {"free", "foreign"} /\ lastEvent' = "port holder changes"
                 /\ UNCHANGED <<phase, caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
IdleRelease == /\ phase \in IdlePhases /\ port = "self"
               /\ phase' = StaleOf(phase) /\ port' = "free" /\ lastEvent' = "listener idle release"
               /\ UNCHANGED <<caller, explicitRequests, connectCalls, browserAttempts, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
BrowserOpens == /\ phase = "launching" /\ port = "self"
                /\ phase' = "browserRequested" /\ browserAttempts' = browserAttempts + 1
                /\ lastEvent' = "browser request accepted"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
BrowserFails == /\ phase = "launching" /\ port = "self"
                /\ phase' = "browserFailed" /\ browserAttempts' = browserAttempts + 1
                /\ lastEvent' = "browser request failed"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, authenticated, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
Recheck == /\ phase \in ({"idle", "ready", "linkReady", "browserRequested", "browserFailed"} \cup StalePhases \cup BusyPhases)
           /\ phase' = "checking" /\ explicitCheck' = TRUE /\ authenticated' = FALSE
           /\ lastEvent' = "user rechecks access"
           /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, portBeforeProbe, approved, signals, signalTarget, retries>>
ReadSucceeds == /\ phase = "checking"
                /\ phase' = "verified" /\ authenticated' = TRUE /\ lastEvent' = "authenticated read succeeds"
                /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
ReadFails == /\ phase = "checking"
             /\ phase' = "checkFailed" /\ authenticated' = FALSE /\ lastEvent' = "authenticated read fails"
             /\ UNCHANGED <<port, caller, explicitRequests, connectCalls, browserAttempts, explicitCheck, portBeforeProbe, approved, signals, signalTarget, retries>>
WaitForUser == /\ phase \in ({"ready", "linkReady", "browserRequested", "browserFailed", "verified", "checkFailed"} \cup StalePhases \cup BusyPhases)
               /\ UNCHANGED vars

Next == OnboardingCheck \/ UIClick \/ ChatConnect \/ ProbeReady \/ ProbeBusy \/ OtherProcessClaimsPort
        \/ BeginBind \/ BindReady \/ BindBusy \/ ApproveReplace \/ ReplaceBindsFree \/ SendTerm
        \/ RefuseForeign \/ PluginExits \/ RetryBinds \/ RetryWaits \/ RetryGivesUp \/ HolderChanges
        \/ IdleRelease \/ BrowserOpens \/ BrowserFails \/ Recheck
        \/ ReadSucceeds \/ ReadFails \/ WaitForUser
TypeOK == /\ phase \in Phases /\ port \in Ports /\ caller \in {"none", "ui", "chat"}
          /\ explicitRequests \in 0..2 /\ connectCalls \in 0..2 /\ browserAttempts \in 0..1
          /\ authenticated \in BOOLEAN /\ explicitCheck \in BOOLEAN /\ portBeforeProbe \in Ports
          /\ approved \in BOOLEAN /\ signals \in 0..1 /\ signalTarget \in {"none", "plugin", "foreign"}
          /\ retries \in 0..MaxRetries
ProbeDoesNotClaimPort == lastEvent \in {"preflight ready", "preflight busy"} => port = portBeforeProbe
BusyNeverOpensBrowser == phase \in BusyPhases => browserAttempts = 0
BrowserRequiresOwnedListener == lastEvent \in {"browser request accepted", "browser request failed"} => port = "self"
BrowserDoesNotVerify == phase \in ({"launching", "linkReady", "browserRequested", "browserFailed", "replaceStart", "stopping"} \cup StalePhases \cup BusyPhases) => ~authenticated
VerifiedRequiresExplicitCheck == authenticated => explicitCheck /\ phase = "verified"
NoAutomaticRetry == browserAttempts <= connectCalls /\ connectCalls <= explicitRequests
ChatLinkDoesNotOpenBrowser == caller = "chat" => browserAttempts = 0
ReplaceNeverTargetsForeign == signalTarget # "foreign"
ReplaceRequiresApproval == (signals > 0 \/ phase \in {"replaceStart", "stopping"}) => approved
SignalSentOnce == signals <= 1
IdleReleaseFreesPort == lastEvent = "listener idle release" => port = "free"
StaleHoldsNoListener == phase \in StalePhases => port # "self"
====
