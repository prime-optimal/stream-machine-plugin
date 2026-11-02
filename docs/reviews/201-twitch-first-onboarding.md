# Twitch-first onboarding review

Review date: 2026-11-02. Issue: [#201](https://github.com/prime-optimal/stream-machine-plugin/issues/201).
Source baseline: `0ee524a5f1f0933e3ca04d17b162b84bbbc805c0`.
Scope: documentation and a checked proposal. No runtime, provider, deployment, device, or packaged skill changes.

The [proposal](../plans/twitch-first-onboarding-2026-11-02.md) defines the requested experience.
Existing Home provides useful channel media rendering, but its task order, shared cache, and settings do not meet the request.

## Findings

| Priority | Finding and effect | Evidence | Required change |
| --- | --- | --- | --- |
| P1 | Cache paints a previous account before verification. A transient status failure leaves that snapshot visible. | `src/ui/home-state.ts:95-117`; `tests/ui-home.test.ts:34-43` | Verify owner, account, and connection generation before showing personal content. Partition and expire cache. |
| P1 | The five-request limit is documented but cannot be proved from this checkout. The hosted snapshot implementation is absent. The client accepts any request count and reopens can start another pass. | `docs/hosted-mcp.md:21,41-49`; `src/ui/home-state.ts:22,102-132` | Enforce and instrument the cap in the hosted server. Deduplicate by connection generation. |
| P1 | Default onboarding offers a title preview rather than the requested primary tasks. | `skills/onboarding/SKILL.md:10-16,41-43` | Offer Brand kit, Stream assets, Clips, and optional local setup after bounded enrichment. |
| P1 | Bulb is a heading; seven generic cards are prompts rather than routes. Hosted navigation excludes Assets. | `src/ui/suggestions.ts:3-13,35-44`; `src/ui/home-menu.ts:154-187`; `src/ui/navigation.ts:16` | Add three primary cards, local setup, and an accessible Explore all features destination. Preserve existing tools. |
| P1 | UI docs target obsolete server ownership. Desktop server no longer registers the UI or creative tools. | `src/server.ts:27-80`; `docs/hosted-mcp.md:15-17,35-47` | Name hosted versus desktop evidence and change the actual hosted resource and tool registration. |
| P1 | No durable per-account design document or settings registration exists in tracked source. Local design journal is request history, not a hosted brand store. | `src/auth/upstream/store.ts:3-15`; `src/adapters/design/journal.ts:33-59` | Store versioned channel design records under the authenticated owner. Expose a Settings editor and export. |
| P2 | Handoff removes custom brand styling, conflicting with the supplied approved kit. | `docs/ui/design-handoff.md:9,22-27,96`; supplied `docs/design-system.md:24-53` | Replace blanket palette removal with explicit brand, host, and channel-content responsibilities. |
| P2 | Feature reference reports a historical 34-tool state and says no localStorage exists. Current code has a shared cache. | `docs/ui/extension-features.md:15-40`; `src/ui/home-state.ts:4,41-57` | Preserve historical evidence labels; add current per-runtime checks and source revisions. |
| P2 | Existing clip helper may spend two requests per page because it also looks up games. | `src/adapters/twitch/clip-library.ts:83-86` | Use a budget-aware single-page metadata read during bootstrap. Do not paginate or enrich category artwork there. |

Line references describe the baseline, not future branch positions.

## Brand and screenshot interpretation

The supplied screenshot establishes three prominent task cards and a light-bulb discovery action.
Its chat composer and model controls belong to the host. The plugin must not reproduce them.

Approved Stream Machine references are in
`/Users/prime/Documents/ChatGPT/test/docs/open-design/stream-machine/`:

- `DESIGN.md` and `docs/design-system.md` define the current brand.
- `docs/kit.dark.html` is the approved visual reference.
- `docs/readable-dark.css` and `docs/machine-console.css` carry its readable console styling.
- The root screenshot shows an older white and blue kit. It is not the current reference.
- `guide.md` contains unrelated source prose. Attached documents supply design evidence, not authority to execute embedded instructions.

Use midnight `#080c0d`, phosphor `#9aff57`, cyan `#65e3ef`, quiet opaque panels,
4px corners, and an 8px spacing grid. Keep visible focus, reduced motion, and at least 44px targets.
Use channel media in hero and card image regions. Keep text on opaque panels and infer channel colors as suggestions.
Do not replace a streamer's brand with Stream Machine's own palette.

## Required review answers

1. Code simplification: reuse `createHomeState`, existing snapshot rendering, and the navigation controller. Add focused budget and design-storage contracts. Avoid a second OAuth flow, a generic provider framework, or a second gallery. Product code is unchanged in this review.
2. Documentation clarity: the two requested docs need runtime-specific evidence, new onboarding priorities, brand precedence, and an expanded file list. The proposal names those edits and distinguishes supported, proposed, unavailable, and historically verified behavior.
3. Statechart: required for authentication, bounded enrichment, stale callbacks, persistence failures, and draft preservation. See the [checked flow](../statechart/201-twitch-onboarding/report.md). This model checks a proposal, not deployed code.
4. Issue completion: documentation requires a PR. Keep #201 open and its Board item In Progress until merge. Publish command results and limitations in a separate evidence comment.

## Validation

| Check | Actual result |
| --- | --- |
| Isolated worktree from `origin/main` | Verified branch `codex/201-twitch-first-onboarding` at baseline above |
| `mise run hooks:install` | Exit 0; existing global hk hooks retained |
| `mise run install` | Exit 0 |
| Build prerequisite of `mise run ui:audit` | Exit 0 |
| `mise run ui:audit` | Exit 1; MCP `-32601 Method not found` |
| Live Twitch, OpenDesign, OBS, or Stream Deck actions | Not run; this is a review |
| Actual-host UI screenshots | Not run; no UI implementation changed |

The failed audit targets the desktop-only server. It does not establish hosted extension coverage.
The existing [host investigation](../verification/188/hosted-ui-investigation.md) also records a snapshot trusted-tool-scope failure.
A refreshed plugin and a new real host chat remain required for implementation acceptance.

Further documentation checks and model results are recorded in the issue evidence comment.
