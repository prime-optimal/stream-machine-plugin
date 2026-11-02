# Issue evidence and completion review

[Issue #73](https://github.com/prime-optimal/stream-machine-plugin/issues/73) tracks this documentation change.

## Changes

`AGENTS.md` now requires evidence comments, inline screenshot attachments when relevant, issue and board updates, and confirmation before handoff. The original issue body remains the record of scope and acceptance criteria.

The Git guide gives a `gh issue comment --body-file ... --attach ...` command. Reports and PR links support the comment rather than replacing visible evidence. A failed upload remains a reported blocker.

Required PRs keep an issue open and `In Progress` until acceptance criteria are met and changes are merged. Verification-only tasks without a merge requirement can finish after their evidence is published. Reviews check the state appropriate to the current stage.

## Verification

The following checks passed:

- GitHub CLI 2.103.3 help confirms `gh issue comment --attach`, image alt text, and body-file support.
- [GitHub's attachment documentation](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli) confirms uploads render inline and local image references are replaced with uploaded URLs.
- Board field inspection confirmed `Todo`, `In Progress`, `Done`, and `Not planned`. Issue #73 is open and its board item is `In Progress` while this PR awaits merge.
- `mise run hooks:check` and `git diff --check` passed.

This change has no visual feature to capture, so no screenshot is needed. Attachment upload itself was not exercised. Issue #46 was read as context and remains unchanged by this task.

## Review findings

The review answered each project question:

1. Code simplification. No product code or automation changed. Completion policy stays in `AGENTS.md`, with commands in the Git guide.
2. Documentation clarity. Evidence comments, original issue scope, and board progress have explicit responsibilities. Screenshots must appear directly in the comment.
3. Statechart need. The two completion cases are short and explicit: required changes wait for merge, while verification-only tasks finish after evidence publication. No separate chart or application model update is needed.
