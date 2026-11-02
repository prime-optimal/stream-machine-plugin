---------------------------- MODULE Consent ----------------------------
EXTENDS TLC, FiniteSets
CONSTANTS Implemented, Future, Retained
Policy == {Implemented, Future}
Universe == Policy \cup {Retained}
VARIABLES phase, connected, grants, requested, prior, priorConnected, missing
vars == <<phase, connected, grants, requested, prior, priorConnected, missing>>

Init ==
  /\ phase = "ready"
  /\ connected \in BOOLEAN
  /\ grants \in SUBSET Universe
  /\ (~connected => grants = {})
  /\ requested = {}
  /\ prior = grants
  /\ priorConnected = connected
  /\ missing = Policy \ grants

BeginConsent ==
  /\ phase = "ready"
  /\ phase' = "pending"
  /\ requested' = Policy \cup grants
  /\ prior' = grants
  /\ priorConnected' = connected
  /\ UNCHANGED <<connected, grants, missing>>

DenyConsent ==
  /\ phase = "pending"
  /\ phase' = "denied"
  /\ UNCHANGED <<connected, grants, requested, prior, priorConnected, missing>>

IncompleteGrant ==
  /\ phase = "pending"
  /\ phase' = "incomplete"
  /\ UNCHANGED <<connected, grants, requested, prior, priorConnected, missing>>

AcceptValidatedGrant ==
  /\ phase = "pending"
  /\ \E validated \in SUBSET Universe:
       /\ requested \subseteq validated
       /\ grants' = validated
       /\ missing' = Policy \ validated
  /\ connected' = TRUE
  /\ phase' = "accepted"
  /\ UNCHANGED <<requested, prior, priorConnected>>

ValidateReducedGrant ==
  /\ phase = "ready"
  /\ connected
  /\ \E validated \in SUBSET grants:
       /\ grants' = validated
       /\ missing' = Policy \ validated
  /\ phase' = "checked"
  /\ UNCHANGED <<connected, requested, prior, priorConnected>>

Done ==
  /\ phase \in {"denied", "incomplete", "accepted", "checked"}
  /\ UNCHANGED vars

Next == BeginConsent \/ DenyConsent \/ IncompleteGrant \/ AcceptValidatedGrant \/ ValidateReducedGrant \/ Done
Spec == Init /\ [][Next]_vars
TypeOK ==
  /\ phase \in {"ready", "pending", "denied", "incomplete", "accepted", "checked"}
  /\ connected \in BOOLEAN
  /\ grants \subseteq Universe
  /\ prior \subseteq Universe
  /\ priorConnected \in BOOLEAN
  /\ requested \subseteq Universe
  /\ missing \subseteq Policy
HonestMissing == missing = Policy \ grants
RequestMatchesPolicy == phase \in {"pending", "denied", "incomplete", "accepted"} => requested = Policy \cup prior
RejectedKeepsConnection == phase \in {"denied", "incomplete"} => /\ grants = prior /\ connected = priorConnected
ValidatedBeforeReady == phase = "accepted" => /\ connected /\ requested \subseteq grants /\ missing = {}
ScopeLossKeepsConnection == phase = "checked" => connected
=============================================================================
