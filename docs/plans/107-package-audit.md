# Package automation audit

Implementation awaits follow-up. Only audit artifacts were written.

## Verified baseline

The task worktree is `chore/107-package-on-merge` at `2592f2afca2af3c7fdaa85fe5aa519f81a902df2`, matching remote main during audit. Git status was clean before export. RepoPrompt window 1, context `38E433A5-8796-4581-B5F6-D20AE0AC594E`, resolved the exact physical worktree. Builder selected 12 files, about 13,216 tokens. Other worktrees remain untouched.

PR #106 is merged at this SHA. Issues #107 and #104 remain open. Open PR inventory contains no competing #104 fix.

## Implementation plan

1. Add a failing Finder metadata fixture first. Filter `.DS_Store` and `._*` before staging. Keep strict archive rejection checks.
2. Extend `scripts/package.ts` with a small shared archive helper and Bun tests. `mise run package` must produce real `docs/packages/stream-machine-0.3.0.zip` and existing `.tar.gz`, both containing the same `stream-machine/` root and payload. Validate both formats.
3. Add a separate main-push/manual workflow. Check out the event SHA, use the same canonical task, grant only `contents: read`, and upload both exact outputs under a version-plus-full-SHA artifact name. No secrets, provider calls, tags, publishing, installation, or release preparation. Manual dispatch packages its selected ref SHA.
4. Update build/download instructions. Distinguish the Actions download wrapper ZIP from the actual plugin ZIP inside it.

## Integration constraints and smallest checks

- `scripts/package.ts:20-23` copies metadata today. Lines 53-58 create only tar.gz and then reject metadata. Start with one isolated fixture, not real source-folder pollution.
- `.github/workflows/ci.yml:3-5,20` checks PR/manual builds but uploads nothing. `release-pr.yml:12-16,33-40` has write permissions and packages only changed releases. Keep new delivery workflow independent. It packages committed versions, not proposed release versions. Every main push must remain eligible, including release-PR merges.
- Smallest tests cover metadata exclusion, real ZIP integrity, tar/ZIP extracted path-and-byte parity, strict rejection for forbidden or unexpected entries, and workflow event/SHA/permissions/upload contracts. Failed validation must prevent upload.
- Use `scripts/smoke.ts` against each extracted `dist/server.js` with a clean environment. Do not reuse `package-smoke.ts` unchanged: it launches fnox and calls real Twitch status at lines 15-31. This corrects the builder proposal and preserves the no-provider boundary.
- After approval, run check, targeted and full tests, smoke, package, extracted mock-only smoke, workflow lint, and check-only hooks. No tests or builds ran during this audit. Initial login-shell startup reported mise sandbox permission failure; actual mise task execution still needs verification.
- ZIP is documented by [OpenAI submission guidance](https://developers.openai.com/plugins/deploy/submission). Desktop update acceptance and archive-root behavior were not tested. Preserve the existing root as requested. Do not claim native-host verification.

## Review findings

- Simplification: share copy filtering and archive validation. Keep release and packaging workflows independent. Do not add provider or version-bump logic.
- Documentation: setup names stale 0.2.0 tar.gz, while package reference names 0.3.0. Correct both and explain the wrapper ZIP.
- Statechart: the #105 model covers release PR preparation, which stays unchanged. No model change is needed for this audit. Reassess packaging failure/upload rules during implementation review.
- Completion: no implementation, evidence publication, issue closure, or board mutation occurred. The follow-up implementation must publish verification and keep issues open while awaiting merge.

## Builder export

[Raw builder export](107-builder-export.md). Treat this audit as controlling where it corrects that draft. Retain raw export for follow-up context.
