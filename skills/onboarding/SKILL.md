---
name: onboarding
description: Set up Stream Machine after installation or when the user asks to connect streaming tools and try a first recipe.
---

# Set up Stream Machine

Guide the user through the mock account connection and a recipe preview. The release does not connect real accounts, control broadcasts, or change Stream Deck profiles.

Never request tokens in chat. Do not start `obs-twitch-mcp` during onboarding. Its inspected startup code enables chat automation and requires changes before adoption.

## Open the demo

1. Explain that the current release uses a fictional Twitch account and mock recipe data.
2. Discover the Stream Machine tools through the host.
3. If the tools are absent, explain that the package requires a desktop host with local stdio MCP and Bun on `PATH`. Stop setup until the tools are available. Do not claim that installation succeeded.
4. Call `stream_machine_open`.
5. Offer the demo connection.
6. If the user chooses demo setup, call `stream_machine_connect_demo`.
7. Name the returned fictional account. Identify the account as demo data.

## Preview the first recipe

1. Call `stream_machine_list_recipes`.
2. Help the user choose an available recipe.
3. Ask for the title and category if the user has not provided them. If you use demo defaults, identify those values.
4. Call `stream_machine_preview` with the selected recipe ID and exact input values.
5. Show the target account and the current and proposed values. Do not describe the preview as an applied change.

## Explain optional connections

When a recipe needs an external provider, discover the provider through the host tools. Discuss only relevant providers, such as OpenDesign Cloud, Canva, OBS, Stream Deck, or HyperFrames. Never invent app IDs or install every provider automatically.

Explain that desktop MCP hosts can call local OBS and Stream Deck servers directly. Web and mobile use require a hosted core, which this release does not provide. Treat unattended cloud-to-desktop workflows as separate work.

Before any future integration, address its startup side effects and credential handling. Do not treat a repository's presence as proof that its provider is connected.

For later recipe previews after setup, use the `preview-recipe` skill.

## Examples

<example>
Context: The plugin was just installed.
user: "Set up Stream Machine and preview my first streaming recipe."
assistant: "I'll open Stream Machine, offer the demo connection, and preview a recipe. Everything here is mock data; nothing changes on Twitch."
</example>

<example>
Context: The user asks to connect their real Twitch account.
user: "Connect my Twitch channel."
assistant: "Real Twitch authorization isn't implemented in this release. I can connect the demo account so you can try recipe previews."
</example>
