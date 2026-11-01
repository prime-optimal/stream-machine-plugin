# Stream Machine architecture

Status: architecture scaffold. First slice uses fixtures only. No Twitch authorization, EventSub subscription, channel update, clip download, or device command runs.

Repository: https://github.com/prime-optimal/stream-machine-plugin

Project: [Stream Machine #18](https://github.com/users/prime-optimal/projects/18)

Issue: [#1](https://github.com/prime-optimal/stream-machine-plugin/issues/1)

Default labels: `feat`, `phase:architecture`, `priority:p1`.

## First usable slice

1. Open Stream Machine onboarding.
2. Choose demo Twitch connection; clearly display simulated account and data.
3. Choose reusable recipe.
4. Inspect required integrations, scopes, inputs, and proposed actions.
5. Preview mock results. Unavailable integrations remain unavailable; fixtures never imply installation or permission.

This proves recipe discovery and review through chat tools and an MCP App. Separate browser preview supports local UI QA; it does not prove native host integration.

## Components and ownership

| Component | Owns | Boundary |
| --- | --- | --- |
| Plugin package | Listing, onboarding skill, recipe guidance, local MCP declaration | Describes implemented capabilities only |
| Local MCP core | Demo account, recipe catalog, action previews, structured tool results | Stdio process; no public endpoint or cloud identity implied |
| MCP App | Connection status, recipe selection, action review | Host capability detection; server results remain authoritative |
| Browser preview | Local demonstration of UI and fixtures | Development surface, separate from MCP host |
| Recipe contracts | Inputs, capability requirements, action plans, result provenance | Independent of provider tool names |
| Integration adapters | Map capabilities to verified tools and normalize results | Preserve provider authentication and execution location |
| Existing plugins | OpenDesign Cloud, Canva, other installed services | Reuse connections; no copied credentials or invented App IDs |
| Local dependencies | OBS and Stream Deck MCP processes; optional rendering tools | Execute on streamer's machine using host-supported local tooling |

Desktop agent can orchestrate multiple local MCP processes directly. First architecture needs no custom cloud-to-local bridge. Mobile/web access to those processes is a separate capability and must not be inferred from package installation.

## Recipe and adapter contracts

Recipes describe outcomes rather than upstream implementation details. Proposed durable fields:

- Recipe: stable ID, version, summary, input schema, required capabilities, ordered steps, preview behavior, failure policy.
- Capability: provider, action, execution location, required grants, availability, read/write classification.
- Action plan: recipe version, resolved inputs, target identity, proposed changes, prerequisites, expiry, mode (`mock` or `live`).
- Run result: run ID, step results, status, artifact references, provenance, timestamps, retry guidance.
- Adapter result: success, unavailable, missing connection, missing grant, invalid input, rate limited, failed, or cancelled.

These are architecture contracts; implementation may introduce them incrementally. Never label a simulated connection as real. Preview must not perform provider writes. Future live execution must revalidate target, grants, and plan freshness server-side.

Use narrow capability names such as channel read, channel update, clip download, scene list, and deck page preview. Do not expose arbitrary shell execution or unrestricted upstream tool forwarding as recipe execution.

## Authentication boundary

Future hosted identity and Twitch identity are separate. Existing Stream Makeover code provides reusable authorization-code, encrypted-token, refresh, and state-validation logic, but its owner model binds one Twitch connection to one Sites user. Extract domain logic behind storage and identity adapters; do not copy its Site identity or credentials. [Existing implementation](https://github.com/prime-optimal/stream-makeover/blob/main/studio/lib/twitch/service.ts), [schema](https://github.com/prime-optimal/stream-makeover/blob/main/studio/db/schema.ts).

Future live tools resolve account ownership from verified caller context. Tokens stay in server/local credential storage; model inputs, tool results, app state, logs, and generated recipe files never carry credentials. Developer credentials remain in fnox/1Password; production storage design remains an explicit later decision.

Hosted MCP authorization must follow its host's authenticated request contract. An installed local plugin does not provide multi-user authorization by itself. [OpenAI authentication](https://developers.openai.com/plugins/build/auth).

## Native UI

Start with standard MCP Apps: UI resource association, host bridge, structured results, and model-context updates. Keep tools usable without UI. Add OpenAI Extensions only when negotiated capabilities support them. [MCP App guidance](https://developers.openai.com/plugins/build/chatgpt-ui), [Extensions specification](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md).

Candidate surfaces:

| Surface | Stream Machine use | Fallback |
| --- | --- | --- |
| Global/thread entrypoint | Recipe library and current run | Open through chat tool |
| Onboarding | Demo connection and first recipe | Onboarding skill |
| Settings | Preferences and connection status | Status tool and explicit setup guidance |
| Composer mention | Selected recipe or artifact reference | Stable ID in chat |
| Model context | Current selection and action preview | Structured tool result |
| Deep link | Reopen recipe/run | Find record by ID |

Extensions spec's Web support refers to Work browser, not classic ChatGPT. Availability varies across desktop, iOS, Android, and web. Treat platform tables as planning evidence; actual host negotiation and verification determine availability. No universal mobile/web parity claim.

Current specification matrix: global/thread entrypoints, onboarding, and settings cover desktop, Work web, iOS, and Android; composer mentions cover desktop/Work web; file handlers are desktop-only; deep links exclude Android. These are specification claims, not verified availability in this scaffold. [Platform table](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md#L7-L25).

## Later execution lanes

Live Twitch linking comes after demo contracts stabilize. EventSub then needs its own subscription registry, renewal/reconciliation, deduplication, replay protection, and unattended credential validation. Chat completion and browser sessions cannot own durable event delivery.

A future hosted worker may process events while chat is closed. Cloud-to-local actions then require a separately designed authenticated bridge or supported host tunnel, device pairing, per-action permissions, expiry, deduplication, and offline behavior. This is deferred, not a prerequisite for desktop orchestration.

Render jobs likewise belong in a local process or suitable worker. HyperFrames authoring produces assets; stock-browser overlay playback must remain independent of authoring tools and secrets. [Existing overlay boundary](https://github.com/prime-optimal/stream-makeover/blob/main/overlays/README.md).

## Verification claims

Track separately: package validity, local process startup, tool discovery, harmless tool call, native UI render, browser preview, real account authorization, provider action, and unattended delivery. Passing one does not establish another. Demo release acceptance requires visible fixture provenance, working recipe preview, useful text results, and no provider/device side effects.
