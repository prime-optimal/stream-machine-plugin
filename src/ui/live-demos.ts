import { z } from "zod";
import type { Runtime } from "./navigation";
import type { ToolRequest, ToolResult } from "./tool-transport";

const record = z.record(z.string(), z.unknown());
const fields = new Set("mode status provider obsVersion resolution currentProgramScene streaming recording scene source text refreshAcknowledged visibility durationMs previousProgramScene observedAt serial deck_type key_count rows columns id name title categoryName login displayName scopes requiredScopes implementedScopes futureScopes grantedScopes requestedScopes missingScopes retainedScopes reconnectRequired disclosure grantSource previewId expiresAt executable requiredScope page label writes ownership notice released storedConfigurationVerified physicalPressVerified keeperRequired url requestId project recipe runId taskId file failureCode entry mime binary truncated connection fixture inFlight ledgerSize received attempted succeeded duplicates skipped error code message ok endpoint".split(" "));
const groups = new Set("scenes devices layout position input button account channel before after project projects scenarios skills files status error".split(" "));
function object(value: unknown): Record<string, unknown> { const parsed = record.safeParse(value); return parsed.success ? parsed.data : {}; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function url(value: unknown): string {
  try { const parsed = new URL(text(value)); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : ""; }
  catch { return ""; }
}
function unwrap(result: ToolResult): Record<string, unknown> {
  const data = object(result.structuredContent);
  for (const key of ["obs", "twitch", "data", "result"]) if (key in data) return object(data[key]);
  return data;
}
function summary(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value.slice(0, 15).flatMap(item => summary(item, depth + 1));
  return Object.entries(object(value)).flatMap(([key, item]) => {
    if (groups.has(key) && typeof item === "object") return summary(item, depth + 1);
    if (!fields.has(key)) return [];
    if (["string", "number", "boolean"].includes(typeof item)) return [`${key}: ${String(item).slice(0, 240)}`];
    if (key.endsWith("Scopes") || key === "scopes") {
      if (Array.isArray(item)) return [`${key}: ${item.filter(value => typeof value === "string").join(", ") || "(none)"}`];
    }
    return [];
  }).slice(0, 35);
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, content = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = content; return node;
}

export function createLiveDemos(request: ToolRequest) {

  let mutating = false;
  function card(title: string, note: string) {
    const node = element("article"); node.className = "live-card";
    const controls = element("div"); controls.className = "live-controls";
    const output = element("div"); output.className = "live-result"; output.setAttribute("role", "status"); output.setAttribute("aria-live", "polite");
    const links = element("div"); links.className = "live-links";
    node.append(element("h2", title), ...(note ? [element("p", note)] : []), controls, output, links);
    let pending = false;
    function field(label: string, value = "", type = "text", max = 140) {
      const wrap = element("label", label); const input = element("input"); input.type = type; input.value = value; input.maxLength = max; wrap.append(input); controls.append(wrap); return input;
    }
    function button(label: string, run: () => void, ready: () => boolean = () => true) {
      const button = element("button", label); button.type = "button"; button.className = "live-button";
      button.addEventListener("click", () => { if (!pending && ready()) run(); });
      controls.append(button);
      return { update() { button.disabled = pending || !ready(); }, node: button };
    }
    const updates: (() => void)[] = [];
    function action(label: string, run: () => void, ready?: () => boolean) { const b = button(label, run, ready); updates.push(b.update); b.update(); return b.node; }
    function refresh() {
      updates.forEach(update => update());
      controls.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach(input => { input.disabled = pending; });
    }
    function link(label: string, value: unknown) {
      const href = url(value); if (!href) return;
      const a = element("a", label); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; links.append(a);
    }
    async function invoke(tool: string, args: Record<string, unknown> = {}, write = false) {
      if (pending) return undefined;
      if (write && mutating) { output.textContent = "Another action is running. Wait for it to finish."; return undefined; }
      pending = true; if (write) mutating = true; refresh();
      output.textContent = "Working…"; output.classList.remove("live-failure"); links.replaceChildren();
      try {
        const result = await request(`stream_machine_${tool}`, args); const data = unwrap(result);
        const lines = summary(data);
        if (result.isError || data.error) {
          output.textContent = lines.join("\n") || "Couldn't do that. Check your setup and try again.";
          output.classList.add("live-failure"); return undefined;
        }
        output.textContent = lines.join("\n") || "Done.";
        return data;
      } catch {
        output.textContent = write ? "Couldn't confirm the result. Check the status before trying again." : "Couldn't reach the service. Try again.";
        output.classList.add("live-failure"); return undefined;
      } finally { pending = false; if (write) mutating = false; refresh(); }
    }
    return { node, field, action, refresh, invoke, link, controls, output, clearLinks: () => links.replaceChildren() };
  }
  const obs = card("OBS alert", "Shows an alert in OBS for a few seconds and switches to the demo scene.");
  obs.action("Check OBS", () => void obs.invoke("obs_preflight"));
  obs.action("Show scenes", () => void obs.invoke("obs_list_scenes"));
  const alert = obs.field("Alert text", "Hello from Stream Machine", "text", 140);
  obs.action("Show alert", () => void obs.invoke("obs_show_alert", { text: alert.value.trim() }, true), () => !!alert.value.trim());
  obs.action("Show last alert again", () => void obs.invoke("obs_show_alert", { replay: true }, true));
  alert.addEventListener("input", obs.refresh);

  const deck = card("Layout", "Sets up a 3×5 layout with scene buttons, mutes, record, go live, and Twitch links. Quit the Elgato app first.");
  const serial = deck.field("Serial number"); const channel = deck.field("Twitch username (optional)", "", "text", 25);
  let deckPreview = "";
  deck.action("Find Stream Deck", () => void (async () => {
    const data = await deck.invoke("streamdeck_inventory");
    const devices = z.array(z.object({ serial: z.string() })).safeParse(data?.devices);
    if (devices.success && devices.data.length === 1) serial.value = devices.data[0]?.serial ?? "";
    deck.refresh();
  })());
  deck.action("Preview layout", () => void (async () => {
    deckPreview = "";
    const data = await deck.invoke("streamdeck_layout_preview", { serial: serial.value.trim(), ...(channel.value.trim() ? { channel: channel.value.trim() } : {}) });
    deckPreview = text(data?.previewId); deck.refresh();
  })(), () => !!serial.value.trim());
  deck.action("Apply layout", () => void (async () => { const id = deckPreview; deckPreview = ""; await deck.invoke("streamdeck_layout_apply", { previewId: id }, true); deck.refresh(); })(), () => !!deckPreview);
  deck.action("Release Stream Deck", () => void deck.invoke("streamdeck_release", {}, true));
  deck.action("Delete layout and release", () => void deck.invoke("streamdeck_release", { deleteLayout: true }, true));
  for (const input of [serial, channel]) input.addEventListener("input", () => { deckPreview = ""; deck.refresh(); });

  const twitch = card("Twitch title", "Preview a new stream title, approve it in your browser, then apply it.");
  let titlePreview = "";
  let titleRevision = 0;
  function invalidateTitle() { titleRevision++; titlePreview = ""; twitch.clearLinks(); twitch.output.textContent = "Check your account and preview the title again."; twitch.refresh(); }
  twitch.action("Show current channel", () => void twitch.invoke("twitch_channel"));
  const title = twitch.field("New stream title", "", "text", 140);
  twitch.action("Preview title", () => void (async () => {
    titlePreview = ""; const revision = ++titleRevision;
    const data = await twitch.invoke("twitch_preview_title", { title: title.value.trim() });
    if (revision !== titleRevision) return;
    titlePreview = text(data?.previewId); twitch.link("Approve title", data?.approvalUrl); twitch.refresh();
  })(), () => !!title.value.trim());
  twitch.action("Apply title", () => void (async () => { const id = titlePreview; titlePreview = ""; await twitch.invoke("twitch_apply_title", { previewId: id }, true); twitch.refresh(); })(), () => !!titlePreview);
  title.addEventListener("input", () => { titlePreview = ""; twitch.refresh(); });

  const creative = card("Create HTML overlays", "");
  creative.action("Show projects", () => void creative.invoke("creative_list"));
  const project = creative.field("Project ID", `stream-machine-${Date.now()}`, "text", 128);
  const projectName = creative.field("Project name", "Stream Machine demo", "text", 100);
  creative.action("Create project", () => void creative.invoke("creative_project", { id: project.value.trim(), name: projectName.value.trim() }, true), () => /^stream-machine-[A-Za-z0-9._-]+$/.test(project.value.trim()) && !!projectName.value.trim());
  const artTitle = creative.field("Overlay heading", "WEEKEND / STUDIO", "text", 48);
  const selectLabel = element("label", "Recipe"); const recipe = element("select");
  for (const [value, label] of [["overlay", "Static HTML overlay"], ["hyperframes-html", "HyperFrames HTML overlay"]]) { const option = element("option", label); option.value = value; recipe.append(option); }
  selectLabel.append(recipe); creative.controls.append(selectLabel);
  let operation: { requestId: string; project: string; recipe: string; title: string } | undefined;
  let artifact: { project: string; entry: string } | undefined;
  const requestNote = element("small"); creative.controls.append(requestNote);
  function artifacts(data: Record<string, unknown> | undefined) {
    const file = text(data?.file); if (file && operation) artifact = { project: operation.project, entry: file };
    creative.link("Open preview", data?.previewUrl); creative.refresh();
  }
  creative.action("Generate", () => void (async () => {
    operation = { requestId: crypto.randomUUID(), project: project.value.trim(), recipe: recipe.value, title: artTitle.value.trim() };
    requestNote.textContent = "Started. Check status for updates.";
    await creative.invoke("creative_start", operation, true).then(artifacts); creative.refresh();
  })(), () => !operation && !!project.value.trim() && !!artTitle.value.trim());
  creative.action("Check status", () => void creative.invoke("creative_run", { requestId: operation?.requestId }).then(artifacts), () => !!operation);
  creative.action("Show files", () => void (async () => { if (artifact) await creative.invoke("creative_artifact", artifact); })(), () => !!artifact);
  creative.action("Start over", () => { operation = undefined; artifact = undefined; requestNote.textContent = ""; creative.refresh(); });
  for (const input of [project, projectName, artTitle]) input.addEventListener("input", creative.refresh);

  const worker = card("Event worker", "Start the worker from a terminal first. Keep this computer awake while it runs.");
  worker.action("Check status", () => void worker.invoke("worker_status"));
  worker.action("Turn on event actions", () => void worker.invoke("worker_arm", {}, true));
  worker.action("Pause", () => void worker.invoke("worker_pause", {}, true));
  worker.action("Stop", () => void worker.invoke("worker_stop", {}, true));
  const tools = element("div"); tools.className = "live-grid";
  function setRuntime(runtime: Runtime) { tools.replaceChildren(...(runtime === "hosted" ? [twitch.node] : [obs.node, twitch.node, worker.node])); }
  setRuntime("local");
  return { assets: creative.node, streamdeck: deck.node, tools, invalidateTitle, setRuntime };
}
