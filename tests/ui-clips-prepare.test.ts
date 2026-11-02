import { describe, expect, test } from "bun:test";
import { createPreparation, discoverPreparation } from "../src/ui/clips-prepare";
import { resolveArchive, type ClipItem } from "../src/ui/clips-state";
import type { ToolResult } from "../src/ui/tool-transport";

const siteOrigin = "https://site.example";
const stored = { fileId: "file", playbackUrl: `${siteOrigin}/api/user-data/files/file`, downloadUrl: `${siteOrigin}/api/user-data/files/file`, bytes: 42, storedAt: "2026-11-02T00:00:00Z" };
function clip(id: string): ClipItem {
  return { id, title: id, url: `https://clips.twitch.tv/${id}`, createdAt: "2026-11-02T00:00:00Z", durationSeconds: 30, viewCount: 1,
    creator: { id: null, name: null }, game: { id: null, name: null }, thumbnailUrl: null, videoId: null, vodOffsetSeconds: null, stored: null };
}
const saved = (id: string): ToolResult => ({ structuredContent: { archive: { saved: [{ clipId: id, stored }], skipped: [], failed: [] } } });
function deferred() {
  let finish: (value: ToolResult) => void = () => {};
  const promise = new Promise<ToolResult>(resolve => { finish = resolve; });
  return { promise, finish };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("clip preparation contract", () => {
  test("uses returned Site metadata and preserves the source clip", () => {
    const outcome = resolveArchive(saved("old-clip"), "old-clip", siteOrigin);
    expect(outcome.kind).toBe("ready");
    if (outcome.kind === "ready") expect(outcome.stored).toEqual(stored);
  });
  test("rejects legacy, contradictory, and foreign media results without retry", () => {
    const legacy = { structuredContent: { archive: { saved: [{ clipId: "a" }], skipped: [], failed: [] } } };
    expect(resolveArchive(legacy, "a", siteOrigin).kind).toBe("unconfirmed");
    const conflict = { structuredContent: { archive: { saved: [{ clipId: "a", stored }], skipped: [], failed: [{ clipId: "a", code: "FAIL", outcome: "failed" }] } } };
    expect(resolveArchive(conflict, "a", siteOrigin).kind).toBe("unconfirmed");
    const foreign = { ...stored, playbackUrl: "https://evil.example/file" };
    expect(resolveArchive({ structuredContent: { archive: { saved: [{ clipId: "a", stored: foreign }], skipped: [], failed: [] } } }, "a", siteOrigin).kind).toBe("unconfirmed");
  });
  test("deduplicates Play and serializes separate clips without library rescans", async () => {
    const first = deferred(); const calls: string[] = []; const applied: string[] = [];
    const model = createPreparation({ siteOrigin, request: async (name, args) => { calls.push(`${name}:${String(args?.clipId)}`); return calls.length === 1 ? first.promise : saved("b"); }, changed() {}, stored: (item) => applied.push(item.id) });
    const a = model.prepare(clip("a")); const duplicate = model.prepare(clip("a")); const b = model.prepare(clip("b"));
    expect(calls).toEqual(["stream_machine_clips_archive:a"]);
    first.finish(saved("a"));
    expect((await a).kind).toBe("ready"); expect((await duplicate).kind).toBe("ready"); expect((await b).kind).toBe("ready");
    expect(calls).toEqual(["stream_machine_clips_archive:a", "stream_machine_clips_archive:b"]);
    expect(applied).toEqual(["a", "b"]);
  });
  test("stored Play makes no archive request", async () => {
    let calls = 0;
    const model = createPreparation({ siteOrigin, request: async () => { calls++; return saved("a"); }, changed() {}, stored() {} });
    expect((await model.prepare({ ...clip("a"), stored })).kind).toBe("ready"); expect(calls).toBe(0);
  });
  test("unknown and unconfirmed results block later writes", async () => {
    let calls = 0;
    const model = createPreparation({ siteOrigin, request: async () => { calls++; throw new Error("connection lost"); }, changed() {}, stored() {} });
    expect((await model.prepare(clip("a"))).kind).toBe("unknown");
    expect((await model.prepare(clip("a"), true)).kind).toBe("unknown"); expect(calls).toBe(1);
  });
  test("known failures retry only after explicit request", async () => {
    let calls = 0;
    const model = createPreparation({ siteOrigin, request: async () => {
      calls++;
      return calls === 1 ? { structuredContent: { archive: { saved: [], skipped: [], failed: [{ clipId: "a", code: "FAILED", outcome: "failed" }] } } } : saved("a");
    }, changed() {}, stored() {} });
    expect((await model.prepare(clip("a"))).kind).toBe("failed");
    expect((await model.prepare(clip("a"))).kind).toBe("failed"); expect(calls).toBe(1);
    expect((await model.prepare(clip("a"), true)).kind).toBe("ready"); expect(calls).toBe(2);
  });
  test("selected Play shares bulk work while cancellation preserves selected interest", async () => {
    const pending = deferred(); const calls: string[] = [];
    const model = createPreparation({ siteOrigin, request: async (_, args) => { calls.push(String(args?.clipId)); return calls.length === 1 ? pending.promise : saved(String(args?.clipId)); }, changed() {}, stored() {} });
    const run = model.startAll([clip("a"), clip("b")]);
    const play = model.prepare(clip("a")); const selected = model.prepare(clip("c"));
    model.cancelAll(); pending.finish(saved("a"));
    await run; expect((await play).kind).toBe("ready"); expect((await selected).kind).toBe("ready");
    expect(calls).toEqual(["a", "c"]);
  });
  test("disposal discards late storage result and queued writes", async () => {
    const pending = deferred(); let applied = 0; let calls = 0;
    const model = createPreparation({ siteOrigin, request: async () => { calls++; return pending.promise; }, changed() {}, stored() { applied++; } });
    const a = model.prepare(clip("a")); const b = model.prepare(clip("b")); model.dispose(); pending.finish(saved("a"));
    expect((await a).kind).toBe("cancelled"); expect((await b).kind).toBe("cancelled"); expect(calls).toBe(1); expect(applied).toBe(0);
  });
  test("cancel lets current write settle and stops further bulk writes", async () => {
    const pending = deferred(); const calls: string[] = [];
    const model = createPreparation({ siteOrigin, request: async (_, args) => { calls.push(String(args?.clipId)); return pending.promise; }, changed() {}, stored() {} });
    const run = model.startAll([clip("a"), clip("b")]); await tick(); model.cancelAll(); pending.finish(saved("a")); await run;
    expect(calls).toEqual(["a"]); expect(model.progress().kind).toBe("cancelled"); expect(model.progress().completed).toBe(1);
  });
  test("bulk refuses snapshots larger than its bound", async () => {
    const model = createPreparation({ siteOrigin, request: async () => { throw new Error("must not dispatch"); }, changed() {}, stored() {} });
    await expect(model.startAll(Array.from({ length: 101 }, (_, i) => clip(String(i))))).rejects.toThrow("100");
  });
});

describe("bounded gallery discovery", () => {
  test("loads at most ten pages without writes", async () => {
    let calls = 0;
    const result = await discoverPreparation({ accountId: "owner", cancelled: () => false, request: async (name, args) => {
      expect(name).toBe("stream_machine_clips_library"); expect(args?.first).toBe(100); calls++;
      return { structuredContent: { clips: { account: { id: "owner", login: "owner", displayName: "Owner" }, items: [clip(String(calls))], cursor: String(calls), storage: "site" } } };
    } });
    expect(calls).toBe(10); expect(result.items).toHaveLength(10); expect(result.truncated).toBe(true);
  });
  test("stops at 100 unsaved clips and rejects account changes", async () => {
    const request = async () => ({ structuredContent: { clips: { account: { id: "owner", login: "owner", displayName: "Owner" }, items: Array.from({ length: 100 }, (_, i) => clip(String(i))), cursor: "next", storage: "site" } } });
    expect((await discoverPreparation({ accountId: "owner", cancelled: () => false, request })).items).toHaveLength(100);
    await expect(discoverPreparation({ accountId: "another", cancelled: () => false, request })).rejects.toThrow("account");
  });
  test("cancellation and repeated cursors stop discovery", async () => {
    let calls = 0;
    const request = async () => { calls++; return { structuredContent: { clips: { account: { id: "owner", login: "owner", displayName: "Owner" }, items: [clip("a")], cursor: "same", storage: "site" } } }; };
    const result = await discoverPreparation({ accountId: "owner", cancelled: () => false, request });
    expect(calls).toBe(2); expect(result.items).toHaveLength(1); expect(result.truncated).toBe(true);
    calls = 0;
    expect((await discoverPreparation({ accountId: "owner", cancelled: () => calls > 0, request })).cancelled).toBe(true);
    expect(calls).toBe(1);
  });
});
