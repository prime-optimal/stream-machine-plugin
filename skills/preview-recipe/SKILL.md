---
name: preview-recipe
description: Preview a Stream Machine streaming recipe, inspect required capabilities, or explain which local or cloud integrations a recipe needs.
---

# Preview a recipe

Use this procedure to preview a supported recipe without applying changes. Results have `mode: mock` and `executable: false`. No apply tool exists. Never claim that Twitch data changed.

## Prepare the preview

1. Read the workspace state with `stream_machine_open`.
2. List recipes with `stream_machine_list_recipes`.
3. Check the returned availability and required capabilities. Do not assume that this server can call a provider installed elsewhere.
4. If the demo account is disconnected, offer `stream_machine_connect_demo`.
5. For `prepare-channel`, ask for a title and a category from the returned catalog.
6. Call `stream_machine_preview` with the recipe ID, title, and category ID.
7. Report the exact fictional target and its current and proposed values.

## Handle errors and resets

If the recipe or category is unknown, report the structured error. If a provider is missing, report that requirement. Preserve the user's requested outcome rather than substituting an unrelated action.

If the user asks to reset the demo, call `stream_machine_reset`. Do not reset it for another reason. Explain that demo state lasts for the current local server process. Separate processes do not share accounts or history.

## Keep provider calls explicit

Use typed adapters or host-driven skills for future provider workflows. Do not forward arbitrary tool names, URLs, secrets, or user-provided executable commands.

First-time setup and the demo connection walkthrough belong to the `onboarding` skill.

## Examples

<example>
Context: The demo account is connected.
user: "Preview changing my stream title to 'Ranked grind' in Street Fighter 6."
assistant: "I'll call `stream_machine_preview` for `prepare-channel` with that title and the `demo-street-fighter` category, then show the before/after for the fictional demo channel. This is a mock preview; nothing is applied."
</example>

<example>
Context: The user asks what a recipe needs.
user: "What does the prepare-channel recipe need to run?"
assistant: "I'll list recipes with `stream_machine_list_recipes` and report its required capabilities and which ones this core can call."
</example>
