# Clips and games integration plan

This explanation records epic #18's combined scope and remaining acceptance work. Integration uses its dedicated worktree and branch `feat/18-media-integration`, based on `de577ad458e49703a5e797c5866d7c3583133c7d`, including #53 profile support. No feature worktree or source branch was edited.

## Verified inputs

| Issue | Focused PR | Exact merged head |
| --- | --- | --- |
| #39 | [PR #76](https://github.com/prime-optimal/stream-machine-plugin/pull/76) | `bccdbdae4149653e026f67b68811b194017632ea` |
| #40 | [PR #77](https://github.com/prime-optimal/stream-machine-plugin/pull/77) | `489220beb6de508dd0edcc603d915d449e7767f3` |
| #41 | [PR #79](https://github.com/prime-optimal/stream-machine-plugin/pull/79) | `87cbe4692450a4f2bdfc0902d6f0d3d86973c018` |
| #42 | [PR #78](https://github.com/prime-optimal/stream-machine-plugin/pull/78) | `08672c98357b08bd771c78aa2af374827161c815` |

Integration merged these heads in table order, then #40's approved descendant `4d64681e2d2fb9abfb7bbba2b5429420d9bbcaef`. That commit adds only rejected vocabulary entries for `live` and `check`. Author: `github-actions[bot]`; provenance: `nlpm-advisory` run `41356810067`. Feature code remains unchanged. Other focused heads matched the supplied heads.

## Coverage ledger

The source is Oracle export `oracle-plan-2026-11-01-141157-media-epic-plan-fadf-ed8d.md`. Each row records its supported decisions, implementation, and limits.

| Plan area | Implemented boundary and rationale | Evidence or remaining work |
| --- | --- | --- |
| OAuth reuse | #39 reuses #25's lazy local runtime and account callback. Explicit clip consent preserves existing scopes. No second listener or store migration. | [Clip plan](39-clip-download.md), upstream tests. Runtime returns `additionalScopes`, correcting planned `requestedScopes`; authorization unions scopes later. |
| Clip API | One validated clip ID, official Helix endpoints, broadcaster ownership, and scope checks. No scraping, batching, guessed URLs, or title-approval reuse. | [Clip demo](../demos/clips.md), client/service tests. |
| Artifact safety | Restricted HTTPS delivery host, no redirects or auth forwarding, byte/deadline bounds, private UUID files, one transfer, atomic completion, partial cleanup. No hidden retry or retention. | Artifact tests and [checked lifecycle](../statechart/18-clip-lifecycle/reproduce.md). |
| Clip acceptance | Smallest visible demo is a real authorized clip download and playback with hash and size. | Missing `channel:manage:clips` consent remains a blocker. No OAuth initiation authorized. |
| Private media | Optional pinned `yt-media-info-mcp` frontend, clean source, loopback service, supported HTTPS URL. Start frontend only on explicit request. No media download. | [Media demo](../demos/media-info.md). Listener inspection does not authenticate the service. |
| Media results | Plain metadata, honest transcript state, bounded transcript, sanitized missing-config error, serialized requests, abort and close. No persistence or background polling. | Synthetic provider tests, bundled missing-config proof, [checked lifecycle](../statechart/18-media-lifecycle/reproduce.md). |
| Media acceptance | One real metadata/transcript request and clean shutdown against private service. | Private provider absent. No public replacement or deployment authorized. |
| Game mapping | Category ID maps through Twitch-returned `igdb_id` to direct IGDB read. App credentials are separate from streamer OAuth. No relay or name guessing. | [Game demo](../demos/games.md), token and mapping tests. |
| Game contracts | Fixed endpoints, numeric queries, bounded calls and token renewal, explicit missing mapping, HTTPS artwork reference. No artwork download or license claim. | Combined bundled read maps 33214 to IGDB 1905. |
| Metric source | User-supplied closed session report. Hashed event reservations and worker counters cannot prove broadcast history. No Creator Dashboard claim. | [Metric demo](../demos/streaming-metric.md). Synthetic authenticity remains unverified. |
| Metric calculation | Offset timestamps, IANA timezone, half-open range, coverage/session union, duplicate ID checks, intersection, explicit gaps, no extrapolation. | Tests cover boundaries, DST, invalid input, empty coverage, overlaps, duplicates. Bundled sample: 6300 seconds, 1.75 hours, 900 gap seconds. |
| Shared files | Direct registration preserves profile, existing tools, and mock isolation. Media and deck cleanup retain `Promise.allSettled`. Game and analytics own no child transport. | Actual combined inventory: 33 tools. No shared provider framework, UI, catalogue, worker, dependency, or secret-schema redesign. |
| Verification and publication | Check full tests, build, smoke, package, package-smoke, hooks, unchanged-HEAD validation, clean upstream handoff, and published evidence. | [Consolidated review](../reviews/18-media-integration.md). |

The coordinator authorized integrating completed #42 now rather than later. This changes sequence, not source-authenticity limits. Feature-specific plans and demos retain API details and historical branch counts.

## Remaining sequence

1. Review combined draft and focused PRs. Report provider defects to their owners.
2. Obtain explicit authorization for clip consent before OAuth. Then prove real download and playback.
3. Supply and verify the private media service before claiming live metadata or transcript acceptance.
4. Obtain an identifiable real session report before claiming source authenticity for the metric.
5. Keep epic #18 open and In Progress until required merges and acceptance are complete.

No GitHub PR merge, deployment, broadcast, device-profile change, cache refresh, or third-party automation start is authorized by this integration task.
