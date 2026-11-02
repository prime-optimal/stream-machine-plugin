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
    const note = el("p", "Connected channel; ignores gallery filters. Each batch finds up to 100 unsaved clips across at most 1,000 clips.", "clips-note");
    element.append(note);
    if (discovering) element.append(el("p", "Finding unsaved clips…", "clips-note"), button("Cancel", cancel));
    else if (running) {
      element.append(el("p", progress.kind === "stopping" ? "Stopping after the current clip. Its save may still complete." : "Preparing clips for playback…", "clips-note"));
      const stop = button("Cancel remaining", cancel); stop.disabled = progress.kind === "stopping"; element.append(stop);
    } else if (snapshot) {
      element.append(el("p", `${snapshot.items.length} unsaved clips found.${snapshot.truncated ? " More clips may remain outside this batch." : ""}`, "clips-note"));
      if (snapshot.items.length) element.append(button(`Prepare ${snapshot.items.length} clips`, () => {
        const items = snapshot?.items ?? []; snapshot = null; message = "";
        void options.controller().startAll(items);
      }, "primary"));
      element.append(button("Cancel", () => { snapshot = null; refresh(); }));
    } else element.append(button("Prepare all", () => void discover()));
    if (progress.kind !== "idle") {
      const status = el("p", `${progress.completed}/${progress.total} checked · ${progress.saved} saved · ${progress.skipped} already saved · ${progress.failed} failed · ${progress.unknown} unknown${progress.kind === "cancelled" ? " · cancelled" : ""}`, "clips-note");
      status.setAttribute("role", "status"); element.append(status);
      if (progress.unknown) element.append(el("p", "Some saves may have completed. Reload the library to check; uncertain saves will not be retried in this session.", "clips-error"));
      if (progress.failed) element.append(el("p", "Open an affected clip to review its failure and retry explicitly.", "clips-note"));
      const failures = el("ul", "", "clips-prepare-failures");
      for (const { clipId, result } of options.controller().outcomes()) {
        if (result.kind === "failed" || result.kind === "unknown" || result.kind === "unconfirmed") failures.append(el("li", `${clipId}: ${result.message}`));
      }
      if (failures.childElementCount) element.append(failures);
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
      message = cause instanceof Error ? cause.message : "Could not read the channel. No clips were prepared.";
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
