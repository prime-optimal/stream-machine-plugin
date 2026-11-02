import { button, el, type OpenLink } from "./clips-dom";
import { createDetail } from "./clips-detail";
import {
  allCategories, categoriesOf, formatDate, formatDuration, formatViews, mergePage, parseArchive, parseLibrary, safeHttpsUrl,
  thumbnailHosts, visibleClips, ClipLibraryError, type ClipFilter, type ClipItem, type ClipPage, type ClipSort,
} from "./clips-state";
import { createZip } from "./clips-zip";
import type { ToolRequest } from "./tool-transport";

type Load =
  | { kind: "idle" } | { kind: "loading" } | { kind: "ready" }
  | { kind: "failed"; message: string };

const pageSize = 24;

export function createClips(options: { request: ToolRequest; openLink: OpenLink }) {
  const element = el("div", "", "clips-panel");
  let account: ClipPage["account"] | null = null;
  let storage: "site" | "local" = "local";
  let items: ClipItem[] = [];
  let cursor: string | null = null;
  let load: Load = { kind: "idle" };
  let revision = 0;
  let filter: ClipFilter = { search: "", category: allCategories };
  let sort: ClipSort = "newest";
  let scroll = 0;

  const zip = createZip(options.request, options.openLink);
  const detail = createDetail({ openLink: options.openLink, zip: zip.view(), back: closeDetail, save: saveClip });
  const gallery = el("div", "", "clip-gallery");
  const header = el("div", "", "clips-header");
  const toolbar = el("div", "", "clips-toolbar");
  const status = el("p", "", "clips-note");
  const grid = el("div", "", "clip-grid");
  const more = el("div", "", "clips-more");
  const galleryZip = zip.view();

  const search = el("input");
  search.type = "search"; search.placeholder = "Search title, category, clipper"; search.maxLength = 100;
  search.setAttribute("aria-label", "Search clips");
  const category = el("select");
  category.setAttribute("aria-label", "Filter by category");
  const order = el("select");
  order.setAttribute("aria-label", "Sort clips");
  for (const [value, label] of [["newest", "Newest first"], ["oldest", "Oldest first"], ["views", "Most viewed"]] as const) {
    const option = el("option", label); option.value = value; order.append(option);
  }
  toolbar.append(search, category, order);
  gallery.append(header, toolbar, status, grid, more);
  element.append(gallery, detail.element);

  search.addEventListener("input", () => { filter = { ...filter, search: search.value }; paint(); });
  category.addEventListener("change", () => { filter = { ...filter, category: category.value }; paint(); });
  order.addEventListener("change", () => { sort = order.value as ClipSort; paint(); });

  function card(clip: ClipItem): HTMLButtonElement {
    const node = button("", () => openDetail(clip), "clip-card");
    const frame = el("span", "", "clip-thumb");
    const thumbnail = safeHttpsUrl(clip.thumbnailUrl, thumbnailHosts);
    if (thumbnail) {
      const image = el("img");
      image.src = thumbnail; image.alt = ""; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
      frame.append(image);
    } else frame.append(el("span", "No thumbnail", "thumb-missing"));
    frame.append(el("span", formatDuration(clip.durationSeconds), "clip-duration"));
    if (clip.stored) frame.append(el("span", "On Site", "clip-stored"));
    const meta = el("span", "", "clip-meta");
    meta.append(
      el("strong", clip.title || "Untitled clip"),
      el("span", `${clip.game.name ?? "Unknown category"} · ${clip.creator.name ?? "Unknown clipper"}`),
      el("span", `${formatDate(clip.createdAt)} · ${formatViews(clip.viewCount)}`),
    );
    node.append(frame, meta);
    return node;
  }

  function paintCategories() {
    const options = [{ key: allCategories, label: "All categories" }, ...categoriesOf(items)];
    category.replaceChildren(...options.map(item => { const option = el("option", item.label); option.value = item.key; return option; }));
    if (!options.some(item => item.key === filter.category)) filter = { ...filter, category: allCategories };
    category.value = filter.category;
  }

  function paintHeader() {
    header.replaceChildren();
    if (account) header.append(el("p", `${account.displayName} · @${account.login} · ${storage === "site" ? "Site library" : "Local server, no Site storage"}`, "clips-account"));
    if (storage === "site") header.append(galleryZip);
  }

  function paint() {
    paintHeader();
    paintCategories();
    const shown = visibleClips(items, filter, sort);
    grid.replaceChildren(...shown.map(card));
    more.replaceChildren();
    if (load.kind === "loading") status.textContent = items.length ? "Loading more clips…" : "Loading your clips…";
    else if (load.kind === "failed") status.textContent = "";
    else if (load.kind === "idle") status.textContent = "";
    else if (items.length === 0) status.textContent = "This channel has no clips yet.";
    else if (shown.length === 0) status.textContent = `No loaded clips match. ${cursor ? "Load more to search older clips." : ""}`;
    else status.textContent = `Showing ${shown.length} of ${items.length} loaded ${items.length === 1 ? "clip" : "clips"}${cursor ? "; more are available." : "."}`;
    if (load.kind === "failed") {
      const failure = el("p", load.message, "clips-error");
      failure.setAttribute("role", "alert");
      more.append(failure, button(items.length ? "Try loading more again" : "Try again", () => void fetchPage(items.length > 0)));
    } else if (cursor && load.kind === "ready") more.append(button("Load more", () => void fetchPage(true)));
  }

  async function fetchPage(next: boolean) {
    if (load.kind === "loading") return;
    const mine = ++revision;
    load = { kind: "loading" };
    paint();
    try {
      const args: Record<string, unknown> = { first: pageSize };
      if (next && cursor) args.cursor = cursor;
      const result = await options.request("stream_machine_clips_library", args);
      if (mine !== revision) return;
      const page = parseLibrary(result.structuredContent ?? (result.isError ? { error: { code: "CLIP_UNAVAILABLE" } } : null));
      account = page.account; storage = page.storage; cursor = page.cursor;
      items = next ? mergePage(items, page.items) : page.items;
      load = { kind: "ready" };
    } catch (cause) {
      if (mine !== revision) return;
      load = { kind: "failed", message: cause instanceof ClipLibraryError ? cause.message : "Could not reach the clip library. Try again." };
    }
    paint();
  }

  async function refreshClip(id: string): Promise<ClipItem | null> {
    let next: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const args: Record<string, unknown> = { first: pageSize };
      if (next) args.cursor = next;
      const result = await options.request("stream_machine_clips_library", args);
      const page = parseLibrary(result.structuredContent ?? (result.isError ? { error: { code: "CLIP_UNAVAILABLE" } } : null));
      const found = page.items.find(item => item.id === id);
      if (found) return found;
      next = page.cursor;
      if (!next) return null;
    }
    return null;
  }

  async function saveClip(clip: ClipItem): Promise<string | null> {
    try {
      const result = await options.request("stream_machine_clips_archive", { clipId: clip.id });
      const outcome = parseArchive(result.structuredContent ?? (result.isError ? { error: { code: "CLIP_UNAVAILABLE" } } : null));
      const failure = outcome.failed.find(item => item.clipId === clip.id);
      if (failure) return failure.outcome === "unknown" ? "The save outcome is unknown. Reload clips and check this clip before trying again." : `The clip could not be saved (${failure.code}).`;
      if (![...outcome.saved, ...outcome.skipped].some(item => item.clipId === clip.id)) return "The Site did not report this clip as saved.";
      const fresh = await refreshClip(clip.id);
      if (!fresh?.stored) return "The clip was saved, but the library does not list it yet. Reload clips to see it.";
      items = items.map(item => item.id === fresh.id ? fresh : item);
      paint();
      if (!detail.element.hidden) detail.show(fresh, storage);
      return null;
    } catch (cause) {
      return cause instanceof ClipLibraryError ? cause.message : "The save request failed. Reload clips to check before trying again.";
    }
  }

  function openDetail(clip: ClipItem) {
    scroll = window.scrollY;
    gallery.hidden = true;
    detail.show(clip, storage);
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    detail.hide();
    gallery.hidden = false;
    window.scrollTo(0, scroll);
  }

  function enter() {
    if (load.kind === "idle") void fetchPage(false);
  }

  function leave() {
    if (!detail.element.hidden) closeDetail();
  }

  function dispose() {
    revision++;
    detail.hide();
    zip.dispose();
  }

  paint();
  return { element, enter, leave, dispose };
}
