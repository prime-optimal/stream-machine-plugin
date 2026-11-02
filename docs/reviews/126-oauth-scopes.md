# OAuth scope documentation review

Issue [#126](https://github.com/prime-optimal/stream-machine-plugin/issues/126). Documentation only. No OAuth request, grant, or deployment changed.

## Findings

- Simplification: no code change is needed. The reference uses the existing registry and grant-union flow in `src/auth/permissions.ts:25-46`.
- Documentation: `docs/twitch-oauth-scopes.md:3` exposes the exact baseline outside the historical audit. The demo links the reference and no longer describes the legacy broadcast flag as the current policy. Historical live-grant evidence remains unchanged.
- Statechart: no model update is needed because request and callback behavior are unchanged. The existing [consent model](../statechart/83-twitch-consent/README.md) covers the documented transitions. Hosted parity remains separate work in PR #125.

## Verification

Validation results and handoff limits are recorded in the issue evidence comment after checks complete.
