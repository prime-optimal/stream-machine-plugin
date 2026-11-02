import { version } from "../version";
import { createClips } from "./clips";
import { createClipAccountStatus } from "./clips-account";
import { createLiveDemos } from "./live-demos";
import { createNavigation, openSchema, sectionLabels, visibleSections, type Runtime, type Section } from "./navigation";
import { createConnections } from "./connections";
import { siteOrigin as defaultSiteOrigin } from "../site";
import { createToolRequest, type ToolResult } from "./tool-transport";
import { createHome } from "./home-menu";
import { App } from "@modelcontextprotocol/ext-apps";
import { OpenAIExtensions } from "@openai/mcp-extensions/app";

type Recipe = { id: string; name: string; description: string; requiredCapabilities: string[]; available: boolean };
type Account = { id: string; displayName: string };
type Channel = { title: string; categoryId: string; categoryName: string };
type Snapshot = {
  mode: "mock";
  connection: { status: "disconnected" | "demo"; account: Account | null; scopes: string[] };
  recipes: Recipe[];
  capabilities: { id: string; name: string; location: "local" | "cloud" | "any"; status: "mock" | "not_configured"; reason: string }[];
  categories: { id: string; name: string }[];
  preview: null | { id: string; mode: "mock"; recipeId: string; account: Account; before: Channel; after: Channel; effects: string[]; executable: false; createdAt: string };
};
const root = document.querySelector<HTMLDivElement>("#app")!;
const galleryPage = location.pathname === "/clips" || location.pathname === "/clips/";
const standalone = galleryPage || new URLSearchParams(location.search).get("preview") === "1";
const app = new App({ name: "Stream Machine", version });
const extensions = new OpenAIExtensions(app);
let siteOrigin = defaultSiteOrigin;
const rawRequest = createToolRequest({ standalone, native: input => app.callServerTool(input) });
const clipAccountStatus = createClipAccountStatus(id => {
  clips.setAccount(id);
  if (id && navigation.current() === "clips") clips.enter();
});
const requestTool: typeof rawRequest = async (name, args) => {
  if (name === "stream_machine_twitch_connect" || name === "stream_machine_twitch_disconnect") {
    clipAccountStatus.invalidate(); clips.setAccount(null, true);
  }
  if (name === "stream_machine_twitch_status") return clipAccountStatus.read(() => rawRequest(name, args));
  return rawRequest(name, args);
};
const liveDemos = createLiveDemos(requestTool);
const openLink = (url: string) => { if (standalone) window.open(url, "_blank", "noopener,noreferrer"); else void app.openLink({ url }).catch(() => {}); };
const clips = createClips({ request: requestTool, openLink, siteOrigin: () => siteOrigin });
const mockPanel = document.createElement("section");
mockPanel.dataset.view = "mock";
let runtime: Runtime = "local";
const home = createHome({
  request: requestTool, openLink, icon, standalone,
  messageSupported: () => app.getHostCapabilities()?.message?.text !== undefined,
  sendMessage: params => app.sendMessage(params),
  storage: (() => { try { return localStorage; } catch { return null; } })(),
});
const connections = createConnections({ request: requestTool, invalidateTitle: liveDemos.invalidateTitle, openLink,
  context: () => ({ runtime, siteOrigin }),
  onVerified: account => {
    if (clipAccountStatus.accountId() !== account.id) return;
    if (runtime !== "hosted" || home.connectedAccountId() === account.id) return;
    void home.verified(account);
    navigation.select(galleryPage ? "clips" : "home", false);
  },
});
let snapshot: Snapshot | null = null;
let selectedRecipe = "prepare-channel";
let busy = false;
let error = "";
let titleDraft = "";
let categoryDraft = "";
let mockOpen = true;

