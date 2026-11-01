# Primary navigation statecharts

These five charts describe the proposed [Stream Machine UX](../../plans/plugin-ux-2026-11-01.md). Read each as a broad user journey, not an implementation diagram. Each section links to its checked TLA+ model, rules, limits, and reproduction command.

The models are independent. Their handoffs do not prove that the implementation connects the sections correctly. They check safety within the stated scope, not eventual completion, host compatibility, or live provider behavior. No broken rule was found, so there are no bug paths to replay.

## Check results

| Section | Model states | Steps | Chart arrows | Result |
| --- | --- | --- | --- | --- |
| [Home](home/README.md) | 47 | 272 | 8 | Five invariants and deadlock check pass |
| [Assets](assets/README.md) | 21 | 56 | 20 | Six invariants and deadlock check pass |
| [Clips](clips/README.md) | 12 | 41 | 20 | Seven invariants and deadlock check pass |
| [Stream Deck](streamdeck/README.md) | 28 | 96 | 19 | Nine invariants and deadlock check pass |
| [Connections](connections/README.md) | 64 | 112 | 17 | Six invariants and deadlock check pass |

All five checker commands exited 0. State counts include internal distinctions that the charts combine. Each model is below the skill's 500-state chart limit.

## Home

Choose a task, recipe, or recent item. Hand off its context without running a live action. [Model and limits](home/README.md).

```mermaid
---
title: "Home: choose and resume work"
---
stateDiagram-v2
  s0: Open Stream Machine
  s1: Home: tasks and recent work
  s2: Task, recipe, or recent item selected
  s3: Connections: keep selected task
  s4: Selected workspace
  [*] --> s0
  s0 --> s1: show Home without provider calls
  s1 --> s2: resume recent work or choose a recipe or choose a task
  s2 --> s3: open setup for selected task
  s2 --> s4: open selected workspace
  s2 --> s1: return Home with context saved
  s3 --> s4: return to selected workspace
  s3 --> s1: return Home with context saved
  s4 --> s1: return Home with context saved
```

## Assets

Review a draft, generate once, then inspect or export the completed asset. Recover an uncertain result through the original job. [Model and limits](assets/README.md).

```mermaid
---
title: "Assets: create, inspect, and export"
---
stateDiagram-v2
  s0: Browse assets and recipes
  s1: Review asset draft
  s2: Asset ready
  s3: Asset exported
  s4: Preview open
  s5: Generation running
  s6: Connect design service
  s7: Generation failed
  s8: Outcome unknown
  s9: Check original job
  [*] --> s0
  s0 --> s1: choose a recipe
  s0 --> s2: open a completed asset
  s1 --> s6: set up connection [connection needed]
  s1 --> s5: choose Generate [connection ready]
  s2 --> s1: start a revised draft
  s2 --> s3: choose Export
  s2 --> s4: open safe preview
  s3 --> s1: start a revised draft
  s4 --> s1: start a revised draft
  s4 --> s3: choose Export
  s5 --> s7: generation fails
  s5 --> s2: artifact confirmed
  s5 --> s8: response is lost
  s6 --> s1: connection verified
  s7 --> s1: start a revised draft
  s8 --> s9: check original job
  s9 --> s5: job still running
  s9 --> s7: job failed
  s9 --> s2: artifact confirmed
  s9 --> s8: status unavailable
```

## Clips

Check access, inspect a clip, then explicitly play or download it. Account changes clear private UI state. [Model and limits](clips/README.md).

```mermaid
---
title: "Clips workspace"
---
stateDiagram-v2
  s0: Connect or recheck account
  s1: Load clips
  s2: No clips found
  s3: Browse clips
  s4: Clip lookup failed
  s5: Inspect selected clip
  s6: Download requested
  s7: Preview ready
  s8: Playing clip
  s9: Download refused
  s10: File verified
  s11: Download outcome unknown
  [*] --> s0
  s0 --> s1: account check succeeds
  s1 --> s2: no matching clips
  s1 --> s3: clips found
  s1 --> s4: lookup fails
  s2 --> s1: change lookup and retry
  s3 --> s5: select a clip
  s4 --> s1: change lookup and retry
  s5 --> s3: back to clips
  s5 --> s6: request download
  s5 --> s7: load preview and verify media
  s6 --> s9: request rejected with known reason
  s6 --> s10: completed file verified
  s6 --> s11: acknowledgment lost after dispatch
  s7 --> s5: close preview
  s7 --> s8: press Play
  s8 --> s0: account changes or access expires
  s8 --> s7: pause playback
  s9 --> s5: review result and return
  s10 --> s5: review result and return
  s11 --> s5: review result and return
```

