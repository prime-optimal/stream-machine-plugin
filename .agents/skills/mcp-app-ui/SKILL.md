---
name: mcp-app-ui
description: "Use when changing the Stream Machine app UI, theme, icons, entrypoints, settings, mentions, model context, display modes, or forms to match the OpenAI MCP extension host surface."
---

# MCP app UI

Adopt OpenAI MCP extension features in the Stream Machine app without inventing APIs.

## Procedure

1. Build and audit.

   ```sh
   mise run ui:audit
   ```

   The table lists each feature as `used`, `partial` or `missing`, with evidence. Add `--json` for machine output.

2. Read `docs/ui/extension-features.md` for the feature you picked, then `docs/ui/design-handoff.md` for constraints and work order. Product flows come from `docs/plans/plugin-ux-2026-11-01.md`.

3. Check the API before you write code. Every `_meta` key and method must appear in the reference spec (`/Users/prime/working/mcp-extensions/docs/spec.md`, `patterns.md`) or SDK source (`/Users/prime/working/mcp-extensions/typescript/src`). The SDK stylesheet is `typescript/styles.css`. The reference plugin is `/Users/prime/working/mcp-extensions/plugins/bits-and-bolts`. If a key is not in the spec, test it in the host and say so.

4. Implement one feature. Follow the reference pattern and keep the change in the files the handoff lists. Metadata and UI changes are in scope. New server tools (settings, mentions, forms) need their own issue.

5. Verify.

   ```sh
   mise run check && mise run test && mise run smoke && mise run ui:audit
   ```

   The target feature's status must improve. Then capture host screenshots in light and dark, inline and fullscreen, at 375, 768 and 1440 px wide.

## Rules

- Use host variables and `@openai/mcp-extensions/app/styles.css`. Do not add custom palette colors.
- No external fonts or images unless the CSP domains are updated.
- Request a display mode only in response to a user action. Do not add dedicated display-mode buttons, because the host provides them.
- When the app opens from any entrypoint on desktop, check the host version against `26.928.20710` and show an update message on older builds. Mark Desktop-only features.
- The audit does not see styles or layout. Screenshots are the evidence for look.
- Write docs with the `technical-writing` and `unslop` skills.
