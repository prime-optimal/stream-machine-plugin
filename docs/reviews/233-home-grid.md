# Home priority grid review

Issue: [#233](https://github.com/prime-optimal/stream-machine-plugin/issues/233).
Plugin base: `ed592256bd670e4cc0903dee48bc4715ec93a56b`.
Site source base: `3e8dbdbd009d3e4345a632697aceeab249d5bbe0`, version 21.

## Change

Home now presents Brand kit and Stream assets in the first row, followed by Clips and local OBS/Stream Deck setup.
The carousel, arrows, scroll calculations, observer, duplicate bottom navigation, and technical footer are removed.
Explore all features retains the seven existing suggestions; Back restores the priorities and keyboard focus.
Clips opens the existing gallery directly. Chat actions retain capability checks.

This is a presentation and action-entry change.
The channel snapshot model is unchanged. Brand-document persistence and bounded onboarding remain separate work in #202 and #203.
The asset prompt is authoring-only; it does not install anything into OBS automatically.

## Checks

- `mise run check` and `mise run build`: exit 0.
- `mise run test`: 311 passed, two skipped, zero failed.
- `mise run smoke`: OBS seven and Stream Deck six passed.
- Existing `mise run ui:audit`: MCP -32601 against the local non-UI server. It does not establish hosted layout support.
- Site MCP handler tests: eleven passed. Typecheck and production build passed.
- Browser Explore/Back: seven catalog cards, then four priority cards. Focus moved to the catalog heading and back to Explore.
- Browser Open Clips: opened the existing Clips view with no chat message.
- Snapshot failure fixture: all four cards and navigation remained visible.
- Fixture chat actions correctly stayed disabled without host message support.

| Viewport | Columns | Priority rows | Horizontal overflow |
| --- | --- | --- | --- |
| 1440 × 900 | 2 | 2 | None |
| 768 × 1024 | 2 | 2 | None |
| 375 × 812 | 1 | 4 | None |

The local screenshots use a labeled layout fixture, not a live account. The fixture made no live provider calls or messages.

After publication, the authenticated Site page loaded KLabFM and its real channel snapshot. Home showed four priority cards in two rows, and Open Clips loaded all twelve saved clips. A saved clip played to 29.07 seconds and sought to 15.00 seconds, with readyState 4 and no console errors. No provider writes or chat messages were sent.

Native MCP-host theme/display-mode verification is still not claimed; the authenticated Site page uses the same bundle but a different host transport.

## Review questions

1. Simplification: one shared card renderer serves the priority and catalog views. Removed obsolete carousel code and geometry tests.
2. Documentation: the hosted guide now describes the four priorities, direct Clips navigation, and Explore/Back. Copy does not claim pending settings work exists.
3. Statechart: no provider, persistence, or section-routing transition changed. The in-place view switch has no tool side effects, so no product statechart update is needed.
4. Completion: publish the exact UI bundle to the existing Site, attach screenshots to issue #233, and keep the issue open while its code PR awaits merge.

## Artifacts

- [Live Home](../verification/233/home-live.jpg)
- [Authenticated Site playback](../verification/233/live-clip.jpg)
- [Desktop preview](../verification/233/home-1440.jpg)
- [Tablet preview](../verification/233/home-768.jpg)
- [Mobile preview](../verification/233/home-375.jpg)
- [All features](../verification/233/all-features.jpg)
- [Fixture script](../verification/233/preview.mjs), run with `mise exec -- bun docs/verification/233/preview.mjs` after building.

The Site update uses resource `ui://stream-machine/workspace-v6.html`.
Published Site version 22 from source `0a38c4d777c4c0a5406e75a2937c4bcee5a4b4b0`. Deployment `appgdep_6ae903c65b7481918eb84f4217e8ea7c` succeeded with the existing public audience unchanged. The production HTML matches plugin build SHA-256 `3fd9877b21d158b00161eff5bdc64f3261656facdea06ef3370ad0c97a12bf21`. The [resource patch](../verification/233/hosted-resource.patch) records the cache-version update. Existing open widgets need refreshed discovery and a new instance to load the new resource.
