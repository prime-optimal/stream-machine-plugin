import { expect, test } from "bun:test";
import { calculateBroadcastDuration } from "../src/analytics/broadcast-duration";
const sample = {
  sourceLabel: "Synthetic interval report", exportedAt: "2026-11-01T12:00:00Z",
  rangeStart: "2026-11-01T10:00:00Z", rangeEnd: "2026-11-01T12:00:00Z", timezone: "America/Los_Angeles",
  coverage: [{ start: "2026-11-01T10:00:00Z", end: "2026-11-01T11:45:00Z" }],
  sessions: [{ id: "a", start: "2026-11-01T10:00:00Z", end: "2026-11-01T11:30:00Z" }, { id: "b", start: "2026-11-01T11:00:00Z", end: "2026-11-01T12:00:00Z" }],
};
test("sample unions overlaps and exposes uncovered 15 minutes", () => {
  const result = calculateBroadcastDuration(sample);
  expect(result.seconds).toBe(6300); expect(result.hours).toBe(1.75);
  expect(result.coveredSeconds).toBe(6300); expect(result.gapSeconds).toBe(900);
  expect(result.coverageStatus).toBe("partial");
  expect(result.gaps).toEqual([{ start: "2026-11-01T11:45:00.000Z", end: "2026-11-01T12:00:00.000Z" }]);
  expect(result.source.authenticity).toContain("not independently verified");
});
test("empty coverage is unknown, not proof of no broadcast", () => {
  const result = calculateBroadcastDuration({ ...sample, coverage: [] });
  expect(result.seconds).toBe(0); expect(result.gapSeconds).toBe(7200); expect(result.coverageStatus).toBe("partial");
});
test("empty sessions with full coverage yields zero", () => {
  const result = calculateBroadcastDuration({ ...sample, sessions: [], coverage: [{ start: sample.rangeStart, end: sample.rangeEnd }] });
  expect(result.seconds).toBe(0); expect(result.coverageStatus).toBe("complete");
});
test("duplicates count once and conflicting IDs fail", () => {
  expect(calculateBroadcastDuration({ ...sample, sessions: [...sample.sessions, ...sample.sessions] }).seconds).toBe(6300);
  expect(() => calculateBroadcastDuration({ ...sample, sessions: [...sample.sessions, { id: "a", start: sample.rangeStart, end: sample.rangeEnd }] })).toThrow("Conflicting");
});
test("clipping, adjacency, disjoint coverage and exclusive end", () => {
  const result = calculateBroadcastDuration({ ...sample, coverage: [
    { start: "2026-11-01T09:00:00Z", end: "2026-11-01T10:30:00Z" },
    { start: "2026-11-01T10:15:00Z", end: "2026-11-01T10:30:00Z" },
    { start: "2026-11-01T10:30:00Z", end: "2026-11-01T11:00:00Z" },
    { start: "2026-11-01T11:30:00Z", end: "2026-11-01T13:00:00Z" },
  ], sessions: [{ id: "wide", start: "2026-11-01T09:00:00Z", end: "2026-11-01T13:00:00Z" }, { id: "edge", start: sample.rangeEnd, end: "2026-11-01T13:00:00Z" }] });
  expect(result.seconds).toBe(5400); expect(result.gapSeconds).toBe(1800); expect(result.contributingIntervals).toHaveLength(2);
});
test("explicit offsets handle DST without local-clock subtraction", () => {
  const result = calculateBroadcastDuration({ ...sample, rangeStart: "2026-11-01T01:00:00-07:00", rangeEnd: "2026-11-01T01:00:00-08:00", coverage: [{ start: "2026-11-01T08:00:00Z", end: "2026-11-01T09:00:00Z" }], sessions: [{ id: "dst", start: "2026-11-01T01:00:00-07:00", end: "2026-11-01T01:00:00-08:00" }] });
  expect(result.seconds).toBe(3600); expect(result.localRange.start).not.toBe(result.localRange.end);
});
for (const change of [ { rangeStart: "2026-02-30T10:00:00Z" }, { rangeStart: "2026-11-01T10:00:00" }, { rangeEnd: sample.rangeStart }, { rangeEnd: "2028-11-01T12:00:00Z" }, { timezone: "no/such-zone" }, { sourceUrl: "http://example.com" }, { sourceLabel: "\n" }, { extra: true }, { sessions: [{ id: "open", start: sample.rangeStart }] }, { coverage: [{ start: sample.rangeEnd, end: sample.rangeStart }] }, { coverage: Array(1001).fill(sample.coverage[0]) } ]) {
  test(`invalid report rejected: ${JSON.stringify(change).slice(0, 90)}`, () => expect(() => calculateBroadcastDuration({ ...sample, ...change })).toThrow());
}
