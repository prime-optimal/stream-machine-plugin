# Architecture decisions

Repository: https://github.com/prime-optimal/stream-machine-plugin

Project: [Stream Machine #18](https://github.com/users/prime-optimal/projects/18)

Issue: [#1](https://github.com/prime-optimal/stream-machine-plugin/issues/1)

Default labels: `feat`, `phase:architecture`, `priority:p1`.

## Accepted

| Decision | Reason | Consequence |
| --- | --- | --- |
| Product name: Stream Machine | Confirmed by user | New project identity; no inherited K-Lab branding |
| Separate repository | Streaming workflows exceed event-specific Studio scope | Reuse selected code later; preserve existing deployment |
| First slice: demo connection→recipe→preview | Proves architecture with minimal integration risk | Every demo account/action/result explicitly marked |
| Local stdio core first | Desktop agent already orchestrates local MCP tools | No custom bridge, public endpoint, or hosted auth claim |
| MCP App plus separate browser preview | Native workflow and practical local QA need distinct surfaces | Browser success does not establish host rendering |
| Existing plugins preferred | Preserve working auth, hosting, and maintenance ownership | OpenDesign Cloud/Canva stay dependencies; no invented App IDs |
| Local OBS/Stream Deck dependencies | Hardware/process access belongs on streamer's machine | Mobile/web access requires separate verified transport |
| Recipes bind capabilities, adapters bind tools | Upstream naming and availability vary | Catalog can survive provider changes |
| Optional native Extensions | Platform support differs | Detect capabilities and retain chat fallback |
| No vendor copies yet | Candidate contracts/licenses differ | Pin dependency only after targeted verification |

## Deferred, with triggers

| Decision | Trigger for resolution |
| --- | --- |
| Live Twitch OAuth extraction and account multiplicity | First real account-linking slice |
| Hosted runtime and tenant identity | Multi-user or mobile/web server access |
| EventSub transport and durable worker | First unattended event recipe |
| Cloud-to-local bridge | Explicit need for cloud events to control offline-chat desktop tools |
| Persistent recipe/run storage | Cross-session or cross-device continuity requirement |
| Automatic execution policy | First unattended write; define action scope, expiry, retry, and revocation |
| HyperFrames plugin versus local CLI adapter | Verified plugin exists or rendering slice begins |
| App dependency IDs and endpoint configuration | Actual connection discovery returns verified IDs/contracts |
| Packaging/install/publication | Scaffold validation complete and chosen host workflow established |

## Open product questions

- Which recipe should graduate from demo first: channel update, clip preparation, event subscription, or desktop setup?
- Does initial live account model need multiple Twitch accounts per user or shared channel teams?
- Which analytics outcomes matter: live stream snapshots, collected event trends, clip performance, or developer game/extension reports?
- Which actions may eventually run unattended, and which always require review?

These questions do not block demo architecture. Do not infer their answers from fixtures.

## Evidence and guardrails

- Existing auth code is reusable, but its Sites identity and one-connection-per-owner storage are deployment-specific. [Source](https://github.com/prime-optimal/stream-makeover/blob/main/studio/lib/twitch/service.ts), [schema](https://github.com/prime-optimal/stream-makeover/blob/main/studio/db/schema.ts).
- Standard MCP Apps provide portable tool/UI behavior; OpenAI Extensions add host surfaces with capability-specific support. [UI guidance](https://developers.openai.com/plugins/build/chatgpt-ui), [Extensions](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md).
- Local package installation does not make stdio processes reachable from mobile/web. OBS and Stream Deck upstream transports are local stdio. [OBS](https://github.com/prime-optimal/agentic-obs/blob/main/internal/mcp/server.go#L297), [Stream Deck](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L953).
- Full integration inventory and adoption constraints: [integrations.md](integrations.md). Component boundaries and verification claims: [architecture.md](architecture.md).
