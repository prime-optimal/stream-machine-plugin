# Design and verification

Sources: https://developers.openai.com/plugins/concepts/ui-guidelines, `patterns.md`, `typescript/README.md`. Official `frontend-testing-debugging` covers generic rendered-UI QA. This file adds ChatGPT-specific checks.

## UI guidelines

- Inline card: at most 2 actions, no nested scrolling, no deep navigation.
- Carousel: 3 to 8 items, 3 lines of metadata each.
- Fullscreen: composer overlays the bottom. Keep controls clear of it.
- System fonts only. No custom fonts, no logo in the response. WCAG AA contrast and alt text on images.
- Brand color only on accents and primary buttons.
- Do not render subscription upsells or ads (plugin-guidelines).

## Host styles and safe areas

- `import "@openai/mcp-extensions/app/styles.css"`, then call `applyDocumentTheme` and `applyHostStyleVariables` (from `@modelcontextprotocol/ext-apps`) on connect and on `hostcontextchanged` (`typescript/README.md L67-117`). Classes: `.btn`, `.btn-primary`, `.card`, `.form-control`, `.cursor-interaction`.
- Apply `hostContext.safeAreaInsets` as padding on a wrapper, at start and on change (`patterns.md L21`).
- Do not add a palette of your own. Host variables cover light, dark and custom themes.

## Responsive sizes

Check entrypoint views at 375x812, 768x1024 and 1440x900. A thread tab is about half width (`patterns.md L15-19`).

## Caching

ChatGPT caches the sidebar icon and the HTML resource. It does not cache the tool result. Render from `localStorage` first, then replace with fresh results. Use a versioned key such as `my-app:home:v1` (`patterns.md L129-153`). Do not store secrets or private data.

## Version gate

On open from any entrypoint on desktop, compare the host version with `26.928.20710`. On older builds, show an update message instead of a broken view. Gate individual features on advertised capabilities, not on version (`patterns.md L5-11`). Source of the version: `app.getHostVersion()` (wrapper API). [unverified: exact version string field]

## Screenshot procedure

1. Build and run the server. Connect it per `chatgpt-plugin-dev/references/connect-and-test.md`. Refresh and start a new conversation.
2. Open the app inline (via a prompt) and fullscreen (via an entrypoint).
3. Capture light and dark, inline and fullscreen, at 375, 768 and 1440 px wide. Expected result: 12 images.
4. Check: no clipped content under the composer, no nested scroll in inline, host colors applied, no CSP errors in the console, images load.
5. Record what you did not check (mobile hosts, other platforms).

Static audits do not see layout. Screenshots are the evidence for look. For local widget iteration outside ChatGPT, use `frontend-testing-debugging`.
