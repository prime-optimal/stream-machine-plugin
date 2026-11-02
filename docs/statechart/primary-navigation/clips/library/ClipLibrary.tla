---- MODULE ClipLibrary ----
EXTENDS Naturals
VARIABLES phase, connected, site, hasMore, selected, stored, srcLoaded, zip
vars == <<phase, connected, site, hasMore, selected, stored, srcLoaded, zip>>
Phases == {"connection", "loading", "empty", "loadError", "gallery", "loadingMore", "moreError", "details", "playing"}
Init == /\ phase = "connection" /\ connected = FALSE /\ site = FALSE /\ hasMore = FALSE
        /\ selected = FALSE /\ stored = FALSE /\ srcLoaded = FALSE /\ zip = "idle"
OpenClips == /\ phase = "connection" /\ phase' = "loading" /\ connected' = TRUE
             /\ UNCHANGED <<site, hasMore, selected, stored, srcLoaded, zip>>
LibraryLoaded == /\ phase = "loading" /\ phase' = "gallery" /\ site' \in BOOLEAN /\ hasMore' \in BOOLEAN
                 /\ UNCHANGED <<connected, selected, stored, srcLoaded, zip>>
LibraryEmpty == /\ phase = "loading" /\ phase' = "empty" /\ site' \in BOOLEAN /\ hasMore' = FALSE
                /\ UNCHANGED <<connected, selected, stored, srcLoaded, zip>>
LibraryFailed == /\ phase = "loading" /\ phase' = "loadError"
                 /\ UNCHANGED <<connected, site, hasMore, selected, stored, srcLoaded, zip>>
RetryLibrary == /\ phase \in {"empty", "loadError"} /\ phase' = "loading"
                /\ UNCHANGED <<connected, site, hasMore, selected, stored, srcLoaded, zip>>
PressLoadMore == /\ phase \in {"gallery", "moreError"} /\ hasMore /\ phase' = "loadingMore"
                 /\ UNCHANGED <<connected, site, hasMore, selected, stored, srcLoaded, zip>>
MoreLoaded == /\ phase = "loadingMore" /\ phase' = "gallery" /\ hasMore' \in BOOLEAN
              /\ UNCHANGED <<connected, site, selected, stored, srcLoaded, zip>>
MoreFailed == /\ phase = "loadingMore" /\ phase' = "moreError"
              /\ UNCHANGED <<connected, site, hasMore, selected, stored, srcLoaded, zip>>
SelectClip == /\ phase = "gallery" /\ phase' = "details" /\ selected' = TRUE /\ stored' \in BOOLEAN
              /\ UNCHANGED <<connected, site, hasMore, srcLoaded, zip>>
PressPlay == /\ phase = "details" /\ stored /\ phase' = "playing" /\ srcLoaded' = TRUE
             /\ UNCHANGED <<connected, site, hasMore, selected, stored, zip>>
BackToClips == /\ phase \in {"details", "playing"} /\ phase' = "gallery" /\ selected' = FALSE
               /\ stored' = FALSE /\ srcLoaded' = FALSE
               /\ UNCHANGED <<connected, site, hasMore, zip>>
RequestZip == /\ phase \in {"gallery", "details", "playing", "moreError"} /\ site /\ zip \in {"idle", "ready", "failed"}
              /\ zip' = "working" /\ UNCHANGED <<phase, connected, site, hasMore, selected, stored, srcLoaded>>
ZipReady == /\ zip = "working" /\ zip' = "ready" /\ UNCHANGED <<phase, connected, site, hasMore, selected, stored, srcLoaded>>
ZipFailed == /\ zip = "working" /\ zip' = "failed" /\ UNCHANGED <<phase, connected, site, hasMore, selected, stored, srcLoaded>>
AccountChanged == /\ phase # "connection" /\ phase' = "connection" /\ connected' = FALSE /\ site' = FALSE
                  /\ hasMore' = FALSE /\ selected' = FALSE /\ stored' = FALSE /\ srcLoaded' = FALSE /\ zip' = "idle"
WaitForUser == /\ phase \notin {"loading", "loadingMore"} /\ zip # "working" /\ UNCHANGED vars
Next == OpenClips \/ LibraryLoaded \/ LibraryEmpty \/ LibraryFailed \/ RetryLibrary \/ PressLoadMore
        \/ MoreLoaded \/ MoreFailed \/ SelectClip \/ PressPlay \/ BackToClips
        \/ RequestZip \/ ZipReady \/ ZipFailed \/ AccountChanged \/ WaitForUser
TypeOK == /\ phase \in Phases /\ connected \in BOOLEAN /\ site \in BOOLEAN /\ hasMore \in BOOLEAN
          /\ selected \in BOOLEAN /\ stored \in BOOLEAN /\ srcLoaded \in BOOLEAN /\ zip \in {"idle", "working", "ready", "failed"}
PlaybackNeedsSavedCopy == phase = "playing" => connected /\ selected /\ stored /\ srcLoaded
VideoLoadsOnlyWhilePlaying == srcLoaded => phase = "playing"
BrowseHasNoMediaEffects == phase \in {"connection", "loading", "empty", "loadError", "gallery", "loadingMore", "moreError"} =>
                          ~selected /\ ~srcLoaded
ZipNeedsSiteLibrary == zip # "idle" => site
LoadMoreNeedsNextPage == phase = "loadingMore" => hasMore
DisconnectedClearsPrivateState == ~connected => ~selected /\ ~srcLoaded /\ zip = "idle" /\ ~site
====
