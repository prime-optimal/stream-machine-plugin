---- MODULE Home ----
EXTENDS Naturals
VARIABLES phase, selection, origin, handoff, liveActions, taskCompleted
vars == <<phase, selection, origin, handoff, liveActions, taskCompleted>>
Targets == {"assets", "clips", "streamdeck"}
Init == /\ phase = "opening" /\ selection = "none" /\ origin = "none"
        /\ handoff = "none" /\ liveActions = 0 /\ taskCompleted = FALSE
ShowHome == /\ phase = "opening" /\ phase' = "home"
            /\ UNCHANGED <<selection, origin, handoff, liveActions, taskCompleted>>
ChooseTask == /\ phase = "home" /\ selection' \in Targets /\ origin' = "task"
              /\ phase' = "selected" /\ handoff' = "none"
              /\ UNCHANGED <<liveActions, taskCompleted>>
ChooseRecipe == /\ phase = "home" /\ selection' \in Targets /\ origin' = "recipe"
                /\ phase' = "selected" /\ handoff' = "none"
                /\ UNCHANGED <<liveActions, taskCompleted>>
ChooseRecent == /\ phase = "home" /\ selection' \in Targets /\ origin' = "recent"
                /\ phase' = "selected" /\ handoff' = "none"
                /\ UNCHANGED <<liveActions, taskCompleted>>
OpenWorkspace == /\ phase = "selected" /\ phase' = "workspace"
                 /\ handoff' = selection
                 /\ UNCHANGED <<selection, origin, liveActions, taskCompleted>>
OpenConnections == /\ phase = "selected" /\ phase' = "connections"
                   /\ handoff' = selection
                   /\ UNCHANGED <<selection, origin, liveActions, taskCompleted>>
ReturnToTask == /\ phase = "connections" /\ phase' = "workspace"
                /\ UNCHANGED <<selection, origin, handoff, liveActions, taskCompleted>>
ReturnHome == /\ phase \in {"selected", "connections", "workspace"}
              /\ phase' = "home"
              /\ UNCHANGED <<selection, origin, handoff, liveActions, taskCompleted>>
WaitForUser == /\ phase \in {"home", "selected", "connections", "workspace"}
               /\ UNCHANGED vars
Next == ShowHome \/ ChooseTask \/ ChooseRecipe \/ ChooseRecent \/ OpenWorkspace
        \/ OpenConnections \/ ReturnToTask \/ ReturnHome \/ WaitForUser
TypeOK == /\ phase \in {"opening", "home", "selected", "workspace", "connections"}
          /\ selection \in Targets \cup {"none"}
          /\ origin \in {"none", "task", "recipe", "recent"}
          /\ handoff \in Targets \cup {"none"}
          /\ liveActions \in Nat /\ taskCompleted \in BOOLEAN
ExplicitSelection == phase \in {"selected", "workspace", "connections"} =>
                     selection \in Targets /\ origin # "none"
HandoffPreservesTask == phase \in {"workspace", "connections"} => handoff = selection
NavigationDoesNotAct == liveActions = 0
NavigationDoesNotClaimCompletion == ~taskCompleted
====
