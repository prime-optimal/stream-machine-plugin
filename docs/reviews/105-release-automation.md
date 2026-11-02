# Issue 105 release automation review

## Result

Prepared version 0.3.0 from the approved 1246d75 boundary through 1784082. Commitizen 4.19.3 owns parsing, bump selection, and changelog generation. The 102-line Python helper adds range selection and synchronized writes, not release rules.

## Required review questions

1. Simplification: keep the small helper and one fixed release PR. The model review found an ancestry gap in the branch guard. The guard now checks the source parent against main before accepting a bot branch. No framework or extra credentials were added. See `.github/workflows/release-pr.yml:55-70`.
2. Documentation: `docs/git-workflow.md:126-142` distinguishes manual full-history generation from range-aware release preparation. The review's claim that token-created PR workflows are always suppressed conflicts with current GitHub documentation, which describes approval-required runs. The documented manual-approval limitation remains. No broader rewrite is needed.
3. Statechart: the [checked lifecycle](../statechart/105-release-automation/report.md) covers no-op, failed checks, stale source, PR failure after branch push, retry, and human merge. TLC passed 59 states, five invariants, and the deadlock check. GitHub internals and the point-in-time source race remain outside the model.

## Validation receipt

- Install and check-only hook setup: exit 0.
- TypeScript: exit 0.
- Full domain suite before the final helper regression: exit 0, 156 tests passed.
- Impacted release suite after the helper correction: exit 0, nine tests passed, 47 assertions.
- Same-date ordering regression failed before the fix and passed afterward.
- Fixture coverage includes preview without writes, repeated prepare, release/docs-only no-op, next fix range, feature and breaking signals, version mismatch, invalid boundary, preserved history, and unchanged HEAD/tags.
- Workflow guard fixtures reject foreign PRs, foreign orphan branches, wrong paths, stale source, inconsistent parent markers, and off-main parents with matching markers.
- Actionlint 1.7.7: exit 0.
- Build and package: exit 0. Archive `docs/packages/stream-machine-0.3.0.tar.gz` is ignored.
- Extracted archive stdio smoke: exit 0, 31 tools. Both extracted manifests and the MCP handshake report 0.3.0.
- Check-only hooks: exit 0 before publication. Staged content is reviewed again before commit.

## Activation and issue completion

The repository read-back returned `default_workflow_permissions: read` and `can_approve_pull_request_reviews: false`. The latter controls the bundled create-and-approve setting. This task does not change it. The release job requests only contents and PR write access. No code approves, merges, tags, or publishes.

The real GitHub workflow cannot be claimed verified before merge and authorized activation. A failed PR API call can leave the bot branch for retry. The source check is point-in-time; a later main run refreshes an outdated proposal.

Issue #105 remains open and its board status remains In Progress while the implementation awaits merge and activation. CLI-only changes need no screenshots. Verification is published in a new issue comment, not appended to the issue body.

The coordinator consumed the builder export. Its broader App/framework proposal was superseded by the bounded implementation, and temporary exports were removed.

[GitHub token event behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) documents approval-required PR runs and suppressed push-triggered runs.
