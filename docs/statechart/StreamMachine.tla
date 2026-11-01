-------------------------- MODULE StreamMachine --------------------------
EXTENDS Naturals
VARIABLES phase, connected, preview, providerWrite
vars == <<phase, connected, preview, providerWrite>>
Init == /\ phase = "disconnected" /\ connected = FALSE /\ preview = FALSE /\ providerWrite = FALSE
Connect == /\ phase = "disconnected" /\ phase' = "ready" /\ connected' = TRUE /\ UNCHANGED <<preview, providerWrite>>
Preview == /\ phase \in {"ready", "preview"} /\ phase' = "preview" /\ preview' = TRUE /\ UNCHANGED <<connected, providerWrite>>
Unavailable == /\ phase \in {"disconnected", "ready", "preview"} /\ phase' = "unavailable" /\ UNCHANGED <<connected, preview, providerWrite>>
Return == /\ phase = "unavailable" /\ phase' = (IF connected THEN "ready" ELSE "disconnected") /\ preview' = FALSE /\ UNCHANGED <<connected, providerWrite>>
Reset == /\ phase \in {"ready", "preview"} /\ phase' = "disconnected" /\ connected' = FALSE /\ preview' = FALSE /\ UNCHANGED providerWrite
Next == Connect \/ Preview \/ Unavailable \/ Return \/ Reset
MockOnly == ~providerWrite
PreviewNeedsDemo == preview => connected
Spec == Init /\ [][Next]_vars
=============================================================================