## Stream Deck

Inspect a supported page, review and authorize a draft, then verify or release the device. Stored configuration and physical confirmation remain separate. [Model and limits](streamdeck/README.md).

```mermaid
---
title: "Stream Deck workspace"
---
stateDiagram-v2
  s0: Check devices
  s1: Inspect Stream Machine page
  s2: Device setup or support needed
  s3: Edit layout draft
  s4: Review changes
  s5: Ready to apply
  s6: Apply once
  s7: Apply refused
  s8: Stored configuration verified
  s9: Outcome unknown
  s10: User confirmed button press
  s11: Device released
  [*] --> s0
  s0 --> s1: supported device found
  s0 --> s2: device missing or unsupported
  s1 --> s3: choose a recipe
  s2 --> s0: check devices again
  s3 --> s4: preview changes
  s4 --> s3: edit draft and clear approval
  s4 --> s5: authorize this preview
  s5 --> s3: edit draft and clear approval
  s5 --> s6: press Apply
  s6 --> s7: rejected before USB takeover
  s6 --> s8: stored configuration matches
  s6 --> s9: acknowledgment is lost
  s7 --> s3: revise and preview again
  s8 --> s10: test button and confirm
  s8 --> s11: release device and confirm cleanup
  s9 --> s8: check original attempt and verify stored configuration
  s9 --> s11: release device and confirm cleanup
  s10 --> s11: release device and confirm cleanup
  s11 --> s1: inspect page again
```

## Connections

Set up the selected provider, verify its required capability, and return to the chosen task. Saved credentials alone do not prove access. [Model and limits](connections/README.md).

```mermaid
---
title: "Connections: verify access and resume the task"
---
stateDiagram-v2
  s0: Connections overview
  s1: Provider needs a check
  s2: Check the required capability
  s3: Follow setup or authorization
  s4: Unavailable in this host
  s5: Check failed
  s6: Setup paused
  s7: Connection verified
  s8: Return to the chosen task
  [*] --> s0
  s0 --> s1: choose a provider
  s1 --> s3: open or resume setup
  s1 --> s4: host cannot reach this provider
  s1 --> s2: check connection [saved setup exists]
  s2 --> s5: check fails or access is insufficient
  s2 --> s6: pause setup
  s2 --> s7: authenticated capability read succeeds
  s3 --> s2: save setup or return from authorization
  s3 --> s6: pause setup
  s4 --> s8: return with setup still needed
  s5 --> s3: open or resume setup
  s5 --> s6: pause setup
  s6 --> s3: open or resume setup
  s6 --> s8: return with setup still needed
  s7 --> s1: access expires or is revoked
  s7 --> s2: check connection [saved setup exists]
  s7 --> s8: resume with verified access
```

## What the overview leaves out

Home combines task, recipe, and recent-item choices that lead to the same destination. Assets assumes that Connections verified its dependency and that an existing asset's completed status is known. Clips abstracts media and file checks. Stream Deck treats successful cleanup as one step. Connections abstracts the selected provider and ends when the task takes control.

For readability, the charts omit waiting and other same-state transitions: 46 for Home, 19 for Assets, 11 for Clips, 54 for Stream Deck, and 12 for Connections. Clips also hides ten account-reset arrows while retaining the reset from Playing clip. Every account-reset action remains in its model and clears private UI state. No other inter-state arrows are hidden.

OAuth transport, secret storage, device timing, media codecs, persistence, cross-device access, and multi-instance races need separate implementation tests. The [detailed onboarding model](../plugin-onboarding/README.md) covers canceled checks and stale results. Current provider limits and future capabilities remain documented in the UX plan.

Use each section's reproduction command with a fresh output folder. The runner is an installed local skill, not a bundled runtime dependency.
