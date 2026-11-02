# UI design handoff

This is a brief for the agent that redesigns the Stream Machine app UI so it looks native in the ChatGPT and Codex host and adopts the extension features. Read [extension-features.md](extension-features.md) first for the API and citation for each feature. Issue: [#113](https://github.com/prime-optimal/stream-machine-plugin/issues/113). Product flows are set by [the UX plan](../plans/plugin-ux-2026-11-01.md) and are not redefined here.

Citations use the same short forms as the reference page: `spec L<n>` and `patterns L<n>` for `/Users/prime/working/mcp-extensions/docs/`, `SDK` for `/Users/prime/working/mcp-extensions/typescript` (sources in `src/`, stylesheet at `styles.css`), `BB` for `plugins/bits-and-bolts`.

## Goals

1. The app uses host colors, fonts, radii and spacing, so light, dark and any host theme work without our own palette.
2. Every feature the audit marks `missing` or `partial` is adopted, or a written reason explains why not.
3. The app is checked at 375x812, 768x1024 and 1440x900 (`patterns L15-19`) and in the inline, fullscreen and thread-tab layouts.

## Non-goals

- No change to the tool set, routing, or recipe logic in `src/` beyond `src/server.ts` metadata, `src/ui/`, `plugin.json` and `skills/`.
- No new navigation model. Use the five sections in the UX plan.
- No new external fonts or remote images unless the CSP is updated (see constraints). The Clips gallery already adds its own origins (see Fonts).

## Constraints

- **Host look.** Import `@openai/mcp-extensions/app/styles.css` (exports map to `typescript/styles.css`, `typescript/package.json` L15), then call `applyDocumentTheme` and `applyHostStyleVariables` from ext-apps on the host context (SDK README L67-96). Inline the stylesheet at build time because of the CSP (README L117). Use the wrapper classes from README L109 and the cursor class `.cursor-interaction` from L111.
- **Theme.** Remove the dark defaults and follow the host. `applyHost` falls back to `dark` when the host sends no theme (`src/ui/app.ts:134`), and `:root` sets `color-scheme: dark` (`src/ui/style.css:24`). Remove the `--page`, `--panel`, `--accent` family (`src/ui/style.css:26-41`).
- **Safe areas.** `applyHost` maps insets to `--safe-{edge}` (`src/ui/app.ts:139-141`). `style.css` reads them on `.shell` (L55, L183) but pads with `max(36px, ...)` and `max(20px, ...)`, so the inset only wins when larger. Decide whether that is intended and check it in the host (`patterns L21-25`). `BB` uses a `.safe-area` wrapper that reads `--safe-area-*` (`BB src/app/index.html` L29-33, `<div class="safe-area">` at L937). The variable names differ, so confirm which names the host sets before relying on either.
- **Responsive.** Replace the 370, 600, 720, 950 and 1200 px breakpoints (`src/ui/style.css`) with container-based rules that work from 375 px up, including the half-width thread tab.
- **Reduced motion.** Keep the existing `prefers-reduced-motion` blocks.
- **Fonts.** Use `var(--font-sans)` and the `--font-text-*` sizes. Do not load web fonts. If one is needed, add its origin to `resourceDomains` in the resource `_meta` CSP (`src/server.ts:57`) and name the origin in the review. `resourceDomains` now lists three origins for the Clips gallery: the Site (`https://stream-machine-oauth-test.tinycocoa22.chatgpt.site`, saved clip video), `https://static-cdn.jtvnw.net` and `https://clips-media-assets2.twitch.tv` (thumbnails). `connectDomains` stays empty because the UI reaches tools through the host, not the network. Whether a real host applies these origins to `<video>` loads is unverified.
- **Display modes.** Request a mode only in response to a user action, such as opening a selected item. Do not add dedicated buttons for changing display modes, because ChatGPT provides them (`patterns L29`). Supported modes are in `spec L858-863`.
- **Version gate.** On any entrypoint open, compare the host version to `26.928.20710`. If the host is older, show an update message instead of the app (`patterns L5-11`, `BB controller.ts` L1504-1510). Desktop only.
- **Do not invent APIs.** Every `_meta` key and method must appear in the spec or SDK. `openai/iconStyle`, `prefersBorder` and the manifest keys `composerIcon`, `logo`, `logoDark` are used by `BB` only and are not in the spec. Use them only after testing in the real host, and say so in the review.

## Current token inventory

Defined at `src/ui/style.css:26-35` (dark) and L41 (light).

| Our token | Dark | Light | Host replacement |
| --- | --- | --- | --- |
| `--page` | `#0d1014` | `#f7f8f4` | `--color-background-primary` (or SDK `--background`) |
| `--panel` | `#15191e` | `#fff` | `--color-background-secondary` (SDK `--card`) |
| `--panel-raised` | `#1b2026` | `#eff2e9` | `--color-background-secondary` plus `--color-border-secondary` |
| `--line` | `#2b3138` | `#dce2d5` | `--color-border-secondary` (SDK `--border`), or `--color-border-primary` (SDK `--input`) for stronger lines |
| `--text` | `#f0f2f1` | `#20271d` | `--color-text-primary` (SDK `--foreground`) |
| `--muted` | `#9ca5ad` | `#5c6955` | `--color-text-secondary` (SDK `--muted-foreground`) |
| `--faint` | `#727d88` | `#667460` | `--color-text-secondary` at reduced emphasis, no separate token |
| `--accent` | `#c9f579` | `#c9f579` | `--color-text-info` (SDK `--primary`) for accent text, `.btn-primary` for buttons |
| `--accent-text` | `#19230e` | `#19230e` | `--color-text-inverse` |
| `--accent-soft` | `#202b19` | `#e9f5d8` | `--color-background-info` (SDK `--accent`) |

Host variable names come from the ext-apps `McpUiStyleVariableKey` union (`dist/src/spec.types.d.ts:31`) and the SDK stylesheet: `--color-background-primary/secondary/info/danger`, `--color-text-primary/secondary/info/inverse/warning/danger`, `--color-border-primary/secondary/danger`, `--color-ring-primary`, `--font-sans`, `--font-text-{xs,sm,md,lg}-size`, `--font-heading-sm-size`, `--font-weight-*`, `--border-radius-lg`. The union has more keys. This list names the ones the tables below use. `applyHostStyleVariables` only sets the ones the host sends. The SDK `--destructive` maps to `--color-text-warning`, not `--color-text-danger`, so use the danger variables directly for errors.

### Hard-coded colors to remove

These bypass the tokens. Each must map to a host variable or be deleted.

| Line in `style.css` | Value | Likely role | Replacement |
| --- | --- | --- | --- |
| 74, 117, 172 | `#517c20` | light-theme accent text | `--color-text-info` |
| 88 | `#59713b` | accent border | `--color-border-primary` |
| 90 | `#d5bef9`, `#2b233a` | purple badge | `--color-text-info` on `--color-background-info` |
| 96 | `#dbff9b` | primary button hover background | `.btn-primary` hover from the SDK |
| 98 | `#42562c` | accent border | `--color-border-primary` |
| 99 | `#385e16` | light-theme accent text | `--color-text-info` |
| 107 | `#7e9b52` | selected border | `--color-border-primary` |
| 138 | `#20291c66` | translucent fill | `--color-background-secondary` with alpha via `color-mix` |
| 150 | `#536b35` | border | `--color-border-secondary` |
| 177 | `#9e5149`, `#422722`, `#ffdbd5` | error state | `--color-border-danger`, `--color-background-danger`, `--color-text-danger` |
| 241 | `#9e5149` | error border | `--color-border-danger` |
| 244 | `#385e16` | light-theme link text | `--color-text-info` |

Roles are inferred from the values. Read each rule before replacing it.

## Typography

Body text uses `--font-text-md-size`, secondary text `--font-text-sm-size`, captions `--font-text-xs-size`. Headings use `--font-heading-sm-size` and `--font-weight-*`. Replace fixed sizes such as `h2 { font-size: 23px; letter-spacing: -.65px }` (`style.css:53`). Keep one heading level per view. The host card in the reference screenshots uses small headings.

## Iconography

- **Entrypoint icons.** Add `icons` to `stream_machine_open` and `stream_machine_workspace`, and to the server info. The host checks tool `icons` first, then server icons (`spec L59-63`). Give each a light and a dark SVG (`patterns L122`), 20x20 viewport, 1.33px stroke, single color, transparent background (`patterns L114-127`). Follow `BB src/server/index.ts:8-25`: read each SVG at startup and pass it as an `image/svg+xml` data URI with `theme: "light"` or `theme: "dark"`. A data URI needs no CSP domain. Note that `BB assets/icon.svg` uses a 32x32 viewBox with stroke 2, so follow `patterns` and verify in the host. `quickAction` icons (`SDK shared/ui.ts:6-14`) are optional, are not in the spec, and are not counted by the audit.
- **Plugin icons.** `BB .codex-plugin/plugin.json` L22-25 sets `composerIcon`, `logo` and `logoDark` under `interface`. The spec does not document them, so treat as unverified. Our `plugin.json:19-29` nests `interface` under `extensions.com.openai` and has none of them. Test in the host before committing to either layout.
- **In-app icons.** `icon()` (`src/ui/app.ts:42-54`) draws 24x24 SVGs with `currentColor` strokes, and `style.css:51` sizes them to 20x20. Keep that.
- **Tool titles.** Add a `title` to every tool (audit `tool-titles`, 0 of 34 at `00eb73f`). Sentence case, verb first.

## Layout per display mode

| Mode | Where | Content |
| --- | --- | --- |
| Inline | Chat card (screenshot 11, left) | One selected item or result, a short status, and Open workspace. Open workspace opens that item in the workspace and requests fullscreen. Do not add a separate Full screen button. No navigation chrome. |
| Fullscreen | Tab (screenshot 11, right; global entrypoint, screenshot 01) | Five-section navigation, search, card grid or detail view. Do not draw an exit button. |
| Thread tab | Beside chat (screenshot 02) | Same views at about half width. Sidebar navigation collapses to a top row. |

Detail pattern, from screenshot 03: a back link, a title, the main object, and an inspector column that moves below the object under about 768 px. List pattern, from screenshot 01: search field, count, primary action, card grid with a single add-to-chat button per card.

Paint from a cache first (`patterns L129-153`) so the first frame is not empty. Use a versioned key such as `stream-machine:home:v1`.

## Work order

1. **Host styles (host-styles).** Import `styles.css`, switch `applyHost` to the SDK helpers, delete the custom palette, map the hard-coded colors. Highest value and unblocks every later step.
2. **Safe areas and responsive.** Apply `--safe-*`, rebuild breakpoints, and check the three viewports.
3. **Tool titles and icons (tool-titles, entrypoint-icons).** Metadata only, in `src/server.ts` and a new `assets/` directory. `plugin.json` icon keys wait for host verification.
4. **Display modes (display-modes).** Read `displayMode`, build the inline card, request fullscreen on user action. Add the version gate here.
5. **Model context (model-context).** Add `content` blocks with a `resource_link`, a title and a thumbnail, gated by `hostContext["openai/modelContext"]` capabilities.
6. **Settings and mentions (settings, mentions).** New server modules. Both change `src/` beyond metadata, so open a separate issue per feature before starting.
7. **Forms, send-message, deep-link, file-entrypoint.** Optional, each its own issue. They depend on the UX plan decisions.

Steps 1 to 5 fit this brief. Step 6 onward needs approval because it changes server behavior.

## Files to touch

| File | Change |
| --- | --- |
| `src/ui/style.css` | Remove custom tokens and hard-coded colors, import host styles, safe areas, responsive rules |
| `src/ui/app.ts` | Host helpers, display mode, version gate, cache, model-context content, send-message |
| `src/ui/index.html` | Drop the fixed `color-scheme` assumptions if they conflict with the host theme (`<meta name="color-scheme">` at L6) |
| `src/server.ts` | `title` on tools, entrypoint `icons`, resource `_meta` |
| `plugin.json` | Icons, only after host verification |
| `assets/` | New directory (does not exist yet) for SVG icons, light and dark |
| `scripts/smoke.ts` | Extend only if a new tool or resource is added |

## Acceptance

Run these in the worktree.

| Check | Pass when |
| --- | --- |
| `mise run check` | No lint or type errors |
| `mise run test` | All tests pass |
| `mise run build` | Build passes and `src/ui/style.css` contains no `#` hex colors from the table above |
| `mise run smoke` | Server starts and lists the expected tools and resource |
| `mise run ui:audit` | host-styles, tool-titles, entrypoint-icons and display-modes read `used`. Any feature left `missing` or `partial` has a written reason in the PR. |
| Host screenshots | Captures of the app in the real host: light and dark, inline and fullscreen, thread tab, at 375, 768 and 1440 px wide. Attach them to the PR. |

The audit cannot see styles or layout, so the screenshots are the only evidence for how the app looks. Each status comes from these rules in `scripts/ui-audit.ts`:

- `host-styles` reads `used` when the `src/ui` sources import the SDK `styles.css` (L89-92). The audit scans sources, not the built HTML, because the build bundles SDK code that mentions every API (L37-39).
- `display-modes` reads `used` when the resource declares available modes and `src/ui` contains the text `requestDisplayMode` (L69-73).
- `tool-titles` reads `used` when every tool has `title` or `annotations.title` (L56-57). `main` has 34 tools at `00eb73f`.
- `entrypoint-icons` reads `used` when any tool has `icons` or the server info has icons. `plugin.json` icon keys alone read `partial` (L50-54).

## Evidence rules

State what was run and what was seen. Mark each claim as verified in the host, verified by the audit, or inferred. Do not report host behavior from the reference screenshots as Stream Machine behavior.
