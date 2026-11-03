# Fix

Develop and verify a fix for a diagnosed Stream Machine bug.

**CRITICAL: Always append to `report.md` before finishing.**

**SCOPE: Do not spawn tasks or subagents.**

## Prerequisites

- **`triageDir`**: the directory that holds the reproduction.
- **`issueDetails`**: the GitHub API issue details payload.
- **`report.md`**: the output of earlier steps.

## Step 1: Review the diagnosis

Read `report.md` for the root cause and suggested fix.

- **Not reproduced**: append "FIX SKIPPED: Not reproduced" and return `fixed: false`.
- **Low confidence**: do not attempt a fix. Name the likely files, write a failing test if you can, and return `fixed: false`.
- **Medium or high confidence**: continue.

## Step 2: Implement the fix

Change files in `src/` or `scripts/`. Keep the change minimal:

- Change only what the fix needs.
- Do not refactor unrelated code or add features.
- Keep each source file under 500 lines.
- Do not add credentials, tokens, or `.env` files.

## Step 3: Check and build

```bash
mise run check
mise run build
```

Fix any TypeScript errors. Then rerun the reproduction from `triageDir`.

## Step 4: Write a test

Add a test to the matching file in `tests/`, or create `tests/<area>.test.ts`. Tests use Bun's test runner:

```typescript
import { describe, expect, test } from "bun:test";
```

Run the new test alone:

```bash
bun test tests/<area>.test.ts
```

## Step 5: Check for regressions

```bash
mise run test
mise run smoke
```

All existing tests must still pass.

## Step 6: Write output

```bash
git diff src/ scripts/ tests/
```

Append to `report.md`:

- What changed and why
- The full diff
- Whether the fix succeeded
- The test you added
- Results of `mise run check`, `mise run test`, and `mise run smoke`

## Step 7: Clean up

1. Revert debug code and remove temporary files outside `triageDir`.
2. Run `git status` and confirm that only fix files changed.
3. Do not commit. The orchestrator handles commits.
