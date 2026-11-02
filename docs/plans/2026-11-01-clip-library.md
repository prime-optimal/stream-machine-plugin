# Clip library plan

Issue: [#147](https://github.com/prime-optimal/stream-machine-plugin/issues/147). It extends [#89](https://github.com/prime-optimal/stream-machine-plugin/issues/89) and [#90](https://github.com/prime-optimal/stream-machine-plugin/issues/90) from a session list to the channel's full clip library.

## Goal

A streamer opens the Clips section and sees every clip on the connected channel. They can filter the gallery, open a clip, and play it in the plugin. They can ask the chat to "download all my clips". Stream Machine then saves each clip to the Site's storage. They can also download the saved clips as ZIP files in batches.

## Current state

- `src/adapters/twitch/clips-client.ts` reads one clip by ID and requests Twitch download URLs. It drops most Helix metadata.
- `src/ui/app.ts` renders the Clips section as a placeholder.
- The Site stores downloaded clips in R2. It records each file in the D1 `user_data_artifacts` table. Completed MP4 clips have public URLs at `/api/user-data/files/<id>`. Those URLs support HTTP range requests, so a `<video>` element can seek ([#143 review](../reviews/143-public-clips.md)).
- The Site has no list query, no bulk download, and no ZIP route.

## Design

### Shared library module

The module `src/adapters/twitch/clip-library.ts` is pure and has no I/O except through the injected Helix fetcher. `scripts/sync-hosted-twitch.ts` copies it to the Site.

- `GET /helix/clips?broadcaster_id=<id>&first=<1-100>&after=<cursor>&started_at=&ended_at=` lists the connected broadcaster's clips. It needs a user or app token and no scope.
- `GET /helix/games?id=` resolves category names for up to 100 IDs per request. An unknown ID yields `null`.
- Thumbnails stay only when their HTTPS host is on an exact allowlist: `static-cdn.jtvnw.net` and `clips-media-assets2.twitch.tv`. Other thumbnails become `null`.

### Tool contract

Both servers register `stream_machine_clips_library`. It is read-only.

Input, strict:

```ts
{ cursor?: string; first?: number /* 1-100, default 24 */; startedAt?: string /* RFC 3339 */; endedAt?: string }
```

Output `structuredContent.clips`:

```ts
{
  account: { id: string; login: string; displayName: string };
  items: ClipItem[];
  cursor: string | null;          // Helix pagination cursor for the next page
  storage: "site" | "local";      // which server answered
}
type ClipItem = {
  id: string; title: string; url: string;          // Twitch clip page
  createdAt: string; durationSeconds: number; viewCount: number;
  creator: { id: string | null; name: string | null };
  game: { id: string | null; name: string | null };
  thumbnailUrl: string | null;
  videoId: string | null; vodOffsetSeconds: number | null;
  stored: { fileId: string; playbackUrl: string; downloadUrl: string; bytes: number; storedAt: string } | null;
};
```

The local server always returns `stored: null` and `storage: "local"`. The local server cannot read Site storage. The hosted server joins each page with the owner's completed artifacts.

### Hosted save-all tool

`stream_machine_clips_archive` saves unsaved clips to Site storage. It is not read-only.

- Input: `{ cursor?: string; maxClips?: number /* 1-5, default 3 */; clipId?: string }`. With `clipId`, the call saves only that clip after the usual ownership check and ignores `cursor` and `maxClips`.
- Each call walks Helix pages from `cursor`. It skips stored clips and saves up to `maxClips` new ones with the existing hosted download writer. The bound keeps one MCP request inside Worker time limits.
- The output reports `saved`, `skipped`, and `failed` items. It also returns `nextCursor` and `done`. A failed clip with an unknown outcome is reported and never retried in the same run.
- The plugin skill tells the model to repeat the call with `nextCursor` until `done` is true. It then reports totals.

### Hosted ZIP tool and route

`stream_machine_clips_zip` creates ZIP batches of the owner's stored clips.

- Each batch holds up to 50 clips and at most 1 GiB of clip bytes. Keeping total size below 4 GiB avoids ZIP64.
- The tool records each batch in D1 under a random UUID with the owner, artifact IDs, and a 24-hour expiry. It returns one download URL per batch: `/api/user-data/zips/<uuid>`.
- The route streams a store-only ZIP, which applies no compression. It reads each clip from R2 in order and does not buffer whole files. New downloads record a CRC32 checksum when written. Older files without one use a data descriptor, which lets the route compute CRC32 while streaming. Set `Content-Length` when every entry has a known CRC32.
- An expired or unknown batch returns 404. Each URL stays private by being unguessable, which matches the public clip URL rule from #143.

### Plugin UI

The Clips section uses `stream_machine_clips_library` through the existing tool transport in `src/ui/tool-transport.ts`.

- The gallery uses thumbnail cards. Each card shows the title, date, category, clipper, duration, and views. It has a search box, a category filter, a sort control, and a **Load more** button that follows the cursor.
- The detail panel shows all metadata, a Twitch link, and the storage state. It separates the creation time from the storage time.
- The player is a `<video controls preload="none">` that loads only after the user selects **Play**. It uses `stored.playbackUrl` as its source. Only one clip plays at a time. Navigation pauses playback and clears the source.
- Clips that have not been saved show **Not on Site**. A **Save to Site** action calls the archive tool only on the hosted server.
- `src/server.ts` adds the Site origin and the thumbnail hosts to `resourceDomains`.

### Hosted UI resource

The Site MCP server also serves the same built UI as `ui://stream-machine/workspace`. It handles `resources/list` and `resources/read` and links the library tool through `_meta.ui.resourceUri`. Hosts that render Site MCP apps can then show the gallery with Site data. The README must state when that host behavior has not been verified.

## Slices

| Slice | Repository | Owner files |
| --- | --- | --- |
| Library module and local tool | plugin | `src/adapters/twitch/clip-library.ts`, `clips-register.ts`, `scripts/sync-hosted-twitch.ts`, `skills/`, tests |
| Gallery and player | plugin | `src/ui/clips*.ts`, `src/ui/app.ts`, `src/ui/style.css`, `src/server.ts` CSP |
| Storage, save-all, ZIP, UI resource | Site | `lib/clips/`, `lib/user-data/`, `lib/mcp/`, `app/api/user-data/zips/`, `drizzle/`, tests |

## Out of scope

- Deleting clips, revoking URLs, and setting retention or quotas.
- Downloading clips from other channels.
- Background jobs that continue after the chat stops calling the archive tool.
