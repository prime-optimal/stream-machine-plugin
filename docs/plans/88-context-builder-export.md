# Builder export for bounded local navigation

Coordinator follow-ups and independently checked source are recorded in [the concise findings](88-local-navigation-findings.md). That document controls the next dispatch. Preserve five primary sections; reuse supported content and label unavailable content honestly. No implementation is authorized yet. The raw builder proposal below is not an approved broader plan.

Corrections: #92 owns authenticated OBS configuration, not general lifecycle. Issues #87/#88/#92/#93 and Twitch status/channel code were checked after builder discovery. Local SDK API declarations were inspected separately; host behavior remains unverified. `src/server.ts` and its resource URI change are outside this local slice until coordinated. Retain lightweight stale-read rejection without expanding into full #93 setup orchestration. Do not infer expired access merely from missing future permissions. No extra channel-read action is needed to display authenticated account/grants status.

## Final Prompt

<taskname="Issue 88 UI Slice"/>

<task>
Planning only: determine smallest local UI slice for persistent primary navigation and genuine Twitch Connections replacing the current “Built to Connect” mock capability cards. Treat issue 88 routing as dependent on #87 host/media proof; do not absorb #93 Connections scope dependent on #92 lifecycle work. Report exact proposed owned files, minimal plan, gates, and acceptance with file:line evidence. No source edits, provider calls, OAuth grants, credentials, or primary fnox.toml changes.
</task>

<architecture>
- `src/ui/app.ts` currently composes one long-rendered mock workspace and mounts `createLiveDemos()` inside `#live-mount`; entire root is replaced per render. There is no active route/navigation state or focused Connections view.
- `src/ui/live-demos.ts` builds live provider controls as cards, including Twitch status/connect/channel/title; external URLs are direct target=_blank anchors. This is live tool UI, but not a persistent workspace shell.
- `src/server.ts` registers MCP global/thread entrypoints and serves `UI_URI`; entrypoint results remain mock `DemoWorkspace` snapshots. Native `App` / `OpenAIExtensions` are used by app.ts; local source confirms host context/theme/safe-area only. No local verified SDK navigation or external-link helper usage found. Installed versions: ext-apps 1.7.5, OpenAI mcp-extensions 0.2.1 (package.json, bun.lock). Host behavior remains unverified.
- Real Twitch APIs are registered separately in `src/adapters/twitch/register.ts`; `stream_machine_twitch_status` validates local stored connection and returns live account/scope metadata; `stream_machine_twitch_connect` starts the local OAuth flow and returns connect URL plus permission disclosure. UI can invoke these through existing `ToolRequest` transport.
- `src/auth/local-runtime.ts` hosts callback on localhost:4017, redirects success to a generic /connected page, and `connect()` reports stored grants/requested scopes. Connect does not itself prove a grant or capability; status/read after return must be authoritative. `src/auth/permissions.ts` currently requests 12 scopes (two implemented, ten future); the consent model #83 explicitly warns excess-scope policy conflict. Keep the existing consent semantics visible; do not claim all requested grants are usable features.
- `docs/statechart/primary-navigation/connections/README.md` and Home chart are proposal models: navigation keeps selected task, setup does not prove access, verified means authenticated required-capability read, and return preserves task. They do not prove runtime/host behavior.
</architecture>

<selected_context>

