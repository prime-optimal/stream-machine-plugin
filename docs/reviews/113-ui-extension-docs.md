# Review: UI extension docs and audit (#113)

Scope: `docs/ui/extension-features.md`, `docs/ui/design-handoff.md`, `.agents/skills/mcp-app-ui/SKILL.md`, and one link in the UX plan. The audit script and `ui:audit` task were written separately and are not reviewed here. No runtime code changed.

## Findings

1. **Simplify code.** This change adds no code. The two reference pages overlap on purpose: the feature page says what the host offers, the handoff says what to do. The handoff cites the feature page instead of repeating API details. The skill holds only the procedure.
2. **Docs clarity.** Both writing skills were applied: sentence-case headings, no em dashes, status separated into implemented, proposed and unverified. Each API claim carries a spec, SDK or reference-plugin line. Each status claim carries a line in our code. Citations were re-checked against the reference repo, the SDK stylesheet (`typescript/styles.css`), the ext-apps type declarations and `scripts/ui-audit.ts` in a second pass. Two statuses are weaker than they look. The `host-styles` result is a static scan of `src/ui` sources, and the hard-coded color roles in the handoff table are inferred from values. Both are labeled. Line numbers will drift as `src/` changes, so a later editor should re-check them with `mise run ui:audit`.
3. **Statechart.** Not needed now. The docs describe no new state machine. The display-mode and onboarding flows are the likely candidates, but they are not designed yet. Add a chart under `docs/statechart/` when step 4 of the handoff defines inline, fullscreen and version-gate transitions, because those states interact (a stale host cannot enter fullscreen).

## Validation

- Every screenshot in the reference set is covered: 01, 02, 03, 05, 07, 08, 11, 12, 13, 14, 15, and the four GIFs, which were read as first frames only.
- Not exercised: Stream Machine in a real host, GIF animation, and the `openai/iconStyle`, `prefersBorder`, `composerIcon`, `logo` and `logoDark` keys, which are absent from the spec.
