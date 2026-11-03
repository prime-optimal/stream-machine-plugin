# Reproduce

Reproduce a GitHub issue to find out whether the bug is real and reproducible.

**CRITICAL: Always write `report.md` to the triage directory before finishing, whatever the outcome.**

**SCOPE: Reproduce only. Do not diagnose or fix.**

## Prerequisites

- **`triageDir`**: the working directory for the triage. The default is `triage/gh-<issue_number>`.
- **`issueDetails`**: the GitHub API issue details payload.

## Step 1: Read the bug details

Read the issue for:

- The bug description, expected behavior, and actual behavior
- Reproduction steps, tool names, or tool inputs
- The host (ChatGPT web, ChatGPT desktop, Codex), the plugin version, and whether the hosted or local server was used

## Step 2: Check exit conditions

- **`not-actionable`**: skip feature requests, questions, roadmap tasks, and discussions. Most issues in this repository are implementation tasks with a "Done when" checklist. Those are not bug reports.
- **`missing-details`**: skip if the issue has no expected behavior or no way to trigger the bug.
- **`maintainer-override`**: skip if a maintainer (`authorAssociation` of `MEMBER`, `COLLABORATOR`, or `OWNER`) said not to auto-triage.
- **Live-only**: skip if the bug needs a real Twitch account, OBS, a Stream Deck, or a ChatGPT host, and no code path can be exercised without them. Say which provider is required.

## Step 3: Set up

The repository is already checked out, installed, and built.

Bugs usually appear in one of these places:

- **MCP tool behavior**: wrong output, schema validation, or errors from a tool registered under `src/adapters/*/register.ts` or `src/server.ts`
- **Domain logic**: `src/domain.ts`, `src/catalog.ts`, or `src/analytics/`
- **Auth**: Twitch OAuth, token storage, or hosted and local selection in `src/auth/`
- **Provider adapters**: request construction or response parsing in `src/adapters/<provider>/client.ts` or `service.ts`
- **UI**: the in-chat app in `src/ui/`
- **Build or package**: `scripts/build.ts`, `scripts/package.ts`

## Step 4: Reproduce

Write a small script or test in `triageDir` that calls the relevant module with the inputs from the issue. Use fakes for provider clients. Follow the patterns in `tests/` for faking clients.

```bash
bun triage/gh-<N>/repro.ts
bun test triage/gh-<N>/repro.test.ts
```

For tool-surface bugs, run `mise run smoke` and compare the listed tools with the report.

1. Trigger the bug and confirm the reported behavior.
2. Confirm correct behavior for inputs that should work.
3. Record what you observe.

## Step 5: Write output

Write `report.md` to the triage directory with:

- The original issue details
- The steps you tried and their results
- Error messages and output
- Whether the bug was reproduced, not reproduced, or skipped, and why