- `src/ui/app.ts`: current root render, mock snapshot discrimination, host bootstrap, result handling; target shell entry point.
- `src/ui/live-demos.ts`: current live Twitch and other controls, direct link behavior, mutation/pending safeguards; migrate only the minimum Twitch Connection controls while keeping other live controls reachable.
- `src/ui/style.css`, `src/ui/index.html`: shell styling and bundled app entry; no route styles currently.
- `src/ui/tool-transport.ts`: native vs `/api/tool` transport and result schema.
- `src/server.ts`: entrypoint metadata, mock-only opening snapshots, HTML resource CSP/display mode; local host contract facts.
- `src/adapters/twitch/register.ts`, `src/auth/local-runtime.ts`, `src/auth/permissions.ts`: authoritative real Twitch tool/OAuth/scope behavior.
- `src/adapters/twitch/clips-register.ts`, `clips-service.ts`, `clips-client.ts`, clip tests: clip metadata/download boundary relevant to labeling implemented Twitch capabilities; download requires clip scope and connected broadcaster ownership.
- `docs/statechart/primary-navigation/home/{README.md,Home.tla}` and `connections/{README.md,Connections.tla,chart.mmd}`: proposed navigation/handoff and readiness invariants.
- `docs/statechart/83-twitch-consent/{README.md,Consent.tla,chart.mmd}` plus scope tests: issue #83 policy and its limitations.
- `docs/plans/plugin-ux-2026-11-01.md`: broad direction/sequence, including #87 host gate, #88 shell, #92/#93 Connections sequencing, and candidate files.
- `docs/repoprompt-workflow.md`: repo workflow context only.
</selected_context>

<relationships>
- MCP global/thread entrypoint → `src/server.ts` mock snapshot → `src/ui/app.ts`; server tool result must not be mistaken for Twitch live state.
- UI `ToolRequest` → `src/adapters/twitch/register.ts` → `LocalTwitchRuntime`; `connect` gives authorization URL/disclosure, then explicit `status` or capability read determines state.
- Twitch `requiredTwitchScopes` includes two implemented and ten future scopes → status `missingScopes/reconnectRequired`; label capability state per implemented task/scope, never generic Connected solely from stored credentials or callback redirect.
- Home/Connections models: choose task → setup with return target → authenticated capability check → return preserving task; navigation itself makes no provider calls.
- Target slice should allow persistent navigation / Connections access and retain unmigrated controls via reachable Tools/live area, without implementing complete route/deep-link or workspace lifecycle contract until #87/#92 gates resolve.
</relationships>

<ambiguities>
- Issue text is not included in workspace context; scope derives from caller instructions plus UX plan. Confirm issue #88/#87/#92/#93 exact acceptance against GitHub before implementation.
- User instruction says “local SDK navigation, link opening”: checked repository use only establishes installed SDK versions, `App` / `OpenAIExtensions`, `app.getHostContext()`, `app.callServerTool()`, and direct browser anchors in live-demos.ts. SDK navigation/link APIs and actual host behavior were not locally verified; #87 gate owns that proof.
- Current “Built to Connect” content is explicitly mock (`app.ts:110-113` and 110’s template, capabilities), while live Twitch tools coexist above it. Distinguish these mock capability statuses from real Twitch provider status.
- Consent statecharts #83 and Connections statechart are checked abstractions, not provider/OAuth acceptance. No OAuth/provider action was run.
- Do not expand into #93’s full provider setup/lifecycle flows; its dependency #92 remains outstanding. Separate #85 transcription worktree exists; no sibling UI writer per coordinator.
- RepoPrompt git status call failed because this discovery context lacks frozen review target; no status conclusion.
</ambiguities>

<proposed_slice>
Likely minimal owned files: `src/ui/app.ts`, `src/ui/live-demos.ts`, `src/ui/style.css`, optionally `src/ui/index.html` only if persistent shell semantics require markup changes. Add route/helper modules only if #87 proves a local contract and #88 acceptance requires it. Do not own server/adapters/auth/provider lifecycle merely to present status/connect already exposed by tools. Preserve other live controls visibly reachable during incremental transition; isolate mock demo so mock state/status cannot masquerade as real Connections.
</proposed_slice>

<gates_and_acceptance>

