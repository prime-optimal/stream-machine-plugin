# Transcribe one local audio file

Use `stream_machine_transcribe_audio` when you have a completed local recording and want its spoken text. The tool uploads the selected file to OpenAI using `gpt-transcribe`. Only invoke it when the user has requested that upload. OpenAI usage may incur charges.

This tool does not fetch URLs, download media, or retrieve video metadata. `stream_machine_media_info` applies it to an authorized Twitch clip. See [Show details or a transcript for one clip](media-info.md). A downloaded clip can also be input here if it meets the limits below.

## Prepare the server

Follow [secret setup](../secrets.md). The server reads `OPENAI_API_KEY` from its environment at invocation time. The package contains a 1Password reference, not a key. Refresh the encrypted local cache intentionally after adding or rotating the reference, then restart the server.

The preview bridge forwards the key only to its local server process. It does not expose it to the browser or tool results. Missing credentials leave discovery and other tools available; only transcription returns `OPENAI_NOT_CONFIGURED`.

## Run one transcription

1. Select a file you intend to send to OpenAI.
2. Use its canonical absolute path. Resolve aliases before calling; on macOS, `/tmp` is a symlink, so its canonical spelling is usually `/private/tmp`.
3. Call the tool with `path`. The call returns text, source basename/size/hash/format, the requested model, and completion time.

Example tool arguments:

```json
{
  "path": "/canonical/path/clip.mp4",
  "keywords": ["Stream Machine"],
  "languages": ["en"]
}
```

For a local CLI check, build the server and run the MCP demo client:

```sh
mise run build
mise exec -- fnox exec -- bun scripts/transcribe-demo.ts /canonical/path/audio.wav
```

Expected result: a `transcription` object with `provider: "openai"`, `model: "gpt-transcribe"`, and the recognized `text`. The CLI uses the actual bundled stdio server through the preview bridge and closes it afterward.

## Input limits

The tool accepts at most 25,000,000 bytes. This conservative decimal-byte boundary stays within the documented 25 MB API upload limit. The endpoint is fixed; redirects and automatic retries are disabled. [OpenAI file transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text).

Supported local formats:

| Extension | Local structural checks |
| --- | --- |
| `.wav` | RIFF/WAVE, PCM, 16-bit samples, valid format/data chunks and frame alignment |
| `.mp3` | Valid bounded ID3 metadata and at least two complete Layer III frames |
| `.mp4`, `.m4a` | Bounded container boxes, file-type box, nonempty media data, and a declared audio handler |

Other formats accepted by OpenAI are outside this first implementation. The reader does not decode media or guarantee speech quality. A file may pass structural checks and still be rejected by OpenAI.

MP4/M4A validation permits at most 10,000 parsed boxes across the root and inspected `moov/trak/mdia` hierarchy. This local defensive limit bounds metadata allocation; it is not an API limit.

Files must be regular, owned by the current user, and not writable by a group or everyone. Symlinks, including ancestor aliases, special files, relative paths, traversal segments, empty files, and changing sources are rejected. Reads use a bounded descriptor and recheck identity, size, and modification metadata. Ordinary Node filesystem APIs cannot make the ancestor walk atomic against a hostile local process; this is a trusted desktop-user boundary, not a multi-user upload service.

## Optional hints

The strict input accepts only `path`, `prompt`, `keywords`, and `languages`.

- `prompt`: 1–4,096 characters.
- `keywords`: 1–64 entries, each 1–128 characters; no angle brackets or line breaks.
- `languages`: 1–16 distinct canonicalizable language tags.

These are local input bounds. The API can impose additional model restrictions. The request uses plural `languages[]` and `keywords[]`; singular `language`, arbitrary models, and source URLs are rejected. [Create transcription reference](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

## Results and recovery

The returned hash identifies the exact bytes uploaded. `model` identifies the requested model, not an independently verified provider snapshot. Empty text remains empty and can indicate no recognized speech. The tool does not invent detected language, duration, word timestamps, speaker labels, or confidence.

| Result | Next step |
| --- | --- |
| `INVALID_INPUT`, `AUDIO_FORMAT_UNSUPPORTED`, `AUDIO_INVALID_MEDIA` | Correct the arguments or prepare supported audio. |
| `AUDIO_SOURCE_UNSAFE`, `AUDIO_SOURCE_UNAVAILABLE` | Select a canonical, owned, stable file with suitable permissions. |
| `AUDIO_SOURCE_EMPTY`, `AUDIO_TOO_LARGE` | Prepare a nonempty file within the upload bound. |
| `OPENAI_NOT_CONFIGURED`, `OPENAI_AUTH_FAILED` | Check fnox configuration, key validity, and model access. |
| `OPENAI_RATE_LIMITED` | Check account limits before a new explicit attempt. |
| `TRANSCRIPTION_BUSY` | Wait for the current local operation. |
| `TRANSCRIPTION_TIMEOUT`, `TRANSCRIPTION_CANCELLED` | Check whether upload was dispatched; do not retry automatically. |
| `OPENAI_REQUEST_FAILED`, `OPENAI_UNAVAILABLE` | Inspect the safe error and processing-uncertainty flag before deciding on a new call. |
| `OPENAI_INVALID_RESPONSE`, `OPENAI_RESPONSE_TOO_LARGE` | No usable transcript was received; do not treat this as proof that no processing occurred. |

Errors expose static messages and `mayHaveBeenProcessed`. Network failures, server errors, or cancellation after dispatch can leave remote processing underway. Canceling a local request cannot establish that OpenAI stopped or that no charge occurred.

One local operation is active per server process, across service instances. The overall deadline is 120 seconds, and the response body is capped at 1 MiB with a 250,000-character text bound. Cleanup releases local resources and the reservation. Server shutdown also aborts active work.

See [the checked lifecycle](../statechart/85-transcription/README.md) and [verification evidence](../reviews/85-transcription.md).
