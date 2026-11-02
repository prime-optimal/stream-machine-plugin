# Download one Twitch clip

The desktop server does not expose these tools after #159. Their registrations are commented out in `src/server.ts`.

Use the existing Twitch connection to download a clip owned by the connected broadcaster. Editor downloads and batch requests are not implemented.

## Authorize and download

1. Call `stream_machine_twitch_connect` with `{}`. Review the [current permission policy](../reviews/83-twitch-scope-audit.md). Open `connectUrl` and approve Twitch access. Existing scopes remain requested during reconnect. `requestedScopes` contains the product policy plus stored grants. `grantedScopes` and `missingScopes` describe stored permissions without claiming consent is complete.
2. Call `stream_machine_twitch_status`. Confirm the account and `channel:manage:clips` scope.
3. Call `stream_machine_twitch_clip` with `{"clipId":"YOUR_CLIP_ID"}`. Check the returned source and broadcaster.
4. Call `stream_machine_twitch_download_clip` with the same input. A successful result contains `clip`, `format`, and `artifact` with an absolute path, byte count, SHA-256, and completion timestamp.
5. Open the returned file in a local video player. Confirm playback before claiming real acceptance.

No title approval, title change, broadcast, or worker action is part of this procedure. Do not share signed URLs or credentials as evidence.

## List the clip library

Call `stream_machine_clips_library` with `{}` to list the connected broadcaster's clips. It needs no clip scope and makes no write. Input is strict: `cursor`, `first` (1 to 100, default 24), `startedAt`, and `endedAt` (RFC 3339). The result is `structuredContent.clips` with `account`, `items`, `cursor`, and `storage`. Pass `cursor` back to read the next page. It is `null` on the last page.

Each item has the Twitch page `url`, `createdAt`, `durationSeconds`, `viewCount`, `creator`, `game`, `thumbnailUrl`, `videoId`, `vodOffsetSeconds`, and `stored`. Creator, game, thumbnail, and VOD fields are `null` when Twitch omits them or, for the game name, when `GET /helix/games` does not know the ID. A thumbnail is kept only when its HTTPS host is `static-cdn.jtvnw.net` or `clips-media-assets2.twitch.tv`.

The local server returns `storage: "local"` and `stored: null` because it cannot read Site storage. The hosted server returns `storage: "site"` and fills `stored` for clips saved to the Site. The [clip library plan](../plans/2026-11-01-clip-library.md) defines the contract, including the hosted save-all and ZIP tools.

## Storage and errors

Files remain under `~/.local/share/stream-machine/clips` until you remove them. A server-side `STREAM_MACHINE_CLIP_DIR` overrides the directory. Use an absolute path with no symlink components and a private directory owned by the current user. The tool does not accept paths.

Downloads prefer landscape, then portrait. Each process allows one active download. Files are limited to 512 MiB with a 120-second network deadline. Filesystem operations and cleanup are awaited safely and can extend total elapsed time on a stalled disk. Completed files use generated names and mode `0600`. The final directory requires mode `0700`. Partial files are removed on handled failures. A process crash can leave a `.partial` file; no automatic retention cleanup runs.

`TWITCH_SCOPE_REQUIRED` requires explicit reconnect. `CLIP_WRONG_BROADCASTER` rejects another broadcaster's clip. `CLIP_FORMAT_UNAVAILABLE` means neither format was returned. `CLIP_DOWNLOAD_EXPIRED` requires a new explicit download request. `CLIP_DOWNLOAD_URL_REJECTED` rejects an unrecognized delivery location. Network failures never return mock data or retry automatically.

## Verified API contract

Checked [Get Clips Download](https://dev.twitch.tv/docs/api/reference/#get-clips-download) and [Get Clips](https://dev.twitch.tv/docs/api/reference/#get-clips) on 2026-11-01 before coding.

The download endpoint is `GET /helix/clips/downloads`. It requires `editor_id`, `broadcaster_id`, and `clip_id`. Both user IDs match the connected broadcaster in this implementation. The user token needs `channel:manage:clips`. Returned records contain `clip_id` and nullable `landscape_download_url` and `portrait_download_url`. Links expire. The documented endpoint limit is 100 requests per minute.

The official example names `production.assets.clips.twitchcdn.net`. For KLabFM clips, Helix returned `d1ndex63qxojbr.cloudfront.net`. This implementation permits only these two exact HTTPS hosts, matching the hosted Site writer, and rejects redirects. Twitch does not document a complete delivery-host list or redirect guarantee. Other delivery hosts therefore fail closed until reviewed.

## Verification limits

Synthetic fetch, temporary filesystem, OAuth, and in-memory MCP tests verify local boundaries. They do not establish real OAuth consent, official download access, playable Twitch media, or native-host playback.

On 2026-11-02, account `1494553296` (KLabFM) granted `channel:manage:clips` through the local connect flow. The local `stream_machine_twitch_download_clip` call for clip `ClumsyZealousBibimbapAMPEnergyCherry-SefTK-jl03LGBlm7` then returned `mode: "live"` and `format: "landscape"`. It wrote a 23,172,694-byte file with mode `600` and SHA-256 `2b7f8b7d5f4f87f802aa65fb265a9bc676926d534c8c063db3a7f35f2c5a755a`, which matches the earlier hosted download. `ffprobe` reported 30.02 seconds of 1280×720 H.264 with AAC audio, and a full `ffmpeg` decode completed without errors. Playback in a native player was not checked.
