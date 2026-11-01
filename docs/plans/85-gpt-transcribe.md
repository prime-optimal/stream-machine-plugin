# GPT-Transcribe implementation plan

Issue [#85](https://github.com/prime-optimal/stream-machine-plugin/issues/85) adds an independent audio tool from `origin/main` at `bc43ca8`. It complements PR #77 without merging or redefining its URL metadata/caption tool.

## Decisions

Use a sibling OpenAI adapter with native fetch and multipart data. Keep the endpoint and model fixed. Read only explicitly selected local files, validate their structure and ownership, and bound upload, response, and elapsed time. Share one local reservation across service instances, propagate MCP cancellation, and never retry paid requests automatically.

Official [model documentation](https://developers.openai.com/api/docs/models/gpt-transcribe), [file-transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text), and [endpoint reference](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create) were checked before implementation. The exact requested model is retained.

## Work and verification

| Work | Files | Verification |
| --- | --- | --- |
| Validate local source | `src/adapters/openai/audio-source.ts` | Real temporary files, malformed structures, mutation, limits, permissions and symlinks |
| Upload and return text | `transcription-contracts.ts`, `transcription-service.ts` | Multipart fields, static errors, bounded bodies, timeout, cross-instance reservation and late cleanup |
| Expose MCP tool | `transcription-register.ts`, `src/server.ts` | In-memory discovery/results/cancellation and bundled stdio smoke |
| Deliver credentials | `src/preview-bridge.ts`, `fnox.toml` | Child-only key forwarding, reference-only staged config, encrypted ignored cache |
| Exercise live request | `scripts/transcribe-demo.ts` | One synthetic spoken WAV through bundled MCP and real API |
| Document boundary | Demo guide, lifecycle model and review | Sources, limitations, state checks and issue evidence |

## Corrections to the builder draft

The builder's optional approval for copying the reference is already covered by the user's instruction to use the key they added. Only the existing `op://` reference was copied; the primary checkout and key value were untouched.

The supported subset also includes MP4/M4A with a declared audio track, because downloaded clips use MP4. No runtime converter was added. Source provenance returns the basename rather than an unnecessary absolute path. The installed SDK exposes cancellation as `context.mcpReq.signal`, confirmed by types and a real MCP cancellation regression.

The lifecycle distinguishes local cleanup from remote processing. Review regressions cover delayed responses, bounded MP4 metadata allocation, and uncertain server-error outcomes. The original Oracle export remains planning context; this file records the implementation decisions.