function escape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function icon(name: string): string {
  const paths: Record<string, string> = {
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    connect: '<rect x="3" y="5" width="18" height="12" rx="3"/><path d="M8 21h8m-4-4v4m-4-11h8m-4-3v6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    play: '<path d="m9 5 10 7-10 7V5Z"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
    cloud: '<path d="M6 18a4 4 0 0 1-.5-8 6.5 6.5 0 0 1 12.6-1A4.5 4.5 0 0 1 18 18H6Z"/>',
    local: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.layers}</svg>`;
}

function rememberDraft(): void {
  titleDraft = document.querySelector<HTMLInputElement>("#channel-title")?.value ?? titleDraft;
  categoryDraft = document.querySelector<HTMLSelectElement>("#channel-category")?.value ?? categoryDraft;
}

function showError(message: string): void {
  error = message;
  const alert = document.querySelector<HTMLElement>("#error");
  if (alert) { alert.textContent = message; alert.hidden = !message; }
}

function setRuntime(next: Runtime, nextOrigin: string): void {
  if (next === runtime && nextOrigin === siteOrigin && !badge.hidden) return;
  const changed = next !== runtime || nextOrigin !== siteOrigin;
  runtime = next; siteOrigin = nextOrigin;
  if (changed) { clipAccountStatus.invalidate(); clips.setAccount(null, true); }
  liveDemos.setRuntime(runtime);
  navigation.show(visibleSections(runtime));
  badge.hidden = false;
  home.activate(runtime === "hosted");
  badge.textContent = runtime === "hosted" ? "Hosted" : "Desktop";
  desktopNote.hidden = runtime !== "hosted";
  renderCards();
  connections.refresh();
}

function accept(result: ToolResult): void {
  const data = result.structuredContent as Snapshot | { error?: { message?: string } } | undefined;
  if (result.isError || (data && "error" in data)) {
    throw new Error(data && "error" in data ? data.error?.message || "Couldn't do that. Try again." : "Couldn't do that. Try again.");
  }
  const open = openSchema.safeParse(data);
  if (open.success) {
    setRuntime(open.data.runtime, open.data.siteOrigin);
    if (open.data.runtime === "hosted") { error = ""; render(); if (galleryPage) navigation.select("clips", false); return; }
  }
  if (!data || !("mode" in data) || data.mode !== "mock" || !Array.isArray(data.recipes)) {
    throw new Error("Something went wrong. Try opening Stream Machine again.");
  }
  snapshot = data;
  if (!categoryDraft) categoryDraft = data.categories[0]?.id ?? "";
  error = "";
  render();
}

async function call(name: string, args: Record<string, unknown> = {}): Promise<void> {
  if (busy) return;
  rememberDraft();
  busy = true;
  showError("");
  render();
  try {
    const result = await requestTool(name, args);
    if (name === "stream_machine_reset" && !result.isError && !(result.structuredContent as { error?: unknown })?.error) {
      titleDraft = "";
      categoryDraft = "";
      selectedRecipe = "prepare-channel";
    }
    accept(result);
    if (!standalone && extensions.modelContext) {
      void extensions.modelContext.update({ structuredContent: { mode: "mock", page: "recipes", recipeId: selectedRecipe, previewId: snapshot?.preview?.id ?? null } }).catch(() => {});
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Something went wrong. Try again.";
  } finally {
    busy = false;
    render();
  }
}

function renderPreview(): string {
  const preview = snapshot?.preview;
  if (!preview) return `<section class="preview empty-preview" aria-labelledby="preview-title"><span class="icon-tile">${icon("layers")}</span><h2 id="preview-title">Preview</h2><p>Your title and category will appear here.</p></section>`;
  return `<section class="preview ready-preview" aria-labelledby="preview-title"><div class="section-top"><h2 id="preview-title">Preview</h2><span class="badge accent">Demo</span></div><p class="muted">For ${escape(preview.account.displayName)}</p><div class="comparison"><div class="before"><span class="field-label">CURRENT</span><h3>${escape(preview.before.title)}</h3><span class="category-chip">${escape(preview.before.categoryName)}</span></div><div class="comparison-arrow">${icon("arrow")}</div><div class="after"><span class="field-label">NEW</span><h3>${escape(preview.after.title)}</h3><span class="category-chip">${escape(preview.after.categoryName)}</span></div></div><ul class="effects">${preview.effects.map((effect) => `<li>${icon("check")}<span>${escape(effect)}</span></li>`).join("")}</ul><div class="preview-foot">${icon("check")}<span>Demo only. Nothing is changed.</span></div></section>`;
}

function render(): void {
  mockOpen = document.querySelector<HTMLDetailsElement>(".mock-workspace")?.open ?? mockOpen;
  const connected = snapshot?.connection.status === "demo";
  const recipes = snapshot?.recipes ?? [];
  const recipe = recipes.find((item) => item.id === selectedRecipe);
  mockPanel.innerHTML = `<h1 tabindex="-1">Mock demo</h1><button class="icon-button reset" type="button" ${busy || !snapshot ? "disabled" : ""}>Reset demo</button><details class="mock-workspace" ${mockOpen ? "open" : ""}><summary>Demo with sample data</summary><div id="error" class="error-banner" role="alert" aria-live="assertive" ${error ? "" : "hidden"}>${escape(error)}</div><ol class="steps" aria-label="Setup progress"><li class="${connected ? "complete" : "active"}"><span>${connected ? icon("check") : "1"}</span>Connect a channel</li><li class="${connected ? "active" : ""}"><span>2</span>Choose a recipe</li><li class="${snapshot?.preview ? "active" : ""}"><span>3</span>Preview the change</li></ol><section class="connection-card"><div class="connection-icon">${icon("connect")}</div><div class="connection-copy"><h2>${connected ? `${escape(snapshot?.connection.account?.displayName)} is connected` : "Demo account"}</h2></div>${connected ? '<span class="badge connected"><span class="dot"></span>Connected</span>' : `<button class="primary connect" type="button" ${busy || !snapshot ? "disabled" : ""}>${busy ? "Loading…" : "Use demo account"}${icon("arrow")}</button>`}</section><div class="workspace-grid"><section class="recipe-section" aria-labelledby="recipes-title"><div class="section-top"><h2 id="recipes-title">Recipes</h2></div><div class="recipes">${recipes.map((item, index) => `<button type="button" class="recipe ${item.id === selectedRecipe ? "selected" : ""}" data-recipe="${escape(item.id)}" aria-pressed="${item.id === selectedRecipe}" ${!item.available || busy ? "disabled" : ""}><span class="recipe-number">${String(index + 1).padStart(2, "0")}</span><span class="recipe-body"><span class="recipe-title">${escape(item.name)}</span><span class="recipe-description">${escape(item.description)}</span>${item.available ? "" : '<span class="recipe-state">Coming soon</span>'}</span><span class="recipe-end">${item.available ? icon(item.id === selectedRecipe ? "check" : "arrow") : "↗"}</span></button>`).join("") || '<div class="loading-state" role="status">Loading…</div>'}</div><form id="preview-form" class="recipe-form"><div class="form-heading"><span class="small-icon">${icon("layers")}</span><h3>Channel update</h3></div><fieldset ${!connected || busy || !recipe?.available ? "disabled" : ""}><label for="channel-title">Stream title</label><input id="channel-title" name="title" type="text" value="${escape(titleDraft)}" placeholder="Tonight: good music, great company" maxlength="140" required /><div class="label-row"><label for="channel-category">Category</label></div><select id="channel-category" name="categoryId" required>${snapshot?.categories.map((category) => `<option value="${escape(category.id)}" ${category.id === categoryDraft ? "selected" : ""}>${escape(category.name)}</option>`).join("") ?? ""}</select><button class="primary preview-button" type="submit">${busy ? "Preparing…" : "Preview"}${icon("arrow")}</button></fieldset>${!connected ? '<p class="form-hint">Connect the demo account to start.</p>' : ""}</form></section>${renderPreview()}</div></details>`;
  document.querySelector(".connect")?.addEventListener("click", () => void call("stream_machine_connect_demo"));
  document.querySelector(".reset")?.addEventListener("click", () => void call("stream_machine_reset"));
  document.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach((button) => button.addEventListener("click", () => {
    rememberDraft();
    selectedRecipe = button.dataset.recipe!;
    render();
  }));
  document.querySelector("#preview-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    rememberDraft();
    void call("stream_machine_preview", { recipeId: selectedRecipe, title: titleDraft.trim(), categoryId: categoryDraft });
  });
}

function applyHost(): void {
  const context = app.getHostContext();
  document.documentElement.dataset.theme = context?.theme === "light" ? "light" : "dark";
  for (const [name, value] of Object.entries(context?.styles?.variables ?? {})) {
    if (name.startsWith("--") && typeof value === "string") document.documentElement.style.setProperty(name, value);
  }
  const insets = context?.safeAreaInsets;
  for (const edge of ["top", "right", "bottom", "left"] as const) {
    document.documentElement.style.setProperty(`--safe-${edge}`, `${Math.max(0, insets?.[edge] ?? 0)}px`);
  }
}

app.ontoolresult = (result) => {
  const data = result.structuredContent;
  if (!data || typeof data !== "object" || !("mode" in data || "runtime" in data)) return;
  if ("mode" in data && data.mode !== "mock") return;
  try { rememberDraft(); accept(result); } catch (cause) { showError(cause instanceof Error ? cause.message : "Couldn't load Stream Machine."); }
};
app.addEventListener("hostcontextchanged", applyHost);
app.onteardown = async () => { clipAccountStatus.invalidate(); connections.dispose(); clips.dispose(); home.dispose(); return {}; };
const shell = document.createElement("div");
shell.className = "shell";
shell.innerHTML = '<header class="app-header"><span class="brand">Stream Machine</span><span class="badge" id="runtime-badge" hidden></span></header><nav class="workspace-nav" aria-label="Workspace sections"></nav><main id="workspace-main"></main><p id="host-error" role="alert" hidden></p>';
root.append(shell);
const main = shell.querySelector("main")!;
const badge = shell.querySelector<HTMLElement>("#runtime-badge")!;
function panel(section: Exclude<Section, "mock">, content?: HTMLElement) {
  const node = document.createElement("section");
  node.dataset.view = section; node.className = "workspace-panel";
  const heading = document.createElement("h1"); heading.tabIndex = -1; heading.textContent = sectionLabels[section];
  node.append(heading);
  if (content) node.append(content);
  main.append(node); return node;
}
const panels = {
  home: panel("home", home.element),
  assets: panel("assets", liveDemos.assets),
  clips: panel("clips", clips.element),
  streamdeck: panel("streamdeck", liveDemos.streamdeck),
  connections: panel("connections", connections.element),
  tools: panel("tools", liveDemos.tools),
  mock: mockPanel,
};
main.append(mockPanel);
const navigation = createNavigation(shell.querySelector("nav")!, panels, section => {
  if (section === "clips") clips.enter(); else clips.leave();
});
const cards = document.createElement("div"); cards.className = "home-actions";
const desktopNote = document.createElement("p"); desktopNote.className = "desktop-note"; desktopNote.hidden = true;
desktopNote.textContent = "Open Stream Machine in the ChatGPT desktop app to use this.";
function renderCards() {
  cards.replaceChildren(...visibleSections(runtime).filter(section => section !== "home").map(section => {
    const button = document.createElement("button"); button.type = "button"; button.className = "live-button";
    button.textContent = sectionLabels[section]; button.addEventListener("click", () => navigation.select(section)); return button;
  }));
}
renderCards();
panels.home.append(desktopNote, cards);
render();
applyHost();
if (standalone) {
  void call("stream_machine_open");
} else {
  void app.connect().then(async () => {
    applyHost();
    if (!snapshot) await call("stream_machine_open");
  }).catch(() => { const alert = shell.querySelector<HTMLElement>("#host-error")!; alert.hidden = false; alert.textContent = "Couldn't connect. Reopen Stream Machine and try again."; });
}
