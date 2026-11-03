---
name: triage
description: Triage a Stream Machine bug report. Reproduces the bug, diagnoses the root cause, checks whether the behavior is intended, and attempts a fix.
---

# Triage

Triage a bug report end to end: reproduce the bug, diagnose the root cause, check whether the behavior is intended, and attempt a fix.

## General rules

**Do not get stuck on infrastructure problems.** Stop after 2 attempts and write your report with the data you already have.

Stream Machine is a ChatGPT and Codex plugin. It runs MCP servers written in TypeScript on Bun, with an in-chat UI. Source is in `src/`, and tests are in `tests/`. CI has no Twitch account, OBS, Stream Deck, or ChatGPT host. Reproduce through unit tests, scripts, or the stdio smoke test, never through live providers.

Use these commands:

| Command | Purpose |
|---------|---------|
| `mise run install` | Install dependencies |
| `mise run check` | Type-check with `tsc --noEmit` |
| `mise run test` | Run `bun test ./tests` |
| `mise run build` | Build the server and UI into `dist/` |
| `mise run smoke` | Start the bundled server over stdio MCP and list its tools |

## Input

You need either:

- `issueTitle` and `issueBody` in args, or
- A GitHub issue number or URL. Use `gh issue view` to fetch it.

If args include `triageDir`, use it as the working directory. Otherwise use `triage/gh-<issue_number>`.

## Step 1: Reproduce

Follow [reproduce.md](reproduce.md) in a subagent.

- If the issue was **skipped** or **not reproducible**, go to Output.
- If it was **reproduced**, continue to Step 2.

## Step 2: Diagnose

Follow [diagnose.md](diagnose.md) in a subagent.

- If confidence is **low**, go to Output.
- If confidence is **medium** or **high**, continue to Step 3.

## Step 3: Verify

Follow [verify.md](verify.md) in a subagent.

- If the verdict is **intended-behavior**, go to Output.
- If the verdict is **bug** or **unclear**, continue to Step 4.

## Step 4: Fix

Follow [fix.md](fix.md) in a subagent. Continue to Output whether or not the fix succeeds.

## Output

Return structured results so the orchestrator can post a comment and manage labels.
