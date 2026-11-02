# Review of brand UI slice

Issue: [#194](https://github.com/prime-optimal/stream-machine-plugin/issues/194).

The shell uses the console palette, grid, serif headings, and compact corners from the archived OpenDesign reference in `docs/open-design/stream-machine-reference.tar.gz`. The light theme uses host colors where available. The app follows the host theme, or the system theme when the host omits one, and resets missing safe-area insets.

## Review questions

- Simplification: The shell stylesheet is separate from the existing shared stylesheet to limit conflicts with clip and creative work. The build concatenates both files.
- Documentation: The source archive and its provenance are described in `docs/open-design/README.md`. No product documentation changed.
- Statechart: No state transition or provider action changed. A statechart update is not needed.

## Verification and limits

- `mise run install`, `mise run hooks:install`, `mise run check`, `mise run build`, and `mise run hooks:check` passed.
- `mise run test` passed with 279 tests, two skipped, and zero failures.
- Browser and host appearance remain unverified. The preview command failed with a sandbox permission error; the escalation request was interrupted.
- `mise run smoke` and `mise run ui:audit` could not start their build dependency because of a sandbox permission error.
- `scripts/build.ts` overlaps issue #191. Preserve both its server build changes and this stylesheet concatenation during integration.
- This slice improves host theme handling; it does not claim a new MCP Apps capability or completion of issue #194.
