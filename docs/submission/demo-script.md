# Demo video script

This script gives a timed shot list for the Stream Machine demo video. The [rules](https://twitchcon-codex.devpost.com/rules) require a public YouTube video under 3 minutes that shows the project working on Twitch and shows how Codex built it. Judges need not watch past 3:00, so the script targets 2:50 and ends with the Codex story before the close.

Record only what the "Basis" column marks as verified. A shot marked **Optional** depends on work that is in progress or on a check nobody has run in a host yet. Cut it if the live take fails. The [feature status table](devpost.md#feature-status-and-evidence) holds the evidence for each claim.

## Shot list

| # | Time | Shot | Narration | Basis |
| --- | --- | --- | --- | --- |
| 1 | 0:00-0:12 | Title card "Stream Machine, Spend more time streaming," then a Codex or ChatGPT chat with the plugin in the composer. | "Streaming means a lot of small manual jobs. Stream Machine puts them in one menu inside Codex and ChatGPT, so you spend more time streaming." | Plugin installs from the release ZIP ([docs/setup.md](../setup.md)). |
| 2 | 0:12-0:32 | Choose **Connect with Twitch** in the chat. Show the Twitch consent page, then the Site showing KLabFM connected. | "I connect my Twitch channel once through Twitch OAuth. From then on, every tool call runs as my account, and no token ever appears in the chat." | Verified: [docs/hosted-oauth.md](../hosted-oauth.md), [docs/verification/161-no-chatgpt-signin](../verification/161-no-chatgpt-signin/local-site-with-owner-cookie.png). |
| 3 | 0:32-0:55 | Ask "Open the Stream Machine menu." Show Home, Clips, Connections, and Tools. In Connections, choose **Recheck** and show KLabFM with all permissions granted. | "The menu renders right in the chat. Connections confirms the channel and the permissions I granted." | Verified once on Site version 19: [docs/verification/188/hosted-ui-investigation.md](../verification/188/hosted-ui-investigation.md). |
| 4 | 0:55-1:10 | **Optional.** Home shows the channel snapshot: title, category, follower total, recent clips. | "Home reads my channel from Twitch: title, category, followers, and my latest clips." | Not verified in a host. The host reported a trusted-tool-scope error from stale tool discovery. Test in a fresh chat first. |
| 5 | 1:10-1:35 | Ask "Change my stream title to `[TEST TITLE]`." Show the preview, open the approval page, choose **Approve exact title**, then show the new title on Twitch. Restore the old title. | "Changing the title is two steps. I see the exact before and after, and I approve it in my browser. Only then does the write happen, and it cannot run twice." | The approval flow is verified with the earlier local tools ([docs/demos/twitch.md](../demos/twitch.md)). The hosted write is not verified live. Run it once off camera before recording. If it fails, cut it and show [approval.jpg](../demos/twitch-evidence/approval.jpg). |
| 6 | 1:35-1:55 | On the desktop app, ask "Check OBS, then show an alert that says `[ALERT TEXT]`." Show the alert playing in OBS, then idle. Confirm streaming and recording stay off. | "On the desktop app, Stream Machine also talks to OBS. It shows an alert and goes back to transparent. It never starts or stops a broadcast." | Verified at the adapter level in OBS 33.0.0: [docs/demos/obs.md](../demos/obs.md). Run it through the plugin once off camera. |
| 7 | 1:55-2:05 | **Optional.** Press a Stream Deck key that Stream Machine just wrote. | "It can also label a Stream Deck key and run an action on press." | Verified once on one device: [docs/demos/streamdeck.md](../demos/streamdeck.md). Cut if no deck is connected. |
| 8 | 2:05-2:20 | Screen: the GitHub board and one issue with its Done when checklist, then `git worktree list` showing several worktrees, then the pull request list. | "I built this with Codex. Every change started as an issue. Each issue got its own worktree, and Codex agents worked in parallel on separate files." | [AGENTS.md](../../AGENTS.md); 124 issues and 63 merged pull requests when this page was written. |
| 9 | 2:20-2:35 | Screen: the plugin-eval report, score 0 to 54, then the deferred token count 242,883 to 14,271. | "Codex ran plugin-eval on the package. It scored zero. Codex found the cause, a broken manifest and 12 megabytes of docs shipped in the plugin, and the score rose to 54." | Verified: [docs/plugin-eval/README.md](../plugin-eval/README.md), issue #176. |
| 10 | 2:35-2:47 | Screen: the desktop log line showing the rejected resource read, then the two fields `ttlMs` and `cacheScope` in the fix, then the menu rendering. | "My menu would not render. Codex read the host log and found the response was missing two cache fields from the newest MCP spec. Adding them fixed it." | Verified: [docs/verification/188/hosted-ui-investigation.md](../verification/188/hosted-ui-investigation.md), issue #188. |
| 11 | 2:47-2:50 | End card: repository URL and "Codex session ID in the Devpost entry." | "Stream Machine. Spend more time streaming." | None needed. |

Shots 1 to 11 total 2:50 if you keep every shot. Cutting both optional shots (4 and 7) frees 25 seconds. Use that time to slow the title approval (shot 5) rather than adding new features.

## Keep out of the video

- Features in progress: separate OBS and Stream Deck servers (#191, #192), OpenDesign graphics (#193), the redesigned menu (#194), and clip playback in the host (#195). Do not show or mention them as working.
- Clip download, subtitles, EventSub alerts, and the worker. The shipped desktop server does not expose them (#159).
- Web and mobile. The hosted tools there are not verified (#140).

## Recording checklist

Before you record:

1. Install the release ZIP through the local marketplace as [docs/setup.md](../setup.md#install-on-desktop) describes. Confirm `codex plugin list` shows `stream-machine`.
2. Open a fresh chat so tool discovery is current. A stale chat caused the snapshot error in shot 4.
3. Use the KLabFM channel as the test channel. Note its current title so you can restore it.
4. Start OBS Studio 33 or later with the WebSocket server on `localhost:4455`. Leave streaming and recording stopped.
5. Connect the Stream Deck by USB and quit the Elgato app. Only one process can own the deck.
6. Run each live shot once off camera. Record again only after it passes.

Windows to open, in order:

1. Codex or ChatGPT desktop chat with the Stream Machine plugin.
2. A browser with the Twitch consent page and the exact-title approval page.
3. OBS Studio with the Stream Machine Demo scene.
4. A terminal in the repository, large font, for `git worktree list`.
5. GitHub in a browser: the project board, one issue, the pull request list.
6. The plugin-eval report and the log excerpt, opened as local files.

Hide or blur:

- Twitch tokens, OAuth `code` and `state` values in any URL bar, and the Site's session cookie.
- Email addresses, browser profile avatars, and bookmarks bars.
- The 1Password window, `fnox.toml` contents, and any `.env` file.
- The OBS stream key. Do not open OBS Settings, Stream.
- Other Twitch tabs or chats with viewer names you do not own.
- Notification banners.

Keep trademarks and music out. Show Twitch, OBS, and Elgato only as they appear in the apps. Use no background music, or music you own or have licensed.

After recording, play the video once with sound off and check each frame for the items above. Upload as **Public**, not Unlisted, and paste the URL into `devpost.md`.
