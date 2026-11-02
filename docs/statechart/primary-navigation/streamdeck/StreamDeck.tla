---- MODULE StreamDeck ----
EXTENDS Naturals
VARIABLES phase, preview, approved, consent, ownership, storedVerified,
          physicalConfirmed, source, away
vars == <<phase, preview, approved, consent, ownership, storedVerified,
          physicalConfirmed, source, away>>
Init == /\ phase = "inventory" /\ preview = FALSE /\ approved = FALSE
        /\ consent = FALSE /\ ownership = "none" /\ storedVerified = FALSE
        /\ physicalConfirmed = FALSE /\ source = "unknown" /\ away = FALSE
DeviceAvailable == /\ phase = "inventory" /\ phase' = "inspect"
                   /\ source' = "stream-machine"
                   /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, physicalConfirmed, away>>
DeviceUnavailable == /\ phase = "inventory" /\ phase' = "unavailable"
                     /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, physicalConfirmed, source, away>>
CheckAgain == /\ phase = "unavailable" /\ phase' = "inventory" /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, physicalConfirmed, source, away>>
ChooseRecipe == /\ phase = "inspect" /\ phase' = "draft"
                /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, physicalConfirmed, source, away>>
ReviewDraft == /\ phase = "draft" /\ phase' = "review" /\ preview' = TRUE
               /\ UNCHANGED <<approved, consent, ownership, storedVerified, physicalConfirmed, source, away>>
EditDraft == /\ phase \in {"draft", "review", "authorized"} /\ phase' = "draft"
             /\ preview' = FALSE /\ approved' = FALSE
             /\ UNCHANGED <<consent, ownership, storedVerified, physicalConfirmed, source, away>>
Authorize == /\ phase = "review" /\ preview /\ phase' = "authorized" /\ approved' = TRUE
             /\ UNCHANGED <<preview, consent, ownership, storedVerified, physicalConfirmed, source, away>>
Apply == /\ phase = "authorized" /\ preview /\ approved /\ phase' = "applying"
         /\ consent' = approved /\ preview' = FALSE /\ approved' = FALSE
         /\ ownership' = "possible"
         /\ UNCHANGED <<storedVerified, physicalConfirmed, source, away>>
ApplyVerified == /\ phase = "applying" /\ phase' = "stored"
                 /\ ownership' = "held" /\ storedVerified' = TRUE
                 /\ UNCHANGED <<preview, approved, consent, physicalConfirmed, source, away>>
ApplyRefused == /\ phase = "applying" /\ phase' = "refused" /\ ownership' = "none"
                /\ UNCHANGED <<preview, approved, consent, storedVerified, physicalConfirmed, source, away>>
OutcomeUnknown == /\ phase = "applying" /\ phase' = "unknown"
                  /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, physicalConfirmed, source, away>>
ReviseAfterRefusal == /\ phase = "refused" /\ phase' = "draft" /\ consent' = FALSE
                      /\ UNCHANGED <<preview, approved, ownership, storedVerified, physicalConfirmed, source, away>>
InspectOriginal == /\ phase = "unknown" /\ phase' = "stored"
                   /\ ownership' = "held" /\ storedVerified' = TRUE
                   /\ UNCHANGED <<preview, approved, consent, physicalConfirmed, source, away>>
ConfirmPhysicalPress == /\ phase = "stored" /\ phase' = "physical" /\ physicalConfirmed' = TRUE
                        /\ UNCHANGED <<preview, approved, consent, ownership, storedVerified, source, away>>
Release == /\ phase \in {"stored", "physical", "unknown"} /\ phase' = "released"
           /\ ownership' = "none"
           /\ UNCHANGED <<preview, approved, consent, storedVerified, physicalConfirmed, source, away>>
ReturnToInventory == /\ phase = "released" /\ phase' = "inspect"
                     /\ consent' = FALSE /\ storedVerified' = FALSE /\ physicalConfirmed' = FALSE
                     /\ UNCHANGED <<preview, approved, ownership, source, away>>
Navigate == /\ away' = ~away
            /\ UNCHANGED <<phase, preview, approved, consent, ownership, storedVerified, physicalConfirmed, source>>
Wait == /\ phase \notin {"inventory", "applying"} /\ UNCHANGED vars
Next == DeviceAvailable \/ DeviceUnavailable \/ CheckAgain \/ ChooseRecipe \/ ReviewDraft
        \/ EditDraft \/ Authorize \/ Apply \/ ApplyVerified \/ ApplyRefused \/ OutcomeUnknown
        \/ ReviseAfterRefusal \/ InspectOriginal \/ ConfirmPhysicalPress \/ Release
        \/ ReturnToInventory \/ Navigate \/ Wait
TypeOK == /\ phase \in {"inventory", "unavailable", "inspect", "draft", "review", "authorized", "applying", "stored", "refused", "unknown", "physical", "released"}
          /\ preview \in BOOLEAN /\ approved \in BOOLEAN /\ consent \in BOOLEAN
          /\ ownership \in {"none", "possible", "held"} /\ storedVerified \in BOOLEAN
          /\ physicalConfirmed \in BOOLEAN /\ source \in {"unknown", "stream-machine"} /\ away \in BOOLEAN
OwnershipRequiresConsent == ownership # "none" => consent
BrowsingDoesNotOwnDevice == phase \in {"inventory", "unavailable", "inspect", "draft", "review", "authorized"} => ownership = "none"
EditsNeedFreshApproval == phase = "draft" => ~preview /\ ~approved
ApprovalRequiresPreview == approved => phase = "authorized" /\ preview
StoredIsNotPhysicalProof == phase = "stored" => storedVerified /\ ~physicalConfirmed
PhysicalNeedsStoredProof == physicalConfirmed => storedVerified
UnknownCannotApplyAgain == phase = "unknown" => ~preview /\ ~approved
NoNativeProfileClaim == source # "native-elgato"
====
