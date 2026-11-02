---- MODULE Assets ----
EXTENDS Naturals
VARIABLES phase, connected, requested, artifact, previewed, exported, installed, sends
vars == <<phase, connected, requested, artifact, previewed, exported, installed, sends>>
Init == /\ phase = "browse" /\ connected \in BOOLEAN
        /\ requested = FALSE /\ artifact = FALSE /\ previewed = FALSE
        /\ exported = FALSE /\ installed = FALSE /\ sends = 0
ChooseRecipe == /\ phase = "browse" /\ phase' = "draft"
                /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
OpenExisting == /\ phase = "browse" /\ phase' = "ready" /\ artifact' = TRUE
                /\ UNCHANGED <<connected, requested, previewed, exported, installed, sends>>
OpenSetup == /\ phase = "draft" /\ ~connected /\ phase' = "setup"
             /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
SetupVerified == /\ phase = "setup" /\ phase' = "draft" /\ connected' = TRUE
                 /\ UNCHANGED <<requested, artifact, previewed, exported, installed, sends>>
Generate == /\ phase = "draft" /\ connected /\ sends = 0
            /\ phase' = "running" /\ requested' = TRUE /\ sends' = 1
            /\ UNCHANGED <<connected, artifact, previewed, exported, installed>>
Completes == /\ phase = "running" /\ phase' = "ready" /\ artifact' = TRUE
             /\ UNCHANGED <<connected, requested, previewed, exported, installed, sends>>
Fails == /\ phase = "running" /\ phase' = "failed"
         /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
ResponseLost == /\ phase = "running" /\ phase' = "unknown"
                /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
CheckOriginal == /\ phase = "unknown" /\ phase' = "checking"
                 /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
FoundRunning == /\ phase = "checking" /\ phase' = "running"
                /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
FoundComplete == /\ phase = "checking" /\ phase' = "ready" /\ artifact' = TRUE
                 /\ UNCHANGED <<connected, requested, previewed, exported, installed, sends>>
FoundFailed == /\ phase = "checking" /\ phase' = "failed"
               /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
CheckUnavailable == /\ phase = "checking" /\ phase' = "unknown"
                    /\ UNCHANGED <<connected, requested, artifact, previewed, exported, installed, sends>>
OpenPreview == /\ phase = "ready" /\ artifact /\ ~previewed
               /\ previewed' = TRUE
               /\ UNCHANGED <<phase, connected, requested, artifact, exported, installed, sends>>
Export == /\ phase = "ready" /\ artifact /\ phase' = "exported" /\ exported' = TRUE
          /\ UNCHANGED <<connected, requested, artifact, previewed, installed, sends>>
Revise == /\ phase \in {"ready", "exported", "failed"} /\ phase' = "draft"
          /\ requested' = FALSE /\ artifact' = FALSE /\ previewed' = FALSE
          /\ exported' = FALSE /\ sends' = 0
          /\ UNCHANGED <<connected, installed>>
Wait == /\ phase \in {"browse", "draft", "setup", "unknown", "ready", "exported", "failed"}
        /\ UNCHANGED vars
Next == ChooseRecipe \/ OpenExisting \/ OpenSetup \/ SetupVerified \/ Generate
        \/ Completes \/ Fails \/ ResponseLost \/ CheckOriginal \/ FoundRunning
        \/ FoundComplete \/ FoundFailed \/ CheckUnavailable \/ OpenPreview \/ Export \/ Revise \/ Wait
TypeOK == /\ phase \in {"browse", "draft", "setup", "running", "unknown", "checking", "ready", "failed", "exported"}
          /\ connected \in BOOLEAN /\ requested \in BOOLEAN /\ artifact \in BOOLEAN
          /\ previewed \in BOOLEAN /\ exported \in BOOLEAN /\ installed \in BOOLEAN
          /\ sends \in {0, 1}
ExplicitGeneration == phase \in {"running", "unknown", "checking", "failed"} => requested /\ sends = 1
OneSubmissionPerDraft == requested => sends = 1
CompleteBeforeUse == (previewed \/ exported \/ phase = "ready") => artifact
UnknownKeepsOriginal == phase \in {"unknown", "checking"} => requested /\ sends = 1 /\ ~artifact
GenerationIsNotInstallation == ~installed
====
