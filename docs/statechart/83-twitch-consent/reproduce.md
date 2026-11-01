# Reproduce the Twitch product-consent check

Use the installed `statechart` skill. The command below uses the skill path supplied for this checkout. Change `skill` if the skill is installed elsewhere.

From the issue worktree, run:

```sh
skill=/Users/prime/Documents/ChatGPT/stream-machine-plugin/.agents/skills/statechart
scratch=$(mktemp -d /tmp/stream-machine-83-consent.XXXXXX)
cp docs/statechart/83-twitch-consent/Consent.tla "$scratch/Consent.tla"
cp docs/statechart/83-twitch-consent/Consent.cfg "$scratch/Consent.cfg"
cp docs/statechart/83-twitch-consent/view.js "$scratch/view.js"
"$skill/scripts/statechart" "$scratch/Consent.tla" \
  --config "$scratch/Consent.cfg" \
  --view "$scratch/view.js" \
  --out "$scratch/checked"
```

Expected result: exit 0, 77 reachable states, 127 steps, and every listed invariant plus `NoDeadlock` holds. The output folder contains `report.md`, `chart.mmd`, and `tlc.out`. The chart has 10 visible states and 11 arrows. No OAuth, provider calls, or credentials are needed.

## Recorded run

On November 1, 2026, the skill command checked `/tmp/stream-machine-83-consent-12/Consent.tla` with `Consent.cfg`, `view.js`, and output `/tmp/stream-machine-83-consent-12/checked`. Exit code was 0. TLC 2.19 completed the state search with no error. The generated artifacts in this folder come from that run.

This run replaces the earlier two-scope model. It checks the requested 12-scope policy through the `Implemented` and `Future` classes documented in [the model reference](README.md). Those classes bound the state space and do not assert that future endpoints exist.
