import { button, el, externalLink, type OpenLink } from "./clips-dom";
import { ClipLibraryError, formatBytes, parseZipBatches, type ZipBatch } from "./clips-state";
import type { ToolRequest } from "./tool-transport";

type ZipState = { kind: "idle" } | { kind: "working" } | { kind: "ready"; batches: ZipBatch[] } | { kind: "failed"; message: string };

export function createZip(request: ToolRequest, openLink: OpenLink) {
  let state: ZipState = { kind: "idle" };
  let revision = 0;
  const views = new Set<HTMLElement>();

  function fill(view: HTMLElement) {
    const trigger = button(state.kind === "working" ? "Preparing…" : "Download saved clips as ZIP", () => void run(), "live-button zip-button");
    trigger.disabled = state.kind === "working";
    view.replaceChildren(trigger, el("small", "Up to 50 clips per ZIP. Links expire after 24 hours."));
    if (state.kind === "failed") view.append(el("p", state.message, "clips-error"));
    if (state.kind === "ready") {
      if (state.batches.length === 0) view.append(el("p", "No saved clips yet.", "clips-note"));
      const list = el("ul", "", "zip-links");
      state.batches.forEach((batch, index) => {
        const item = el("li");
        item.append(
          externalLink(`Part ${index + 1}`, batch.url, openLink),
          el("span", ` · ${batch.clipCount} ${batch.clipCount === 1 ? "clip" : "clips"} · ${formatBytes(batch.bytes)}`),
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
      state = { kind: "failed", message: cause instanceof ClipLibraryError ? cause.message : "Couldn't create the ZIP. Try again." };
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
