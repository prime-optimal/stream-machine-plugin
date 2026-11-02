import { button, el, externalLink, type OpenLink } from "./clips-dom";
import { ClipLibraryError, formatBytes, formatDate, parseZipBatches, type ZipBatch } from "./clips-state";
import type { ToolRequest } from "./tool-transport";

type ZipState = { kind: "idle" } | { kind: "working" } | { kind: "ready"; batches: ZipBatch[] } | { kind: "failed"; message: string };

export function createZip(request: ToolRequest, openLink: OpenLink) {
  let state: ZipState = { kind: "idle" };
  let revision = 0;
  const views = new Set<HTMLElement>();

  function fill(view: HTMLElement) {
    const trigger = button(state.kind === "working" ? "Preparing ZIP…" : "Download ZIP of saved clips", () => void run(), "live-button zip-button");
    trigger.disabled = state.kind === "working";
    view.replaceChildren(trigger, el("small", "Packs every clip saved on the Site into ZIP files of up to 50 clips. Links expire after 24 hours."));
    if (state.kind === "failed") view.append(el("p", state.message, "clips-error"));
    if (state.kind === "ready") {
      if (state.batches.length === 0) view.append(el("p", "No saved clips to pack yet. Ask the chat to save all your clips first.", "clips-note"));
      const list = el("ul", "", "zip-links");
      state.batches.forEach((batch, index) => {
        const item = el("li");
        item.append(
          externalLink(`Batch ${index + 1}`, batch.url, openLink),
          el("span", ` · ${batch.clipCount} ${batch.clipCount === 1 ? "clip" : "clips"} · ${formatBytes(batch.bytes)} · expires ${formatDate(batch.expiresAt)}`),
        );
        list.append(item);
      });
      view.append(list);
    }
  }

  function paint() { for (const view of views) fill(view); }

  async function run() {
    if (state.kind === "working") return;
    const mine = ++revision;
    state = { kind: "working" };
    paint();
    try {
      const result = await request("stream_machine_clips_zip", {});
      if (mine !== revision) return;
      state = { kind: "ready", batches: parseZipBatches(result.structuredContent) };
    } catch (cause) {
      if (mine !== revision) return;
      state = { kind: "failed", message: cause instanceof ClipLibraryError ? cause.message : "The ZIP request failed. Try again." };
    }
    paint();
  }

  function view(): HTMLElement {
    const node = el("div", "", "zip-block");
    views.add(node);
    fill(node);
    return node;
  }

  return { view, reset() { revision++; state = { kind: "idle" }; paint(); }, dispose() { revision++; views.clear(); } };
}
