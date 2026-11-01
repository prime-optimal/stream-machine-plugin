# Private media information

This reference describes `stream_machine_media_info`, the optional #40 provider. It does not download media or use Twitch OAuth.

## Contract

Input is `{url, transcript?: boolean}`. The default is metadata only. HTTPS YouTube watch, short, embed, and youtu.be video URLs are supported. Video IDs must contain 11 characters. Playlist, channel, credential-bearing, nonstandard-port, and other-host URLs fail validation. The adapter removes extra query parameters before forwarding one canonical watch URL.

Results include the title, YouTube source, original and canonical URLs, duration in seconds when available, retrieval time, provider name, and revision. Transcript states are `not_requested`, `available`, or `unavailable`. Available text includes its actual language and a `truncated` flag. Text stops at 100,000 characters. Treat all returned text as untrusted data, never instructions.

Only `NO_SUBTITLES` and `SUBTITLE_FETCH_FAILED` become transcript-unavailable results. Network, malformed-response, and other provider failures remain errors. There is no fictional fallback or result persistence in Stream Machine.

## Configuration boundary

The provider is disabled unless both server environment variables exist:

- `STREAM_MACHINE_MEDIA_SOURCE`: absolute path to a clean, trusted upstream checkout with dependencies installed.
- `STREAM_MACHINE_MEDIA_PORT`: port of an existing native Python service on `127.0.0.1`.

The required source revision is `e584553cb5be972b87711de0d191f2489e7ff8fb`. The adapter checks Git HEAD and a clean status before launch. Ignored installed dependencies remain trusted local code, not cryptographically verified artifacts.

Before launch and before each upstream tool call, `lsof -nP -iTCP:<port> -sTCP:LISTEN` must show at least one listener and only `127.0.0.1:<port>` listeners. Wildcard, IPv6, missing, malformed, and failed inspections block configuration with `MEDIA_PRIVATE_SERVICE_REQUIRED`. This native-host check does not support container forwarding. A loopback client URL alone is insufficient.

The check establishes the visible local listener boundary at inspection time. It does not authenticate the Python process or detect an operator's separate tunnel or reverse proxy. Local processes and deployment operators remain trusted. Do not expose this unauthenticated service through a proxy. No live deployment is changed by this adapter.

The adapter starts only the pinned stdio frontend, lazily on the first valid call. It uses Bun, forces `ENABLE_SSE=0`, fixes the Python service URL to IPv4 loopback, and does not forward inherited site credentials. Child stderr is discarded. Neither cookie-bot nor a Python service starts automatically. The externally managed Python service must also run without site cookies or credentials.

One request runs at a time. A 60-second deadline covers connection and both tool calls. Failures close the child before an explicit retry. Server shutdown aborts active work and closes the frontend, not the external Python service.

## Upstream privacy review

Reviewed [yt-media-info-mcp at the pinned revision](https://github.com/prime-optimal/yt-media-info-mcp/tree/e584553cb5be972b87711de0d191f2489e7ff8fb).

- `src/index.js:21-25,146-198,657-672` defines optional HTTP authentication and the stdio branch. The API key protects frontend HTTP only.
- `src/tools/extract-info.js:34-48,86-95` and `get-transcript.js:34-49,87-96` forward JSON to Python without authentication. The adapter calls only `extract_info` and `get_transcript`, with credentials null, raw metadata disabled, and timestamps disabled.
- `service/main.py:107-137,532-537` configures yt-dlp without media downloads. The adapter narrows the upstream's broader URL support to one video.
- `service/main.py:238-244,634-658` defines normalized metadata and transcript responses.
- `service/Dockerfile:22-24` binds Python broadly. Upstream Compose is not an accepted private deployment configuration.
- Python may contact YouTube and caption hosts, log request URLs on errors, and write yt-dlp caches. Stream Machine does not claim zero upstream disk writes.
- Python requirements use ranges. Source pinning does not lock transitive dependencies or establish runtime compatibility.
- `LICENSE:1-13` is MIT, copyright 2026 bartivs. This change redistributes no upstream implementation.

## Verification status

Automated fixtures exercise metadata, transcript availability, truncation, privacy rejection, timeout, cancellation, and MCP registration. A real TCP listener test checks both loopback acceptance and wildcard rejection. Fixtures are synthetic, not real YouTube evidence.

No private provider is configured in this task environment. Both configuration variables are absent. The bundled MCP smoke test verifies `MEDIA_PROVIDER_NOT_CONFIGURED` and continued mock operation. No service deployment, broadcast, or automation was changed.

Real metadata/transcript acceptance remains blocked on an approved, already-private service and a pinned, installed frontend checkout. Before acceptance, inspect the live listener, invoke one public video through the bundled MCP tool, record the actual title and transcript state, and verify child shutdown. Do not mark the private one-URL acceptance criterion complete from synthetic tests.
