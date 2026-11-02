# Issue #83 verification

## Result

Initial consent requests the agreed exact 12 scopes. The registry separates two implemented privileged feature permissions from ten future permissions. Status reports actual missing grants without blocking existing reads or title preview. Existing grants survive reconnect and rejected upgrades.

No live OAuth, token inspection, grant mutation, channel action, worker control, or separate bot authorization was performed. Future capabilities remain inactive.

## Checks

Host: macOS arm64. Bun 1.4.4, TypeScript 5.9.3, HeadlessChrome 156.0.0.0, agent-browser 0.41.0, TLC 2.19.

| Command | Exit | Evidence |
| --- | --- | --- |
| `mise run hooks:install` | 0 | Existing global hk hooks retained. |
| `mise run install` | 0 | Frozen lockfile, 103 packages installed. |
| `mise exec -- bun test tests/twitch-permissions.test.mjs` before fix | 1 | Actual authorize URL had empty `scope=`; expected current-feature permissions. |
| `mise run check` after final source changes | 0 | TypeScript checks passed. |
| `mise run test` after final source changes | 0 | 113 tests, 0 failures, 690 expectations across 17 files. |
| `mise run build` | 0 | UI, server, worker, and event adapter built. |
| `mise run smoke` | 0 | 30 tools, isolated mock lifecycle, UI resource. |
| `mise run package` | 0 | 136 archive entries inspected. Archive generated under ignored `docs/packages/`. |
| `bash docs/verification/83-ui/verify.sh` | 0 | Actual UI component with mocked status/connect only. Own server and browser stopped. |
| Installed `statechart` command | 0 | 77 states, 127 steps, six invariants and no deadlock. [Reproduce](../statechart/83-twitch-consent/reproduce.md). |
| `git diff --check` | 0 | No whitespace errors. |
| `mise run hooks:check` | 0 | Markdown, whitespace, and secret checks passed. Staged content is also checked by the commit hook. |

Intermediate tests caught stale opt-in assertions during migration. They were updated to the exact 12-scope policy. Initial hook checks rejected the consumed raw export, blank-line formatting, and this not-yet-created report link. The export was removed after fidelity capture, formatting was fixed, and this report resolves the link.

The packaged launcher smoke script was inspected but not run because it calls live Twitch status through fnox. The ordinary stdio smoke performs no real provider action.

## Regression coverage

- Real `TwitchClient.authorizationUrl()` query has exactly the agreed scopes, sorted once, for default and legacy flag inputs.
- Registered Twitch tools match implemented registry entries. Real client endpoint requests and the actual EventSub subscription type match that inventory.
- Future scopes are requested product policy, not fabricated endpoints. Legacy IRC and developer analytics scopes stay excluded.
- Empty, broadcast-only, and full older grants remain connected. Reconnect preserves an extra old grant, rejects incomplete replacements, and retains the old connection on denial.
- Callback storage uses validated scopes, not token-exchange claims. Refresh can reduce grants and report missing scopes without deleting the connection.
- Broadcast-only title tests perform real client channel reads and create an executable title preview while `reconnectRequired=true`. Missing future permissions do not disable that already-granted feature.
- Browser state, identity, title approval, single-use execution, clip ownership, and token-redaction tests remain passing.

## UI evidence

[Mock UI reproduction and limits](83-ui/README.md) uses the real live-demo component with fake tool results. Screenshots were inspected for secrets and unrelated data.

- [Missing grants](83-ui/missing-grants.png) shows one granted permission and eleven missing permissions.
- [Consent disclosure](83-ui/connect-disclosure.png) shows plain purpose groups, expandable exact names, future-not-active status, and separate-bot identity limits.
- [Observations](83-ui/observations.json) records only mocked status/connect calls, no browser errors, and no navigation to consent.

No native-host or real-account acceptance is claimed.

## Review

One Oracle review found no substantive source defect and requested the missing report link be repaired. This file resolves it. Coordinator spot review requested broadcast-only usability evidence; the existing title read/preview test now asserts it directly.

- Simplification: shared scope helpers reuse existing callback and storage logic. No general authorization framework, store migration, or worker hardening.
- Documentation: [the reference](../reviews/83-twitch-scope-audit.md) preserves the audit, prior defaults, historical grant evidence, exact product decision, and future matrix. Raw builder output was consumed and removed.
- Statechart: [the model](../statechart/83-twitch-consent/README.md) checks abstract permission classes. It omits real credentials, concurrency, identity changes, and provider-policy compliance. No counterexample was found.

## Retained worktrees and processes

All eleven other worktrees were inspected read-only and were clean at inspection. Existing owners retain them. No checkout was advanced or removed.

| Branch or checkout | Local-only status | Owner and next step |
| --- | --- | --- |
| Primary `main` | 0 against upstream | Maintenance owner retains clean checkout. |
| `codex/70-secrets-repoprompt` in `/private/tmp/stream-machine-secrets` | 0 | Existing session retains. |
| `feat/39-clip-download` | No upstream; commit reachable through remote media integration | Clip owner retains pending cleanup. |
| `feat/18-media-integration` | 0 | Media owner retains open PR work. |
| `feat/40-media-info` | 0 | Media owner retains. |
| `feat/42-streaming-metric` | 0 | Metric owner retains. |
| `feat/41-game-lookup` | 0 | Game owner retains. |
| `codex/49-demo-integration` in `stream-machine-demo` | 0 | Worker owner retains active source. |
| `codex/46-native-verification` in `stream-machine-native-46` | No upstream or containing remote ref | Native verification owner preserves local history. |
| `feat/53-channel-profile` | 0 | Profile owner retains. |
| `chore/81-plugin-ux-plan` | 0 | UX owner retains separate work. |

Worker PID 91601 uses `stream-machine-demo/src/worker/main.ts` and its demo adapter. It remains running. The owner must approve any future move or stop.

Existing plugin-cache server groups also remain untouched: PIDs 19122/19561/19564, 64056/65510/65513, 73149/73258/73261, 85987/86352/86356, and 91658/91820/91824. These belong to existing host sessions. Their owners decide when to restart or retire them.

Task-generated ignored dependencies, bundles, package archive, and TLC output remain for reproduction. No task preview server or browser remains. Issue #83 stays open and the board stays In Progress while the PR awaits merge.
