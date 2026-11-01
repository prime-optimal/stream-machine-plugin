# Scope

Reviewable combined integration for epic #18. Preserves focused [#76](https://github.com/prime-optimal/stream-machine-plugin/pull/76), [#77](https://github.com/prime-optimal/stream-machine-plugin/pull/77), [#79](https://github.com/prime-optimal/stream-machine-plugin/pull/79), and [#78](https://github.com/prime-optimal/stream-machine-plugin/pull/78).

Reconciles server registration, independent media/deck cleanup, and 33-tool smoke/package checks. Includes checked clip/media lifecycle models and reproduction.

See [consolidated results](https://github.com/prime-optimal/stream-machine-plugin/blob/feat/18-media-integration/docs/reviews/18-media-integration.md) and [coverage ledger](https://github.com/prime-optimal/stream-machine-plugin/blob/feat/18-media-integration/docs/plans/18-clips-and-games.md).

## Limits

Clip live acceptance needs explicit channel:manage:clips consent. Private media provider remains absent. Synthetic metric verifies arithmetic, not report authenticity. No OAuth, deployment, broadcasts, or GitHub merges performed. Epic stays open and In Progress.
