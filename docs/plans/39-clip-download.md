# Issue 39 clip download plan

Implement only [#39](https://github.com/prime-optimal/stream-machine-plugin/issues/39). Reuse closed #25 OAuth. Approved source: `oracle-plan-2026-11-01-141157-media-epic-plan-fadf-ed8d.md`, section #39.

## Ownership

Own Twitch clip client, service, artifact writer, registration, OAuth extension, tests, and issue-specific docs. No changes to server assembly, media-info, IGDB, analytics, UI, or workers. Siblings own those files.

Binding verified before edits: worktree `wt_25d0e3462d3ada5b5542ec74a2600e5cb7880f45a438ada022c76645825f5af6`, branch `feat/39-clip-download`, HEAD `9c5e2970b7dd693672292ee0b53c71c10f33c863`, clean status. Physical checkout: session-bound `rp-agent-50c48c29-feat-39-clip-download-e53aa619`.

## Contract gate

Official Twitch reference verified 2026-11-01 before implementation. GET `/helix/clips/downloads` requires `editor_id`, `broadcaster_id`, and `clip_id`. Both user IDs equal the connected broadcaster. Request `channel:manage:clips` explicitly. Response contains `clip_id` and nullable landscape and portrait URLs. Links expire. Prefer landscape, then portrait.

Official example host: `production.assets.clips.twitchcdn.net`. No complete CDN or redirect contract exists in the reference. Allow only this exact HTTPS host and reject redirects. Real delivery remains unverified.

## Sequence

1. Write failing OAuth, clip, artifact, and registration tests.
2. Extend existing OAuth runtime and preserve stored scopes.
3. Validate metadata and ownership before resolving download access.
4. Leave credential callback before fetching bytes without authorization headers.
5. Stream into private bounded temporary storage, hash, and publish atomically. Reject concurrency and clean partial files.
6. Run checks, tests, build, stdio smoke, packaging, and hooks. Record actual exits.
7. Review simplification, writing, state transitions, and issue evidence under `docs/reviews/`.
8. Commit, push, open PR, and publish evidence. Keep issue open and board In Progress. Do not merge.

## Implementation adjustments

The smoke script also belongs to this issue because registration adds two tools. The initial branch expected 29. User authorized this change. After merging main's #53 profile tool, this branch expects 30 in both source and packaged smoke checks. #40 adds its tool independently; reconcile counts and preserve all tool assertions when integrating branches.

Review renamed the synchronous connect result's new field to `additionalScopes`. It describes explicit flags without misreporting preserved grants. `TwitchService.begin` returns full effective `requestedScopes`. The storage deadline covers network waits, not stalled filesystem operations. Safe cleanup waits rather than racing pending writes.

## Acceptance limits

Synthetic tests do not prove real OAuth, download, or playback. Real acceptance needs explicit account consent and a broadcaster-owned clip. Do not change titles, start broadcasts, alter Stream Deck profiles, or stop the demo worker.