1. Verify #87 named host proof for local routing/navigation and external Twitch link opening; distinguish SDK API contract from observed host behavior.
2. Keep #88 local UI slice narrow: persistent primary nav; Connections reachable; Twitch status is real tool result; explicit Connect opens existing URL; callback return requires status/capability recheck; honest states include not checked, checking, ready for specific scope, missing scope/setup, unreachable, unsupported/error. No route-triggered provider calls.
3. Preserve task/navigation context and keep non-migrated live controls accessible; isolate current fictional mock status behind explicit mock affordance.
4. Respect #83 consent disclosure/current 12-scope request and retained-grants behavior; no OAuth grant requested during planning. Do not claim future scopes implement functionality.
5. Defer full Connections lifecycle, provider-specific setup UX, stale-attempt orchestration, and broad setup/recovery to #92/#93.
6. Acceptance evidence: local tests for navigation state and Twitch rendering against fixture tool results; host proof recorded separately; no real provider call required for UI tests. Confirm no call occurs on route navigation.
</gates_and_acceptance>

## Selection

- Files: 26 total (26 full)
- Total tokens: 45035 (Auto view)
- Token breakdown: full 45035
- Token accounting: stale from bound_tab_cache; refresh pending

### Files

### Selected Files

stream-machine-plugin/
├── docs/
│   ├── plans/
│   │   └── plugin-ux-2026-11-01.md — 13,091 tokens (full)
│   ├── statechart/
│   │   ├── 83-twitch-consent/
│   │   │   ├── Consent.tla — 696 tokens (full)
│   │   │   ├── README.md — 1,060 tokens (full)
│   │   │   └── chart.mmd — 431 tokens (full)
│   │   └── primary-navigation/
│   │       ├── connections/
│   │       │   ├── Connections.tla — 1,197 tokens (full)
│   │       │   ├── README.md — 1,232 tokens (full)
│   │       │   └── chart.mmd — 270 tokens (full)
│   │       └── home/
│   │           ├── Home.tla — 710 tokens (full)
│   │           └── README.md — 931 tokens (full)
│   └── repoprompt-workflow.md — 1,658 tokens (full)
├── src/
│   ├── adapters/
│   │   └── twitch/
│   │       ├── clips-client.ts — 767 tokens (full)
│   │       ├── clips-register.ts — 449 tokens (full)
│   │       ├── clips-service.ts — 404 tokens (full)
│   │       └── register.ts — 1,073 tokens (full)
│   ├── auth/
│   │   ├── local-runtime.ts — 2,075 tokens (full)
│   │   └── permissions.ts — 1,023 tokens (full)
│   ├── ui/
│   │   ├── app.ts — 3,734 tokens (full)
│   │   ├── index.html — 97 tokens (full)
│   │   ├── live-demos.ts — 3,728 tokens (full)
│   │   ├── style.css — 4,832 tokens (full)
│   │   └── tool-transport.ts — 257 tokens (full)
│   └── server.ts — 890 tokens (full)
├── tests/
│   ├── twitch-clips-registration.test.ts — 819 tokens (full)
│   ├── twitch-clips.test.ts — 1,324 tokens (full)
│   └── twitch-permissions.test.mjs — 2,123 tokens (full)
└── package.json — 164 tokens (full)

---

## Generated Plan

## Chat Send ✅

- **Chat**: `88-bounded-navigation-in-80D7F9` | **Mode**: plan

### Response

# 1. Summary

Small UI refactor: persistent five-section navigation, existing live cards redistributed without duplication, genuine Twitch Connections replacing fictional capability cards. Reuse existing transport and Twitch tools. #87 gates host routing/link behavior; #92/#93 retain full Connections lifecycle and setup ownership. Planning only; no tools, edits, provider calls, or grants performed.

**Target artifact:** `docs/plans/88-ui-slice.md`. Not written: text-only restriction.

# 2. Current-state analysis

