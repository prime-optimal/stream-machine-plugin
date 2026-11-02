# Update

TLC reached 13 states and 17 steps. The chart draws 11 states and 11 arrows.
The chart does not draw 4 steps that stay in one chart state.

## Rules that hold

VerifiedMeansSaved, ReloadRequiresReadback, RunningRequiresHost, UnknownIsUnverified, NoDeadlock

## Scope and evidence

This model checks the guided procedure, not an implemented automatic installer. `src/update/register.ts` exposes check and preparation tools. `skills/self-update/SKILL.md` owns Creator submission, uncertain outcomes, read-back verification, and host reload guidance.

The rules mean that a verified release was saved, reload pending requires successful read-back, and only a fresh host observation confirms the running target. A lost Creator response remains unverified whether the save happened or not. No invariant violations were found, so there are no bug paths to replay. This result does not prove GitHub, Plugin Creator, or host reload behavior.

The model omits network timing, authentication, archive internals, version arithmetic, concurrent publishers, and source compatibility. It assumes package checks and Creator identity checks passed before submission. Four terminal self-loops are hidden by the generated chart. Both possible outcomes of a lost response share the same visible unknown state.

Initial check exited 2 because the scratch model used an unassigned Boolean in `Init`. Explicit Boolean assignments corrected the model. The final check exited 0 with 13 states and 17 steps. `tlc.out` contains the final TLC output.

## Regenerate

Run from the repository with a new output directory:

```sh
mise exec -- bun .agents/skills/statechart/scripts/statechart.ts docs/statechart/109-guided-update/Update.tla --config docs/statechart/109-guided-update/Update.cfg --view docs/statechart/109-guided-update/view.mjs --out /private/tmp/update-109-model-new
```

The checked Mermaid source is [chart.mmd](chart.mmd); the model and presentation are [Update.tla](Update.tla), [Update.cfg](Update.cfg), and [view.mjs](view.mjs).
