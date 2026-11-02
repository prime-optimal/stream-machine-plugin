# Observed broadcast duration

The desktop server does not expose these tools after #159. Their registrations are commented out in `src/server.ts`.

`src/analytics/register.ts` exports `registerAnalyticsTools(server)` and the main server calls it. It registers `stream_machine_streaming_metric`. The tool is available through bundled stdio MCP; no graphical UI is required.

The tool calculates duration from an explicitly user-supplied report. It does not fetch a provider, verify report authenticity, infer missing sessions, or claim Creator Dashboard access. `complete` describes supplied coverage, not independently verified completeness.

## Report contract

The strict input contains `sourceLabel` (1–200 plain-text characters), optional HTTPS `sourceUrl` (reference only, never fetched), `exportedAt`, `rangeStart`, `rangeEnd`, IANA `timezone`, `coverage`, and `sessions`.

Timestamps require RFC 3339 seconds and an explicit offset. Fractional seconds support up to millisecond precision. The range must increase and span at most 366 elapsed days. Each coverage interval has `start` and `end`. Each session also has a nonempty `id` of at most 200 characters. Both arrays allow at most 1,000 entries. Intervals must be closed and increasing. Unknown fields are rejected.

Calculation uses half-open UTC intervals. It clips and merges overlapping or adjacent coverage, unions sessions, then intersects the two unions. Identical IDs with equal instants count once. Conflicting timestamps for the same ID reject the report, including conflicts outside the range. The timezone only controls display. Explicit offsets determine instants, including daylight-saving transitions.

Results include seconds, decimal hours, UTC and local range labels, source provenance, covered seconds, gap seconds, gap intervals, contributing intervals, and formula. Empty coverage returns zero observed duration and a full-range gap. It does not prove no streaming occurred. Empty sessions return zero without inventing activity. No estimate or extrapolation fills gaps.

## Verified synthetic sample

This fixture is synthetic, not a provider export or account claim:

- Range: 2026-11-01 10:00–12:00 UTC.
- Display timezone: America/Los_Angeles.
- Coverage: 10:00–11:45 UTC.
- Session a: 10:00–11:30 UTC.
- Session b: 11:00–12:00 UTC.

Session union spans two hours. Its intersection with coverage spans 105 minutes: `105 * 60 = 6300` seconds, `6300 / 3600 = 1.75` hours. The uncovered interval 11:45–12:00 spans 900 seconds. Coverage status is `partial`; overlapping sessions do not double-count.

Run `bun test tests/broadcast-duration.test.ts tests/analytics-registration.test.ts` from the issue worktree. Expected result: 18 passing tests. The MCP test connects an actual in-memory client and server, invokes the tool, checks structured results, and rejects an invalid timezone. No browser view exists for this chat-first calculation.

## Bundled integration verification

The streaming-metric tool is commented out in `src/server.ts` (#159), so the bundled server no longer advertises it. The `tests/analytics-registration.test.ts` unit test still covers the 6,300-second, 1.75-hour, partial-coverage, and 900-second-gap results through its own server. `mise run package` creates and inspects the plugin archive. The separate mise-managed package smoke check verifies packaged launch. These checks do not contact analytics providers.
