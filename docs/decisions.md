# Architecture decisions

This record describes the decisions for the initial demo and the questions deferred to later work. It does not report current installation or integration status.

The [demo roadmap](roadmap.md) records the revised priorities from 2026-11-01. The goal is a quick prototype, not a complete platform. Twitch title updates, OBS alerts, Stream Deck buttons, and a chat-closed event-to-alert demo proceed in parallel where possible.

The existing Twitch OAuth, Sealos OpenDesign service, and OpenDesign HyperFrames workflow are reuse work. OpenDesign and HyperFrames move into V1 alongside the four core demos. Shared frameworks, broad recovery, hosted multi-user access, and public distribution do not block those demos. The [reuse record](reuse-evidence.md) separates prior acceptance from the remaining Stream Machine hookup.

The repository is [prime-optimal/stream-machine-plugin](https://github.com/prime-optimal/stream-machine-plugin).

The project board is [Stream Machine #18](https://github.com/users/prime-optimal/projects/18).

The initial architecture issue is [#1](https://github.com/prime-optimal/stream-machine-plugin/issues/1).

The default issue labels are `feat`, `phase:architecture`, and `priority:p1`.

## Accepted

The following decisions define the initial demo.

| Decision | Reason | Consequence |
| --- | --- | --- |
| The product is named Stream Machine. | The user confirmed the name. | The project has its own identity without K-Lab branding. |
| The project has a separate repository. | Streaming workflows extend beyond the event-specific Studio. | Selected code can be reused later without changing the existing deployment. |
| The first demo connects a demo account, selects a recipe, and previews actions. | The demo tests the architecture without live integrations. | Every demo account, action, and result is labeled. |
| The first MCP server uses local stdio. | The desktop agent can already call local MCP tools. | The demo requires no custom bridge or public endpoint and makes no hosted authentication claim. |
| The MCP App has a separate browser preview. | Native host testing and local browser testing verify different behavior. | A successful browser preview does not prove that the host renders the app. |
| Existing plugins are preferred. | They retain their authentication, hosting, and maintenance ownership. | OpenDesign service and Canva remain external dependencies. App IDs require verification. |
| OBS and Stream Deck remain local dependencies. | Their processes need access to the streamer's machine. | Mobile and web access requires a separately verified transport. |
| Recipes name capabilities, and adapters map those capabilities to tools. | Upstream tool names and availability vary. | A provider change need not change the recipe catalog. |
| Native Extensions are optional. | Platform support differs. | The app detects available capabilities and retains a chat fallback. |
| The project does not copy upstream implementations. | The candidates have different APIs and licenses. | A dependency receives a specific version after targeted verification. |

## Hosted Twitch tools

Issue [#130](https://github.com/prime-optimal/stream-machine-plugin/issues/130) supersedes local stdio as the default Twitch transport. The existing OAuth Site hosts stateless `POST /mcp`; publishing its `mcp` capability provisions the canonical Sites plugin. OBS, USB Stream Deck, local audio, and the independent worker retain their desktop runtime.

`mcp.json` registers both servers under distinct names: `stream-machine` for the hosted endpoint and `stream-machine-local` for the local stdio server. A single hosted entry would have removed 25 desktop tools from desktop installs, and swapping configuration files by hand was error-prone. Both servers expose Twitch tools with the same names. The onboarding skill routes Twitch calls to the hosted server and uses the local Twitch tools only after the user chooses the fallback.

Sites authenticates MCP requests and forwards a Site-scoped `oai-authenticated-user-id`. Each request must have that identity before discovery or tool execution. The handler closes over that owner for encrypted D1 token access and title preview storage. Strict request and tool schemas reject caller-supplied owner selectors. A shared service credential does not identify a user. Email and MCP session IDs never select an owner.

Public Site pages do not make user data public. Every MCP request, title approval, and private artifact request requires authenticated ownership. Title approval records survive separate requests, and atomic preview consumption prevents replay. A failed or ambiguous write is never retried through localhost. An authentication failure stays on the hosted sign-in path. The [hosted MCP guide](hosted-mcp.md) records configuration and verification boundaries.

The platform contract is documented in the installed Sites skill's `references/site-mcp-server.md`. Hosted code uses Web APIs and the supported Workers runtime; desktop modules stay outside the synchronized dependency graph. See [Cloudflare's Node.js compatibility reference](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) for runtime limits.

## Deferred, with triggers

The initial architecture deferred these decisions until the stated need arose.

| Decision | Trigger for resolution |
| --- | --- |
| Live Twitch OAuth code reuse and support for multiple accounts | The first real account connection requires these choices. |
| Hosted runtime and user isolation | The server needs multiple users, mobile access, or web access. |
| EventSub transport and a worker that remains available | The first recipe needs unattended events. |
| A bridge from cloud services to local tools | Cloud events must control desktop tools while chat is closed. |
| Persistent recipe and run storage | State must survive across sessions or devices. |
| Automatic execution policy | The first unattended write requires rules for permissions, expiry, retries, and revocation. |
| A HyperFrames plugin or local CLI adapter | A suitable plugin is verified or rendering work begins. |
| App dependency IDs and endpoint configuration | Connection discovery returns verified IDs and API details. |
| Packaging, installation, and publication | Initial validation passes and the target host's workflow is established. |

## Open product questions

These questions remain outside the initial demo's decisions.

- Which recipe should use live data first: channel updates, clip preparation, event subscriptions, or desktop setup?
- Does the initial live account model need multiple Twitch accounts per user or teams that share a channel?
- Which analytics outcomes matter: live stream snapshots, collected event trends, clip performance, or developer reports for games and extensions?
- Which actions may eventually run unattended, and which always require review?

These questions do not block the demo architecture. Demo data does not establish their answers.

## Evidence and guardrails

The following evidence limits the scope of the accepted decisions.

- The existing authentication code can be reused. Its Sites identity and storage model, which permits one connection per owner, are specific to that deployment. [Authentication service](https://github.com/prime-optimal/stream-makeover/blob/main/studio/lib/twitch/service.ts), [storage schema](https://github.com/prime-optimal/stream-makeover/blob/main/studio/db/schema.ts).
- Standard MCP Apps support portable tools and interactive views. OpenAI Extensions add host features whose availability depends on the supported capability. [MCP App guidance](https://developers.openai.com/plugins/build/chatgpt-ui), [Extensions specification](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md).
- Local package installation does not make stdio processes reachable from mobile or web clients. The inspected OBS and Stream Deck servers use local stdio. [OBS transport](https://github.com/prime-optimal/agentic-obs/blob/main/internal/mcp/server.go#L297), [Stream Deck transport](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L953).

[Integration choices](integrations.md) explains adoption constraints. [Architecture](architecture.md) describes component responsibilities and the evidence required for verification claims.
