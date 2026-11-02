# Primary navigation statechart review

This review covers the five proposed UX models linked from [the overview](../statechart/primary-navigation/README.md). It extends [issue #81](https://github.com/prime-optimal/stream-machine-plugin/issues/81) and draft PR #82. No product code or live configuration changed.

## Scope and ownership

Five subagents owned separate directories: Home, Assets, Clips, Stream Deck, and Connections. They built models in scratch folders, checked them, then copied their artifacts into `docs/statechart/primary-navigation/`. The coordinator reviewed every model and README, assembled the overview, and linked it from the UX plan.

The task worktree was clean before dispatch. It was fast-forwarded from `a0148ec` to the existing remote vocabulary update `f8f749d`. That update was preserved. Agents did not stage or commit files, and no ownership overlap occurred.

## Required review questions

1. Can the code be simplified? Product code is unchanged. The models use small finite state sets and one selected task, asset, clip, device, or provider. Each chart stays at 20 arrows or fewer. Provider protocols and library internals remain outside these broad UX models.
2. Can the documentation be clarified? The overview distinguishes independent proposal checks from implementation proof. Each README names assumptions, hidden transitions, and exclusions. Review added connection guards to the Assets arrows because the draft state combines connected and disconnected cases.
3. Does this change need statecharts? Yes; statecharts are the requested deliverable. All five primary navigation sections now have checked models and generated Mermaid. Connections links to the existing detailed onboarding model rather than duplicating stale-result handling.

## Review findings

| Location | Finding and resolution |
| --- | --- |
| [Assets view labels](../statechart/primary-navigation/assets/view.mjs) | Generate and setup arrows now state connection-ready and connection-needed guards. Regenerated output still has 21 model states and 20 arrows. |
| [Clips scope](../statechart/primary-navigation/clips/README.md) | Ten account-reset arrows are hidden for readability. They remain checked in the model; the diagram retains the reset from Playing clip. The omission is explicit in both README and overview. |
| [Stream Deck limits](../statechart/primary-navigation/streamdeck/README.md) | Stored configuration, user-confirmed physical press, and successful release remain distinct. Release failures, expiry, and real device ownership need later implementation tests. |
| [Connections limits](../statechart/primary-navigation/connections/README.md) | Saved credentials and authorization return cannot establish readiness. Provider-specific details and stale callbacks remain outside the broad model. |
| [Home handoff](../statechart/primary-navigation/home/README.md) | Navigation preserves selection without claiming task completion or connection readiness. Deep links and storage are explicitly excluded. |

No invariant violation was found. These models specify intended behavior, so no production bug or live reproduction is claimed. Independent model checks do not prove end-to-end composition across sections.

## Commands and results

Every model was checked in scratch space and reproduced against its final worktree sources. Each command used the installed statechart runner through `mise exec -- bun`; exact commands are in the section READMEs.

| Model | Model states | Steps | Invariants | Deadlock check | Exit |
| --- | --- | --- | --- | --- | --- |
| Home | 47 | 272 | 5 pass | Pass | 0 |
| Assets | 21 | 56 | 6 pass | Pass | 0 |
| Clips | 12 | 41 | 7 pass | Pass | 0 |
| Stream Deck | 28 | 96 | 9 pass | Pass | 0 |
| Connections | 64 | 112 | 6 pass | Pass | 0 |

The invariant counts include each model's type rule. All graphs are below the 500-state chart limit. Generated reports and TLC logs are retained beside the sources.

A Bun consistency check compared each generated chart with its README and the overview, then resolved local README/report links. All five passed with exit 0. `mise run hooks:check` passed with exit 0 after the model files and overview were added. Staged-secret and commit hooks run again before the commit.

No ChatGPT host, media player, OAuth flow, OBS setup, or Stream Deck action was exercised. Screenshots are not applicable to this documentation-only change. Mermaid is embedded in Markdown for review; no raster rendering is claimed.

## Handoff boundaries

The task stays on the existing issue branch. The issue and board remain open and In Progress while PR #82 awaits merge. Publication and final push results are recorded in a new issue comment.

Existing worktrees, running plugin/demo processes, and the ignored prior Oracle export remain owned by their original sessions. No cleanup or process stop is part of this task. The earlier [planning review](81-plugin-ux-plan.md#retained-work) records their paths and ownership; the final issue comment records any change in that snapshot.
