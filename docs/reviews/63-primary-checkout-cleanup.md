# Primary checkout cleanup

[Issue #63](https://github.com/prime-optimal/stream-machine-plugin/issues/63) tracks preservation of local work before retiring `codex/1-plugin-architecture`.

## Preserved local work

The branch has no commits absent from `origin/main`. Its working tree contained nine modified tracked files and 30 untracked documentation or metadata files.

Twenty files under `docs/reviews/project-audit-2026-11-01/` are unique. The other documentation contains current copies, historical copies, or older variants superseded by committed changes. No unique implementation was found.

[The snapshot archive](../archive/2026-11-01/primary-checkout-docs.tar.gz) preserves all 39 files byte for byte. [The manifest](../archive/2026-11-01/primary-checkout-manifest.json) records each original path and SHA-256 hash. Archive entries distinguish tracked edits from untracked files.

To inspect the snapshot without changing the checkout, run:

```sh
tar -tzf docs/archive/2026-11-01/primary-checkout-docs.tar.gz
```

Extract into a separate directory when recovering a file. Do not overwrite current documentation with historical copies.

## Cleanup

After the snapshot is committed and pushed, the primary checkout moves to current `main`. Superseded local copies are removed only after their hashes match the archived copies.

Installed statechart files and the local Claude skill link remain in place. The root `skills-lock.json` remains local and is excluded through `.git/info/exclude`. Local build outputs remain ignored.

The merged architecture branch is deleted locally and remotely. The merged cleanup-report branch from PR #62 is also deleted locally after its history is archived. The preservation branch stays until this snapshot is merged.

The running worker's `stream-machine-demo` worktree remains unchanged.

## Review

The review addressed each project question:

1. Code simplification. No product code changes. The primary checkout returns to current `main`.
2. Documentation clarity. Historical files are preserved as a snapshot with original paths and checksums, separate from current docs.
3. Statechart need. No model changes are needed. Existing model files are preserved, and cleanup changes no product behavior.

Archive contents were read back and checked against every manifest hash before cleanup. Commit and push checks protect the preservation branch.
