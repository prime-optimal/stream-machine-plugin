import { button, el, type OpenLink } from "./clips-dom";
import { createDetail } from "./clips-detail";
import {
  allCategories, categoriesOf, formatDate, formatDuration, formatViews, mergePage, parseLibrary, safeHttpsUrl,
  thumbnailHosts, visibleClips, ClipLibraryError, type ClipFilter, type ClipItem, type ClipPage, type ClipSort,
} from "./clips-state";
import { createZip } from "./clips-zip";
import { createPreparation } from "./clips-prepare";
import { createBulkPreparation } from "./clips-bulk";
import type { ToolRequest } from "./tool-transport";
import "./clips-prepare.css";

type Load =
  | { kind: "idle" } | { kind: "loading" } | { kind: "ready" }
  | { kind: "failed"; message: string };

const pageSize = 24;

export function createClips(options: { request: ToolRequest; openLink: OpenLink; siteOrigin: () => string }) {
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
  let identity: string | null = null;
  let disposed = false;
  let preparation = makePreparation();

  function makePreparation() {
    return createPreparation({ request: options.request, siteOrigin: options.siteOrigin(), changed: () => bulk.refresh(), stored: fresh => {
      items = items.map(item => item.id === fresh.id ? fresh : item);
      paint();
    } });
  }

  const zip = createZip(options.request, options.openLink);
  const detail = createDetail({ openLink: options.openLink, zip: zip.view(), back: closeDetail, siteOrigin: options.siteOrigin,
    prepare: (clip, retry) => preparation.prepare(clip, retry),
  });
  const bulk = createBulkPreparation({ request: options.request, accountId: () => account?.id ?? null, controller: () => preparation });
  const gallery = el("div", "", "clip-gallery");
  const header = el("div", "", "clips-header");
  const toolbar = el("div", "", "clips-toolbar");
  const status = el("p", "", "clips-note");
  const grid = el("div", "", "clip-grid");
  const more = el("div", "", "clips-more");
  const galleryZip = zip.view();

  const search = el("input");
  search.type = "search"; search.placeholder = "Search clips"; search.maxLength = 100;
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
    if (clip.stored) frame.append(el("span", "Saved", "clip-stored"));
    const meta = el("span", "", "clip-meta");
    meta.append(
      el("strong", clip.title || "Untitled clip"),
      el("span", `${clip.game.name ?? "Unknown"} · ${clip.creator.name ?? "Unknown"}`),
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
    if (account) header.append(el("p", `${account.displayName} · @${account.login}${storage === "site" ? "" : " · Saving isn't available here"}`, "clips-account"));
    if (storage === "site") header.append(bulk.element, galleryZip);
  }

  function paint() {
    paintHeader();
    paintCategories();
    const shown = visibleClips(items, filter, sort);
    grid.replaceChildren(...shown.map(card));
    more.replaceChildren();
    if (load.kind === "loading") status.textContent = items.length ? "Loading…" : "Loading your clips…";
    else if (load.kind === "failed") status.textContent = "";
    else if (load.kind === "idle") status.textContent = "";
    else if (items.length === 0) status.textContent = "No clips yet.";
    else if (shown.length === 0) status.textContent = cursor ? "No matches. Load more to search older clips." : "No matches.";
    else status.textContent = "";
    if (load.kind === "failed") {
      const failure = el("p", load.message, "clips-error");
      failure.setAttribute("role", "alert");
      more.append(failure, button("Try again", () => void fetchPage(items.length > 0)));
    } else if (cursor && load.kind === "ready") more.append(button("Load more", () => void fetchPage(true)));
  }

  async function fetchPage(next: boolean) {
    if (disposed || load.kind === "loading") return;
    const mine = ++revision;
    load = { kind: "loading" };
    paint();
    try {
      const args: Record<string, unknown> = { first: pageSize };
      if (next && cursor) args.cursor = cursor;
      const result = await options.request("stream_machine_clips_library", args);
      if (mine !== revision) return;
      const page = parseLibrary(result.structuredContent ?? (result.isError ? { error: { code: "CLIP_UNAVAILABLE" } } : null));
      if (identity && identity !== page.account.id) {
        setAccount(null);
        load = { kind: "failed", message: "The Twitch account changed. Reload your clips." };
        paint(); return;
      }
      identity = page.account.id;
      account = page.account; storage = page.storage; cursor = page.cursor;
      items = next ? mergePage(items, page.items) : page.items;
      load = { kind: "ready" };
    } catch (cause) {
      if (mine !== revision) return;
      load = { kind: "failed", message: cause instanceof ClipLibraryError ? cause.message : "Couldn't load your clips. Try again." };
    }
    paint();
  }

  function setAccount(id: string | null, force = false) {
    if ((!force && id === identity) || disposed) return;
    revision++; identity = id;
    preparation.dispose();
    preparation = makePreparation();
    bulk.reset(); zip.reset(); detail.hide(); gallery.hidden = false;
    account = null; items = []; cursor = null; storage = "local";
    filter = { search: "", category: allCategories }; search.value = "";
    sort = "newest"; order.value = sort; load = { kind: "idle" };
    paint();
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
    bulk.cancel();
    if (!detail.element.hidden) closeDetail();
  }

  function dispose() {
    disposed = true; revision++;
    preparation.dispose(); bulk.dispose();
    detail.hide();
    zip.dispose();
  }

  paint();
  return { element, enter, leave, dispose, setAccount };
}
