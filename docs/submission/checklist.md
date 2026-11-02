# Submission checklist

The Devpost submission closes at **2:00 p.m. Pacific on November 2, 2026**. After that time you cannot change the entry ([rules, section 5](https://twitchcon-codex.devpost.com/rules)). Devpost lets you save a draft before the deadline, so start the form early and finish it last.

Owners: **Prime** is the repository owner and submitter. **Main agent** is the parent Codex session. **Agents** are the sub-agents that own issues #191 to #196.

## Requirements we currently fail

| Requirement | Status | Fix |
| --- | --- | --- |
| Code repository open for judging | **Failing.** `prime-optimal/stream-machine-plugin` is private and the only collaborator is the owner. The rules require a public repository, or a private one shared with `testing@devpost.com`. | Pick an option in [Repository access](#repository-access). |
| Public YouTube demo under 3 minutes | **Not started.** No video exists. | Record from [demo-script.md](demo-script.md). |
| Codex session ID | **Not collected.** | Run `/status` in the main build thread. |
| Free access for judges through the end of judging | **At risk.** Release downloads and Actions artifacts need repository access ([docs/setup.md](../setup.md#download-a-released-package)). The Site must stay published through November 15. | Resolve repository access. Keep the Site published. |

## Repository access

Choose one option. The rules also require that the entry works free of charge and without restriction for the Sponsor, Administrator, and judges until judging ends (November 15, 5:00 p.m. Pacific).

| Option | Steps | Trade-off |
| --- | --- | --- |
| A. Share the private repository | Invite `testing@devpost.com` with Read access in **Settings, Collaborators**. Confirm the invite shows as accepted or pending. Write "Private, shared with testing@devpost.com" in the form. | Meets the rules as written. A human judge without an invite cannot read the source or download a release, so a judge who wants to install the plugin may not be able to. |
| B. Make the repository public | Run a secrets scan of the full history, then switch visibility under **Settings, Danger zone**. Add a license. | Any judge can install and read it. The repository then exposes the full history, including reviews and plans. |
| C. Public mirror with a clean history | Push a squashed copy of `main` to a new public repository and submit its URL. | Hides history, but the issue and pull request evidence the write-up cites is not in the mirror. |

Recommendation: option B if the scan is clean, because judges include Twitch engineers who may try to install it. Use option A if the scan finds anything you cannot remove in time. Do option A in either case as a fallback, since it costs one invite.

Before you choose B, check these:

1. Run `gitleaks detect` over the full history. [AGENTS.md](../../AGENTS.md) records that earlier scans passed, but they did not cover every commit.
2. Open `fnox.toml`. It holds 1Password item references, not values. Confirm that and decide whether to publish the vault and item names.
3. Search docs for local absolute paths and device serial numbers. [docs/demos/streamdeck.md](../demos/streamdeck.md) lists a Stream Deck serial number.
4. The repository has no `LICENSE` file. Add one so judges may run and evaluate the code.
5. The hosted Site `https://stream-machine-oauth-test.tinycocoa22.chatgpt.site` is a public Site. Do not publish anything it protects.

## Steps

| # | Step | Owner | Done when |
| --- | --- | --- | --- |
| 1 | Decide the repository access option and apply it. | Prime | A logged-out browser or `testing@devpost.com` can open the repository, depending on the option. |
| 2 | Decide whether the entrant is an individual or a team. The rules exclude organizations, so enter under your own name. Confirm you are over the age of majority and have received no funding from Amazon Advertising or Devpost. | Prime | The Devpost profile matches. |
| 3 | Confirm the latest release (`v0.9.1`, published 2026-11-02 15:26 UTC) installs on a clean desktop using [docs/setup.md](../setup.md#install-on-desktop). If #191 to #196 merge and release before the deadline, repeat for the new version. | Main agent | `codex plugin list` shows the plugin and the 7 desktop tools appear. |
| 4 | Pick the final `main` commit. Freeze merges after it. Note the commit in the Devpost description. | Main agent | One commit SHA is recorded. |
| 5 | Run the live dry run of every shot in [demo-script.md](demo-script.md) in a fresh chat. Mark each shot pass or fail. | Prime | Each non-optional shot passes. Cut any that fail. |
| 6 | Record the video. Check each frame for tokens, emails, and the OBS stream key. | Prime | A file under 3:00 exists. |
| 7 | Upload to YouTube as **Public**. Open the link while logged out. | Prime | The video plays without signing in. |
| 8 | Copy the Codex session ID from `/status` in the main build thread. | Prime | The ID is in [devpost.md](devpost.md#codex-session-id). |
| 9 | Fill the video URL and session ID placeholders in [devpost.md](devpost.md). | Prime | No `[BRACKETS]` remain. |
| 10 | Compare [devpost.md](devpost.md) with the live form. Add any field the form has that this page lacks. | Prime | Every form field has an answer. |
| 11 | Upload gallery images and the repository link. Save the draft. | Prime | Draft saved. |
| 12 | Check that the hosted Site loads and that Connect with Twitch works for an account other than KLabFM. | Prime | A second account connects, or you record that it did not. |
| 13 | Submit the form before 2:00 p.m. Pacific. Aim for 1:00 p.m. | Prime | Devpost shows **Submitted**, not **Draft**. |
| 14 | Post the Devpost submission URL on issue #197. | Prime | The issue has the URL. |
| 15 | Keep the Site published, the repository accessible, and the Twitch app registered through November 15. Do not merge breaking changes to `main` before then. | Prime, Main agent | Judges can install the version named in the entry on November 15. |

## Risks to the entry

- **New work only.** The rules say the work must be built during the submission period, October 23 to November 2. The first commit here is November 1. The Twitch OAuth service and the OBS alert template come from the author's earlier `prime-optimal/stream-makeover` project. [devpost.md](devpost.md#disclosures) discloses this. Decide whether to keep that disclosure as written.
- **Shots that depend on unverified behavior.** The hosted title write, the Home snapshot, and the OBS alert through the plugin have not been run in a host. Step 5 settles each.
- **In-progress issues.** #191 to #195 may merge before the deadline. Update [devpost.md](devpost.md) only after each is verified. Until then the write-up lists them as in progress.
- **Plugin listing.** #196 adds the icon and brand metadata. The checked-in `plugin.json` still has the display name "Stream Machine Desktop". Match the name in the form to the installed name.
- **Hosted tools on web and mobile.** Issue #140 is open. The write-up states desktop only.
- **Judge installation.** The install path needs Bun on `PATH` and Codex desktop. Give judges the video as the primary evidence, since judges are not required to test the project.