| Component | Current responsibility / evidence |
|---|---|
| App bootstrap | `src/ui/app.ts:17-29` owns SDK instances, transport, retained live subtree, and mock state. |
| Rendering | `src/ui/app.ts:100-126`, `render()` replaces root markup, then reattaches live controls. Mock capability cards belong to fictional snapshot—not Twitch. |
| Live controls | `src/ui/live-demos.ts`, `createLiveDemos()` retains per-card pending state, shared mutation guard, preview IDs, and creative request identity. Reuse these closures. |
| Transport | `src/ui/tool-transport.ts:3-20` validates tool envelopes; native calls use `app.callServerTool`, standalone calls use `/api/tool`. No transport change needed. |
| Twitch tools | `src/adapters/twitch/register.ts:10-40` exposes status, connect, channel, profile, and title operations. Successful results use `{ twitch: result }`; failures use `{ error: { code } }`. |
| OAuth | `src/auth/local-runtime.ts`, `connect()` returns authorization URL and stored-grant disclosure. `/connected` reports redirect completion—not verified readiness. |
| Consent | `src/auth/permissions.ts:30-64` separates implemented scopes, ten future permissions, requested scope union, and missing grants. Preserve current policy and warnings. |
| Entry points | `src/server.ts:10-38` opens same resource using mock workspace results. These results must never populate live Connections state. |
| Host limits | `src/server.ts:40-49` supplies restrictive CSP and inline/fullscreen modes. SDK versions appear in `package.json:16-21`; versions do not prove navigation/link support. |

**Existing call chain**

Explicit click → `ToolRequest` → registered Twitch tool → local runtime/account provider → live result → Connections-specific validation → local display.

Connect follows different boundary:

Explicit Connect → existing connect tool → authorization URL/disclosure → browser authorization → **explicit Check access**. Neither URL generation nor browser return establishes readiness.

**Reusable invariants**

- Home navigation executes no live action: `docs/statechart/primary-navigation/home/Home.tla:37-40`.
- Verified readiness requires authenticated capability read: `docs/statechart/primary-navigation/connections/Connections.tla:58-62`.
- Denied/incomplete consent preserves prior connection: `docs/statechart/83-twitch-consent/Consent.tla`, `RejectedKeepsConnection`.
- Clip download additionally requires scope and connected-broadcaster ownership: `src/adapters/twitch/clips-service.ts:15-22`.

**Decision:** targeted UI decomposition, not provider refactor. Missing behavior concerns composition and presentation; existing authorization, persistence, and tool contracts remain authoritative.

# 3. Design

## Persistent local shell

Build shell once after bootstrap. Keep header, primary navigation, global transport error region, and workspace containers mounted. Existing mock rendering updates **mock container only**.

Primary sections:

| Section | Smallest content |
|---|---|
| Home | Compact task links; no provider checks or invented recent history. |
| Assets | Existing creative card, unchanged operation semantics. |
| Clips | Honest scope boundary: “Clip workspace not included in this slice.” No player, download, or readiness claim. |
| Stream Deck | Existing USB demo card; retain limitation and Release action. |
| Connections | New Twitch panel only; other providers explicitly deferred. |

Secondary navigation: **Tools**, **Mock demo**.

Tools retains OBS, Twitch title preview/apply, and worker controls. Mock demo retains fictional workflow but loses **Built to Connect** capability-card section. Keep `Snapshot.capabilities` accepted for compatibility; stop rendering it.

Navigation contract:

- Closed local section set: `home | assets | clips | streamdeck | connections | tools | mock`.
- Initial section: Home.
- One active section; inactive containers use `hidden`.
- Button navigation, accessible `aria-current="page"`, stable section heading.
- Explicit navigation focuses destination heading.
- No history, hash routes, deep links, persisted route, or SDK routing integration in this slice.
- No tool call on selection, mounting, opening Home, or returning from browser.
- Retained DOM preserves inputs, output, preview IDs, and creative operation identity.
- Navigation never releases USB, changes worker state, or resets mock/live data.

This is local section selection, not completion of broader routing contract. Host routing remains gated by #87.

## Existing live-card redistribution

Change `createLiveDemos(request)` return contract:

- **Before:** single `HTMLElement`.
- **After:** named persistent elements for `assets`, `streamdeck`, and `tools`.

`app.ts` is sole supplied call site; update atomically.

Keep card construction and shared `mutating` closure inside existing factory. Move DOM ownership, not provider logic.

