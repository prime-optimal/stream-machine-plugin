------------------------------ MODULE Publish ------------------------------
EXTENDS Naturals
CONSTANT MaxRuns
VARIABLES phase, runs, gates, tag, draft, published, assets, releases, writeLog
vars == <<phase, runs, gates, tag, draft, published, assets, releases, writeLog>>

AllGates == {"head", "checks", "draft", "tag", "clean", "package"}

Init == /\ phase = "Idle" /\ runs = 0 /\ gates = {}
        /\ tag \in {"none", "other"}
        /\ draft = FALSE /\ published = FALSE /\ assets = FALSE
        /\ releases = 0 /\ writeLog = {}

\* Plan job: release:publish --dry-run. A draft counts as not published.
PlanStops == /\ phase = "Idle" /\ runs < MaxRuns /\ published
             /\ phase' = "Stopped" /\ runs' = runs + 1
             /\ UNCHANGED <<gates, tag, draft, published, assets, releases, writeLog>>
PlanFindsWork == /\ phase = "Idle" /\ runs < MaxRuns /\ ~published
                 /\ phase' = "Planned" /\ runs' = runs + 1 /\ gates' = {}
                 /\ UNCHANGED <<tag, draft, published, assets, releases, writeLog>>

\* Publish job: verify the checkout, then the five mise steps.
VerifyHeadPasses == /\ phase = "Planned" /\ phase' = "HeadOk" /\ gates' = gates \union {"head"}
                    /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
RefuseHead == /\ phase = "Planned" /\ phase' = "Refused"
              /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>
ChecksPass == /\ phase = "HeadOk" /\ phase' = "ChecksPassed" /\ gates' = gates \union {"checks"}
              /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
ChecksFail == /\ phase = "HeadOk" /\ phase' = "ChecksFailed"
              /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>

\* Guards in scripts/release-publish.ts, in source order.
DraftGuardPasses == /\ phase = "ChecksPassed" /\ ~draft
                    /\ phase' = "NoDraft" /\ gates' = gates \union {"draft"}
                    /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
RefuseDraft == /\ phase = "ChecksPassed" /\ draft /\ phase' = "Refused"
               /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>
TagGuardPasses == /\ phase = "NoDraft" /\ tag # "other"
                  /\ phase' = "TagOk" /\ gates' = gates \union {"tag"}
                  /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
RefuseTag == /\ phase = "NoDraft" /\ tag = "other" /\ phase' = "Refused"
             /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>
CleanGuardPasses == /\ phase = "TagOk" /\ phase' = "Clean" /\ gates' = gates \union {"clean"}
                    /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
RefuseDirty == /\ phase = "TagOk" /\ phase' = "Refused"
               /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>
PackageGuardPasses == /\ phase = "Clean" /\ phase' = "Ready" /\ gates' = gates \union {"package"}
                      /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>
RefuseMissing == /\ phase = "Clean" /\ phase' = "Refused"
                 /\ UNCHANGED <<runs, gates, tag, draft, published, assets, releases, writeLog>>

\* gh release create. Success publishes the tag at the release commit with both assets.
\* A failed upload leaves a draft and creates no tag.
CreateSucceeds == /\ phase = "Ready" /\ phase' = "Published"
                  /\ published' = TRUE /\ assets' = TRUE /\ tag' = "release"
                  /\ releases' = releases + 1
                  /\ writeLog' = writeLog \union {[gates |-> gates, draft |-> draft,
                                                   published |-> published, tag |-> tag]}
                  /\ UNCHANGED <<runs, gates, draft>>
UploadFails == /\ phase = "Ready" /\ phase' = "UploadFailed" /\ draft' = TRUE
               /\ writeLog' = writeLog \union {[gates |-> gates, draft |-> draft,
                                                published |-> published, tag |-> tag]}
               /\ UNCHANGED <<runs, gates, tag, published, assets, releases>>

RunEnds == /\ phase \in {"Stopped", "Refused", "ChecksFailed", "UploadFailed", "Published"}
           /\ phase' = "Idle" /\ gates' = {}
           /\ UNCHANGED <<runs, tag, draft, published, assets, releases, writeLog>>

\* Human actions, only between runs.
HumanDeletesDraft == /\ phase = "Idle" /\ draft /\ draft' = FALSE
                     /\ UNCHANGED <<phase, runs, gates, tag, published, assets, releases, writeLog>>
HumanFixesTag == /\ phase = "Idle" /\ tag = "other" /\ tag' = "none"
                 /\ UNCHANGED <<phase, runs, gates, draft, published, assets, releases, writeLog>>

Done == /\ phase = "Idle" /\ runs = MaxRuns /\ UNCHANGED vars

Next == PlanStops \/ PlanFindsWork \/ VerifyHeadPasses \/ RefuseHead
        \/ ChecksPass \/ ChecksFail
        \/ DraftGuardPasses \/ RefuseDraft \/ TagGuardPasses \/ RefuseTag
        \/ CleanGuardPasses \/ RefuseDirty \/ PackageGuardPasses \/ RefuseMissing
        \/ CreateSucceeds \/ UploadFails \/ RunEnds
        \/ HumanDeletesDraft \/ HumanFixesTag \/ Done

TagAtReleaseCommit == published => tag = "release"
OneReleasePerVersion == releases <= 1
NoWriteUnlessGuarded == \A w \in writeLog :
    /\ w.gates = AllGates /\ ~w.draft /\ w.tag # "other"
NeverRepublished == \A w \in writeLog : ~w.published
PublishedHasAssets == published => assets
=============================================================================
