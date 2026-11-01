---- MODULE Clips ----
EXTENDS Naturals
VARIABLES phase, connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified
vars == <<phase, connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
Phases == {"connection", "loading", "list", "empty", "loadError", "details", "preview", "playing", "downloading", "saved", "refused", "unknown"}
Init == /\ phase = "connection" /\ connected = FALSE /\ selected = FALSE
        /\ mediaVerified = FALSE /\ playRequested = FALSE
        /\ downloadRequested = FALSE /\ fileVerified = FALSE
ConnectionVerified == /\ phase = "connection" /\ phase' = "loading" /\ connected' = TRUE
                      /\ UNCHANGED <<selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
ClipsFound == /\ phase = "loading" /\ phase' = "list"
              /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
NoClipsFound == /\ phase = "loading" /\ phase' = "empty"
                /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
LookupFailed == /\ phase = "loading" /\ phase' = "loadError"
                /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
RetryLookup == /\ phase \in {"empty", "loadError"} /\ phase' = "loading"
               /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
SelectClip == /\ phase = "list" /\ phase' = "details" /\ selected' = TRUE
              /\ UNCHANGED <<connected, mediaVerified, playRequested, downloadRequested, fileVerified>>
LoadVerifiedPreview == /\ phase = "details" /\ connected /\ selected
                       /\ phase' = "preview" /\ mediaVerified' = TRUE
                       /\ UNCHANGED <<connected, selected, playRequested, downloadRequested, fileVerified>>
PreviewUnavailable == /\ phase = "details" /\ UNCHANGED vars
PressPlay == /\ phase = "preview" /\ mediaVerified /\ connected /\ selected
             /\ phase' = "playing" /\ playRequested' = TRUE
             /\ UNCHANGED <<connected, selected, mediaVerified, downloadRequested, fileVerified>>
PausePlayback == /\ phase = "playing" /\ phase' = "preview" /\ playRequested' = FALSE
                 /\ UNCHANGED <<connected, selected, mediaVerified, downloadRequested, fileVerified>>
ClosePreview == /\ phase = "preview" /\ phase' = "details" /\ mediaVerified' = FALSE
                /\ UNCHANGED <<connected, selected, playRequested, downloadRequested, fileVerified>>
PressDownload == /\ phase = "details" /\ connected /\ selected
                 /\ phase' = "downloading" /\ downloadRequested' = TRUE
                 /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, fileVerified>>
DownloadVerified == /\ phase = "downloading" /\ phase' = "saved" /\ fileVerified' = TRUE
                    /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested>>
DownloadRefused == /\ phase = "downloading" /\ phase' = "refused"
                   /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
DownloadOutcomeUnknown == /\ phase = "downloading" /\ phase' = "unknown"
                          /\ UNCHANGED <<connected, selected, mediaVerified, playRequested, downloadRequested, fileVerified>>
ReviewDownloadResult == /\ phase \in {"saved", "refused", "unknown"}
                        /\ phase' = "details" /\ downloadRequested' = FALSE /\ fileVerified' = FALSE
                        /\ UNCHANGED <<connected, selected, mediaVerified, playRequested>>
BackToClips == /\ phase = "details" /\ phase' = "list" /\ selected' = FALSE
               /\ UNCHANGED <<connected, mediaVerified, playRequested, downloadRequested, fileVerified>>
AccountChanged == /\ phase # "connection" /\ phase' = "connection" /\ connected' = FALSE
                  /\ selected' = FALSE /\ mediaVerified' = FALSE /\ playRequested' = FALSE
                  /\ downloadRequested' = FALSE /\ fileVerified' = FALSE
WaitForUser == /\ phase \in Phases \ {"loading", "downloading"} /\ UNCHANGED vars
Next == ConnectionVerified \/ ClipsFound \/ NoClipsFound \/ LookupFailed \/ RetryLookup
        \/ SelectClip \/ LoadVerifiedPreview \/ PreviewUnavailable \/ PressPlay \/ PausePlayback
        \/ ClosePreview \/ PressDownload \/ DownloadVerified \/ DownloadRefused
        \/ DownloadOutcomeUnknown \/ ReviewDownloadResult \/ BackToClips \/ AccountChanged \/ WaitForUser
TypeOK == /\ phase \in Phases /\ connected \in BOOLEAN /\ selected \in BOOLEAN
          /\ mediaVerified \in BOOLEAN /\ playRequested \in BOOLEAN
          /\ downloadRequested \in BOOLEAN /\ fileVerified \in BOOLEAN
PlaybackNeedsVerifiedMedia == phase = "playing" => connected /\ selected /\ mediaVerified /\ playRequested
DownloadNeedsExplicitRequest == phase \in {"downloading", "saved", "refused", "unknown"} => downloadRequested
BrowseHasNoMediaEffects == phase \in {"connection", "loading", "list", "empty", "loadError"} =>
                          ~selected /\ ~mediaVerified /\ ~playRequested /\ ~downloadRequested /\ ~fileVerified
DisconnectedClearsPrivateState == ~connected => ~selected /\ ~mediaVerified /\ ~playRequested /\ ~fileVerified
SavedRequiresVerifiedFile == phase = "saved" => connected /\ selected /\ fileVerified
UncertainIsNotSuccess == phase \in {"refused", "unknown"} => ~fileVerified
====
