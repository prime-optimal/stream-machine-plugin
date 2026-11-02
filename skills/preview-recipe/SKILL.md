---
name: preview-recipe
description: Preview a Stream Machine Twitch title through the hosted stream-machine server, set a Stream Deck button with the stream-machine-desktop server, and browse, save, and zip the channel's Twitch clips through the hosted server.
---

# Preview and run a selected demo

Read the provider first. Use the account or device returned by that provider, not a guessed identifier.

Use this plugin's hosted `stream-machine` server for Twitch and clips. Keep every Twitch step on that connection. The local `stream-machine-obs` server provides OBS tools and `stream-machine-desktop` provides Stream Deck tools. Neither provides a Twitch fallback. If the Stream Machine Site plugin is also installed, keep the whole task on one connection and never replay a mutation through the other.

## Update a Twitch title

1. Call `stream_machine_twitch_channel`.
2. Call `stream_machine_twitch_preview_title` with the exact requested title.
3. Show the returned account and current and proposed titles.
4. Open the returned URL for the user's exact-title approval.
5. After approval, call `stream_machine_twitch_apply_title` with the returned preview ID.
6. Report the read-back result. Do not claim success on an error or an unknown write outcome.

An expired preview needs a new preview. A changed account or current title also needs a new review. Never automatically retry an ambiguous write.

## Set one Stream Deck button

1. Call `stream_machine_streamdeck_inventory`.
2. Select the user's original 3×5 device.
3. Call `stream_machine_streamdeck_preview` with its serial, a key index from 0 to 14, and the requested HTTP URL.
4. Show the exact button and explain that the USB process must remain running.
5. If the user has authorized setup, call `stream_machine_streamdeck_apply` with the returned preview ID.
6. Distinguish configuration read-back from a physical press. Ask for one press only when physical proof is still needed.

Do not claim the device while another demo process or Elgato app owns it. `stream_machine_streamdeck_release` removes this session's demo page and releases USB.

## Browse, save, and zip clips

Use the hosted server's tools. `stream-machine-desktop` does not expose clip tools.

To browse or search clips, call `stream_machine_clips_library`. Pass `startedAt` and `endedAt` (RFC 3339) to filter by date and `first` (1 to 100, default 24) to set the page size. To read more, call it again with the returned `cursor` until `cursor` is `null`. Each item shows whether the clip is saved to the Site in `stored`.

To save all clips ("download all my clips"):

1. Call `stream_machine_clips_archive` with `{}`.
2. While the result has `done: false`, call it again with `{"cursor": nextCursor}`. Each call saves at most `maxClips` new clips (default 3, maximum 5).
3. When `done` is true, report the totals of saved, skipped, and failed clips across all calls. List each failed clip with its reason.

Do not retry a failed clip in the same run. A failure with an unknown outcome needs the user to ask again.

To save one clip the user names or selects, call `stream_machine_clips_archive` with `{"clipId": id}` only. It ignores `cursor` and `maxClips`, checks that the clip belongs to the connected channel, and returns the same result shape.

To download saved clips as ZIP files ("zip my clips"), call `stream_machine_clips_zip`. Present each returned link as one batch, with its clip count and size. Each link expires after 24 hours. Tell the user that only clips already saved to the Site are included, and offer to save the rest first.

## Examples

<example>
user: "Preview changing my title to Ranked grind."
assistant: "I'll read your channel, then show the exact preview and its approval link."
</example>

<example>
user: "Make a button that opens the demo page."
assistant: "I'll identify the deck and preview a button for that URL before applying the authorized setup."
</example>
