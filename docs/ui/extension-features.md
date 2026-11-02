# OpenAI MCP extension UI features

This page maps each host UI feature in the reference screenshots to its API, to Stream Machine's current status, and to a concrete use here. Run `mise run ui:audit` for the live status table. Feature IDs below match the audit output. Issue: [#113](https://github.com/prime-optimal/stream-machine-plugin/issues/113). Product direction lives in [the UX plan](../plans/plugin-ux-2026-11-01.md). Design work is briefed in [design-handoff.md](design-handoff.md).

## Sources

- Spec: `/Users/prime/working/mcp-extensions/docs/spec.md` (cited as `spec L<n>`) and `docs/patterns.md` (`patterns L<n>`).
- SDK: `/Users/prime/working/mcp-extensions/typescript` (`SDK`): sources in `src/`, stylesheet at `styles.css`.
- Reference plugin: `/Users/prime/working/mcp-extensions/plugins/bits-and-bolts` (`BB`). `register.ts` is in `src/server/`. `controller.ts` and `point-annotations.ts` are in `src/app/`. Citations give the file name and line numbers.
- Screenshots: `/Users/prime/working/mcp-extensions/docs/resources/*.png`. The GIFs in `/Users/prime/working/mcp-extensions/resources/` were read as first frames only, so motion is not described.
- Our code: cited as `src/...:line` on `main` at `00eb73f`. Line numbers drift as `src/` changes.

## Status at a glance

Audit result on `main` at `00eb73f` (`mise run ui:audit`, 34 tools). Run the task again for the current status.

