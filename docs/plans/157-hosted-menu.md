# Plan: open the hosted menu after Twitch OAuth (#157)

## Problem

After a user connects Twitch on the Stream Machine Site, the Site shows the same onboarding page again. The plugin menu has a global entrypoint only on the local stdio server. Its Connections panel reads the local Twitch store, which hosted consent never fills, and starts local OAuth by default.

## Decision

Use a hosted menu and a separate local device workspace. Both servers serve the same UI bundle (`ui://stream-machine/workspace-v4.html`). The UI asks its own server which runtime it is on and shows the matching sections. An MCP app UI can only call tools on the server that served it. For that reason, hosted Twitch data appears only in the hosted menu, and device controls appear only in the local workspace.

## Contract

### `stream_machine_open` on both servers

The UI calls `stream_machine_open` at boot. Both servers return a `runtime` field. `siteOrigin` is `https://stream-machine-oauth-test.tinycocoa22.chatgpt.site`. The hosted server derives the origin from its setup, and the local server uses one shared constant.

| Server | `structuredContent` | Entry points |
| --- | --- | --- |
| Hosted | `{ runtime: "hosted", siteOrigin }` | `stream_machine_open`: `[{ type: "global" }]` |
| Local | Existing mock snapshot plus `runtime: "local"` and `siteOrigin` | `stream_machine_open`: none. `stream_machine_workspace`: `[{ type: "thread" }]` |

The hosted `stream_machine_open` is read-only, has an empty strict input schema, and carries `_meta.ui.resourceUri` set to the workspace URI with `visibility: ["model", "app"]`. Its text content says that Twitch runs on the hosted connection and that OBS, Stream Deck, creative, and worker controls need the desktop workspace.

### UI by runtime

| Section | Hosted | Local |
| --- | --- | --- |
| Home | Connection confirmation, channel snapshot, suggestion carousel, section cards, and a desktop note (#164) | Section cards |
| Connections | Hosted Twitch status. Connect opens the exact `${siteOrigin}/` through `app.openLink`; no preflight or `browserRequested` | A Site link first. Local preflight and OAuth only inside an explicit "Use desktop fallback" disclosure |
| Clips | Hosted clip tools | Local clip tools |
| Tools | Twitch cards only (channel, title preview with approval link, apply) | All cards |
| Assets, Stream Deck, Mock demo | Hidden | Shown |

The header badge reads `Hosted` or `Desktop workspace`. `connectionUrl` accepts `http://localhost:4017/connect` only on the local fallback path, and `${siteOrigin}/` only in hosted mode. It rejects credentials, query strings, and fragments.

### Site

- After the `?twitch=connected` callback, the page shows a done state: "Twitch connected. Return to ChatGPT and open Stream Machine." The page keeps the account card and Disconnect.
- **Connect with Twitch** appears only while the user is disconnected or permissions are missing. When permissions are missing, a short line says that connecting again adds them.
- `lib/stream-machine/ui-html.ts` is regenerated from the plugin's `dist/app.html` with `bun scripts/sync-clip-ui.ts` after the plugin UI builds.

### Skill

After hosted `stream_machine_twitch_status` verifies the account, the skill calls hosted `stream_machine_open`, and the user lands on Home with the connection confirmation and channel snapshot. Then it offers the title preview. Device controls use the local `stream_machine_workspace`.

## Verification

- Plugin: `mise run check`, `mise run test`, `mise run smoke`, `mise run build`, `mise run hooks:check`.
- Site: `bun run check`, `bun run build`, `bun test tests`.
- Browser: the hosted-mode and local-mode menus through the #110 fixture, and the Site done state through `bun run dev`.
- Live: publish the Site through the Sites workflow after the user approves. Connect from the ChatGPT desktop app and confirm that it lands in the hosted menu.
