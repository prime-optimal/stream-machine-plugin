---
name: onboarding
description: Route Twitch calls to the Stream Machine Site plugin, and use Stream Machine Desktop for OBS and Stream Deck controls.
---

# Start with Stream Machine

Stream Machine Desktop gives you OBS and Stream Deck controls for your desktop. The Stream Machine Site plugin provides Twitch, clips, and the Stream Machine menu, and it installs on desktop, web, and mobile. Use the Site plugin for every Twitch call. Stream Machine Desktop has no Twitch tools and no local workspace.

For Twitch, call the Site plugin's `stream_machine_twitch_preflight`, then `stream_machine_twitch_status`. If the Site plugin's tools are missing, open the [Stream Machine Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site) and connect its Sites-generated plugin. Sites sign-in identifies the caller. Twitch consent connects that caller's channel. Read status after consent to verify the account and scopes.

After status verifies the account, call the Site plugin's `stream_machine_open` to open the Stream Machine menu, then offer the title preview. Use `preview-recipe` for the exact title preview and browser approval. Open the returned connection or approval URL through the host's navigation. Never replay a failed mutation through another provider.

The user lands on Home. Home confirms "Connected to Twitch as <name>", shows a channel snapshot from `stream_machine_twitch_snapshot`, and lists suggestion cards. OBS and Stream Deck controls are not in the hosted menu. Use Stream Machine Desktop's tools for them on a desktop host.

## Check the connection

Read before you act:

- OBS: `stream_machine_obs_preflight`.
- Stream Deck: `stream_machine_streamdeck_inventory`.

A missing connection does not block unrelated work. Never substitute mock results for a failed real check. Never request tokens or passwords in chat.

## Use OBS

OBS controls target the running local WebSocket server. Showing an alert selects the Stream Machine demo scene. Never start or stop broadcasting or recording.

## Use Stream Deck

The Stream Deck tools use the original 15-key USB device. Preview the exact button and URL. Apply only when the user has authorized the setup. Keep one USB owner running. Release the current demo before another process claims the device. USB pages are separate from Elgato profiles.

## Examples

<example>
user: "Show an OBS alert."
assistant: "I'll check OBS, then show the requested message in the Stream Machine demo scene. Broadcasting and recording stay unchanged."
</example>

<example>
user: "Connect my Twitch account."
assistant: "I'll open the Stream Machine Site connection and verify which account connected. Then I'll open the Stream Machine menu and offer a title preview."
</example>
