-------------------------- MODULE HostedOAuth --------------------------
EXTENDS TLC
VARIABLES phase, owner, stateOwner, stateLive, stored, encrypted, provider
vars == <<phase, owner, stateOwner, stateLive, stored, encrypted, provider>>
Init == /\ phase = "Deployed, browser signed out" /\ owner = "none"
        /\ stateOwner = "none" /\ stateLive = FALSE /\ stored = FALSE
        /\ encrypted = FALSE /\ provider = FALSE
SignIn == /\ phase = "Deployed, browser signed out"
          /\ owner' \in {"A", "B"} /\ phase' = "Sites signed in"
          /\ UNCHANGED <<stateOwner, stateLive, stored, encrypted, provider>>
Begin == /\ phase = "Sites signed in" /\ owner = "A"
         /\ phase' = "Twitch authorization pending" /\ stateOwner' = owner
         /\ stateLive' = TRUE /\ UNCHANGED <<owner, stored, encrypted, provider>>
ValidCallback == /\ phase = "Twitch authorization pending"
                 /\ stateLive /\ stateOwner = owner /\ owner = "A"
                 /\ phase' = "Callback consumed, exchanging code"
                 /\ stateLive' = FALSE
                 /\ UNCHANGED <<owner, stateOwner, stored, encrypted, provider>>
InvalidCallback == /\ phase = "Twitch authorization pending"
                   /\ phase' = "Callback rejected" /\ stateLive' = FALSE
                   /\ UNCHANGED <<owner, stateOwner, stored, encrypted, provider>>
Save == /\ phase = "Callback consumed, exchanging code"
        /\ stateOwner = owner /\ owner = "A"
        /\ phase' = "Connected to Twitch" /\ stored' = TRUE
        /\ encrypted' = TRUE /\ provider' = TRUE
        /\ UNCHANGED <<owner, stateOwner, stateLive>>
Refresh == /\ phase = "Connected to Twitch"
           /\ phase' = "Refresh in flight"
           /\ UNCHANGED <<owner, stateOwner, stateLive, stored, encrypted, provider>>
SaveRefresh == /\ phase = "Refresh in flight" /\ stored
               /\ phase' = "Connected to Twitch"
               /\ UNCHANGED <<owner, stateOwner, stateLive, stored, encrypted, provider>>
Disconnect == /\ phase \in {"Connected to Twitch", "Refresh in flight", "Callback consumed, exchanging code"}
              /\ phase' = "Disconnected" /\ stored' = FALSE /\ encrypted' = FALSE
              /\ stateLive' = FALSE /\ stateOwner' = "none"
              /\ UNCHANGED <<owner, provider>>
FreshBrowser == /\ phase = "Connected to Twitch"
                /\ phase' = "Deployed, browser signed out" /\ owner' = "none"
                /\ UNCHANGED <<stateOwner, stateLive, stored, encrypted, provider>>
OwnStatus == /\ phase = "Sites signed in" /\ owner = "A" /\ stored
             /\ phase' = "Connected to Twitch"
             /\ UNCHANGED <<owner, stateOwner, stateLive, stored, encrypted, provider>>
ForeignStatus == /\ phase = "Sites signed in" /\ owner = "B"
                 /\ phase' = "Other owner sees disconnected"
                 /\ UNCHANGED <<owner, stateOwner, stateLive, stored, encrypted, provider>>
Done == /\ phase \in {"Callback rejected", "Disconnected", "Other owner sees disconnected"}
        /\ UNCHANGED vars
Next == SignIn \/ Begin \/ ValidCallback \/ InvalidCallback \/ Save \/ Refresh
        \/ SaveRefresh \/ Disconnect \/ FreshBrowser \/ OwnStatus \/ ForeignStatus \/ Done
Spec == Init /\ [][Next]_vars
EncryptedAtRest == stored => encrypted
OwnerBoundView == (phase = "Connected to Twitch") => (owner = "A" /\ stored /\ provider)
DeploymentIsNotProviderProof == (~provider) => ~stored
FreshBrowserHasNoIdentity == (phase = "Deployed, browser signed out") => owner = "none"
ConsumedStateCannotReplay == (phase = "Callback consumed, exchanging code") => ~stateLive
=============================================================================
