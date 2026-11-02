# Proposal coverage and critique

Issue [#201](https://github.com/prime-optimal/stream-machine-plugin/issues/201) is a review.
Implementation slices are [#202](https://github.com/prime-optimal/stream-machine-plugin/issues/202) and [#203](https://github.com/prime-optimal/stream-machine-plugin/issues/203), coordinated with the existing UI and provider issues.

The preservation baseline was the complete generated response in
`oracle-plan-2026-11-02-104722-twitch-onboarding-pr-b2d0.md`, lines 98-504.
The prompt and selected-file list were context, not proposal content.
The baseline was read in full before editing. The temporary exports were consumed and removed after this check.

## Coverage ledger

| Baseline content | Final location and disposition |
| --- | --- |
| Hosted versus desktop ownership, separate Sites source, deployment prerequisite | Current-state analysis and Hosted source changes. Preserved; no invented existing hosted paths. |
| OAuth/status/open/Home flow and current components | Existing flow and ownership table. Preserved with baseline file evidence in review. |
| Shared cache leak, duplicate calls, stale generation, observer and clip reset | Current blockers, Browser state, and tests. Preserved. |
| Superseded task order, old palette rule, historical audit and discovery | Outdated direction, Presentation, and review. Preserved with approved kit provenance. |
| Immediate post-consent trigger and fallback for existing connections | Authoritative trigger and onboarding tool contract. Preserved through mutating start action. |
| Owner/account/generation identity; token refresh versus reconnect | Identity contract, schema, migration, and tests. Preserved. |
| Five reads, before-dispatch reservation, failure counting, no hidden pagination/retries | Five-attempt algorithm. Preserved; exact count remains an implementation claim requiring instrumentation. |
| Durable lease, crash reservation, no DB transaction over HTTP, stale commits | Crash and concurrency discipline. Preserved; D1 primary docs added. |
| Partial state, read progress, finite poll schedule, deactivate/dispose | Onboarding interface and Browser state. Preserved. |
| Hero, channel media, three task cards, fourth local card, bulb | Rendering hierarchy, navigation, and presentation acceptance. Preserved. |
| Existing routes, capability fallback, no cross-server iframe calls | Navigation and task contracts. Preserved. |
| Per-owner/account design data, revisions, schema version, 20 revisions | Storage and ownership. Preserved; run identity corrected. |
| Fields, sources, observed/inferred/approved classification, deterministic seed | Document representation. Preserved; missing colors stay unknown. |
| CAS saves, pending suggestions, section hash conflicts, approval invalidation | Progressive updates. Preserved. |
| 128 KiB limit, no caller authority, safe Markdown | Tool contracts. Preserved; reads made pure. |
| Creative request IDs and unknown outcomes, immutable brand revision | Task contracts. Preserved; project/file binding and read-back added. |
| Bulk download versus saved ZIP, transcription versus timed subtitles | Task contracts and execution index. Preserved; ownership corrected. |
| File impact, hosted migration, sync manifest, resource version, account erasure | File-by-file impact. Preserved; proposed filenames clearly labeled. |
| Tests, migration, rollback, actual-host matrix, publication evidence | Tests, risks, implementation order. Preserved; audit failure called out. |

## Evidence-based corrections

- Scope: the baseline treated #201 as implementation. The user's requested deliverable and hands-off choice are a reviewed proposal. #201 remains documentation-only.
- Snapshot: the baseline redefined `twitchRequests` and made snapshot/read calls start persistent work. Shipped tool contracts remain compatible. Additive onboarding tools own persistent mutations and new accounting.
- Brand read: the baseline seeded during read. Seeding belongs to onboarding start, while brand and native settings reads remain read-only.
- Native settings: the baseline deferred it because a Markdown editor was uncertain. The current extension specification supports a same-server tool action opening an MCP App modal. The in-app editor is the shared destination.
- Refresh: a new explicit refresh run is distinct from budget-limited retry. Reopens never reset the automatic run.
- Fonts: the supplied approved kit requests local Geist fonts. Bundle those fonts with fallbacks and verify loading; do not replace them with a blanket host-font-only rule.
- Clip ownership: #195 covers playback. The proposal coordinates bulk library, audio extraction, transcription, and a subtitle follow-up with their actual owners.
- Source claims: retrieved Twitch docs establish broadcaster clip sorting by views. Keep Top clips. Imported design instructions remain untrusted data.
- Source scope: no new general provider framework, OAuth system, local workspace, or automatic paid generation is introduced.

## Bounded critique and resolution

A read-only critique compared the draft with the complete baseline. Three P1 findings were resolved:

1. Stale account A could save over account B at the same revision. All account-specific mutations now require expected generation checked atomically with authenticated owner/current account and revision.
2. Refresh runs lacked a durable run key. The job key now includes run ID, kind, and idempotency ID, with a current-run pointer and one active run per owner/account/generation.
3. Retry had no explicit tool contract. The proposal now separates retry within remaining budget, read-only Check progress, and an explicit fresh bounded refresh.

The critic found no other material preservation gaps. A final section review confirmed the ledger and the added onboarding procedure, execution index, and statechart limits. No baseline detail was removed solely to shorten the document.
