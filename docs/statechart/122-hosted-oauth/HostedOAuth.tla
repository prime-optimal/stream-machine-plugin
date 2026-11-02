-------------------------- MODULE HostedOAuth --------------------------
EXTENDS TLC
Baseline == {"bits:read", "channel:bot", "channel:manage:broadcast",
 "channel:manage:clips", "channel:manage:redemptions", "channel:read:redemptions",
 "channel:read:subscriptions", "clips:edit", "moderator:read:followers",
 "user:bot", "user:read:chat", "user:write:chat"}
Additional == {"additional:example"}
VARIABLE s
Init == \E old \in BOOLEAN:
 s = [phase |-> "Browser signed out", owner |-> "none", live |-> FALSE,
 stored |-> old, encrypted |-> old, provider |-> old,
 scopes |-> IF old THEN {"previous:example"} ELSE {},
 priorStored |-> old, priorScopes |-> IF old THEN {"previous:example"} ELSE {},
 requested |-> {}, granted |-> {}]
SignIn == /\ s.phase = "Browser signed out"
 /\ \E who \in {"A", "B"}: s' = [s EXCEPT !.phase = "Sites signed in", !.owner = who]
Begin == /\ s.phase = "Sites signed in" /\ s.owner = "A"
 /\ s' = [s EXCEPT !.phase = "Twitch authorization pending", !.live = TRUE,
 !.requested = Baseline \cup s.scopes \cup Additional, !.granted = {},
 !.priorStored = s.stored, !.priorScopes = s.scopes]
ValidCallback == /\ s.phase = "Twitch authorization pending" /\ s.live /\ s.owner = "A"
 /\ s' = [s EXCEPT !.phase = "Callback consumed, exchanging code", !.live = FALSE]
Reject == /\ s.phase \in {"Twitch authorization pending", "Callback consumed, exchanging code"}
 /\ s' = [s EXCEPT !.phase = "Authorization failed, previous connection retained", !.live = FALSE]
CompleteGrants == /\ s.phase = "Callback consumed, exchanging code"
 /\ s' = [s EXCEPT !.phase = "All requested grants validated", !.granted = s.requested]
MissingGrants == /\ s.phase = "Callback consumed, exchanging code"
 /\ s' = [s EXCEPT !.phase = "Authorization failed, previous connection retained", !.granted = {}]
Save == /\ s.phase = "All requested grants validated" /\ s.requested \subseteq s.granted
 /\ s' = [s EXCEPT !.phase = "Connected to Twitch", !.stored = TRUE,
 !.encrypted = TRUE, !.provider = TRUE, !.scopes = s.granted]
Refresh == /\ s.phase = "Connected to Twitch"
 /\ s' = [s EXCEPT !.phase = "Refresh in flight"]
SaveRefresh == /\ s.phase = "Refresh in flight" /\ s.stored
 /\ s' = [s EXCEPT !.phase = "Connected to Twitch"]
Disconnect == /\ s.phase \in {"Connected to Twitch", "Refresh in flight", "Callback consumed, exchanging code", "All requested grants validated"}
 /\ s' = [s EXCEPT !.phase = "Disconnected", !.stored = FALSE,
 !.encrypted = FALSE, !.live = FALSE, !.scopes = {}]
FreshBrowser == /\ s.phase = "Connected to Twitch"
 /\ s' = [s EXCEPT !.phase = "Browser signed out", !.owner = "none"]
OwnStatus == /\ s.phase = "Sites signed in" /\ s.owner = "A" /\ s.stored
 /\ s' = [s EXCEPT !.phase = "Connected to Twitch"]
ForeignStatus == /\ s.phase = "Sites signed in" /\ s.owner = "B"
 /\ s' = [s EXCEPT !.phase = "Other owner sees disconnected"]
Done == /\ s.phase \in {"Authorization failed, previous connection retained", "Disconnected", "Other owner sees disconnected"}
 /\ UNCHANGED s
Next == SignIn \/ Begin \/ ValidCallback \/ Reject \/ CompleteGrants \/ MissingGrants
 \/ Save \/ Refresh \/ SaveRefresh \/ Disconnect \/ FreshBrowser \/ OwnStatus \/ ForeignStatus \/ Done
Spec == Init /\ [][Next]_s
EncryptedAtRest == s.stored => s.encrypted
OwnerBoundView == (s.phase = "Connected to Twitch") => (s.owner = "A" /\ s.stored /\ s.provider)
DeploymentIsNotProviderProof == (~s.provider) => ~s.stored
FreshBrowserHasNoIdentity == (s.phase = "Browser signed out") => s.owner = "none"
ConsumedStateCannotReplay == (s.phase \in {"Callback consumed, exchanging code", "All requested grants validated"}) => ~s.live
RequestPreservesScopes == (s.phase = "Twitch authorization pending") => s.requested = Baseline \cup s.priorScopes \cup Additional
CompleteBeforeSave == (s.phase = "All requested grants validated") => s.requested \subseteq s.granted
FailedAuthorizationPreservesConnection == (s.phase = "Authorization failed, previous connection retained") => (s.stored = s.priorStored /\ s.scopes = s.priorScopes)
=============================================================================
