# Verify

Decide whether a GitHub issue describes a real bug or a misunderstanding of intended behavior.

**CRITICAL: Always append to `report.md` before finishing.**

**SCOPE: Verify only. Do not fix.**

## Prerequisites

- **`triageDir`**: the directory that holds the reproduction.
- **`issueDetails`**: the GitHub API issue details payload.
- **`report.md`**: the output of earlier steps.

## Step 1: Identify the claim

Extract from the issue:

- **Current behavior**: what the reporter observes.
- **Expected behavior**: what the reporter says should happen.

## Step 2: Research intended behavior

### Check the docs

Read `README.md`, `docs/architecture.md`, and `docs/decisions.md`. Several limits are deliberate:

- OBS and Stream Deck tools need the desktop app. ChatGPT web and mobile report `desktop required`.
- Twitch tools use hosted OAuth by default. They fall back to local OAuth only when the hosted service is unreachable, returns a 5xx, or is unconfigured. A 401, a cancellation, or a denial never falls back.
- Mock data is labeled as mock and kept apart from real provider actions.

### Check the source

Read the relevant code. Look for comments, explicit conditionals, and early returns that show a deliberate choice.

### Check history

Run `git blame` on the relevant lines and read the commit messages and linked issues.

The key question: did the developer know about this behavior and choose it?

## Step 3: Decide the verdict

- **bug**: accidental, unexplained, contradicts the docs, or a regression
- **intended-behavior**: documented, explicitly handled, or recorded in `docs/decisions.md`
- **unclear**: intent cannot be determined

## Step 4: Assign confidence

- **high**: strong evidence
- **medium**: reasonable evidence with some ambiguity
- **low**: mostly inference

## Step 5: Write output

Append to `report.md`:

- The verdict: `bug`, `intended-behavior`, or `unclear`
- The confidence: `high`, `medium`, or `low`
- The evidence for the verdict
