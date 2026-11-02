import { describe, expect, test } from "bun:test";
import {
  ClipLibraryError, allCategories, categoriesOf, formatBytes, formatDuration, formatOffset, mergePage, parseLibrary,
  parseArchive, parseZipBatches, safeHttpsUrl, uncategorized, visibleClips, type ClipItem,
} from "../src/ui/clips-state";

function clip(id: string, over: Partial<ClipItem> = {}): ClipItem {
  return {
    id, title: `Clip ${id}`, url: `https://clips.twitch.tv/${id}`, createdAt: "2026-10-01T00:00:00Z", durationSeconds: 30, viewCount: 1,
    creator: { id: "c", name: "Fan" }, game: { id: "1", name: "Chess" }, thumbnailUrl: null, videoId: null, vodOffsetSeconds: null, stored: null, ...over,
  };
}

describe("clip gallery state", () => {
  test("merges pages by clip ID without duplicates and prefers the newer record", () => {
    const merged = mergePage([clip("a"), clip("b")], [clip("b", { title: "Renamed" }), clip("c")]);
    expect(merged.map(item => item.id)).toEqual(["a", "b", "c"]);
    expect(merged[1]!.title).toBe("Renamed");
  });

  test("filters by search text and category", () => {
    const items = [clip("a", { title: "Big Win" }), clip("b", { game: { id: "2", name: "Go" } }), clip("c", { game: { id: null, name: null } })];
    expect(visibleClips(items, { search: "win", category: allCategories }, "newest").map(item => item.id)).toEqual(["a"]);
    expect(visibleClips(items, { search: "", category: "Go" }, "newest").map(item => item.id)).toEqual(["b"]);
    expect(visibleClips(items, { search: "", category: uncategorized }, "newest").map(item => item.id)).toEqual(["c"]);
    expect(visibleClips(items, { search: "fan", category: allCategories }, "newest")).toHaveLength(3);
  });

  test("sorts newest, oldest, and most viewed", () => {
    const items = [
      clip("a", { createdAt: "2026-01-01T00:00:00Z", viewCount: 5 }),
      clip("b", { createdAt: "2026-03-01T00:00:00Z", viewCount: 1 }),
      clip("c", { createdAt: "2026-02-01T00:00:00Z", viewCount: 9 }),
    ];
    const ids = (sort: "newest" | "oldest" | "views") => visibleClips(items, { search: "", category: allCategories }, sort).map(item => item.id);
    expect(ids("newest")).toEqual(["b", "c", "a"]);
    expect(ids("oldest")).toEqual(["a", "c", "b"]);
    expect(ids("views")).toEqual(["c", "a", "b"]);
  });

  test("lists categories alphabetically with an unknown bucket last", () => {
    const items = [clip("a", { game: { id: "2", name: "Go" } }), clip("b"), clip("c", { game: { id: null, name: null } })];
    expect(categoriesOf(items)).toEqual([{ key: "Chess", label: "Chess" }, { key: "Go", label: "Go" }, { key: uncategorized, label: "Unknown category" }]);
  });

  test("formats durations, sizes, and VOD offsets", () => {
    expect(formatDuration(65.4)).toBe("1:05");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatOffset(3725)).toBe("1:02:05");
  });
});

describe("clip tool results", () => {
  test("preserves stored metadata needed to play an archived clip directly", () => {
    const stored = { fileId: "id", playbackUrl: "https://site.example/api/user-data/files/id", downloadUrl: "https://site.example/api/user-data/files/id", bytes: 42, storedAt: "2026-11-02T00:00:00Z" };
    expect(parseArchive({ archive: { saved: [{ clipId: "a", stored }], skipped: [], failed: [] } }).saved[0]).toEqual({ clipId: "a", stored });
  });
  test("parses a library page and rejects malformed or faulted results", () => {
    const page = { clips: { account: { id: "1", login: "l", displayName: "L" }, items: [clip("a")], cursor: "next", storage: "site" } };
    expect(parseLibrary(page).cursor).toBe("next");
    expect(() => parseLibrary({ clips: {} })).toThrow(ClipLibraryError);
    expect(() => parseLibrary({ error: { code: "TWITCH_RECONNECT_REQUIRED" } })).toThrow("Twitch is not connected");
  });

  test("keeps only HTTPS ZIP batch links", () => {
    const batch = (url: string) => ({ url, clipCount: 2, bytes: 10, expiresAt: "2026-11-02T00:00:00Z" });
    const result = parseZipBatches({ zip: { batches: [batch("https://site.example/api/user-data/zips/x"), batch("javascript:alert(1)"), batch("http://site.example/z")] } });
    expect(result.map(item => item.url)).toEqual(["https://site.example/api/user-data/zips/x"]);
  });

  test("allows only exact HTTPS hosts and rejects credentials", () => {
    const hosts = ["static-cdn.jtvnw.net"];
    expect(safeHttpsUrl("https://static-cdn.jtvnw.net/a.jpg", hosts)).toBe("https://static-cdn.jtvnw.net/a.jpg");
    for (const value of ["http://static-cdn.jtvnw.net/a.jpg", "https://evil.static-cdn.jtvnw.net/a.jpg", "https://u:p@static-cdn.jtvnw.net/a", "nope", null])
      expect(safeHttpsUrl(value, hosts)).toBe("");
  });
});