Remove Twitch **Check connection**, **Connect/reconnect**, and **Read current channel** controls from old card. Connections becomes sole owner of those operations. Keep title draft, preview, approval link, and Apply together in Tools.

No replacement mutation coordinator, controller framework, provider registry, or generic workflow engine.

## Twitch Connections panel

Add `src/ui/twitch-connections.ts`: small DOM factory, typed result parsing, presentation mapping, and panel-local state.

Partial interface:

> `createTwitchConnections(request: ToolRequest): HTMLElement`

Own app-instance memory only:

- Last successful status/account.
- Last successful channel read.
- Last successful check timestamp.
- Current pending operation.
- Last failure code.
- Connect URL and returned consent disclosure.
- Stale-result marker after failed refresh.

No credentials, token values, persistence, background polling, callback listener, or account-switch workflow.

### Actions

**Check Twitch access**

1. Disable panel actions; clear current readiness.
2. Call `stream_machine_twitch_status`.
3. Validate live envelope, account identity, and scope fields.
4. Call `stream_machine_twitch_channel`.
5. Validate channel response against actual `TwitchTitleService.channel()` contract before implementation.
6. Publish **Channel read verified**, account, check time, and separate task-scope indicators.

Status success alone displays **Account validated; channel access not checked** if channel read fails. Scope possession never proves successful title writes or clip downloads.

**Connect / reconnect Twitch**

1. Explicit call to `stream_machine_twitch_connect` with existing default arguments.
2. Display returned disclosure and exact requested/retained scopes.
3. Offer separate **Open Twitch authorization** link.
4. Use only #87-proven link mechanism. Until that proof exists, no native-host support claim.
5. Keep **Check Twitch access** visible with “After authorization, check access again.”

Connect performs no channel action. Do not auto-open returned URL, auto-recheck on focus, or infer readiness from `/connected`.

### Honest display states

| State | Required meaning |
|---|---|
| Not checked | No explicit successful check this app instance. |
| Checking | Current explicit read sequence pending. |
| Channel read verified | Status and authenticated channel read succeeded. |
| Setup needed | Unconfigured runtime or absent connection. |
| Access expired | Reconnect-required result. |
| Missing permissions | Validated grants omit relevant scope; list exact names. |
| Unreachable | Provider/transport unavailable; prior data remains visibly stale. |
| Check failed | Malformed result or other known failure. |
| Unsupported here | Only #87-confirmed host limitation—not generic fetch failure. |

Keep **policy completeness** separate from **implemented capability access**:

- Missing future scopes may set existing `reconnectRequired`; do not label usable channel read disconnected.
- Broadcast scope: “Title permission present; changes require separate exact-title approval.”
- Clip scope: “Own-clip download permission present; ownership checked per download.”
- Ten future permissions: explicitly “Not implemented.”
- Retain excess-scope policy warning and separate-bot disclaimer.

### Concurrency and errors

All UI state stays on browser event loop. One panel operation at a time; no overlapping check/connect attempts.

- Navigation leaves dispatched request running; completion updates retained panel only.
- Navigation never triggers replacement attempt.
- No automatic retries.
- Failed refresh retains previous data as **Stale**, but removes current verified badge.
- Malformed/mock envelopes cannot become live state.
- `app.ontoolresult` remains mock-specific; do not route unsolicited results into Connections.
- No cancellation API or stale-attempt orchestration added. Those belong to #92/#93.

## Scope exclusions and gates

**Before implementation**

1. Confirm actual #88/#87/#92/#93 issue acceptance. Supplied issue text absent; broad UX plan contains conflicting older permission guidance.
2. Inspect omitted `TwitchTitleService.status()` / `channel()` implementations and existing tests. Freeze exact response schemas and error mapping; do not infer field names.
3. Confirm #87 named-host evidence for entry behavior, navigation constraints, and external authorization links.
4. Verify build includes added UI modules without packaging changes.

**Explicitly deferred**

