---
name: preview-recipe
description: Preview a Stream Machine streaming recipe, inspect required capabilities, or explain which local or cloud integrations a recipe needs.
---

# Preview a recipe

Read state with `stream_machine_open`, then list recipes with `stream_machine_list_recipes`. Respect returned availability and required capabilities. A provider being installed elsewhere does not mean this core can call it.

For `prepare-channel`, gather title and category ID from returned categories. Use `stream_machine_preview` and report exact fictional target plus before/after. Results always have `mode: mock` and `executable: false`; no apply tool exists. Never claim Twitch data changed.

Disconnected demo state: offer `stream_machine_connect_demo`. Unknown recipe/category or missing provider: report structured error, preserve requested intent, and avoid substituting an unrelated action.

Use `stream_machine_reset` only when asked to reset demo. Demo state lasts for current local server process; separate processes do not share accounts or history.

Future provider orchestration belongs in explicit typed adapters or host-driven skills. Do not forward arbitrary tool names, URLs, secrets, or user-provided executable commands.
