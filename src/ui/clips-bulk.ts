import { button, el } from "./clips-dom";
import { discoverPreparation, type createPreparation, type PreparationDiscovery } from "./clips-prepare";
import type { ToolRequest } from "./tool-transport";

export function createBulkPreparation(options: {
  request: ToolRequest; accountId: () => string | null; controller: () => ReturnType<typeof createPreparation>;
}) {
  const element = el("div", "", "clips-prepare");
  let revision = 0;
  let discovering = false;
  let snapshot: PreparationDiscovery | null = null;
  let message = "";
  let disposed = false;

  function refresh() {
    if (disposed) return;
    const progress = options.controller().progress();
    const running = progress.kind === "working" || progress.kind === "stopping";
    element.replaceChildren();
    const note = el("p", "Saves up to 100 unsaved clips at a time.", "clips-note");
    element.append(note);
    if (discovering) element.append(el("p", "Finding unsaved clips…", "clips-note"), button("Cancel", cancel));
    else if (running) {
      element.append(el("p", progress.kind === "stopping" ? "Stopping after the current clip…" : "Saving clips…", "clips-note"));
      const stop = button("Cancel", cancel); stop.disabled = progress.kind === "stopping"; element.append(stop);
    } else if (snapshot) {
      element.append(el("p", snapshot.items.length ? `${snapshot.items.length} unsaved ${snapshot.items.length === 1 ? "clip" : "clips"} found.${snapshot.truncated ? " There may be more." : ""}` : "All clips are saved.", "clips-note"));
      if (snapshot.items.length) element.append(button(`Save ${snapshot.items.length} ${snapshot.items.length === 1 ? "clip" : "clips"}`, () => {
        const items = snapshot?.items ?? []; snapshot = null; message = "";
        void options.controller().startAll(items);
      }, "primary"));
      element.append(button("Cancel", () => { snapshot = null; refresh(); }));
    } else element.append(button("Save all clips", () => void discover()));
    if (progress.kind !== "idle") {
      const failed = progress.failed + progress.unknown;
      const summary = progress.kind === "cancelled" ? `Cancelled. ${progress.saved} saved.` : `${progress.completed} of ${progress.total} done. ${progress.saved} saved.`;
      const status = el("p", summary, "clips-note");
      status.setAttribute("role", "status"); element.append(status);
      if (failed) element.append(el("p", `${failed} ${failed === 1 ? "clip" : "clips"} couldn't be saved.`, "clips-error"));
    }
    if (message) { const error = el("p", message, "clips-error"); error.setAttribute("role", "alert"); element.append(error); }
  }

  async function discover() {
    if (discovering) return;
    const accountId = options.accountId();
    if (!accountId) return;
    const mine = ++revision;
    discovering = true; message = ""; refresh();
    try {
      const found = await discoverPreparation({ request: options.request, accountId, cancelled: () => disposed || mine !== revision });
      if (disposed || mine !== revision) return;
      snapshot = found.cancelled ? null : found;
    } catch (cause) {
      if (disposed || mine !== revision) return;
      message = cause instanceof Error ? cause.message : "Couldn't read your clips. Nothing was saved.";
    }
    discovering = false; refresh();
  }

  function cancel() {
    revision++; discovering = false; snapshot = null;
    options.controller().cancelAll(); refresh();
  }
  function reset() { revision++; discovering = false; snapshot = null; message = ""; refresh(); }
  refresh();
  return { element, refresh, cancel, reset, dispose() { disposed = true; revision++; } };
}
