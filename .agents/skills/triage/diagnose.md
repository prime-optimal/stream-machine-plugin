# Diagnose

Find the root cause of a reproduced bug in the Stream Machine source.

**CRITICAL: Always append to `report.md` before finishing, whatever the outcome.**

**SCOPE: Diagnose only. Do not fix.**

## Prerequisites

- **`triageDir`**: the directory that holds the reproduction.
- **`issueDetails`**: the GitHub API issue details payload.
- **`report.md`**: the output of the reproduce step.

## Step 1: Review the reproduction

Read `report.md`. If the bug was not reproduced, append "DIAGNOSIS SKIPPED: No reproduction" and return `confidence: null`.

## Step 2: Find the relevant files

| Path | Responsibility |
|------|----------------|
| `src/server.ts`, `src/stdio.ts` | MCP server setup and stdio entry point |
| `src/adapters/<provider>/register.ts` | Tool registration and input schemas for each provider |
| `src/adapters/<provider>/client.ts`, `service.ts` | Provider API calls and response handling |
| `src/domain.ts`, `src/catalog.ts` | Domain behavior and mock data |
| `src/auth/` | Twitch OAuth, token storage, and hosted or local auth selection |
| `src/events/` | Twitch EventSub handling |
| `src/ui/` | The in-chat app UI |
| `scripts/` | Build, package, and smoke scripts |
| `docs/architecture.md`, `docs/decisions.md` | Design decisions |

Use `grep` for the tool name or error message from the issue to find the entry point.

## Step 3: Investigate

Trace the execution path with the inputs from the reproduction. For provider bugs, check request construction, token use, and response parsing. For tool bugs, check that the zod input schema matches what the caller sends.

You may add `console.log` to trace execution. Revert all instrumentation before finishing.

## Step 4: Identify the root cause

Record:

1. The file or files that contain the bug
2. What the code does wrong
3. Why that causes the observed behavior
4. What the fix should be

## Step 5: Write output

Append to `report.md`:

- The root cause, with file paths and line numbers
- The suggested fix
- A confidence level: `high`, `medium`, or `low`
