# Clip save action review

Issue #195 remains open. This change moves the existing explicit save action onto the clip poster and labels it **Save to play**. After a confirmed save, the existing library refresh displays **Play clip**. It does not start playback automatically.

The live KLabFM library returned 12 clips, all without stored media. This does not establish the cause of the reported target-host failure. The native player and Site playback still require target-host verification.

The fixture has synthetic save success for clip 2 and a synthetic failure for other unsaved clips. It uses a previously published public clip URL for the success case. The fixture does not change Twitch or Site storage.

## Review

1. Code simplicity: `src/ui/clips-player.ts` accepts the existing action element. It does not add a player library or another media source.
2. Documentation: The action states why a copy is saved. Existing failure messages remain available below the player. The new fixture cases need browser verification.
3. Statechart: No save or playback transition changed. The existing clips library model needs no update for this label and placement change.
4. Issue completion: Target-host reproduction, playback, controls, and visual evidence remain outstanding. Do not close #195.

## Verification

- `mise run check`: passed.
- `mise run test`: 279 passed, two skipped.
- `mise run build`: passed.
- Browser verification: blocked. Browser access host was unavailable, and the request to run the local fixture outside the sandbox was aborted. No fixture process remained on inspection.

## Fixture browser check

In Brave on macOS, the local fixture displayed **Save to play** for clip 3. The synthetic failure displayed `FIXTURE_FAILURE` and kept the save action available. Clip 2 returned synthetic success and the refreshed detail displayed **Play clip**.

Selecting **Play clip** displayed native video controls, but Brave reported “Unable to play media” at 0:00. Playback did not succeed. A HEAD request to the public fixture URL returned HTTP 200, `video/mp4`, a 23,167,834-byte content length, and byte-range support. The codec, range GET, and browser failure cause remain unverified. This check does not establish behavior in the ChatGPT host. The fixture server was stopped after the check.

## Real single-clip archive

With user authorization, the hosted archive tool saved one KLabFM clip, **K-LAB FIRST LIVE STREAM**, to Site storage. The response reported one saved file of 21,208,110 bytes and no failures. A subsequent library read returned that clip with its Site playback and download URLs. No other clip was archived. This verifies the Twitch-to-Site-to-library path for one clip; it does not verify playback in the plugin host.
