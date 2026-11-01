# Download one Twitch clip

Use the existing Twitch connection to download a clip owned by the connected broadcaster. Editor downloads and batch requests are not implemented.

## Authorize and download

1. Call `stream_machine_twitch_connect` with `{"manageClips":true}`. Open `connectUrl` and approve Twitch access. Existing scopes remain requested during reconnect. `additionalScopes` lists only the permissions selected by this tool call; OAuth adds stored grants when you open the URL.
2. Call `stream_machine_twitch_status`. Confirm the account and `channel:manage:clips` scope.
3. Call `stream_machine_twitch_clip` with `{"clipId":"YOUR_CLIP_ID"}`. Check the returned source and broadcaster.
4. Call `stream_machine_twitch_download_clip` with the same input. A successful result contains `clip`, `format`, and `artifact` with an absolute path, byte count, SHA-256, and completion timestamp.
5. Open the returned file in a local video player. Confirm playback before claiming real acceptance.

No title approval, title change, broadcast, or worker action is part of this procedure. Do not share signed URLs or credentials as evidence.

## Storage and errors

Files remain under `~/.local/share/stream-machine/clips` until you remove them. A server-side `STREAM_MACHINE_CLIP_DIR` overrides the directory. Use an absolute path with no symlink components and a private directory owned by the current user. The tool does not accept paths.

Downloads prefer landscape, then portrait. Each process allows one active download. Files are limited to 512 MiB with a 120-second network deadline. Filesystem operations and cleanup are awaited safely and can extend total elapsed time on a stalled disk. Completed files use generated names and mode `0600`. The final directory requires mode `0700`. Partial files are removed on handled failures. A process crash can leave a `.partial` file; no automatic retention cleanup runs.

`TWITCH_SCOPE_REQUIRED` requires explicit reconnect. `CLIP_WRONG_BROADCASTER` rejects another broadcaster's clip. `CLIP_FORMAT_UNAVAILABLE` means neither format was returned. `CLIP_DOWNLOAD_EXPIRED` requires a new explicit download request. `CLIP_DOWNLOAD_URL_REJECTED` rejects an unrecognized delivery location. Network failures never return mock data or retry automatically.

## Verified API contract

Checked [Get Clips Download](https://dev.twitch.tv/docs/api/reference/#get-clips-download) and [Get Clips](https://dev.twitch.tv/docs/api/reference/#get-clips) on 2026-11-01 before coding.

The download endpoint is `GET /helix/clips/downloads`. It requires `editor_id`, `broadcaster_id`, and `clip_id`. Both user IDs match the connected broadcaster in this implementation. The user token needs `channel:manage:clips`. Returned records contain `clip_id` and nullable `landscape_download_url` and `portrait_download_url`. Links expire. The documented endpoint limit is 100 requests per minute.

The official example names `production.assets.clips.twitchcdn.net`. This implementation permits only that exact HTTPS host and rejects redirects. Twitch does not document a complete delivery-host list or redirect guarantee here. Other legitimate delivery hosts therefore fail closed until reviewed.

## Verification limits

Synthetic fetch, temporary filesystem, OAuth, and in-memory MCP tests verify local boundaries. They do not establish real OAuth consent, official download access, playable Twitch media, or native-host playback. At 2026-11-01 verification, the authorized existing primary encrypted overlay supplied credentials read-only. A read-only token-store lookup and Twitch validation returned exit 0 for account `1494553296`. Its only granted scope was `channel:manage:broadcast`; `channel:manage:clips` was absent. No cache copy, source cache mutation, token refresh, or new OAuth request occurred.

Real account validation is verified. Clip consent, authorized download, and playback remain unmet because the existing account lacks the required clip grant. Obtain explicit clip consent before running the download procedure. No playback screenshot is claimed.
