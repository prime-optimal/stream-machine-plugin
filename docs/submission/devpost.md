# Devpost submission answers

This page holds paste-ready answers for the [Codex x TwitchCon Hackathon](https://twitchcon-codex.devpost.com/) submission form. Each answer cites the repository file, issue, or pull request that backs it. Text in `[BRACKETS]` is a placeholder you must replace before submitting.

The form itself sits behind a Devpost login, so these field names come from the [official rules](https://twitchcon-codex.devpost.com/rules) (sections 4 and 6) and the standard Devpost project form. Compare this page against the live form before you submit. The [checklist](checklist.md) lists the remaining steps.

## Form fields from the rules

The rules require these items. Devpost also asks for the standard project fields in the second table.

| Field | Rule | Answer below |
| --- | --- | --- |
| Code repository URL | GitHub, GitLab, or Bitbucket. Must hold all source, assets, and run instructions. Private is allowed on GitHub or GitLab if shared with `testing@devpost.com`. | [Repository](#repository-and-links) |
| Demo video | Under 3 minutes. Shows the project working on Twitch and shows how Codex built it. Public on YouTube. No third-party trademarks or copyrighted music without permission. | [Video](#repository-and-links) |
| Project description | Explains features, functionality, and how you used Codex. | [Project story](#project-story) |
| Codex session ID | The thread where most of the build happened. Run `/status` in Codex to read it. | [Session ID](#codex-session-id) |

| Standard Devpost field | Answer below |
| --- | --- |
| Project name | [Project name](#project-name) |
| Elevator pitch | [Elevator pitch](#elevator-pitch) |
| Project story sections | [Project story](#project-story) |
| Built with | [Built with](#built-with) |
| Try it out links | [Repository and links](#repository-and-links) |
| Image gallery | [Image gallery](#image-gallery) |

## Project name

```text
Stream Machine
```

## Tagline

```text
Spend more time streaming
```

## Elevator pitch

Devpost limits this field to 200 characters. The text below is 177 characters.

```text
Stream Machine puts a Twitch channel menu, clip library, OBS alerts, and Stream Deck buttons inside Codex and ChatGPT, so streamers spend more time streaming and less on manual work.
```

The longer pitch for the story's opening paragraph:

```text
Spend more time streaming and less time doing manual labor with Stream Machine. Connect your Twitch account and open one menu inside ChatGPT or Codex to see your channel, browse your clips, and approve a stream title change. On the desktop app, Stream Machine also shows alerts in OBS and sets up Stream Deck buttons. Stream Machine works so you can play.
```

## Project story

Paste each section under its Devpost heading.

### Inspiration

```text
Running a Twitch channel means a lot of small manual jobs: finding last week's clips, changing the title before you go live, wiring an alert into OBS, labeling a Stream Deck key. None of them is hard. Together they eat the time you wanted to spend streaming.

I wanted one place where a streamer asks for the job in plain language, sees exactly what will change, and approves it. Codex and ChatGPT plugins give that place: a chat for the request, a menu for the result, and MCP tools that do the work.
```

### What it does

Every item below is verified except where it says "in progress." The evidence column in the [feature status table](#feature-status-and-evidence) links each claim.

```text
Stream Machine is a Codex and ChatGPT plugin with two MCP servers.

The hosted "stream-machine" server runs on a ChatGPT Site. It has nine Twitch tools. You connect your Twitch account once through Twitch OAuth, and every tool call then runs as you. The plugin renders a Stream Machine menu with Home, Clips, Connections, and Tools. In a live ChatGPT session the menu rendered and the Connections recheck returned the connected channel (KLabFM) with all 12 permissions the plugin requests. Changing a stream title is a two-step flow: a preview shows the current and proposed title, you approve the exact title in your browser, and only then does a separate call write it to Twitch.

The local "stream-machine-desktop" server runs on the ChatGPT or Codex desktop app. It has three OBS tools (check the connection, list scenes, show an alert) and four USB Stream Deck tools (inventory, preview, apply, release). Web and mobile hosts cannot start a local process, so on those hosts you get the Twitch tools only.

Safety rules are part of the design. No tool starts or stops a broadcast. No tool takes a token as input. Approval alone never writes to Twitch. A used title preview cannot run again.

In progress and not yet claimed: separate OBS and Stream Deck servers (#191, #192), OpenDesign-generated overlays and brand kits (#193), a redesigned menu in the Stream Machine brand (#194), and clip playback inside the host (#195).
```

### How we built it

```text
Stream Machine is TypeScript on Bun. One MCP server module defines the tools. A bundled menu UI renders them through the MCP Apps extension. The hosted server runs on a ChatGPT Site (Cloudflare Workers with D1 and R2), stores Twitch tokens encrypted and bound to the caller, and reads Twitch through the Helix API. The desktop server talks to OBS Studio over its WebSocket v5 interface and to a Stream Deck over USB.

The build ran through Codex from the first commit on November 1, 2026:

- Every change started as a GitHub issue with a Done when checklist. The repository has 124 issues and 63 merged pull requests so far.
- Each issue got its own git worktree from origin/main, and subagents worked in separate worktrees on separate files.
- Codex ran the OpenAI plugin-eval tool against the packaged plugin. The first score was 0/100, because the manifest broke the tool and the package shipped 12 MB of docs. Fixes in #176 raised it to 54/100 and cut the deferred token estimate from 242,883 to 14,271.
- Codex wrote regression tests first, watched them fail, then fixed the code. The hosted server suite grew to 137 tests during the menu repair.
- Codex produced checked state models (TLA+) for the rules where a mistake would be expensive: hosted authorization, title preview replay, and public clip access. They live in docs/statechart/.
- Releases are automated. Merging a release PR publishes a GitHub Release with the plugin ZIP.
```

### Challenges

```text
The hardest bug was a menu that never rendered. The hosted server returned the menu HTML, the Site log said "served," and ChatGPT still showed nothing. Codex read the desktop log and found the host rejected the resource response: it was missing ttlMs and cacheScope, fields from the MCP 2026-07-28 caching specification. Adding ttlMs: 0 and cacheScope: private to discovery, tool-list, resource-list, and resource-read results fixed it. The next deployment rendered Home, Clips, Connections, and Tools in a real ChatGPT session (issue #188).

Other challenges:

- A hosted MCP server does not see the Site's user identity, so we bound every request to the platform-supplied caller and never to a request argument.
- The local server cannot run on web or mobile, so we split Twitch (hosted) from OBS and Stream Deck (desktop) and report the limit.
- Two title writes racing each other could overwrite a title. A review reproduced the race, and a held execution lease fixed it.
- plugin-eval scored the first package 0, so we rebuilt the package to ship only what it needs.
```

### Accomplishments that we're proud of

```text
- A real Twitch account (KLabFM) connected through hosted OAuth, with the 12 granted permissions confirmed by a read of the live record.
- A title change that cannot happen without the streamer approving the exact text, and cannot be replayed.
- A real OBS Studio alert shown and replayed on screen, with streaming and recording left off. A physical Stream Deck key pressed to open a page.
- An MCP protocol bug found from logs and fixed in one deployment.
- A project history where every change has an issue, a worktree, a test, and evidence.
```

### What we learned

```text
- MCP hosts enforce newer protocol fields that a working server can still omit. Read the host log, not only the server log.
- A tool call that succeeds does not prove the UI rendered. We stopped claiming rendered success until we saw the menu.
- Identity must come from the platform. A user ID passed as a tool argument is not authorization.
- A plugin package should ship what the host needs and nothing else. Shipping docs cost 228,000 estimated tokens.
- Writing the failing test first is the fastest way to point an agent at the real bug.
```

### What's next

```text
- Split OBS and Stream Deck into separate local servers (#191, #192).
- Generate overlays, alerts, and brand kits with OpenDesign (#193).
- Redesign the menu in the Stream Machine brand (#194).
- Play clips inside the host and save all clips to the Site at once (#195, #147).
- Download all clips at once and generate subtitles when you get clipped. The transcription and clip download code exists but is disabled in the shipped server (#159), so we do not claim it.
- Verify hosted tools on web and mobile (#140) and evaluate the Secure MCP Tunnel for desktop tools there (#146).
```

## Built with

Paste these tags into the "Built with" field.

```text
codex, openai-codex, chatgpt-plugins, model-context-protocol, mcp-apps, typescript, bun, twitch-api, twitch-oauth, helix-api, obs-websocket, stream-deck, cloudflare-workers, cloudflare-d1, cloudflare-r2, tla-plus, github-actions, mise
```

## Repository and links

| Item | Value |
| --- | --- |
| Repository | `https://github.com/prime-optimal/stream-machine-plugin` (private today; see [checklist](checklist.md) for the access decision) |
| Demo video | `[YOUTUBE_URL]` |
| Hosted Site | `https://stream-machine-oauth-test.tinycocoa22.chatgpt.site` |
| Install instructions | [README, For judges](../../README.md#for-judges) and [docs/setup.md](../setup.md) |
| Releases | `https://github.com/prime-optimal/stream-machine-plugin/releases` |
| Test channel | KLabFM (`@klabfm`) |

## Codex session ID

Run `/status` in the Codex thread where most of the build happened and paste the ID here.

```text
[CODEX_SESSION_ID]
```

## Image gallery

Upload these existing screenshots. Each one shows a verified state. Check each image for tokens and personal data first.

| File | Shows |
| --- | --- |
| [docs/demos/event-evidence/event-program.png](../demos/event-evidence/event-program.png) | A real Twitch event shown as an alert in OBS (earlier prototype tool, not exposed in the current plugin) |
| [docs/demos/obs-evidence/play.png](../demos/obs-evidence/play.png) | The OBS alert playing |
| [docs/hosted-oauth-connected.jpg](../hosted-oauth-connected.jpg) | KLabFM connected through hosted OAuth |
| [docs/demos/twitch-evidence/approval.jpg](../demos/twitch-evidence/approval.jpg) | The exact-title approval page |
| [docs/demos/live-controls.jpg](../demos/live-controls.jpg) | The live OBS and Stream Deck controls |

Add a frame from the recorded demo showing the menu rendered in ChatGPT. The repository has no screenshot of that render, only the written record in [docs/verification/188/hosted-ui-investigation.md](../verification/188/hosted-ui-investigation.md).

## Feature status and evidence

Claims in the answers above trace to these records.

| Claim | Status | Evidence |
| --- | --- | --- |
| Hosted Twitch OAuth connects KLabFM with 12 permissions | Verified | [docs/hosted-oauth.md](../hosted-oauth.md), issue #122 |
| Hosted MCP server with per-caller authorization and nine Twitch tools | Verified in tests and live Site | [docs/hosted-mcp.md](../hosted-mcp.md), [docs/reviews/130-hosted-mcp.md](../reviews/130-hosted-mcp.md), [docs/package-reference.md](../package-reference.md), issue #130 |
| Menu renders Home, Clips, Connections, and Tools in ChatGPT, and Connections recheck returns KLabFM | Verified once on Site version 19 | [docs/verification/188/hosted-ui-investigation.md](../verification/188/hosted-ui-investigation.md), issue #188 |
| MCP cache hints (`ttlMs`, `cacheScope`) fix the render failure | Verified | Same file |
| Home channel snapshot | Not verified in a host. The host reported a trusted-tool-scope error because the chat had stale tool discovery. | Same file, "Remaining limitation" |
| Exact-title approval and write-back | Verified with the earlier local tools. The hosted write is not verified live. | [docs/demos/twitch.md](../demos/twitch.md), [docs/hosted-mcp.md](../hosted-mcp.md#authorization-boundary) |
| OBS alert shown and replayed in OBS Studio 33.0.0 with streaming and recording stopped | Verified at the adapter level | [docs/demos/obs.md](../demos/obs.md) |
| Stream Deck key written over USB and pressed | Verified once on one device | [docs/demos/streamdeck.md](../demos/streamdeck.md) |
| Desktop server exposes seven tools | Verified by `mise run smoke` | [docs/package-reference.md](../package-reference.md#server-and-tools) |
| Clip library gallery, ZIP, and player | Verified with fixture data in a browser only. Not verified in a host. | [docs/verification/147-clip-library/README.md](../verification/147-clip-library/README.md), issue #147 (open) |
| plugin-eval 0 to 54, deferred tokens 242,883 to 14,271 | Verified | [docs/plugin-eval/README.md](../plugin-eval/README.md), issue #176 |
| Checked state models | Verified | [docs/statechart/](../statechart/README.md) |
| Release automation | Verified | [docs/CHANGELOG.md](../CHANGELOG.md), issues #105, #107, #120 |
| Separate OBS and Stream Deck servers | In progress | Issues #191, #192 |
| OpenDesign graphics | In progress | Issue #193 |
| Redesigned menu | In progress | Issue #194 |
| Clip playback in the host | In progress | Issue #195 |
| Hosted tools on web and mobile | Not verified | Issue #140 (open) |

## Disclosures

Put these in the description or the repository notes so a judge does not find them first.

- The repository's first commit is November 1, 2026, inside the submission window. The Twitch OAuth service in `src/auth/upstream/` is copied from the author's earlier `prime-optimal/stream-makeover` project, commit `4e2bff85`, and the OBS alert template comes from the same project ([docs/demos/twitch.md](../demos/twitch.md), [docs/demos/obs.md](../demos/obs.md), [docs/reuse-evidence.md](../reuse-evidence.md)). The Stream Deck server is the author's MIT fork of `streamdeck-mcp`, run at a pinned revision with no code copied ([docs/demos/streamdeck.md](../demos/streamdeck.md)).
- The hosted server runs on one test Site, `stream-machine-oauth-test`. It binds each Twitch connection to its ChatGPT caller, but only the author's KLabFM channel has been tested live. It is a prototype.
- The hosted Site and the plugin use the Twitch app registered for the author. Judges connect their own Twitch account through the same OAuth flow.
