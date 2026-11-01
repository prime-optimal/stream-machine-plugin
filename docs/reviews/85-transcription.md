# GPT-Transcribe verification and review

Issue [#85](https://github.com/prime-optimal/stream-machine-plugin/issues/85) adds `stream_machine_transcribe_audio` for explicitly selected local audio. The tool uses the exact requested model, `gpt-transcribe`, without the private provider in PR #77.

## Live result

On macOS 27.2 with Bun 1.4.4, one synthetic spoken WAV was sent through fnox, the preview bridge, the bundled stdio MCP server, and the real OpenAI API. This was not an injected-provider test.

Command:

```sh
mise exec -- fnox exec -- bun scripts/transcribe-demo.ts /private/tmp/stream-machine-transcribe-85/speech.wav
```

Exit: 0. Completion time: `2026-11-01T23:18:50.763Z`.

| Field | Observed value |
| --- | --- |
| Model requested | `gpt-transcribe` |
| Uploaded bytes | 121264 |
| SHA-256 | `6d4220a91f8f79ab6dce7b8888d1b1bafa6d23caa178a310d97ec6643c2debbf` |
| Returned text | Stream machine transcription test. The blue lantern is ready. |

The input was generated locally with macOS speech synthesis and converted to mono 16 kHz PCM16 WAV. Only that synthetic audio was uploaded. No private stream recording was used. The key was resolved through an ignored age-encrypted fnox cache; only its existing 1Password reference was added to source. The primary checkout's user-owned fnox change was preserved.

Later fixes affect error classification, late-response cleanup, and pathological MP4 parsing. Focused regressions verify those paths; the successful paid request was not repeated.

## Automated checks

At the implementation baseline from `bc43ca8`:

- Source tests first failed because the reader did not exist; source implementation then passed.
- Service tests first failed because the service did not exist; the implementation then passed.
- The real in-memory MCP cancellation test failed when it used the wrong SDK context property. After switching to `context.mcpReq.signal`, it passed.
- `mise run check`: exit 0.
- `mise run test`: exit 0; 134 tests, 0 failures, 811 assertions.
- `mise run smoke`: exit 0; 31 tools.
- `mise run package`: exit 0; 128 archive entries inspected at that run.
- `mise exec -- bun scripts/package-smoke.ts`: exit 0; 31 tools and packaged fnox launch passed.
- Preview bridge test verifies child-only key forwarding using a sentinel, without network access.
- Local generated WAV, MP3, MP4 with audio/video, and M4A inputs passed source validation. Only WAV received live API acceptance.

The [lifecycle model](../statechart/85-transcription/README.md) checked 56 states and 164 steps. Ten invariants and deadlock checking passed. It describes one local reservation across two service instances, not exactly-once remote processing.

The final issue comment records checks after any reconciliation with newer main commits and the final push. Package entry count changes when evidence documents are added.

## Final integration check

Rebased the isolated issue branch onto `origin/main` at `cfc34a3`, including the merged Twitch-consent and UX-plan changes. No conflict required a source change.

All commands exited 0 after reconciliation: `mise run check`, `mise run test` with 140 tests and 817 assertions, `mise run smoke` with 31 tools, `mise run package` with 200 inspected entries, packaged fnox smoke with 31 tools, and `mise run hooks:check`.

The live transcription result above remains the single paid acceptance call. No new provider or UI behavior was introduced by reconciliation.

## Retained work at handoff

The primary checkout is current on main but keeps the user's uncommitted `fnox.toml` reference change. Its owner should reconcile that reference when this feature merges; this task did not stage or overwrite it.

Clean retained worktrees include the media tasks, secrets task, demo checkout, and Twitch-profile checkout. The native verification worktree retains commit `94371ca`; the consent worktree retains `7afc84b`; the UX worktree retains its original commits after squash merge. Their remote branches are gone. Respective task owners must verify merge inclusion and active paths before cleanup.

The primary checkout has Codex, Node, RepoPrompt, and Open Design helper processes. The demo checkout has a Bun process. Installed plugin runtimes still use the plugin cache. None was stopped. No persistent transcription-demo process remained after the client closed.

## Required review questions

1. Can code be simplified? A sibling adapter using native fetch and FormData avoids a new SDK or provider framework. File validation, request lifecycle, and MCP registration remain separate small modules. No runtime transcoder or automatic acquisition path was added.
2. Can documentation be clarified? The guide separates metadata/captions from audio transcription, local structural checks from decoding, local cancellation from remote processing, and the requested model from provider-confirmed metadata. It documents canonical paths, supported formats, limits, and missing-key behavior.
3. Does this flow need a statechart? Yes. Validation, dispatch, shared reservation, cancellation, cleanup, and service closure need explicit rules. The checked chart and runtime tests cover different claims.

## Findings resolved

| Finding | Regression and fix |
| --- | --- |
| Late response body left open after timeout | A delayed-response test failed first. The abort helper now cancels a Response body arriving after cancellation; the regression passes. See `transcription-service.ts:17`. |
| MP4 box-count memory amplification | Tests for excessive root and nested boxes failed before a shared 10,000-box budget. Root/nested overflow and the exact boundary now pass. See `audio-source.ts:92`. |
| HTTP 5xx falsely marked unprocessed | A 500-response regression failed first. Server errors and HTTP 408 now report processing uncertainty. Known refusals remain distinct. See `transcription-service.ts:99`. |

A separate reviewer rechecked all three fixes and the guide. Its focused run passed 23 tests with no failures. No unresolved finding remains in that scope.

## Limits and related work

PR #77's private YouTube metadata/caption provider remains unconfigured. This new tool supplies local-file transcription; it does not make a YouTube URL into audio or satisfy that PR's one-URL metadata acceptance. The branches remain independent.

No UI was changed, no installed plugin was replaced, and no native ChatGPT rendering was tested. The live acceptance exercised the bundled MCP tool through a local stdio client. No screenshots are needed for this nonvisual tool.

Structural media checks do not establish decode quality. A hostile local process racing ancestor-directory changes remains outside the trusted desktop-user boundary. No API transcript timestamps, detected language, confidence, or speaker labels are inferred.

The new worktree retains its ignored encrypted fnox cache and generated package for local use. The planning export and synthetic scratch files are retained for this task. Other worktrees and running processes remain with their owners; the final issue evidence records the handoff snapshot.
