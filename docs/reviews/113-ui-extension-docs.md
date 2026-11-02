# Review: UI extension docs and audit (#113)

Scope: `docs/ui/extension-features.md`, `docs/ui/design-handoff.md`, `.agents/skills/mcp-app-ui/SKILL.md`, and one link in the UX plan. The audit script and `ui:audit` task were written separately and are not reviewed here. No runtime code changed.

## Findings

1. **Simplify code.** This change adds no code. The two reference pages overlap on purpose: the feature page says what the host offers, the handoff says what to do. The handoff cites the feature page instead of repeating API details. The skill holds only the procedure.
2. **Docs clarity.** Both writing skills were applied: sentence-case headings, no em dashes, status separated into implemented, proposed and unverified. Each API claim carries a spec, SDK or reference-plugin line. Each status claim carries a line in our code. Citations were re-checked against the reference repo, the SDK stylesheet (`typescript/styles.css`), the ext-apps type declarations and `scripts/ui-audit.ts` in a second pass. Two statuses are weaker than they look. The `host-styles` result is a static scan of `src/ui` sources, and the hard-coded color roles in the handoff table are inferred from values. Both are labeled. Line numbers will drift as `src/` changes, so a later editor should re-check them with `mise run ui:audit`.
3. **Statechart.** Not needed now. The docs describe no new state machine. The display-mode and onboarding flows are the likely candidates, but they are not designed yet. Add a chart under `docs/statechart/` when step 4 of the handoff defines inline, fullscreen and version-gate transitions, because those states interact (a stale host cannot enter fullscreen).

## Validation

- Every screenshot in the reference set is covered: 01, 02, 03, 05, 07, 08, 11, 12, 13, 14, 15, and the four GIFs, which were read as first frames only.
- Not exercised: Stream Machine in a real host, GIF animation, and the `openai/iconStyle`, `prefersBorder`, `composerIcon`, `logo` and `logoDark` keys, which are absent from the spec.

## Post-merge review

A second review after PR #115 merged checked every citation in `docs/ui/extension-features.md` and `docs/ui/design-handoff.md` against `main` at `00eb73f`, the spec, the SDK, the ext-apps type declarations, and the Bits & Bolts sources. It also viewed screenshot 05 again.

1. **Simplify code.** No code changed in #113. One test fix outside #113 is tracked in #116.
2. **Docs clarity.** The review corrected the errors listed in [Corrections](#corrections).
3. **Statechart.** Still not needed. No state machine changed.

### Corrections

- The tool count was 33. `mise run ui:audit` reports 34 tools on `main`.
- The handoff told the designer to put entrypoint icons on `quickAction`. The audit does not read `quickAction`, and the spec resolves tool `icons` first. The handoff now names the two entrypoint tools and server info, and describes the Bits & Bolts data URI icons with a `theme` field.
- The handoff said `plugin.json` icon keys count toward `entrypoint-icons`. They give only `partial`. The audit-rule citations pointed at the wrong lines.
- The light and dark icon pair was cited to `spec L59-63`. It is in `patterns L122`.
- Both pages said not to draw a fullscreen button "the host already shows". `patterns L29` rules out any dedicated display-mode button. Both pages now say that Open workspace opens a selected item and requests fullscreen as part of that action.
- The thumbnail rule at `spec L1613` was stated backwards. Mixed thumbnails render with a fallback image.
- Screenshot 05 shows blue mention text, not a pill.
- Line numbers into `src/ui/app.ts` and `src/ui/style.css` were off by one or cut short. The breakpoint list omitted 370 px. The `:root` `color-scheme: dark` default was missing from the theme constraint.
- The reference plugin path is now absolute in the feature page and the skill.

### Issue completion

`mise run test` failed on `main` with three package tests. The fixture lacked the `self-update` skill added in #109. #116 and PR #117 fix it. #113 stays open until this review's PR and PR #117 merge.
