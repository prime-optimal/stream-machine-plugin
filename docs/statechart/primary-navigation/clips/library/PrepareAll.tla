---- MODULE PrepareAll ----
EXTENDS Naturals
CONSTANTS MaxClips, MaxPages
VARIABLES phase, pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown
vars == <<phase, pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
Init == /\ phase = "idle" /\ pages = 0 /\ queued = 0 /\ remaining = 0
        /\ active = FALSE /\ confirmed = FALSE /\ cancelled = FALSE
        /\ dispatched = 0 /\ completed = 0 /\ unknown = FALSE
PrepareAll == /\ phase = "idle" /\ phase' = "discovering"
              /\ UNCHANGED <<pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
ReadPage == /\ phase = "discovering" /\ pages < MaxPages /\ queued < MaxClips
            /\ pages' = pages + 1
            /\ queued' \in {queued, queued + 1, MaxClips}
            /\ UNCHANGED <<phase, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
FinishDiscovery == /\ phase = "discovering" /\ pages > 0 /\ phase' = "confirmation"
                   /\ UNCHANGED <<pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
DiscoveryFails == /\ phase = "discovering" /\ phase' = "failed"
                  /\ UNCHANGED <<pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
Confirm == /\ phase = "confirmation" /\ queued > 0 /\ phase' = "preparing"
           /\ confirmed' = TRUE /\ remaining' = queued
           /\ UNCHANGED <<pages, queued, active, cancelled, dispatched, completed, unknown>>
Dispatch == /\ phase = "preparing" /\ ~active /\ ~cancelled /\ remaining > 0
            /\ active' = TRUE /\ remaining' = remaining - 1 /\ dispatched' = dispatched + 1
            /\ UNCHANGED <<phase, pages, queued, confirmed, cancelled, completed, unknown>>
Settle == /\ active /\ active' = FALSE /\ completed' = completed + 1
          /\ unknown' \in {unknown, TRUE}
          /\ UNCHANGED <<phase, pages, queued, remaining, confirmed, cancelled, dispatched>>
Cancel == /\ phase \in {"discovering", "confirmation", "preparing"} /\ ~cancelled
          /\ cancelled' = TRUE /\ remaining' = 0 /\ phase' = "cancelled"
          /\ UNCHANGED <<pages, queued, active, confirmed, dispatched, completed, unknown>>
Finish == /\ phase = "preparing" /\ ~active /\ remaining = 0 /\ phase' = "done"
          /\ UNCHANGED <<pages, queued, remaining, active, confirmed, cancelled, dispatched, completed, unknown>>
UnknownRetryBlocked == /\ unknown /\ UNCHANGED vars
Wait == /\ phase \in {"idle", "confirmation", "done", "failed", "cancelled"} /\ ~active /\ UNCHANGED vars
Next == PrepareAll \/ ReadPage \/ FinishDiscovery \/ DiscoveryFails \/ Confirm \/ Dispatch
        \/ Settle \/ Cancel \/ Finish \/ UnknownRetryBlocked \/ Wait
TypeOK == /\ phase \in {"idle", "discovering", "confirmation", "preparing", "done", "failed", "cancelled"}
          /\ pages \in 0..MaxPages /\ queued \in 0..MaxClips /\ remaining \in 0..MaxClips
          /\ active \in BOOLEAN /\ confirmed \in BOOLEAN /\ cancelled \in BOOLEAN
          /\ dispatched \in 0..MaxClips /\ completed \in 0..MaxClips /\ unknown \in BOOLEAN
DiscoveryBound == pages <= MaxPages
QueueBound == queued <= MaxClips /\ dispatched <= queued
ConsentBeforeWrites == dispatched > 0 => confirmed
SerialWrites == dispatched - completed = IF active THEN 1 ELSE 0
CancelDropsQueue == cancelled => remaining = 0
UnknownRequiresSettledRequest == unknown => completed > 0
NoWritesDuringDiscovery == phase \in {"idle", "discovering", "confirmation", "failed"} => dispatched = 0
CancelStopsFutureDispatch == [][cancelled => dispatched' = dispatched]_vars
====
