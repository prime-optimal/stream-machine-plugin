# Plugin UX plan review

Reviewed on 2026-11-01. Source: [UX plan](../plans/plugin-ux-2026-11-01.md), committed on main at `cfc34a3`. This review creates implementation work; it does not verify the proposed runtime.

[Epic #86](https://github.com/prime-optimal/stream-machine-plugin/issues/86) tracks the initial delivery. [Project #18](https://github.com/users/prime-optimal/projects/18) records readiness and ownership.

## Findings

1. **P1: preserve the current consent policy.** Plan line 433 requires separate basic/title/clip permission actions. Merged #83 requests the agreed initial permissions. Connections issue #93 preserves that baseline and handles missing or revoked grants without reverting it.
2. **P1: choose media delivery before implementation.** Plan line 476 makes chunk delivery conditional. Issue #87 selects and tests the host/media contract. Issue #90 implements that choice, with account and session isolation.
3. **P1: split OBS provider work from setup UI.** Plan line 176 combines configuration, authenticated reads, UI, and captures. Issue #92 owns secure provider readiness. Issue #93 owns Connections and the tested guide.
4. **P2: make sequencing explicit.** Plan lines 173 and 203 differ on whether shell work can precede host decisions. The board conservatively gates #88 on #87. Isolated route/parser work can proceed earlier, but host integration cannot claim acceptance before the spike.
5. **P2: separate initial recipes from library expansion.** Plan line 178 combines recipes and durable storage. Issue #95 migrates existing recipes. Issue #97 defers listing, storage, broader recipes, and optional extensions.

These corrections are recorded in the implementation issues. The source plan remains unchanged.

## Issue map

All new issues remain open. Implementation has not started. The epic uses Start = Group. Initial work uses P1; optional expansion uses P2.

| Issue | Scope | Start | Dependencies |
| --- | --- | --- | --- |
| [#87](https://github.com/prime-optimal/stream-machine-plugin/issues/87) | Validate plugin UX host and media contracts | Start now | None |
| [#88](https://github.com/prime-optimal/stream-machine-plugin/issues/88) | Add routed Home and persistent workspace state | Waiting for another task | #87 |
| [#89](https://github.com/prime-optimal/stream-machine-plugin/issues/89) | Add validated clip metadata and session gallery | Waiting for another task | #88 |
| [#90](https://github.com/prime-optimal/stream-machine-plugin/issues/90) | Deliver one authorized clip preview and save in the target host | Waiting for another task | #87, #89 |
| [#91](https://github.com/prime-optimal/stream-machine-plugin/issues/91) | Move existing creative workflows into Assets | Waiting for another task | #88 |
| [#92](https://github.com/prime-optimal/stream-machine-plugin/issues/92) | Support authenticated OBS connection configuration and read-only checks | Start now | None |
| [#93](https://github.com/prime-optimal/stream-machine-plugin/issues/93) | Add contextual Connections and task-first onboarding | Waiting for another task | #88, #92 |
| [#94](https://github.com/prime-optimal/stream-machine-plugin/issues/94) | Add source-labeled Stream Deck preview and release workspace | Waiting for another task | #88 |
| [#95](https://github.com/prime-optimal/stream-machine-plugin/issues/95) | Finish recipe routing and isolate the mock demo | Waiting for another task | #88, #91, #94, #93, #90 |
| [#96](https://github.com/prime-optimal/stream-machine-plugin/issues/96) | Verify routed plugin UX across browser and named native hosts | Waiting for another task | #95 |
| [#97](https://github.com/prime-optimal/stream-machine-plugin/issues/97) | Scope later recipe and library expansion after UX acceptance | Later | #96 |

Reuse existing #39 download verification, #40 media details, and #41 game lookup. Coordinate active transcription #85 without making it a clip-preview prerequisite. Existing issues retain their current parent groups. Issue #97 is an optional follow-up, not an initial-release acceptance requirement.

## Review checks

- Code simplification: not applicable to this documentation-only change. Keep the proposed coordinator local to the UI; no generic provider framework is required.
- Documentation clarity: the findings resolve consent, sequencing, provider ownership, and initial-release scope in the issue contracts.
- Statecharts: update the affected models after selecting delivery and setup behavior. The [navigation models](../statechart/primary-navigation/README.md) exclude cross-section correctness. The [onboarding model](../statechart/plugin-onboarding/README.md) excludes accounts, scopes, host capabilities, and writes. The [Clips model](../statechart/primary-navigation/clips/README.md) permits preview before download, while Candidate A requires completed artifacts. Issue #87 reconciles that difference. Runtime tests must cover account changes, stale callbacks, and multiple app instances.

## Verification boundaries

The epic and child issues were created through GitHub and linked as native sub-issues. Project fields were read back after updates. A timed-out field mutation partially applied; the persisted fields were inspected before missing fields were filled.

No provider actions, deployment, UI implementation, or live-host tests ran. No screenshots are relevant to this planning-only review. Implementation issues require applicable inline visual evidence at acceptance.

The primary checkout has a pre-existing `fnox.toml` edit. This report uses an isolated worktree and does not include that edit.
