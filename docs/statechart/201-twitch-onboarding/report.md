# Twitch onboarding state review

This model checks the proposed onboarding flow for issue [#201](https://github.com/prime-optimal/stream-machine-plugin/issues/201). It does not verify the current plugin implementation.

## Result

TLC checked 215 distinct states and 749 transitions with one worker. All eight invariants and the deadlock check passed. The command exited 0. No counterexample was found.

The [raw check report](check-report.md), [TLC output](tlc-output.txt), [model](Onboarding.tla), [configuration](Onboarding.cfg), and [chart view](view.mjs) preserve the evidence.

## Checked rules

| Rule | Meaning |
| --- | --- |
| TypeOK | Every value belongs to the modeled domain. |
| RequestBudget | One enrichment generation attempts at most five Twitch requests. |
| CountBeforeDispatch | Every in-flight request has already consumed its slot. |
| SeedOnce | One generation creates at most one initial brand draft. |
| HomeHasDraft | Ready and partial Home states have a draft, including an unsaved draft. |
| NoStaleMedia | Disconnect, account switch, and lost authorization clear visible media before an old reply arrives. |
| UserEditsSurvive | Once the user saves a field, evidence merges and late save completions preserve that field. |
| ConnectionBeforeEnrichment | Collection starts only after account verification and initial draft creation. |
| NoDeadlock | Each state has a next action or an explicit wait for user action. |

## Flow

```mermaid
---
title: "Proposed Twitch onboarding"
---
stateDiagram-v2
  state "Legend" as legend {
    lg0: connection
    lg1: home
    lg2: setup
  }
  class lg0 orange
  class lg1 teal
  class lg2 blue
  s0: Connect Twitch
  s1: Waiting for consent
  s2: Connection required
  s3: Account verified
  s4: Collecting channel media
  s5: Reconnect#59; old reply pending
  s6: Partial home#59; brand draft unsaved
  s7: Home with partial data
  s8: Partial home with your edits
  s9: Home#59; brand draft unsaved
  s10: Personalized home
  s11: Home with your edits
  [*] --> s0
  s0 --> s1: you connect Twitch
  s1 --> s2: consent fails or is canceled
  s1 --> s3: the server verifies the account
  s3 --> s2: you disconnect, switch accounts, or consent expires
  s3 --> s4: the server creates the first DESIGN draft
  s4 --> s2: you disconnect, switch accounts, or consent expires
  s4 --> s5: you disconnect, switch accounts, or consent expires
  s4 --> s6: collection stops early or the five-request pass ends
  s5 --> s2: the server discards the old reply
  s4 --> s7: collection stops early or the five-request pass ends
  s6 --> s2: you disconnect, switch accounts, or consent expires
  s6 --> s7: the brand draft saves
  s6 --> s8: you save a brand edit
  s7 --> s8: you save a brand edit
  s7 --> s2: you disconnect, switch accounts, or consent expires
  s8 --> s2: you disconnect, switch accounts, or consent expires
  s4 --> s9: the five-request pass ends
  s4 --> s10: the five-request pass ends
  s9 --> s2: you disconnect, switch accounts, or consent expires
  s9 --> s10: the brand draft saves
  s9 --> s11: you save a brand edit
  s10 --> s11: you save a brand edit
  s10 --> s2: you disconnect, switch accounts, or consent expires
  s11 --> s2: you disconnect, switch accounts, or consent expires
  class s0 blue
  class s1 blue
  class s2 orange
  class s3 blue
  class s4 blue
  class s5 orange
  class s6 teal
  class s7 teal
  class s8 teal
  class s9 teal
  class s10 teal
  class s11 teal
```

The chart is the generated output, without manual changes. It shows 12 states and 24 arrows. It omits 465 transitions whose source and destination share one chart label. These include request dispatch and completion while collecting, repeated opens, retrying a draft save, and evidence merges. The model still checks these transitions.

## Failure and reuse behavior

A failure or timeout consumes the reservation made before dispatch. The pass can stop early and show partial Home. Reopening the same generation changes no state and cannot reset its budget.

Draft creation and persistence are separate. A failed save leaves an unsaved draft visible on Home. Retrying that save changes only its persistence state. It does not create another draft or spend another Twitch request. A successful user edit also saves the draft.

Invalidation clears displayed media immediately. An in-flight reply can then complete only through IgnoreLateReply, which changes no draft, request count, or media. The stored draft remains associated with the old generation. The model does not display it as the new account's draft.

## Model limits

The model represents one verified account generation and one in-flight request at a time. It treats disconnect, account switch, and revoked consent as equivalent invalidation. Connection required is the boundary where a new authenticated generation starts in the product. It does not reset and explore that next generation.

Server authentication, account-keyed storage, and atomic reservation of request slots are assumptions. Multi-worker contention, duplicate callbacks, network cancellation, cache reuse across processes, and database compare-and-swap require implementation tests. No fairness condition proves that a stalled provider eventually responds.

SeedOnce applies within this generation. Reusing an existing account's draft across a later connection is an implementation acceptance test. One symbolic field represents a user-approved value. Revision conflicts, field provenance, suggestion acceptance, retention, deletion, and OpenDesign synchronization are outside this model.

The model excludes creative generation, transcription, clip downloads, OBS changes, and Stream Deck changes. No onboarding transition starts those actions. This exclusion is a proposed boundary, not evidence about their current implementations.

## Reproduce

From the task worktree, run the following command with a new output directory:

```sh
mise exec -- bun .agents/skills/statechart/scripts/statechart.ts \
	docs/statechart/201-twitch-onboarding/Onboarding.tla \
	--config docs/statechart/201-twitch-onboarding/Onboarding.cfg \
	--view docs/statechart/201-twitch-onboarding/view.mjs \
	--out /tmp/stream-machine-201-onboarding-recheck
```

Expected result: exit 0, 215 states, 749 transitions, and no violated rules. The recorded run used Bun 1.4.4 and TLC 2.19. The runner selected its own Java runtime, shown in tlc-output.txt, preserved from the generated tlc.out.
