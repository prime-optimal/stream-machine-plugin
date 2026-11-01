# Existing integration evidence

Stream Machine reuses the existing Twitch OAuth implementation and the deployed OpenDesign service on Sealos. OpenDesign's integrated HyperFrames workflow is the default rendering path. The roadmap does not require a new OAuth implementation, a new OpenDesign deployment, or a separate HyperFrames service.

This record separates earlier acceptance from the remaining plugin connection work. The source records below describe checks completed on October 30, 2026. They are not current service-health results.

## Current connection status

During the November 1, 2026 read-only check, the OpenDesign `list_projects`, `list_plugins`, and `list_skills` calls all failed with `Transport closed`. The current tool connection is unavailable. Those failures do not prove that the Sealos service is down. No deployment, container operation, or creative job ran during this check.

## Twitch OAuth

The implementation merged through [Stream Makeover PR #48](https://github.com/prime-optimal/stream-makeover/pull/48), at commit `3aaaac1`. Its reusable components are `TwitchService` and `ConnectionStore`. The service handles authorization state, token validation, encrypted storage, refresh, and disconnect behavior. [Service source](https://github.com/prime-optimal/stream-makeover/blob/3aaaac1/studio/lib/twitch/service.ts), [store interface and adapter](https://github.com/prime-optimal/stream-makeover/blob/3aaaac1/studio/lib/twitch/store.ts).

The prior acceptance established these results:

- The existing Twitch application authorized `KLabFM` with `moderator:read:followers`.
- The connection persisted after a browser reload.
- All 22 automated Twitch tests passed with the actual SQLite migration and D1 adapter.
- TypeScript checks and the production build passed.

The [account-connection record](https://github.com/prime-optimal/stream-makeover/blob/main/docs/twitch-auth.md#verification) documents the live results. The [merge verification](https://github.com/prime-optimal/stream-makeover/blob/main/docs/qa/twitch-oauth-merge.md) records the automated checks. Live profile-only authorization and disconnect/reconnect remain separate acceptance work in [issue #62](https://github.com/prime-optimal/stream-makeover/issues/62). The earlier failed callback has no confirmed cause.

### Remaining plugin connection work

The existing implementation binds a connection to a signed-in Sites user. A local stdio process does not inherit that identity. Stream Machine still needs a verified mapping between its caller and the stored connection owner, plus an adapter for its runtime and storage. A caller-supplied owner ID alone cannot authorize access. [Owner identity and routes](https://github.com/prime-optimal/stream-makeover/blob/main/docs/twitch-auth.md#flow).

The existing flow requests either no optional scopes or follower-read access. Updating a channel title requires `channel:manage:broadcast`, so the existing follower grant does not authorize that recipe. [Existing permissions](https://github.com/prime-optimal/stream-makeover/blob/main/docs/twitch-auth.md#permissions), [Twitch channel-update requirements](https://dev.twitch.tv/docs/api/reference/#modify-channel-information).

OAuth acceptance does not establish EventSub delivery. Background work also needs token validation that runs independently of the browser. Credentials remain outside model inputs, tool results, generated assets, and logs.

## Sealos OpenDesign service

The deployed MCP endpoint is [the existing Sealos `/api/mcp` endpoint](https://open-design-ssjzomvt.usw-1.sealos.app/api/mcp). Its implementation lives in the [prime-optimal/stream-machine fork](https://github.com/prime-optimal/stream-machine).

The endpoint exposes existing tools and resources through MCP Streamable HTTP. The public nginx proxy requires Basic authentication and forwards an internal daemon bearer credential. This is a single-tenant administrative connection, not public per-streamer authentication. Each MCP request requires authentication. A session ID does not grant access. [HTTP MCP contract](https://github.com/prime-optimal/stream-machine/blob/main/docs/http-mcp.md).

The deployment record reports successful initialization, discovery of 22 tools, `list_projects`, `list_agents`, and session deletion. Anonymous requests returned HTTP 401. It also records authenticated cloud Codex execution, 15 HTTP protocol tests, and 54 focused regression tests. [Deployment verification](https://github.com/prime-optimal/stream-machine/blob/main/docs/http-mcp-verification.md).

The later HTML authentication repair retained both authentication layers. Its public checks recorded authenticated HTML and API success, anonymous rejection, and successful MCP tool discovery. [Sealos authentication repair](https://github.com/prime-optimal/stream-makeover/blob/main/docs/sealos-ui-auth.md).

### Installed scenarios and artifacts

Two reusable scenarios already exist in the hosted workflow:

| Scenario | Output | Recorded acceptance |
| --- | --- | --- |
| `stream-alert-authoring` | A finite offline HTML alert with transparent idle, replay, cancel, and a bounded queue. | Fresh K-Lab and Night Arcade outputs passed browser and OBS checks. |
| `stream-overlay-authoring` | A persistent camera frame or fullscreen schedule. | Fresh camera and schedule outputs passed browser and OBS checks. |

The [creator runbook and package source](https://github.com/prime-optimal/stream-machine/tree/main/plugins/stream-machine) describe the installed workflows. [Cloud receipts](https://github.com/prime-optimal/stream-makeover/blob/main/docs/qa/scenarios/cloud-runs.json) record four successful runs with exact inputs and terminal statuses. The [QA handoff](https://github.com/prime-optimal/stream-makeover/blob/main/docs/qa/scenarios/README.md) links artifacts, hashes, browser assertions, and OBS evidence. [Archived packages](https://github.com/prime-optimal/stream-makeover/tree/main/docs/qa/scenarios/packages) include source-parity records.

The accepted alert scenarios use `requestAnimationFrame`. The accepted overlay scenarios are static. Those results do not prove HyperFrames seeking or a HyperFrames video render. The earlier GSAP pilot is a separate artifact. [Scenario implementation limits](https://github.com/prime-optimal/stream-machine/blob/main/docs/stream-scenarios-acceptance.md#scope).

Private K-Lab outputs contain supplied fonts with unresolved redistribution metadata. Public scenario defaults use system fonts. Synthetic alert playback does not prove real Twitch event delivery.

### Remaining work for issue #43

[Issue #43](https://github.com/prime-optimal/stream-machine-plugin/issues/43) connects Stream Machine to this existing service. Its remaining acceptance covers the following behavior:

- The existing tool connection can again read projects, scenarios, and artifacts.
- A recipe maps validated inputs to a selected installed scenario.
- Run tracking preserves the returned run ID and reports terminal success, failure, or cancellation without duplicate jobs.
- Artifact results retain the project ID, file reference, and source information.
- An isolated test project verifies the new plugin handoff. Existing deployment acceptance remains historical evidence.
- Provider credentials remain with the existing connection. Stream Machine does not expose administrative credentials to users.

This work has no Twitch OAuth dependency and requires no new deployment.

## OpenDesign's HyperFrames workflow

The existing OpenDesign integration defines `od media scaffold`, then `od media generate --surface video --model hyperframes-html --composition-dir …`. The render returns a task ID, and `od media wait` follows that task. The daemon owns the Chrome render process. [Integrated HyperFrames workflow](https://github.com/prime-optimal/stream-machine/blob/main/design-templates/hyperframes/SKILL.md#opendesign-integration-load-bearing-for-this-surface).

Composition sources belong under `.hyperframes-cache/` within the project. The rendered MP4 is the visible project deliverable. The existing source contains runtime, composition setup, audio, and route tests under [the daemon's media test directory](https://github.com/prime-optimal/stream-machine/tree/main/apps/daemon/tests/media). This audit did not rerun those tests or verify a hosted render.

### Remaining work for issue #44

[Issue #44](https://github.com/prime-optimal/stream-machine-plugin/issues/44) uses OpenDesign's existing HyperFrames integration. Its remaining acceptance covers the following behavior:

- Current service discovery confirms the integrated HyperFrames capability and installed version.
- One small composition with system fonts completes through the existing composition setup and daemon render workflow.
- Stream Machine follows the returned task ID and reports progress, failure, cancellation, or the completed artifact without duplicate jobs.
- The returned MP4 passes dimension, duration, visible-frame, and playback checks. Editable composition source remains retrievable.
- The recipe distinguishes rendered video from interactive OBS HTML. Existing alert and overlay scenarios retain their separate output contracts.

The connected acceptance depends on the reusable OpenDesign connection from issue #43. It does not depend on Twitch OAuth or a separate local renderer.
