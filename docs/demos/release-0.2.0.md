# Private plugin 0.2.0 verification

The existing [Stream Machine plugin](https://chatgpt.com/plugins/Plugin_b4a997d77c548191a250dbaa578523b2) was updated in place. It remains private and user-scoped.

Release: `pluginrel_6ae75f35cc5c8191a024fcd1c00f5149`.

The source read-back confirmed version 0.2.0 in both manifests, the fnox launcher, unchanged identity and default prompt, and removal of old macOS metadata files.

## Verified before publication

- TypeScript checks passed.
- All 68 tests passed with 225 assertions.
- The bundled stdio server exposed 27 tools.
- The archive started through its actual fnox command outside the checkout, without `node_modules`. The Twitch account was available through that launch.
- The package scan found no resolved credential values or MP4 deliverables.
- The local UI performed real reads, applied the USB button, and created a HyperFrames HTML artifact.
- The layout had no horizontal overflow at 375 and 1440 CSS pixels. The browser console had no warnings or errors in the checked page.

The [demo evidence](integration.md) records the real Twitch, OBS, USB, creative, and independent-worker results.

## Current-chat limitation

After publication, this chat still exposed the six v0.1 mock tools. Its opener returned the old mock-only response. Updated native-host tool and view verification therefore remains pending a plugin reload or fresh chat.

The [local live controls](http://127.0.0.1:4318/?preview=1) already use the new 27-tool server. The saved plugin update and local verification are complete; neither is a claim that this chat's cached runtime refreshed.

This report was written after the package was published. It is a repository verification record, not an additional plugin release.
