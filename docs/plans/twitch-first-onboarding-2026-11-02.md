# Twitch-first onboarding and personalized Home

Status: reviewed proposal, 2026-11-02. [Issue #201](https://github.com/prime-optimal/stream-machine-plugin/issues/201) covers documentation only. Implementation requires the separately owned slices below. Source baseline: `0ee524a5f1f0933e3ca04d17b162b84bbbc805c0`.

## Goal

Connect Twitch, show the channel immediately, and help the user choose useful work. Extend hosted onboarding and Home with account-scoped brand-document persistence. Reuse existing snapshot, navigation, clip UI, OAuth verification, and creative-operation safeguards. After verified connection, automatically run one durable enrichment job capped at five Helix enrichment attempts; show verified channel identity, real available media, three primary task cards, and separate desktop setup. Store editable `DESIGN.md` with provenance, optimistic concurrency, and suggestions that never overwrite user edits. No automatic generation, downloads, transcription, OAuth upgrades, or device actions. This proposal changes no runtime behavior. The [review](../reviews/201-twitch-first-onboarding.md) records source evidence and actual checks.

## Current-state analysis

### Runtime and deployment ownership

Two distinct servers exist:

- Hosted `stream-machine`: Twitch, clips, menu, owner-bound Sites authentication.
- Local `stream-machine-desktop`: OBS and Stream Deck only.

`src/server.ts#createServer()` currently registers only OBS and Stream Deck. UI resource, creative, transcription, worker, and Twitch registrations are commented out. Changing its `UI_URI` or restoring registrations would **not** update hosted Home and would violate current desktop boundary.

`docs/hosted-mcp.md` describes separate Sites source, D1 storage, authenticated request dispatch, and shared-module synchronization. Hosted handlers, snapshot implementation, schema migrations, and resource registration are not supplied. Exact existing hosted paths cannot be established from this export.

**Implementation prerequisite:** locate those files in retained Sites checkout; record their paths, source revision, migration mechanism, and UI build/publication path before runtime edits. Do not assume `scripts/sync-hosted-twitch.ts` deploys UI or copies new modules.

### Existing flow

1. `skills/onboarding/SKILL.md` requests hosted preflight and status.
2. Sites authentication identifies caller; Twitch OAuth connects channel.
3. `TwitchService.complete()` exchanges code, validates token, reads profile, encrypts tokens, and conditionally saves connection.
4. Hosted status verifies account/grants.
5. Hosted `stream_machine_open` returns `{ runtime: "hosted", siteOrigin }`.
6. `app.ts#accept()` to `setRuntime()` to `home.activate(true)`.
7. `createHomeState.open()` requests status, then `stream_machine_twitch_snapshot`.
8. Snapshot result passes Zod validation, enters browser state, and writes shared `localStorage`.
9. `home-menu.ts` renders channel profile, banner, facts, clips, and generic suggestions.

Browser state runs on browser event loop. OAuth, authorization, persistence, and upstream requests remain server responsibilities.

### Relevant ownership and mutation points

| Component | Current responsibility | Reuse / limitation |
|---|---|---|
| `home-state.ts` | Status, snapshot, cache, stale-response revision | Reuse revision protection; remove pre-verification media painting |
| `home-menu.ts` | Safe DOM rendering, media, suggestion carousel | Reuse media rendering and HTTPS allowlists |
| `navigation.ts` | Closed section set, visibility, panel focus | Extend rather than replace routing |
| `app.ts` | Runtime selection, persistent panels, host messages | Wire identity invalidation and new panels |
| `clips.ts` | Paginated gallery, save, ZIP, detail/player | Preserve #195 ownership; not an onboarding enrichment engine |
| `clip-library.ts` | Clips plus category lookup | May add requests; unsuitable for five-request onboarding unchanged |
| `TwitchService` | OAuth, token validation/refresh, connection lifecycle | Preserve encrypted storage and refresh leases |
| `CreativeController` / `CreativeJournal` | Explicit generation, UUID/hash reservation, recovery | Preserve; fixed QA recipes are not brand-kit implementation |
| `TranscriptionService` | Explicit local-file transcription | Disabled in desktop registration; not hosted clip transcription |

### Current blockers

- `paintCache()` exposes previous cached channel before verifying current caller/account.
- Any structured status fault currently becomes disconnected; transient provider failure can wrongly clear cache.
- `open()`, `verified()`, and `retry()` can independently request another snapshot. Browser revision prevents stale painting, **not duplicate upstream calls**.
- Snapshot reports `twitchRequests`, but supplied code does not prove budget enforcement, retry accounting, server deduplication, or durable completion.
- `TwitchService.withAccessToken()` validates status, then separately rereads connection. New enrichment must bind requests/results to a connection generation, not Twitch ID alone.
- Home correctly labels its sample Top clips. Twitch returns broadcaster clips by view count; preserve that label rather than promising the latest clips.
- `safeHttpsUrl()` does not reject ports; new onboarding media must use exact HTTPS host/origin checks.
- `createHome()` creates an unretained `ResizeObserver`; disposal currently does not disconnect it.
- `clips.ts` has no supplied account-reset API. Old selections and pending save completions need explicit invalidation.
- No durable brand-document settings exist.

### Outdated direction to supersede

- `plugin-ux-2026-11-01.md`: task-first/no automatic checks and earlier first-workflow decisions are historical for this slice.
- `design-handoff.md`: blanket prohibition on brand palette is superseded by supplied brand direction. Host integration/accessibility rules remain.
- `extension-features.md`: "no localStorage," empty CSP, older server metadata, and several status claims are historical. Existing investigation proves some hosted rendering and status reads, not current snapshot trust/discovery.
- Packaged onboarding: automatic title-preview offer becomes three-task offer. "Open desktop workspace" guidance is incorrect: desktop server has no workspace.
- Existing creative provider supports constrained overlay/HTML operations, not arbitrary brand-kit generation.
- Preserve current consent policy. Do not request new permissions merely to personalize Home. Request task-specific permissions only when a selected workflow requires them.

## Design

### A. Verified connection to durable enrichment

#### Authoritative trigger

Start enrichment server-side:

- Immediately after successful `TwitchService.complete()` persistence.
- On the explicit onboarding-start tool for an existing verified connection lacking enrichment state. Status and read tools remain read-only.

Browser activation cannot be sole trigger: OAuth can complete while app closed.

Use existing hosted background-work mechanism. Background scheduling may be best-effort; the idempotent onboarding-start action resumes durable job state. No generation/device work enters this mechanism.

#### Identity contract

Add server-generated `connectionGeneration` UUID:

- New generation on successful OAuth connection/replacement, including same Twitch account.
- Preserve through token refresh.
- Invalidate on disconnect.
- Never accept generation or owner as authority from tool arguments.

Internal operation identity:

> authenticated Sites owner + Twitch account ID + connection generation + enrichment schema version + run ID

Public generation is an opaque stale-result guard, not authorization. The automatic run ID is deterministic per connection generation and uses the connection record ID plus generation for deduplication, scoped to the authenticated owner. Explicit Refresh channel data creates a new run ID from a deduplicated user action. Reopens never create a run.

Add optional generation field to status and snapshot results. Existing fields/tool inputs remain compatible. New UI does not display account media or load brand settings until generation-aware status verifies identity.

#### Five-attempt algorithm

Reuse the five documented snapshot reads:

1. Account `/helix/users`.
2. Channel `/helix/channels`.
3. Clips `/helix/clips`, one page, no category lookup.
4. Last archive `/helix/videos`, one page.
5. Followers `/helix/channels/followers`, aggregate total only when existing authorization permits it. Do not retain follower identities.

Use clips `first=20` without pagination and videos `type=archive&sort=time&first=1`. Report sample size, not channel-wide clip total. Endpoint fields and ordering: [Twitch API reference](https://dev.twitch.tv/docs/api/reference/).

OAuth exchange, token validation/refresh, and OAuth identity profile read are authentication work, excluded from enrichment cap. Every dispatched enrichment request counts, including a repeated users read. Reuse verified profile data when available, so fewer than five requests is valid.

Rules:

- Reserve attempt durably **before** dispatch.
- Network failure, timeout, malformed response, 401, 403, 429, and 5xx consume reservation.
- Disable automatic retries and redirect following.
- No pagination, games lookup, clip-byte fetch, scraping, or provider generation. Color sampling may read already fetched, allowlisted images with strict byte/time limits; it must not call another API or block Home.
- Image loads are browser presentation requests, not Twitch API enrichment; state this scope explicitly.
- Unavailable follower access skips that request and marks the total unavailable; bootstrap does not request broader consent.
- Execute sequentially; maximum five requests, bounded memory.
- Each pending section gets its first attempt before retrying failed sections.
- Automatic flow never retries.
- Explicit Retry may retry failed sections only using remaining budget; no new five-attempt allocation.
- Reopening app, duplicate status, duplicate snapshot, and token refresh do not reset budget.
- New successful OAuth generation creates one automatic budget. Explicit Refresh channel data creates a separate bounded run after its user action is recorded; duplicate clicks reuse that run.

After exhaustion: preserve partial result, report unavailable sections, disable enrichment Retry. Explicit Clips browsing remains separate user-requested work, not a concealed budget reset.

#### Crash and concurrency discipline

Use owner/generation-scoped durable lease:

- Atomic claim prevents concurrent workers/app instances.
- Persist reserved section and attempt number.
- Commit successful section only while generation and lease still match.
- Crash after reservation consumes attempt; no blind redispatch of uncertain reservation.
- Lease expiry permits remaining sections to continue.
- Late results from replaced connections are discarded.
- Disconnect invalidates job and stops further dispatch. In-flight fetch may finish, but cannot commit.

Do not hold a database transaction across HTTP. Use conditional writes and transactional batches for reservation and history updates. Check affected-row counts: a failed compare condition is not a SQL exception. [D1 batch behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/) supports atomic statement batches, not arbitrary application work inside a transaction.

New job state variants:

> `pending | running | complete | partial | invalidated`

Persist per-section outcome:

> `pending | succeeded | skipped | failed`, safe failure code, last attempt number

No tokens or raw provider errors in job records. Use a 3-second timeout per enrichment attempt and a 15-second pass deadline as initial implementation defaults. A deadline produces partial Home. Durable jobs resume only undispatched sections or explicitly authorized retries with remaining slots.

#### Onboarding tool interface

Preserve `stream_machine_twitch_snapshot({})`, its annotations, and existing field meanings. Reuse its verified read implementation inside the bounded collector; do not silently turn it into a document-writing operation.

Add hosted tools with explicit schemas and annotations:

| Tool | Input | Behavior |
| --- | --- | --- |
| `stream_machine_onboarding_start` | `{}` | Idempotently create/resume the connection's automatic run and seed the document; readOnlyHint false |
| `stream_machine_onboarding_read` | `{}` | Return committed run state, verified account/generation, partial sections, and design save state; readOnlyHint true |
| `stream_machine_onboarding_refresh` | Request ID, expected connection generation | Start one explicit refresh run or return its prior result; readOnlyHint false |
| `stream_machine_onboarding_retry` | Run ID, expected connection generation, request ID | Retry failed sections only within remaining reservations of that run; readOnlyHint false |

The new result includes schema version, run ID, connection generation, state, per-section outcomes, `attemptsUsed`, `attemptsMax: 5`, retry eligibility, observed timestamp, and design revision/save status. Bound counts in the schema. Do not redefine the old `twitchRequests` field.

Home calls start once after verification, then reads progress. OAuth callback and Home start share the same automatic run. Poll only while active and running: 1, 2, 4, then 8 seconds, at most ten reads per activation. These reads check caller authorization and stored generation but make no Twitch requests. After the limit, show **Check progress**. Deactivation cancels timers, not durable work.

All tools declare output schemas and explicit read-only, destructive, and open-world hints. Existing entrypoints still accept `{}`. Direct tool calls enforce the same owner and generation checks as the UI.

### B. Home, navigation, and account isolation

#### Rendering hierarchy

1. Compact verified account header: avatar, display name, `@login`, connection status.
2. Real available offline image, archive poster, or clip thumbnails.
3. Three equally prominent image-backed tasks: **Brand kit**, **Generate stream assets**, and **Clips**.
4. Separate fourth card: **OBS & Stream Deck. Desktop only**.
5. Labeled light-bulb action: **Explore all features**.

No replacement chat composer.

Use actual channel media when available. Otherwise use bundled static task illustrations, labeled as illustrations rather than channel output or generated results. No remote-image generation or paid call to fill empty cards.

Preserve available data when enrichment partial. Never infer follower total zero, missing media, or no clips from failed reads.

#### Navigation

Extend existing `Section` with:

- `features`: current all-features menu.
- `settings`: brand-document editor.
- `brand`: brand-kit workspace.

Preserve `home`, `assets`, `clips`, `streamdeck`, `connections`, `tools`, `mock` names and behaviors. No new general router.

Move current Home workspace links and seven suggestion cards into `features`; keep existing destinations and host-message guards. Light bulb calls `navigation.select("features")`, not `sendMessage`.

Hosted visible sections add `brand`, `assets`, `features`, `settings`; assets may show honest capability-unavailable state. Retain Clips, Connections, Tools. Do not expose local controls as hosted execution paths.

Fourth card behavior:

- Hosted: desktop setup guidance with explicit OBS/Deck conversational actions, host-message gated.
- Desktop with local tools discovered: host-mediated setup guidance for the correct local server. The hosted iframe itself still cannot invoke another server.
- No message support: copyable instructions, no dead button.
- Never invoke tools across server namespaces from hosted iframe.

#### Browser state

Replace shared cached public snapshots with in-memory verified-generation state:

- Delete legacy `stream-machine:home:v1`; never render it. Use verified in-memory content and durable server snapshots, not a new browser cache.
- No new account-media localStorage cache.
- Skeleton paints before identity verification.
- After status verification, display only matching account/generation data.
- Transient status failure: show **Connection check unavailable**; hide account-bound content until verified.
- Explicit disconnect/auth failure: clear identity, media, brand state, selected clips, player, ZIP results, and pending UI revisions.
- Account/generation change: same clear before loading replacement data.

Removing durable browser media cache avoids treating Twitch ID as Sites-owner isolation. Durable server snapshot still enables fast reopen after verified status.

Reuse revision guards. Add `deactivate()` to Home for polling cleanup; `dispose()` also disconnects observer and cancels scheduled callbacks.

Add `clips.resetIdentity()` to clear account/filter/media/ZIP state and invalidate pending reads/saves. Server remains final authority for writes already dispatched.

### C. Durable `DESIGN.md` settings

#### Storage and ownership

Store in hosted D1, not creative journal, browser storage, or local filesystem. Scope by authenticated Sites owner **and** Twitch account ID; reconnecting same account restores document. Account switch never exposes other account’s document.

New tables:

| Table | Fields |
|---|---|
| `brand_documents` | `owner_id TEXT`, `twitch_user_id TEXT`, `revision INTEGER`, `markdown TEXT`, `metadata_json TEXT`, `updated_at TEXT`; composite primary key |
| `brand_document_revisions` | owner/account, revision, Markdown, metadata, timestamp; composite primary key |
| `twitch_enrichment_jobs` | owner/account/generation/schema version/run ID as composite key; kind automatic or refresh, unique scoped idempotency request ID, state, attempts, section outcomes, partial snapshot, lease ID/expiry, timestamps |

These are proposed table names, to reconcile with the actual hosted schema before implementation. Brand revision begins at `1`. Metadata carries explicit schema version `1`. Keep latest 20 document revisions; retain current document until explicit deletion or existing account-erasure policy removes it.

Keep a current-run pointer scoped to owner/account/generation. At most one run is active there. Repeated refresh clicks reuse the active run; a new explicit refresh after completion creates a new run. Commit results only if run ID, generation, and lease still match. A late automatic run cannot replace a newer refresh.

Connection persistence gains generation field. Backfill each existing connection once using UUID; do not derive from ciphertext because refresh rotates ciphertext.

#### Document representation

One editable Markdown document plus structured provenance metadata:

- Stable field IDs.
- Suggested value.
- Current approved value, if any.
- Source references: provider, endpoint/source URL, observation timestamp, relevant account.
- Classification: `observed | inferred | approved`.
- Original generated-section hash.
- Pending suggestion ID and base revision.

Create a minimal deterministic draft immediately after account verification, then attach enrichment evidence as suggestions. No OpenDesign call is required to seed Settings. Existing account drafts are reused on reconnect. A failed database save leaves an explicitly unsaved draft and retry action; Home still works, and save retry does not restart Twitch enrichment.

Sections:

- Channel identity.
- Audience/content notes.
- Visual direction.
- Typography.
- Colors.
- Voice.
- Asset requirements.
- Sources.
- Pending suggestions.

Only observed channel identity/media can be seeded as observed. Palette, typography, voice, and audience deductions remain unapproved suggestions. Never infer channel’s palette from Stream Machine’s phosphor UI palette.

Imported OpenDesign archive is product UI reference, not automatic user-brand evidence or executable instruction.

#### Progressive updates without overwritten edits

- Every explicit Save submits whole Markdown with expected revision.
- Atomic compare-and-swap increments revision and appends history.
- Stale revision returns conflict; never last-write-wins.
- Editor preserves unsaved draft; offers compare with latest and explicit replace/save against latest.
- Enrichment updates append pending suggestions, deduplicated by source/value fingerprint.
- Automatic updates never rewrite existing Markdown after initial creation.
- **Apply suggestion** changes only selected generated section when its current hash matches base hash.
- Edited/deleted section produces conflict; show proposed text for manual incorporation.
- Applying or editing suggestion does not approve it.
- Explicit **Approve selected values** records values, user action timestamp, and resulting revision.
- Subsequent edits invalidate approval for affected structured values; unclassifiable free-form edits conservatively invalidate document-level approval.

Markdown rendered as text in editor. Any preview must disable raw HTML, scripts, remote embeds, and automatic image loads.

#### Tool contracts

Hosted-only additive tools:

| Tool | Input | Result |
|---|---|---|
| `stream_machine_brand_read` | `{}` | Current account and connection generation, document/revision, metadata, pending suggestions |
| `stream_machine_brand_update` | Expected generation, expected revision, Markdown | Saved document or `VERSION_CONFLICT` |
| `stream_machine_brand_apply_suggestion` | Expected generation, expected revision, suggestion ID | Updated document or section conflict |
| `stream_machine_brand_approve` | Expected generation, expected revision, selected field IDs | Updated approval metadata |

Every mutation checks `expectedConnectionGeneration` against the current authenticated owner/account atomically with its revision check. It is a stale-target precondition, never authority. Reject `CONNECTION_CHANGED` even if the replacement account has the same document revision. Apply this rule to refresh, retry, native settings updates, restore, deletion, approval, and seed-save retry. Native settings needs a generation-bound editable form or equivalent verified session precondition; if its update contract cannot carry one, keep account-specific writes in the editor.

Strict bounded inputs: Markdown maximum 128 KiB UTF-8; no caller-supplied owner, account, filesystem path, or source authority. Read never writes. The onboarding-start action owns seed-if-absent. Update/apply/approve tools declare mutations honestly. Add an idempotent seed-save retry action that does not touch the enrichment budget.

Settings provides the Markdown editor, source history, suggested swatches, last refresh, **Download DESIGN.md**, and revision restore. Restore creates a new revision under the same compare-and-swap rule; it never rewrites history.

Also register native `openai/settings` read/update tools before server connection. Their Brand kit group exposes simple preferences and a same-server MCP App action accepting `{}` that opens this editor. The read is pure; updates accept only changed properties. Do not pass Markdown through a presumed native rich-text field. Use the in-app editor when the host does not expose native settings.

The [current extension specification](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md) supports primitive settings plus tool actions and makes persistence the server's responsibility. Tool actions can open an MCP App modal. This is a design contract, not host verification.

Image colors are inferred suggestions with source URL, timestamp, and sampling method. Sample avatar/offline artwork before gameplay frames. If CORS or decoding prevents sampling, preserve unknown colors and let the user choose; do not claim exact brand colors or add API calls. Hostile bios, filenames, and imported Markdown remain data, never tool instructions.

### D. Task contracts and existing issue owners

| Task | Proposed behavior | Execution boundary / acceptance |
|---|---|---|
| Brand kit | Show seeded document, sources, inferred/approved values; explicit **Create or refine with OpenDesign** | #193 supplies owner-scoped OpenDesign project/job contract. Review inputs and side effects first; immutable request ID. Unknown outcome checks original request, never resubmits |
| Generate stream assets | Open existing Assets destination with approved brand revision reference and selectable recipe | #193 owns execution; #194 owns shared visual integration. No claim current fixed QA controller consumes full brand brief |
| Clips | Open existing gallery; present bulk download, transcription, subtitles with actual availability | Existing clip library #147 and playback #195 own their current scope; transcription #40/#151 and a separately scoped subtitle task own missing processing. Existing ZIP does not establish downloading arbitrary unsaved clips; local transcription does not establish hosted subtitles |
| OBS / Deck | Explain local prerequisite; offer explicit setup path | #191/#192 own setup/device behavior. No automatic check or device write |

Task selection navigates or prepares a brief. It does not start generation, bulk downloads, transcription, or device changes. Read-only gallery work follows its existing contract. If integration unavailable, workspace explains limitation and preserves intent; never silently falls back to mock or generic generation.

Brand handoff includes owner-scoped OpenDesign project ID, target DESIGN.md path, immutable document revision/content hash, request ID, and explicitly approved values. Read the target before writing; if its revision/hash changed, retain a proposed version and show a conflict instead of overwriting it. Read back successful writes and persist their remote revision/hash. Treat unknown outcomes as unresolved until the original request and file are inspected. Inferred values may accompany draft as clearly labeled suggestions, never approved defaults.

Bulk clip acceptance must be coordinated with the clip-library and transcription owners, not silently added to playback issue #195: selection, bounded batch size, per-item progress/cancel, partial failure, save-outcome ambiguity, actual media-to-transcript pipeline, timestamped subtitle output. Plain `TranscriptionService` text output cannot satisfy subtitle acceptance. #201 must not invent these APIs or re-enable disabled local services.

## File-by-file impact

### Repository files

| File | Change / dependency |
|---|---|
| `src/auth/upstream/store.ts` | Add connection generation and persistence contract; update every store implementation atomically |
| `src/auth/upstream/service.ts` | Generate on successful connection; preserve during refresh; generation-aware enrichment notification in the hosted callback after persistence; notification failure cannot fail successful OAuth |
| `src/adapters/twitch/onboarding-contracts.ts` (new) | Shared snapshot/enrichment schemas, section outcomes, additive result fields |
| `src/adapters/twitch/onboarding-service.ts` (new) | Five-attempt scheduler; injected authenticated access, fetch, durable store, clock; no filesystem/local runtime dependencies |
| `src/adapters/twitch/onboarding-store.ts` (new) | Persistence/lease interface; hosted D1 implementation separate |
| `src/brand/contracts.ts` (new) | Document, provenance, suggestions, revision and error schemas |
| `src/brand/service.ts` (new) | Deterministic seed, CAS updates, suggestions, approval invalidation; injected store |
| `src/brand/store.ts` (new) | Account-scoped transactional persistence interface |
| `src/brand/register.ts` (new) | Brand and settings tool registrations with safe failures; onboarding start/read/refresh registered in its own focused module |
| `src/ui/home-state.ts` | Shared contracts, generation guards, legacy cache deletion, bounded polling/retry eligibility |
| `src/ui/home-menu.ts` | Identity/media/task hierarchy; extract carousel; retain/disconnect observer |
| `src/ui/features-menu.ts` (new) | Existing suggestions and workspace links, preserving destinations |
| `src/ui/brand.ts` (new) | Brand workspace and explicit provider handoff; no automatic generation |
| `src/ui/brand-settings.ts` (new) | Markdown editor, sources, approvals, conflict comparison, retained draft |
| `src/ui/navigation.ts` | Add three sections and labels; preserve existing sections |
| `src/ui/app.ts` | Panels, task navigation, verified identity propagation, account reset, deactivation |
| `src/ui/clips.ts` | Narrow identity-reset hook; coordinate #195 |
| `src/ui/suggestions.ts` | Keep prompts; correct unsupported promises with issue owners; used by Features |
| `src/ui/style.css` | Shared product tokens; remove conflicting legacy rules; split workspace CSS to stay below 500 lines |
| `src/ui/home.css`, `src/ui/brand.css` (new) | Scoped Home/task/editor layouts |
| `scripts/sync-hosted-twitch.ts` | Explicitly copy new portable modules; update manifest/hash expectations |
| `scripts/build.ts` | Confirm imported CSS, static task images, UI packaging; update only required build inclusion |
| `skills/onboarding/SKILL.md` | Twitch-first verified flow, automatic bounded enrichment, three tasks, desktop-only fallback; remove title-preview default |
| `docs/plans/twitch-first-onboarding-2026-11-02.md` | Replace proposal with resolved #201 specification |
| `docs/plans/plugin-ux-2026-11-01.md` | Mark superseded onboarding/Home clauses, retain unaffected safety contracts |
| `docs/ui/design-handoff.md` | Brand exception, host boundaries, current runtime ownership |
| `docs/ui/extension-features.md` | Correct stale inventory; separate verified/current/proposed support |
| `docs/hosted-mcp.md` | Budget, account isolation, document lifecycle, deployment steps |
| `docs/verification/201-twitch-first-onboarding.md` (new) | Source mappings, test evidence, host limits, deployment revisions |

Leave `src/server.ts`, creative journal/controller, clip downloader, transcription service, and permission policy unchanged in the implementation. Existing tests guarding those boundaries remain mandatory.

### Hosted source changes

Existing hosted paths are unavailable in this checkout. Locate and record exact paths before editing:

- OAuth callback: schedule generation-bound enrichment.
- Owner-bound onboarding handlers: create/read/resume the durable job; status and shipped snapshot remain compatible.
- D1 connection adapter: generation backfill.
- D1 migration: three new tables and generation column.
- Hosted MCP bootstrap: register onboarding, brand, and native settings tools before connection.
- Hosted resource/build: new UI bundle, static images, cache-breaking resource URI.
- Authenticated browser routes: same owner-bound handlers; no independent trust path.
- Account-erasure implementation: remove enrichment and brand history. Disconnect clears active media and stops reads but retains the account draft for reconnect; Settings separately offers explicit deletion.

Use new hosted modules `lib/stream-machine/onboarding-d1.ts` and `lib/stream-machine/brand-d1.ts`, unless checkout already defines canonical equivalent locations. Extend existing adapters rather than duplicating them.

### Tests

Add:

- `tests/twitch-enrichment.test.ts`: five-attempt cap, failures, skipped grant, retry exhaustion, duplicate calls, crash reservations, leases.
- `tests/brand.test.ts`: deterministic seed, progressive suggestions, edited-section preservation, approval invalidation, size limits.
- `tests/brand-registration.test.ts`: real MCP contracts, safe errors, account authority.
- `tests/ui-brand.test.ts`: unsaved drafts, revision conflicts, account reset.
- Hosted D1 integration tests: concurrent CAS, owner isolation, disconnect/reconnect, migration/backfill.

Modify:

- `tests/ui-home.test.ts`: replace pre-verification cache expectations; generation/polling/identity tests.
- `tests/ui-navigation.test.ts`: added sections, light-bulb navigation, preserved destinations.
- `tests/ui-clips-state.test.ts` / new controller test: stale account reads/saves cannot repopulate UI.
- `tests/twitch-upstream.test.mjs` and fixture store: generation lifecycle and notification failures.
- Build/sync tests: hosted copied-module inventory and resource inclusion.

## Risks and migration

- **Hosted source gap:** exact existing paths and deployed snapshot behavior remain unverified. Resolve through source inspection, not deployment assumptions.
- **Connection migration:** nullable generation added first, backfilled transactionally, then required by new runtime. Token ciphertext format unchanged.
- **Browser migration:** delete shared v1 cache; no migration of unverified account data.
- **Rollback:** brand tables remain additive and untouched by old code. Old hosted snapshot code could bypass new budget; rollback must retain budget-enforcing backend or disable automatic enrichment.
- **Trust/discovery:** earlier host omitted snapshot from trusted discovery. Refresh discovery in fresh host session; never weaken trust restrictions.
- **Consent policy:** existing grants are separate from a task capability. No new grants are requested for Home personalization.
- **Parallel ownership:** #201 owns this review only. Implementation issues own onboarding orchestration, brand persistence, and task shell. #193/#194/#195/#191/#192 retain provider and workspace ownership; agree contracts before shared-file edits.

## Implementation order

1. **Map hosted source.** Start each implementation issue from current origin/main in its own worktree; inspect no secrets/caches. Record callback, D1, snapshot, build, deployment, and shared-source paths. Validate endpoint/SDK contracts against primary docs during implementation.
2. **Write failing regressions.** Reproduce pre-verification cache disclosure, duplicate enrichment, stale account results, and brand revision conflict.
3. **Land persistence foundation.** Add generation migration, job/document tables, adapters, in-memory fixtures, and isolation tests. Keep UI unchanged.
4. **Land enrichment atomically.** Callback/onboarding-start wiring plus durable reservation enforcement. Prove synthetic single-account behavior before concurrent cases.
5. **Land brand service/tools.** Deterministic seeding, history, CAS, suggestions, approvals. Verify two owners connected to same Twitch account remain isolated.
6. **Land UI state/navigation.** Identity invalidation, Home polling lifecycle, Features route, settings editor, clip reset. Preserve old routes and tool contracts.
7. **Land branded task composition.** Midnight `#080c0d`, phosphor `#9aff57`, quiet panels, 4px corners, 8px grid, 20px body, 44px targets. Use bundled Geist Serif headlines, Geist Mono controls, and restrained Geist Pixel labels from the approved kit, with host-font fallbacks. Retain safe areas, focus, reduced motion, and forced-color support. No external font fetches; verify bundled font loading and CSP. Coordinate #194.
8. **Connect approved provider contracts.** Explicit OpenDesign action and clip capabilities only after owners deliver verified contracts. Missing capability remains visibly unavailable.
9. **Update skills/docs and shared-source export.** Build hosted UI separately; version hosted resource, not desktop-only constant.
10. **Validate before publication.** Run check, tests, build, smoke, a hosted-targeted UI audit, migration and sync tests. The current desktop UI audit fails with method-not-found; fix its target in its own scope and record actual results. Browser-check 375×812, 768×1024, 1440×900; keyboard/focus, media errors, empty accounts, provider outages, account switching, console health.
11. **Publish and verify named host.** Record source/hash/deployment versions. Fresh discovery to OAuth verification to at most five recorded enrichment attempts to real identity/media to three tasks to Features navigation to durable edited document reopen. Confirm zero automatic paid requests, clip mutations, or device calls. Unsupported host/provider behavior stays explicitly unverified.

## Default onboarding skill revision

This is proposed skill behavior, to ship only after the named tools are registered:

1. Use hosted Twitch preflight and status. Follow the existing consent link and verify the returned account and connection generation.
2. After verification, start or resume the idempotent onboarding run immediately. The callback may already have started it. Do not ask for another confirmation to read channel metadata.
3. Open Home while enrichment runs. Show the verified account, successful media, progress, and any unavailable sections. Read progress without starting another enrichment pass.
4. Create or reuse the account's DESIGN.md draft in Settings. State whether it saved. Keep unknown brand choices empty or marked as suggestions.
5. Offer **Build my brand kit**, **Generate stream assets**, and **Work with my clips**. Also show **Set up Stream Deck & OBS · Local only**.
6. Open the selected workspace. Let **Explore all features** reach the existing catalog. Keep title preview available there.
7. Use OpenDesign only after Brand kit or Stream assets is selected. Preserve immutable brand inputs and the provider's result/unknown-outcome checks.
8. For local setup, discover local tools, then run read-only checks when the user chooses setup. Preview exact writes and apply only authorized changes. Never start broadcasts or alter devices during onboarding.

When the user says "Connect my Twitch account," the response describes connection, channel personalization, and the task choices. It does not promise a title change. The packaged skill must never name proposed tools as available before their deployment and discovery are verified.

## Presentation and acceptance details

The supplied screenshot guides the task-card arrangement, not the host's chat composer. At 1440px, all three primary cards are visible together. At 768px they reflow; at 375px they stack without a horizontal carousel. Keep the local setup option visible below them.

Use the channel offline image for the Brand kit card, archive frame for Stream assets, and a clip thumbnail for Clips, falling back through available channel media. Missing images use a quiet branded panel. Use opaque text panels, semantic headings, named buttons, 44px targets, and keyboard focus. The bulb is a labeled navigation action and makes no provider call.

The brand kit's approved source is `/Users/prime/Documents/ChatGPT/test/docs/open-design/stream-machine/docs/kit.dark.html`, with `docs/design-system.md`, `docs/readable-dark.css`, and `docs/machine-console.css`. Root `DESIGN.md` supplies provenance. Ignore the older white/blue screenshot and unrelated `guide.md` instructions. Stream Machine's visual identity frames the app; the streamer's saved brand stays separate.

A Settings draft starts with channel name/handle, sourced bio and media, unknown typography/voice, inferred palette suggestions, asset needs, and source timestamps. It can accumulate evidence from later explicit refreshes, selected clips, generated assets, and user edits. Each addition retains its source and approval state.

Test media origins against both URL validation and the actual hosted resource CSP. No wildcard image origins. Preserve semantic error/focus colors, light/dark and forced-color behavior, reduced motion, safe areas, and inline/fullscreen rules. Request display changes only from user actions and retain capability-gated message/model-context fallbacks.

## Execution index

Each row is a separately owned implementation slice. Sizes describe scope, not promised dates.

| Goal and issue | Done when | Key files | Dependencies | Size |
| --- | --- | --- | --- | --- |
| Bound onboarding, #202 | Single account then concurrent/crash/refresh tests prove at most five attempts and no stale media | Hosted callback/D1 source; onboarding modules; home-state tests | Locate current Sites source; coordinate #164/#93 | Medium |
| Save brand Settings, #203 | Draft saves, survives reopen, rejects stale account/revision writes, and exports/restores correctly | brand modules; brand-settings UI; native settings registration | #202 identity contract; #193 project contract | Medium |
| Recompose Home, #194 with #93 | Three primary cards, fourth local option, working bulb destination, empty/error states, host screenshots | home-menu, suggestions, navigation, app, scoped CSS, onboarding skill | #202/#203 contracts; coordinate shared files before edits | Medium |
| Connect creative tasks, #193 | One brand draft round-trip and one asset from chosen revision, with read-back evidence | Existing design adapter and brand handoff | #203; existing OpenDesign service | Medium |
| Complete clips tasks, #147/#195/#40/#151 | Bounded download, per-item failures/cancel, timestamped transcript and SRT/VTT output, playback proof | Existing clip and transcription modules | Media extraction and authorization contracts; subtitle follow-up scope | Large |
| Route local setup, #191/#192 | Cloud guidance and discovered local read-only checks; reviewed authorized writes only | Local server tools and task prompts | Desktop tools available | Small |

The [checked statechart](../statechart/201-twitch-onboarding/report.md) covers one generation, five attempts, partial Home, unsaved draft retry, invalidation, and preserved edits: 215 states, 749 transitions, eight invariants plus deadlock check passed. It does not prove hosted concurrency, cross-generation identity, revision conflicts, API behavior, or UI rendering. Those remain the named implementation tests above.
