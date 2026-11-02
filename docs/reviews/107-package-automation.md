# Package automation verification

Issues #107 and #104. Baseline `2592f2a`. Implementation awaits merge.

## Results

| Command | Exit | Result |
| --- | --- | --- |
| `mise run hooks:install` | 0 | Global check-only hooks already configured. |
| `mise run install` | 0 | Locked dependencies installed in task worktree. |
| Initial `mise exec -- bun test tests/package-archive.test.ts` | 1 | Finder fixture reproduced archive rejection before fix. |
| Final archive fixture tests | 0 | Four tests passed, including extracted byte parity and failure cleanup. |
| Workflow contract tests | 0 | Three tests passed. |
| `mise run test` | 0 | 165 tests passed, 987 assertions. |
| `mise run check` | 0 | TypeScript passed. |
| `mise run build` | 0 | Server and UI bundles built. |
| `mise run package` | 0 | Real ZIP and tar.gz validated against the same staged inventory. |
| `mise run smoke` | 0 | Mock-only MCP lifecycle passed. |
| Extracted tar.gz MCP smoke | 0 | 31 tools and mock lifecycle passed. |
| Extracted ZIP MCP smoke | 0 | 31 tools and mock lifecycle passed. |
| `mise exec -- go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.7 .github/workflows/package.yml` | 0 | Workflow lint passed. |
| `mise run hooks:check` | 0 | Markdown, whitespace, and staged secret checks passed. |

Extracted checks ran `scripts/smoke.ts <temporary-root>/stream-machine/dist/server.js` with `env -i`, an empty temporary HOME, and scratch working directory. No fnox launch, Twitch status, plugin installation, or provider action occurred. Sandbox denied initial mise/cache access; authorized reruns produced the exits above.

## Review findings

- Simplification: `scripts/package-archive.ts:4-65` shares filtering and validation without a plugin framework. Existing tar.gz remains intact.
- Documentation: `docs/setup.md:46-69` distinguishes actual ZIP from the Actions wrapper, local filenames from SHA-qualified artifact names, and build checks from native-host verification.
- Statechart: `docs/statechart/105-release-automation/Release.tla` describes release preparation, which is unchanged. No model expansion is needed for this independent sequential package job.
- Bounded Oracle review found no blocking correctness or security defects. Independent workflow spot review also found none.

## Boundaries

Hosted main-push and manual workflow execution remain unverified until merge. Native desktop update is not tested. Local packaging and both extracted mock MCP checks passed. No merge, tag, publishing, installation, or release preparation occurred.

The workflow checks out the event SHA, has only `contents: read`, and uploads only both versioned archives under a version-plus-full-SHA artifact name. It does not inherit release-PR write permissions. Both issues remain open and In Progress pending merge and hosted evidence. No screenshots apply to this packaging-only change.

## Retained state

Primary checkout has a pre-existing `AGENTS.md` edit owned by another session. Preserve it. Only ignored ZIP and tar.gz copies are authorized there.

Other inspected worktrees were clean. Branches with configured upstreams had no commits ahead before this task push. Retained tips without a containing remote ref: UX review 86 `dcee6e7`, release 105 `8a5bd4e`, Twitch scopes 83 `7afc84b`, native 46 `94371ca`, transcription 85 `a821fd6`, and UX 81 `8eced02`. Their issue owners must reconcile squash history before cleanup. Nothing was removed.

Existing host processes using cached plugin 0.2.0 and the demo process PID 91601 remain untouched. Their host/demo owners control their lifecycle. This task leaves no background server or test process.
