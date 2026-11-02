# Clip library UI verification

These screenshots show the Clips section in a headless Chromium tab. The data is a fixture from `scripts/clips-fixture-preview.ts`. Every title starts with `FIXTURE`, and the channel is named "Fixture channel". Only clip 1 is backed by a real file: the public Site clip `https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/user-data/files/d56e9e6d-17cb-40dd-a453-a4f485f28bb9`. The ZIP batch link is a placeholder that points nowhere.

Reproduce:

```sh
mise run build
bun scripts/clips-fixture-preview.ts
```

Then open `http://127.0.0.1:4319/?preview=1` and select **Clips**. Expected result: a gallery of four cards and a **Load more** button.

| File | What it shows |
| --- | --- |
| `gallery.png` | First page with search, category, sort, and the Site ZIP action. |
| `gallery-loaded-sorted.png` | Both pages loaded and sorted by most viewed. |
| `detail.png` | Details of the stored clip before Play. |
| `playing.png` | The same clip playing after Play. |
| `detail-zip.png` | ZIP batch links under the details. |
| `detail-not-on-site.png` | A clip with no saved copy. |

Measured in the playing state: `readyState` 4, `video.error` null, `currentTime` advanced to 2.5 s, `preload="none"`, `controls` and `playsInline` true. No `<video>` exists before Play, and none remains after leaving Clips.

Not verified: a real ChatGPT or Codex host applying the `resourceDomains` CSP to video and thumbnail loads, and real Twitch or Site tool responses.
