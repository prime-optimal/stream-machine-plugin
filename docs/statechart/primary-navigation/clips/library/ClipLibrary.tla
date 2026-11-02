---- MODULE ClipLibrary ----
EXTENDS Naturals
VARIABLES phase, site, selected, stored, save, current, srcLoaded
vars == <<phase, site, selected, stored, save, current, srcLoaded>>
Phases == {"gallery", "details", "saving", "starting", "playing", "manual", "failed", "unknown", "closed"}
Init == /\ phase = "gallery" /\ site \in BOOLEAN /\ selected = FALSE
        /\ stored = FALSE /\ save = "idle" /\ current = FALSE /\ srcLoaded = FALSE
SelectClip == /\ phase = "gallery" /\ phase' = "details" /\ selected' = TRUE
              /\ stored' \in BOOLEAN /\ current' = FALSE
              /\ UNCHANGED <<site, save, srcLoaded>>
PlaySaved == /\ phase = "details" /\ stored /\ phase' = "starting" /\ srcLoaded' = TRUE
             /\ UNCHANGED <<site, selected, stored, save, current>>
PlayUnsaved == /\ phase = "details" /\ site /\ ~stored /\ save = "idle"
               /\ phase' = "saving" /\ save' = "pending" /\ current' = TRUE
               /\ UNCHANGED <<site, selected, stored, srcLoaded>>
DuplicatePlay == /\ save = "pending" /\ UNCHANGED vars
SaveConfirmed == /\ save = "pending"
                 /\ save' = "confirmed"
                 /\ phase' = IF current THEN "starting" ELSE phase
                 /\ stored' = IF current THEN TRUE ELSE stored
                 /\ srcLoaded' = IF current THEN TRUE ELSE srcLoaded
                 /\ UNCHANGED <<site, selected, current>>
SaveFailed == /\ save = "pending" /\ save' = "failed"
              /\ phase' = IF current THEN "failed" ELSE phase
              /\ UNCHANGED <<site, selected, stored, current, srcLoaded>>
SaveUnknown == /\ save = "pending" /\ save' = "unknown"
               /\ phase' = IF current THEN "unknown" ELSE phase
               /\ UNCHANGED <<site, selected, stored, current, srcLoaded>>
RetryKnownFailure == /\ phase = "failed" /\ site /\ save = "failed"
                     /\ phase' = "saving" /\ save' = "pending"
                     /\ UNCHANGED <<site, selected, stored, current, srcLoaded>>
PlaybackStarts == /\ phase = "starting" /\ phase' = "playing"
                  /\ UNCHANGED <<site, selected, stored, save, current, srcLoaded>>
AutoplayDenied == /\ phase = "starting" /\ phase' = "manual"
                  /\ UNCHANGED <<site, selected, stored, save, current, srcLoaded>>
PressVisiblePlay == /\ phase = "manual" /\ phase' = "starting"
                    /\ UNCHANGED <<site, selected, stored, save, current, srcLoaded>>
LeaveDetail == /\ phase \in {"details", "saving", "starting", "playing", "manual", "failed", "unknown"}
               /\ phase' = "gallery" /\ selected' = FALSE /\ stored' = FALSE
               /\ current' = FALSE /\ srcLoaded' = FALSE
               /\ UNCHANGED <<site, save>>
AccountChanges == /\ phase # "closed" /\ phase' = "closed" /\ site' = FALSE
                  /\ selected' = FALSE /\ stored' = FALSE /\ current' = FALSE /\ srcLoaded' = FALSE
                  /\ UNCHANGED save
Wait == /\ phase # "starting" /\ save # "pending" /\ UNCHANGED vars
Next == SelectClip \/ PlaySaved \/ PlayUnsaved \/ DuplicatePlay \/ SaveConfirmed \/ SaveFailed
        \/ SaveUnknown \/ RetryKnownFailure \/ PlaybackStarts \/ AutoplayDenied \/ PressVisiblePlay
        \/ LeaveDetail \/ AccountChanges \/ Wait
TypeOK == /\ phase \in Phases /\ site \in BOOLEAN /\ selected \in BOOLEAN /\ stored \in BOOLEAN
          /\ save \in {"idle", "pending", "confirmed", "failed", "unknown"}
          /\ current \in BOOLEAN /\ srcLoaded \in BOOLEAN
PlaybackNeedsSavedCopy == srcLoaded => selected /\ stored /\ phase \in {"starting", "playing", "manual"}
BrowseHasNoMediaEffects == phase \in {"gallery", "closed"} => ~selected /\ ~srcLoaded
UnknownNotRetried == save = "unknown" => phase # "saving"
SaveRequiresSite == save = "pending" /\ current => site
SelectionGuard == current => selected /\ phase \notin {"gallery", "closed"}
ManualPlayVisible == phase = "manual" => srcLoaded /\ stored
DisconnectedClearsPrivateState == phase = "closed" => ~site /\ ~selected /\ ~stored /\ ~current /\ ~srcLoaded
StaleSavePreservesView == [][save = "pending" /\ ~current /\ save' = "confirmed" => UNCHANGED <<phase, stored, srcLoaded>>]_vars
====
