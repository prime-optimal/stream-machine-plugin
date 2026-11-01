import { z } from "zod";

const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/).datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)), "Invalid timestamp");
const interval = z.object({ start: timestamp, end: timestamp }).strict().refine(value => Date.parse(value.start) < Date.parse(value.end), "Interval must increase");
export const broadcastReportSchema = z.object({
  sourceLabel: z.string().trim().min(1).max(200).refine(value => !/[\x00-\x1f\x7f]/.test(value)),
  sourceUrl: z.string().url().refine(value => new URL(value).protocol === "https:").optional(),
  exportedAt: timestamp,
  rangeStart: timestamp,
  rangeEnd: timestamp,
  timezone: z.string().refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return !/^[+-]/.test(value); } catch { return false; } }, "Invalid IANA timezone"),
  coverage: z.array(interval).max(1000),
  sessions: z.array(z.object({ id: z.string().min(1).max(200), start: timestamp, end: timestamp }).strict().refine(value => Date.parse(value.start) < Date.parse(value.end), "Session must increase")).max(1000),
}).strict().refine(value => { const duration = Date.parse(value.rangeEnd) - Date.parse(value.rangeStart); return duration > 0 && duration <= 366 * 86400000; }, "Range must increase and span at most 366 days");

type Span = { start: number; end: number };
const serialize = (span: Span) => ({ start: new Date(span.start).toISOString(), end: new Date(span.end).toISOString() });
function union(spans: Span[]): Span[] {
  const result: Span[] = [];
  for (const span of spans.sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else result.push({ ...span });
  }
  return result;
}
export function calculateBroadcastDuration(input: unknown) {
  const report = broadcastReportSchema.parse(input);
  const start = Date.parse(report.rangeStart), end = Date.parse(report.rangeEnd);
  const clip = (value: { start: string; end: string }): Span => ({ start: Math.max(start, Date.parse(value.start)), end: Math.min(end, Date.parse(value.end)) });
  const coverage = union(report.coverage.map(clip).filter(span => span.start < span.end));
  const ids = new Map<string, Span>();
  for (const session of report.sessions) {
    const span = { start: Date.parse(session.start), end: Date.parse(session.end) };
    const previous = ids.get(session.id);
    if (previous && (previous.start !== span.start || previous.end !== span.end)) throw new Error("Conflicting session ID");
    ids.set(session.id, span);
  }
  const sessions = union([...ids.values()].map(span => ({ start: Math.max(start, span.start), end: Math.min(end, span.end) })).filter(span => span.start < span.end));
  const contributing: Span[] = [];
  let i = 0, j = 0;
  while (i < sessions.length && j < coverage.length) {
    const session = sessions[i], covered = coverage[j];
    if (!session || !covered) break;
    const span = { start: Math.max(session.start, covered.start), end: Math.min(session.end, covered.end) };
    if (span.start < span.end) contributing.push(span);
    if (session.end < covered.end) i++; else j++;
  }
  const gaps: Span[] = [];
  let cursor = start;
  for (const covered of coverage) { if (cursor < covered.start) gaps.push({ start: cursor, end: covered.start }); cursor = covered.end; }
  if (cursor < end) gaps.push({ start: cursor, end });
  const seconds = (spans: Span[]) => spans.reduce((total, span) => total + span.end - span.start, 0) / 1000;
  const format = new Intl.DateTimeFormat("en-GB", { timeZone: report.timezone, dateStyle: "full", timeStyle: "long" });
  return {
    metric: "Observed broadcast duration", seconds: seconds(contributing), hours: seconds(contributing) / 3600,
    range: serialize({ start, end }), timezone: report.timezone,
    localRange: { start: format.format(start), end: format.format(end) },
    source: { label: report.sourceLabel, url: report.sourceUrl, exportedAt: new Date(report.exportedAt).toISOString(), authenticity: "User supplied; authenticity not independently verified" },
    coverageStatus: gaps.length ? "partial" : "complete", coveredSeconds: seconds(coverage), gapSeconds: seconds(gaps),
    gaps: gaps.map(serialize), contributingIntervals: contributing.map(serialize),
    formula: "Duration of union(sessions) intersect union(coverage) intersect [rangeStart, rangeEnd); no extrapolation",
  };
}