Deep links, host navigation APIs, media delivery/CSP changes, clip workspace, all-provider setup, account switching, return-to-task setup state machine, timeout/cancel orchestration, credential input, OAuth changes, and durable state.

# 4. File-by-file impact

**Exact proposed production ownership: five files.**

| File | Changes / dependency |
|---|---|
| `src/ui/app.ts` | Persistent shell and local section state; mount named live elements and Twitch panel; scope mock render/reset; remove fictional capability-card markup. Depends on both factories. |
| `src/ui/live-demos.ts` | Return named retained sections; remove migrated Twitch connection controls; preserve shared mutation guard and existing action closures. Atomic with app change. |
| `src/ui/twitch-connections.ts` — new | Twitch-specific parsing, read sequence, consent/link presentation, state mapping, retained panel DOM. Depends on verified existing result contracts and #87 link decision. |
| `src/ui/style.css` | Compact navigation, workspace visibility/layout, responsive menu, scope/status presentation. Reuse theme/safe-area/focus tokens; remain below 500 lines. |
| `src/server.ts` | Change only `UI_URI` to `ui://stream-machine/workspace-v3.html` to separate cache-breaking UI. No entrypoint/result/CSP changes. |

**Tests and evidence ownership**

| File | Changes |
|---|---|
| `tests/ui-navigation.test.ts` — new | Pure section-state tests: valid destinations, initial Home, draft-independent navigation, zero request dispatch. |
| `tests/ui-twitch-connections.test.ts` — new | Fixture schemas, presentation states, injected-request call order, pending guard, failure retention, mock rejection. Keep presentation mapping pure enough for Bun tests without DOM dependency. |
| `docs/verification/88-ui.md` — new | Ownership, gates, test exits, fixture/browser observations, separate #87 host references, unmet acceptance. |
| `docs/plans/88-ui-slice.md` — new | Final implementation handoff. |

**Not owned:** `index.html`, transport, adapters, auth, permission policy, storage, preview bridge, package dependencies, statechart sources, onboarding skills, primary `fnox.toml`.

# 5. Risks and migration

- UI resource URI changes; tool names, inputs, result fields, SQLite, and files remain compatible.
- Retained DOM must not weaken title/deck one-shot behavior or creative request identity.
- Existing direct approval/provider links remain subject to #87; moving cards proves no host compatibility.
- Full Connections readiness/return lifecycle remains unfinished by design. Document boundary; do not claim #93 completion.
- Rollback loses session UI state only; provider operations, worker, and USB ownership remain independent.

# 6. Implementation order

1. **Close evidence gates.** Confirm issue boundaries, #87 proof, and omitted Twitch result contracts. Record unresolved host limitations.
2. **Add Twitch presentation/parser tests and panel.** Use injected fixture requests only; no OAuth.
3. **Land shell migration atomically.** Update `app.ts`, live factory contract, CSS, and resource URI together. No duplicated action owner.
4. **Run local checks.** Existing check/test/build/smoke/package scripts; report actual exits, not assumed success.
5. **Fixture-browser acceptance.** Verify:

  - All primary sections reachable; Tools and Mock explicit.
  - Navigation dispatches zero tools.
  - Creative/title/deck drafts and operation IDs survive navigation.
  - Mock reset affects mock only.
  - Twitch labels match fixture outcomes; requested scopes never count as granted.
  - Keyboard focus, narrow layout, light/dark theme, and safe areas remain usable.

6. **Attach #87 host evidence separately.** Named host/version, supported link behavior, and transport reachability. No provider grant required for #88 fixture acceptance.

**Done:** persistent local shell, one authoritative Twitch Connections panel, no fictional capability badges presented as live status, all old live actions reachable, fixture tests passing, #87 gate satisfied. **Not done:** complete routing, media proof, or #92/#93 lifecycle/setup work.

> 💡 Continue this plan conversation with ask_oracle(chat_id: "88-bounded-navigation-in-80D7F9", new_chat: false). In Agent Mode, continuation requires the run that created this chat; after that run changes, start a new chat instead.
