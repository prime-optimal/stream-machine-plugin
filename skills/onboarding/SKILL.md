---
name: onboarding
description: Set up Stream Machine, check existing streaming tools, and start one local live demo or the separate mock preview.
---

# Start a Stream Machine demo

Open `stream_machine_open`. Explain that real controls and the fictional demo are separate. Use the user's requested demo when clear. Otherwise, ask which demo they want.

## Check the selected connection

Use the relevant read tool before an action:

- Twitch: `stream_machine_twitch_preflight`, then `stream_machine_twitch_status` and `stream_machine_twitch_channel`.
- OBS: `stream_machine_obs_preflight`.
- Stream Deck: `stream_machine_streamdeck_inventory`.
- OpenDesign: `stream_machine_creative_list`.
- Independent worker: `stream_machine_worker_status`.

A missing connection does not block unrelated demos. Never substitute mock results for a failed real check. Never request tokens or passwords in chat. The private package uses fnox references to the owner's 1Password items.

## Connect Twitch

Run `stream_machine_twitch_preflight` before Twitch setup. It checks configuration and whether the registered callback port can be bound, then releases the probe. `TWITCH_LOCAL_PORT_BUSY` means another session or app owns port 4017. Report that conflict before consent. Do not stop another session automatically or pick an unregistered callback port. The Connect action checks again because another process can acquire the port after preflight.

Call `stream_machine_twitch_connect` to connect or upgrade missing permissions. Initial consent requests the owner's 12-permission policy. Only `channel:manage:broadcast` for title updates and `channel:manage:clips` for own-channel clip downloads support implemented privileged actions. The other ten permissions cover future chat, followers, subscriptions, cheers, rewards, clip creation, and bot use. They do not enable active features. The full list and Twitch excess-scope policy conflict appear in the returned `disclosure` and [scope reference](../../docs/reviews/83-twitch-scope-audit.md). Broadcaster consent does not authorize a separate bot account. Existing grants are retained. Review `requiredScopes`, `grantedScopes`, `missingScopes`, and `requestedScopes` before consent. For an explicitly requested connection, pass `openBrowser: true` to open the local authorization flow directly in the desktop browser. The plugin button uses this path; the user does not need to copy the URL. Empty inputs preserve the existing link-only response. `browserRequested` reports a successful browser-launch request, not completed consent. On a browser-launch error, report the failure and wait for an explicit retry. The registered callback is `http://localhost:4017/api/twitch/callback`.

Read `stream_machine_twitch_status` after consent. Missing permissions require reconnect, not disconnect. Consent does not change a title, download a clip, or arm a worker. Read the account after consent. Use `preview-recipe` for the exact title preview and browser approval. OAuth consent does not approve an arbitrary title.

## Use local devices

OBS controls target the running local WebSocket server. Showing an alert selects the Stream Machine demo scene. Never start or stop broadcasting or recording.

The Stream Deck demo uses the original 15-key USB device. Preview the exact button and URL. Apply only when the user has authorized the setup. Keep one USB owner running. Release the current demo before another process claims the device. USB pages are separate from Elgato profiles.

## Use existing creative tools

Use the existing OpenDesign service. Select an exact project or create an isolated `stream-machine-` test project. Supported recipes are `overlay` and `hyperframes-html`.

HyperFrames produces editable, playable HTML. Do not request MP4 rendering or install a separate renderer. Keep the request ID after submission and poll that request. A failed or unknown result does not authorize an automatic resubmission.

## Keep the worker explicit

The worker starts separately through the trusted packaged CLI and starts paused. Arm only the configured account, event, and OBS action requested by the user. Pause prevents new alerts. Keep the desktop awake.

For a fictional demo, use `stream_machine_connect_demo`, `stream_machine_list_recipes`, and `stream_machine_preview`. Label its results as mock data. `stream_machine_reset` resets only that sample.

## Examples

<example>
user: "Show an OBS alert."
assistant: "I'll check OBS, then show the requested message in the Stream Machine demo scene. Broadcasting and recording stay unchanged."
</example>

<example>
user: "Connect my Twitch account."
assistant: "I'll open the existing local authorization flow, then verify which account connected."
</example>