| Feature ID | Status | Section |
| --- | --- | --- |
| global-entrypoint | used | [Global library](#global-library-entrypoint) |
| thread-entrypoint | used | [Thread tray](#thread-entrypoint) |
| file-entrypoint | missing | [File viewer](#file-entrypoint-desktop-only) |
| entrypoint-icons | missing | [Global library](#global-library-entrypoint) |
| tool-titles | missing (0 of 34) | [Global library](#global-library-entrypoint) |
| settings | missing | [Settings](#settings) |
| mentions | missing | [Composer mentions](#composer-mentions) |
| display-modes | partial | [Display modes](#display-modes) |
| onboarding-skill | used | [Onboarding](#onboarding) |
| model-context | partial (structuredContent only) | [Model context](#model-context-attachments) |
| form-elicitation | missing | [Forms](#forms) |
| host-styles | partial (variables copied, `styles.css` not imported) | [Host styles](#host-styles-and-csp) |
| csp | used (empty domains) | [Host styles](#host-styles-and-csp) |
| send-message | used (Home suggestions) | [Follow-up messages](#follow-up-messages-and-deep-links) |
| deep-link | missing | [Follow-up messages](#follow-up-messages-and-deep-links) |

## Platform rules that apply everywhere

- Desktop-only features are marked **Desktop only** below. The platform table is `spec L14-29`.
- Version gate. The reference plugin needs ChatGPT desktop `26.928.20710` or later. Check the host version whenever any entrypoint opens and show an update message instead of a broken view (`patterns L5-11`). `controller.ts` compares versions with `localeCompare` at L1504 and renders an update-required state at L1510. Stream Machine has no version gate (`src/ui/app.ts`, no match for a version check). Status: proposed.
- Stale-while-revalidate cache. ChatGPT caches the icon and the HTML resource but not the tool result. The plugin should paint from `localStorage` first, then replace it with the fresh tool result (`patterns L129-153`). `controller.ts` reads the cache at L43 and writes it at L201 and L858. The key is `bits-and-bolts:library:v1`. Stream Machine has no `localStorage` use. Status: proposed. Suggested key: `stream-machine:home:v1`.
- One tool per entrypoint (`patterns L155-159`). Stream Machine follows this: `stream_machine_open` for global, `stream_machine_workspace` for thread (`src/server.ts:26`).
- Responsive targets are 375x812, 768x1024 and 1440x900 (`patterns L15-19`). Honor safe areas (`patterns L21-25`).

## Global library entrypoint

**Feature IDs:** global-entrypoint, entrypoint-icons, tool-titles.

**Screenshot 01 (global library) and GIF sidebar-entrypoint.** The host adds a sidebar item that opens the plugin in a tab with a global header ("Bits & Bolts Local"). The app shows a search field, a count ("36 parts"), an Import button, and a three-column card grid. Each card has a thumbnail, a name, a meta line ("STL · 6.6 MB") and a "+" button that adds the part to the chat. The composer stays docked below. The sidebar GIF shows the plugin detail page with Install plugin, Apps 1, and Skills 2.

**API.**

- Entrypoint declaration in tool `_meta["openai/ui"].entrypoints` (`spec L40-66`, global section `L76-118`). The spec schema for a global entrypoint is only `{ type: "global" }` (`spec L90-92`). SDK type: `SDK shared/ui.ts:6-37` with `quickAction { title, icons, target: { type: "tool", name, arguments } }`. `quickAction` appears in the SDK and in `BB` but not in `spec.md` `[unverified in spec]`.
- Icon resolution order (`spec L59-63`): the `icons` property on the tool in `tools/list`, then the server icon (`serverInfo.icons`), then a generic fallback. Tool titles come from `title`, then `annotations.title`, then `name` (`spec L65-74`).
- Reference: `register.ts` `ui()` L92-96, global entrypoint with `quickAction` at L217-228.
- Icons are 20x20 viewport, 1.33px stroke, single color, transparent background, with a light and a dark file (`patterns L114-127`, pair at L122). Caveat: `BB/assets/icon.svg` is a 32x32 viewBox with stroke 2, so the reference itself does not match the pattern text.
- `BB` serves each icon as an `image/svg+xml` data URI with `theme: "light"` or `theme: "dark"` (`src/server/index.ts:8-25`). It passes the same list to `serverInfo.icons` (L31), to each entrypoint tool (`register.ts:87`), and to `quickAction` (L221).

**Stream Machine status.**

- global-entrypoint: used. `stream_machine_open` is registered with the global entrypoint (`src/server.ts:25-36`).
- entrypoint-icons: missing. No tool has `icons`, server info has none, and `plugin.json` has no icon keys (`plugin.json:19-29`). The audit reads `used` only for tool `icons` or server info icons. `plugin.json` icon keys alone read `partial`, and `quickAction` icons are not read (`scripts/ui-audit.ts:50-54`).
- tool-titles: missing. None of the 34 tools has a `title` field (`src/server.ts:27-32` shows `description` and `annotations` only).

**Stream Machine use.** The global view becomes Home: recipe and scene catalog cards with an add-to-context button, plus a connection summary. Give each tool a human title so the sidebar and tool lists read well.

## Thread entrypoint

**Feature ID:** thread-entrypoint.

**Screenshot 02 (thread tray).** A tab named after the entrypoint ("Parts Tray") opens beside the chat. It shows the same library in a narrower three-column grid, so layouts must work at about half width.

**API.** `spec L204-247`. Declared next to the global entrypoint in `openai/ui` `_meta`.

**Status.** used. `stream_machine_workspace` carries the thread entrypoint (`src/server.ts:26`). The CSS has `max-width` breakpoints at 370, 600, 720 and 950 px and a `min-width` breakpoint at 1200 px (`src/ui/style.css:15, 180-182, 225, 249`). The narrow-tab case has not been checked in a real host.

**Stream Machine use.** A live session panel: current stream state, active recipe, last clip, and the next suggested action, kept beside the conversation.

## File entrypoint (Desktop only)

**Feature ID:** file-entrypoint.

**Screenshot 03 (file viewer) and GIF file-viewer.** A chat link ("Download joystick-cap.stl", labeled "Open STL file") opens a tab, "Bits & Bolts CAD viewer", with a "Library" back link, the file name, a 3D viewport with view controls, and a "Part details" inspector on the right (size, format, file).

**API.** `spec L249-357`. File extensions are declared in the entrypoint (`FileInput` at `spec L291-298`). The host passes the file through `resources/read` (`spec L388`). Writing back is covered from `spec L419`. Opening local files from the app uses `openai/files` (`spec L1268-1303`).

**Status.** missing. `src/server.ts` declares no `file` entrypoint.

**Stream Machine use.** Open exported clips, overlay JSON, or recipe files from chat in a preview tab. This needs a decision on which file types Stream Machine produces. Proposed, not planned.

## Settings

**Feature ID:** settings.

**Screenshot 07 (settings entrypoint).** The host plugin page shows breadcrumb Plugins > name, icon, description, an Open plugin button, a prompt banner, the MCP servers list, then a native "Settings" section. Fields are grouped ("Measurements" with a Units select; "3D viewer" with a Show grid toggle and a Default view select). Skills follow below.

**API.** `spec L522-835`. The capability is described at `spec L528-583`, with `readTool` and `updateTool` at `spec L596-601`. SDK: `SDK server/settings.ts`. A field is `{ schema, title, description? }` (L28-32). Registration takes `readTool` (default `settings.read`), `updateTool` (default `settings.update`), `fields`, `layout`, `read`, `update` (L42-74). `createSettings` is at L91 and must register before the server connects (L101-102). Reference: `register.ts` `createSettings` L162-196 with groups Measurements, 3D viewer and Library.

**Status.** missing. No settings tools in `src/server.ts`.

**Stream Machine use.** OBS host and scene defaults, Twitch channel and title template, Stream Deck profile, preferred display mode. Secrets such as tokens stay out of the structured settings and in the existing provider flow.

## Composer mentions

**Feature ID:** mentions. **Availability:** web and desktop.

**Screenshot 05 (composer mention) and GIF composer-mentions.** Typing `@` opens a typeahead titled "Bits & Bolts Local · Type to search" with file-icon rows. Picking one inserts the plugin icon and the plugin name, in blue text, into the composer.

**API.** `openai/mentions: { searchTool }` in the server capability (`spec L1329-1405`, key at L1339). The search tool needs `readOnlyHint: true` (L1340) and visibility that includes `"app"` (L1341). Items are `resource_link` blocks. SDK: `SDK server/mentions.ts:16-22`, `setHandler(handler)` where the handler receives `{ query }` and returns `{ items }`. Reference: `register.ts` L198-206.

**Status.** missing.

**Stream Machine use.** `@recipe` and `@scene`: search recipes, OBS scenes, and recent clips by name. Each item is a `resource_link` the model can then read.

## Model context attachments

**Feature ID:** model-context.

**Screenshot 08 (model context attachments).** The viewer has a "Current view / Isometric / Add" row. After Add, the composer shows a "Context" chip with a remove button. Opening the chip lists four rows, by type: Text ("Current view"), Resource link, Embedded resource ("Data"), and Image ("View of ... PNG").

**API.** `app.updateModelContext` (`spec L908-1135`). Group blocks with `_meta["openai/group"]` (L959). Titles with `openai/title` (L1058) and thumbnails with `openai/thumbnail` (L1078). Set `audience: ["assistant"]` for model-only blocks (L1106). Calls replace earlier context idempotently (L944). Supported block types: `spec L1128-1134`. Web hosts do not accept images (L942). Hosts expose capabilities in `hostContext["openai/modelContext"]` (L998). Reference: `controller.ts` resource_link block L606-626 (group L621, thumbnail L623); capability checks at L144 (image) and L174, L607 (resource link); `point-annotations.ts` L43-44, L150, L167, L179. Explicit versus background context: `patterns L49-80`.

**Status.** partial. `src/ui/app.ts:95-97` sends `structuredContent` only, and only when not standalone and `extensions.modelContext` is set. No `content` blocks, no thumbnails, no groups.

**Stream Machine use.** An Add to chat button on a recipe, clip or preview. It attaches a `resource_link` with a title and a thumbnail, grouped by session. Gate the image block on the host capability.

## Display modes

**Feature ID:** display-modes.

**Screenshot 11 (display modes).** The left side shows an inline card in chat: header with plugin name, a "Full screen" link, content, and truncated details. The right side shows the same app in a tab with an "Exit full screen" control.

**API.** `spec L836-880`. Rules at L858-863. Fullscreen applies to all entrypoints (L863). Picture-in-picture is not supported (L858). Declare preferred and available modes in the resource `_meta["openai/ui"]` (L842-853). Request a mode with `requestDisplayMode({ mode })` (ext-apps `dist/src/app.d.ts:1359`), and read `displayMode` and `availableDisplayModes` from host context (`app.d.ts:431-432`). Call it only in response to a user interaction, such as opening a selected item. Do not add dedicated buttons for changing display modes, because ChatGPT provides them (`patterns L29`). Reference: `register.ts` `readUi` from L603 (`openai/ui` display modes at L615-619), `controller.ts` L1303.

**Status.** partial. The resource declares preferred `fullscreen` and available `inline` and `fullscreen` (`src/server.ts:58`). `src/ui/app.ts` never reads `displayMode` (`applyHost` at L132-142) and never calls `requestDisplayMode`.

**Stream Machine use.** Inline mode is a status card: selected clip, asset or check, with an Open workspace action. Open workspace opens the selected item in the workspace and requests fullscreen as part of that action. It is not a generic Full screen toggle, which `patterns L29` rules out. Fullscreen holds the full workspace. See [the UX plan](../plans/plugin-ux-2026-11-01.md) for the inline summary rule.

## Onboarding

**Feature ID:** onboarding-skill.

**Screenshot 12 (plugin onboarding).** A modal over the plugin page: "<Plugin> is ready for use", with Maybe later and Set up buttons. Set up starts the onboarding skill in a chat.

**API.** `extensions["com.openai"]["onboardingSkill"]` in the plugin manifest (`spec L882-906`, key at L890). Reference: `.codex-plugin/plugin.json` L11 and `skills/onboarding/SKILL.md`.

**Status.** used. `plugin.json:18` points at `./skills/onboarding/SKILL.md`.

**Stream Machine use.** The skill walks through connecting Twitch, OBS and Stream Deck, in the order the UX plan gives.

## Forms

**Feature ID:** form-elicitation.

**Screenshots 13, 14, 15 and GIF image-picker.**

- 13 (resource picker): an inline prompt card "Choose CAD references" with allowed file types, a thumbnail strip with a "Choose files" tile, "View all", and Continue.
- 14 (select with thumbnails): numbered rows with thumbnail, title and description, and Continue.
- 15 (suggested values): a stepped form ("4 of 6") with a checkbox list of titled options, Skip for now, and Next.

**API.** Forms are `spec L1407-1945`. Servers on the 2026-07-28 protocol use MRTR (L1438). The legacy method is `openai/elicitation/create` (L1439).

- Thumbnails: `x-openai-thumbnail` on options (L1610). A thumbnail `src` must be an HTTPS URL or a base64 data URI (L1611). If any option of a property has a thumbnail, the host renders every option of that property with an image and shows a fallback image for options without one (L1613-1614). Option descriptions: L1581.
- Suggestions: `x-openai-suggestions` (L1663).
- Resource pickers: `x-openai-input` (L1721), explicit or implicit selection (L1727-1737), `userOptions` of `kind` `file` or `directory` and `accept` (L1753-1760). Option `_meta` takes `openai/thumbnail` and `openai/preview` (L1725). On Web, directory selection is unsupported (L1719), and forms requested through MCP Apps support only explicit selection without user uploads (L1720).
- Reference: `register.ts` `pickFile` L425-463, `pickReferences` L464-527 (thumbnail L494, preview L496), `reviewForm` L528-602 (`x-openai-suggestions` L561, option descriptions L575 and L580).

**Status.** missing. No elicitation call in `src/`.

**Stream Machine use.** Choose clip: screenshot 14 pattern with a frame thumbnail per candidate. Choose overlay: screenshot 13 with `accept` limits. Title suggestions: screenshot 15 pattern with `x-openai-suggestions` for stream titles. These replace free-text prompts for destructive or ambiguous actions.

## Host styles and CSP

**Feature IDs:** host-styles, csp.

**API.** SDK README L67-96: import `@openai/mcp-extensions/app/styles.css`, then call `applyDocumentTheme` and `applyHostStyleVariables` from ext-apps with the host context. The SDK `package.json` exports map `./app/styles.css` to `./styles.css` (`typescript/package.json` L15), so the file is `typescript/styles.css`, not under `src`. It defines `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, `--font-size-base`, and the classes `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.form-label`, `.form-control`, `.form-select`, `.form-check`, `.text-small`, `.text-muted`, `.text-destructive`, `.sr-only` and `.cursor-interaction` (README L111). Most of them fall back to a host variable: `--background` to `--color-background-primary`, `--foreground` to `--color-text-primary`, `--primary` to `--color-text-info`, `--accent` to `--color-background-info`, `--secondary` to `--color-background-secondary`, `--muted-foreground` to `--color-text-secondary`, `--border` to `--color-border-secondary`, `--input` to `--color-border-primary`, `--ring` to `--color-ring-primary`, `--radius` to `--border-radius-lg`, and `--destructive` to `--color-text-warning`, not `--color-text-danger`. `--card` and `--muted` are mixes of `--foreground` (`typescript/styles.css` L6-56). Host variable names are the `McpUiStyleVariableKey` union in ext-apps `dist/src/spec.types.d.ts:31`. It includes `--color-background-primary`, `--color-text-primary`, `--color-border-primary`, `--color-text-danger`, `--color-background-danger`, `--font-sans`, `--font-text-md-size` and `--font-heading-sm-size`. Inline the CSS because of the CSP (README L117). `prefersBorder` and `openai/iconStyle` appear only in `BB register.ts` (L95, L631) and are not in the spec, so treat them as unverified.

**Status.**

- host-styles: partial. `applyHost` copies host `--*` variables and sets `data-theme` (`src/ui/app.ts:132-142`), but `style.css` defines its own palette with a lime accent, `#c9f579` (`style.css:23-41`). `font-family` reads `var(--font-sans)` and falls back to a local font stack (L25). The SDK stylesheet is not imported.
- csp: used. The resource declares empty domains (`src/server.ts:57`). Adding external fonts or images requires listing the domains there.

**Stream Machine use.** Replace the custom palette with host variables so the app follows the host's light, dark, or custom theme. See [design-handoff.md](design-handoff.md) for the mapping.

## Follow-up messages and deep links

**Feature IDs:** send-message, deep-link.

**API.** `ui/message` with `openai/message { target, send }` (`spec L1143-1265`, L1184-1215; defaults `active` and `true` at L1190). Deep links arrive in `hostContext["openai/deepLink"]` (`spec L120-202`, key at L142). Reference: `controller.ts` `openai.message.send` at L1117, deep link handling at L806-817 and L1524.

**Status.** send-message is used for Home suggestion cards (#164). `src/ui/app.ts` calls `app.sendMessage` with the default `active` target and `send: true`, only when `getHostCapabilities().message.text` is advertised. The standalone preview has no host, so Try stays disabled. Deep links are still missing: the app does not read `openai/deepLink`.

**Stream Machine use.** A Send to chat action on an inline card that asks the model to continue ("clip this and suggest a title"). Deep links let a recipe mention open the workspace on that recipe.

## WebMCP (Desktop only)

Desktop apps can expose tools through `document.modelContext` (`spec L1136-1141`). `App.registerTool` is not supported there. Not audited and not planned.

## Unverified items

- Animation in the four GIFs was not observed.
- Host rendering of any Stream Machine change has not been checked in a real ChatGPT or Codex desktop host.
- `openai/iconStyle` and `prefersBorder` are used by the reference plugin but absent from the spec.
- The manifest keys `interface.composerIcon`, `logo` and `logoDark` come from `BB .codex-plugin/plugin.json` L22-25 and are not documented in the spec.
- `quickAction` (with `icons`) is defined in the SDK (`shared/ui.ts:6-14`) and used by `BB` (`register.ts` L219) but not described in `spec.md`.
