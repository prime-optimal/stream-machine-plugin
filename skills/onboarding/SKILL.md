---
name: onboarding
description: Set up Stream Machine after installation or when the user asks to connect streaming tools and try a first recipe.
---

# Stream Machine setup

1. Explain current release: mock Twitch account and recipe previews only. No real account connection, broadcasting, or Stream Deck changes.
2. Discover Stream Machine tools and call `stream_machine_open`. If tools are absent, explain that this desktop package needs a host with local stdio MCP and Bun on PATH. Do not claim installation succeeded.
3. Offer demo connection. Call `stream_machine_connect_demo` when user chooses demo setup. Name returned fictional account and explicitly call it demo data.
4. Call `stream_machine_list_recipes`. Help choose available recipe; request title/category if not provided, or use clearly identified demo defaults.
5. Call `stream_machine_preview` with selected recipe ID and exact values. Show target and before/after; do not describe a preview as an applied change.
6. Explain optional providers only when relevant: existing OpenDesign Cloud/Canva connections, selected OBS/Stream Deck local MCP servers, and HyperFrames tooling. Discover actual availability through host tools. Never invent app IDs or automatically install every provider.

Desktop-capable MCP hosts can call local OBS/Stream Deck servers directly. Web/mobile require a hosted core; this release has no hosted endpoint. Unattended cloud-to-local workflows need separate runtime design later.

Never request tokens in chat. Live Twitch authorization is not implemented. Do not launch candidate `obs-twitch-mcp` server during onboarding: inspected startup enables chat automation. Future integrations must address startup side effects and credential handling first.

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
assistant: "Live Twitch authorization isn't implemented in this release. I can connect the demo account so you can try recipe previews."
</example>
