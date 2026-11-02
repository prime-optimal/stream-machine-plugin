# Local navigation and Twitch Connections

Status: bounded scope approved by coordinator. Investigation only. Await next dispatch before source edits.

[Context builder export](88-context-builder-export.md) preserves the discovery baseline. This concise report incorporates the coordinator's later section-access direction and independently checked source. Its ownership list supersedes optional files in the raw export.

## Findings

- `src/ui/app.ts:17-29,97-117` creates one persistent live-controls subtree but replaces the app root on mock renders. No route model exists. "Built to Connect" describes fictional capabilities, not provider status.
- `src/ui/live-demos.ts:90-164` already has real OBS, Stream Deck, Twitch title, HTML overlay, and worker controls. Keep their state and action owners. Assets can expose existing HTML controls; Stream Deck can expose existing Original 3×5 USB controls. Neither means a full library or native profile editor.
- `src/ui/live-demos.ts:116-130` already has Twitch status and connect controls. Move those into Connections. Keep exact-title preview/browser approval/apply under Tools.
- `src/adapters/twitch/register.ts:14-40` returns typed tool envelopes. `src/auth/local-runtime.ts:89-103` returns a connection URL, not proof of authorization. `src/adapters/twitch/service.ts:10` authenticates status through the account provider.
- `src/auth/permissions.ts:26-57` owns the initial 12-scope policy, retained grants, missing grants, and disclosure. Reuse it. The separate-scope wording in the UX plan is stale; issue #93 explicitly supersedes it.
- Installed primary-checkout SDK declarations expose `App.openLink({url})`, which can return `isError` or throw, and `App.onteardown`, registered before connect. Source: `node_modules/@modelcontextprotocol/ext-apps/dist/src/app.d.ts:750-778,1197-1225`. This is API inspection, not host proof.
- Installed `@openai/mcp-extensions@0.2.1` exposes `deepLink.getCurrent()`. Local SDK source `mcp-extensions/typescript/src/app/deep-link.ts:14-44` normalizes host state. Host context changes can carry later links. Full host-link precedence remains #87/#88 work.
- `src/ui/app.ts:126-152` registers tool results before connect and applies host theme/safe areas. Preserve this order. No current teardown handler exists.
- `scripts/build.ts:7-12` bundles imported TypeScript but reads one CSS file directly. No build change is needed for this slice.

## Minimal ownership for next dispatch

Existing files:

- `src/ui/app.ts`: persistent menu, local selection, Home, explicit Mock demo, injected SDK link opener, retained host setup.
- `src/ui/live-demos.ts`: expose existing cards under their sections without recreating them; remove duplicated Twitch connect/status ownership; retain title approval and live-action serialization.
- `src/ui/style.css`: responsive menu, selected state, focus, Connections status.

New files:

- `src/ui/navigation.ts`: closed local section set and validated local selection.
- `src/ui/connections.ts`: schema-validated Twitch status/connect UI, explicit recheck, last-check time, missing grants, disclosure, safe link fallback.
- `tests/ui-navigation.test.ts`: section access, invalid selection, no provider calls from navigation, state retention.
- `tests/ui-connections.test.ts`: malformed/error results, stale reads, missing grants, link refusal, no false connected state.

Evidence ownership: `docs/verification/88-local-navigation/` and `docs/reviews/88-local-navigation.md` after implementation. No other source ownership requested.

## Menu and behavior

Home, Assets, Clips, Stream Deck, and Connections stay visible. Assets shows only existing constrained HTML authoring. Stream Deck shows only existing USB demo controls. Clips shows unavailable gallery/playback state, not fake cards or a player. Tools retains OBS, Twitch title, and worker controls. Mock demo remains explicit and fictional. Existing controls stay reachable.

Home and navigation run no provider tools. Keep view nodes and drafts across selection changes. No automatic worker actions, USB release/acquisition, OAuth, or write retries. Connection URL creation and link opening require explicit clicks. A returned URL, browser return, or stored grant never marks readiness. Recheck authenticates the account and shows missing required scopes. Ignore stale check results; failed refresh marks old data stale. Preserve #83 disclosure and permission list. Invalidate local title approval selection when reconnect starts; server remains final authority.

Use native `app.openLink` only through explicit user action; handle denial/timeout with a copyable validated URL and no automatic retry. Standalone uses an explicit browser link. Do not publish auth URLs in model context.

## Gates and acceptance

- Next coordinator dispatch authorizes implementation. No source edits in this investigation.
- #87 gates full host routing, deep-link acceptance, transport/media selection, and named-host support claims. No media delivery/CSP changes here.
- #92 gates authenticated configurable OBS setup. #93 depends on #88 and #92 and owns full contextual provider onboarding and task-return/account invalidation.
- Preserve existing tool names, provider contracts, server registrations, and entrypoints. Resource URI/cache changes require coordination before native deployment; `src/server.ts` is outside this slice.
- Tests prove every menu destination, honest unavailable states, retained drafts, one owner per action, mock/live separation, stale-check rejection, exact permission disclosure, and no provider calls from navigation.
- Run check, test, build, smoke, and hook checks after dispatch using repository mise tasks. Verify browser keyboard/focus and measured narrow/wide layouts with synthetic tool responses. No live OAuth/provider mutation is authorized.
- Local browser evidence does not prove Work desktop/browser support. Keep #88/#93 open until their full dependencies and acceptance pass.

## Investigation evidence and limits

Worktree: `feat/88-navigation-connections`, HEAD `864eaf262409ce72a65882aece32037c154c7d37`. Window 1, context `DA841F9D-D766-4C79-BD66-BBE1EC6045B6`; binding and empty initial selection verified before builder. Task tree initially clean.

Read #87, #88, #92, and #93 through an account-scoped GitHub read after default account lacked private-repository access. All four were open. No issue or board mutations.

Primary checkout has dirty `fnox.toml`; untouched. Separate #85 transcription worktree and all other worktrees preserved. No tests, installs, provider tools, OAuth grants, or live app actions ran. This checkout has no `node_modules`; inspected primary SDK read-only. Initial login shell emitted a mise permission error; later investigation used a non-login shell.

Simplification: retain existing card controllers; no general workflow engine or provider registry. Documentation: #93 resolves stale scope language. Statecharts: existing Connections and onboarding models are proposals, not runtime proof; update only if dispatched behavior changes their claims. Broader epic planning is excluded.
