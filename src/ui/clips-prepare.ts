import { parseLibrary, playableStored, resolveArchive, type ClipItem, type PreparationResult } from "./clips-state";
import type { ToolRequest } from "./tool-transport";

type Job = { clip: ClipItem; resolve: (result: PreparationResult) => void; promise: Promise<PreparationResult>; selected: boolean };
export type PreparationProgress = {
  kind: "idle" | "working" | "stopping" | "complete" | "cancelled";
  total: number; completed: number; saved: number; skipped: number; failed: number; unknown: number;
};
const emptyProgress = (): PreparationProgress => ({ kind: "idle", total: 0, completed: 0, saved: 0, skipped: 0, failed: 0, unknown: 0 });

export function createPreparation(options: {
  request: ToolRequest; siteOrigin: string; changed: () => void; stored: (clip: ClipItem) => void;
}) {
  const pending = new Map<string, Job>();
  const settled = new Map<string, PreparationResult>();
  let queue: Job[] = [];
  let busy = false;
  let disposed = false;
  let cancelled = false;
  let progress = emptyProgress();
  function notify() { if (!disposed) options.changed(); }

  async function pump() {
    if (busy || disposed) return;
    const job = queue.shift();
    if (!job) return;
    busy = true;
    let result: PreparationResult;
    try {
      result = resolveArchive(await options.request("stream_machine_clips_archive", { clipId: job.clip.id }), job.clip.id, options.siteOrigin);
    } catch { result = { kind: "unknown", message: "Couldn't confirm the save. Reload your clips to check." }; }
    if (disposed) result = { kind: "cancelled" };
    else {
      settled.set(job.clip.id, result);
      if (result.kind === "ready") options.stored({ ...job.clip, stored: result.stored });
    }
    pending.delete(job.clip.id);
    busy = false;
    job.resolve(result);
    void pump();
  }

  function prepare(clip: ClipItem, retry = false, selected = true): Promise<PreparationResult> {
    if (disposed) return Promise.resolve({ kind: "cancelled" });
    if (clip.stored && playableStored(clip.stored, options.siteOrigin)) {
      const result: PreparationResult = { kind: "ready", stored: clip.stored, alreadyStored: true };
      settled.set(clip.id, result);
      return Promise.resolve(result);
    }
    const held = settled.get(clip.id);
    if (held && !(held.kind === "failed" && retry)) return Promise.resolve(held);
    const existing = pending.get(clip.id);
    if (existing) {
      if (selected && !existing.selected) {
        existing.selected = true;
        const index = queue.indexOf(existing);
        if (index >= 0) { queue.splice(index, 1); queue.unshift(existing); }
      }
      return existing.promise;
    }
    let finish: (value: PreparationResult) => void = () => {};
    const promise = new Promise<PreparationResult>(resolve => { finish = resolve; });
    const job: Job = { clip, promise, resolve: finish, selected };
    pending.set(clip.id, job);
    if (selected) queue.unshift(job); else queue.push(job);
    void pump();
    return promise;
  }

  async function startAll(items: readonly ClipItem[]) {
    if (items.length > 100) throw new Error("Save at most 100 clips at a time.");
    if (disposed || progress.kind === "working" || progress.kind === "stopping") return;
    cancelled = false;
    const unique = [...new Map(items.map(item => [item.id, item])).values()];
    progress = { ...emptyProgress(), kind: "working", total: unique.length };
    notify();
    for (const clip of unique) {
      if (cancelled || disposed) break;
      const result = await prepare(clip, false, false);
      if (disposed) return;
      if (result.kind === "cancelled") break;
      progress.completed++;
      if (result.kind === "ready") { if (result.alreadyStored) progress.skipped++; else progress.saved++; }
      else if (result.kind === "failed") progress.failed++;
      else progress.unknown++;
      notify();
    }
    if (!disposed) { progress.kind = cancelled ? "cancelled" : "complete"; notify(); }
  }

  function cancelAll() {
    cancelled = true;
    for (const job of queue.filter(item => !item.selected)) {
      pending.delete(job.clip.id); job.resolve({ kind: "cancelled" });
    }
    queue = queue.filter(item => item.selected);
    if (progress.kind === "working") progress.kind = "stopping";
    notify();
  }

  function dispose() {
    disposed = true; cancelled = true;
    for (const job of queue) job.resolve({ kind: "cancelled" });
    queue = []; pending.clear(); settled.clear();
  }

  return { prepare, startAll, cancelAll, dispose, progress: () => ({ ...progress }), outcomes: () => [...settled].map(([clipId, result]) => ({ clipId, result })) };
}

export type PreparationDiscovery = { items: ClipItem[]; truncated: boolean; cancelled: boolean };
export async function discoverPreparation(options: {
  request: ToolRequest; accountId: string; cancelled: () => boolean;
}): Promise<PreparationDiscovery> {
  const items = new Map<string, ClipItem>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
    if (options.cancelled()) return { items: [], truncated: false, cancelled: true };
    const result = await options.request("stream_machine_clips_library", { first: 100, ...(cursor ? { cursor } : {}) });
    if (options.cancelled()) return { items: [], truncated: false, cancelled: true };
    if (result.isError) throw new Error("Couldn't read your clips. Nothing was saved.");
    const page = parseLibrary(result.structuredContent);
    if (page.account.id !== options.accountId) throw new Error("The Twitch account changed. Reload your clips and try again.");
    if (page.storage !== "site") throw new Error("Saving isn't available here.");
    for (const clip of page.items) {
      if (!clip.stored) items.set(clip.id, clip);
      if (items.size === 100) return { items: [...items.values()], truncated: Boolean(page.cursor) || page.items.at(-1)?.id !== clip.id, cancelled: false };
    }
    if (!page.cursor) return { items: [...items.values()], truncated: false, cancelled: false };
    if (cursors.has(page.cursor)) break;
    cursors.add(page.cursor); cursor = page.cursor;
  }
  return { items: [...items.values()], truncated: true, cancelled: false };
}
