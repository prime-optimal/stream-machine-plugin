import { createLiveDemos } from "./live-demos";
import { createToolRequest, type ToolResult } from "./tool-transport";
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
const standalone = new URLSearchParams(location.search).get("preview") === "1";
const app = new App({ name: "Stream Machine", version: "0.1.0" });
const extensions = new OpenAIExtensions(app);
const requestTool = createToolRequest({ standalone, native: input => app.callServerTool(input) });
const liveDemos = createLiveDemos(requestTool);
let snapshot: Snapshot | null = null;
let selectedRecipe = "prepare-channel";
let busy = false;
let error = "";
let titleDraft = "";
let categoryDraft = "";
let mockOpen = false;

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

function accept(result: ToolResult): void {
  const data = result.structuredContent as Snapshot | { error?: { message?: string } } | undefined;
  if (result.isError || (data && "error" in data)) {
    throw new Error(data && "error" in data ? data.error?.message || "That action could not be completed." : "That action could not be completed.");
  }
  if (!data || !("mode" in data) || data.mode !== "mock" || !Array.isArray(data.recipes)) {
    throw new Error("The demo returned an unexpected response. Try opening Stream Machine again.");
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
    error = cause instanceof Error ? cause.message : "Something went wrong. Please try again.";
  } finally {
    busy = false;
    render();
  }
}

function renderPreview(): string {
  const preview = snapshot?.preview;
  if (!preview) return `<section class="preview empty-preview" aria-labelledby="preview-title"><span class="icon-tile">${icon("layers")}</span><p class="eyebrow">ACTION PREVIEW</p><h2 id="preview-title">See it before you change it.</h2><p>Your proposed title and category will appear here, side by side with the demo channel.</p><span class="quiet-badge">No changes sent to Twitch</span></section>`;
  return `<section class="preview ready-preview" aria-labelledby="preview-title"><div class="section-top"><div><p class="eyebrow">ACTION PREVIEW</p><h2 id="preview-title">Your next stream, prepared.</h2></div><span class="badge accent">Mock preview</span></div><p class="muted">For ${escape(preview.account.displayName)}</p><div class="comparison"><div class="before"><span class="field-label">CURRENT · DEMO</span><h3>${escape(preview.before.title)}</h3><span class="category-chip">${escape(preview.before.categoryName)}</span></div><div class="comparison-arrow">${icon("arrow")}</div><div class="after"><span class="field-label">PROPOSED</span><h3>${escape(preview.after.title)}</h3><span class="category-chip">${escape(preview.after.categoryName)}</span></div></div><ul class="effects">${preview.effects.map((effect) => `<li>${icon("check")}<span>${escape(effect)}</span></li>`).join("")}</ul><div class="preview-foot">${icon("check")}<span>Preview only. Live execution is unavailable in this demo.</span></div></section>`;
}

function render(): void {
  mockOpen = document.querySelector<HTMLDetailsElement>(".mock-workspace")?.open ?? mockOpen;
  const connected = snapshot?.connection.status === "demo";
  const recipes = snapshot?.recipes ?? [];
  const recipe = recipes.find((item) => item.id === selectedRecipe);
  root.innerHTML = `<div class="shell"><header class="app-header"><a class="brand" href="#top" aria-label="Stream Machine home"><span class="brand-mark"><i></i><i></i><i></i></span><span>stream<span class="brand-light">machine</span><small>YOUR STREAM. YOUR SYSTEM.</small></span></a><div class="header-actions"><span class="badge demo-badge"><span class="dot"></span>Live demos + mock preview</span><button class="icon-button reset" type="button" ${busy || !snapshot ? "disabled" : ""} aria-label="Reset demo">${icon("reset")}<span>Reset</span></button></div></header><main id="top"><div id="live-mount"></div><details class="mock-workspace" ${mockOpen ? "open" : ""}><summary>Mock preview · fictional account, no live changes</summary><div class="intro"><div><p class="eyebrow">THE STREAMER'S WORKSPACE</p><h1>Less setup.<br><span>More stream.</span></h1><p class="intro-copy">Bring your tools together. Pick a workflow.<br class="desktop-break"> Make your next stream your best one.</p></div><div class="session-card"><span class="session-symbol">${icon("play")}</span><div><span class="field-label">WORKSPACE STATUS</span><strong>${connected ? "Demo channel ready" : "Ready when you are"}</strong><span>${connected ? escape(snapshot?.connection.account?.displayName) : "Start with a sample Twitch account"}</span></div></div></div><div id="error" class="error-banner" role="alert" aria-live="assertive" ${error ? "" : "hidden"}>${escape(error)}</div><ol class="steps" aria-label="Setup progress"><li class="${connected ? "complete" : "active"}"><span>${connected ? icon("check") : "1"}</span>Connect a channel</li><li class="${connected ? "active" : ""}"><span>2</span>Choose a recipe</li><li class="${snapshot?.preview ? "active" : ""}"><span>3</span>Preview the change</li></ol><section class="connection-card"><div class="connection-icon">${icon("connect")}</div><div class="connection-copy"><h2>${connected ? `${escape(snapshot?.connection.account?.displayName)} is ready to explore.` : "First, make yourself at home."}</h2><p>${connected ? "Sample channel connected. Every action stays inside this demo." : "Try the full workflow with sample data. No Twitch sign-in needed."}</p></div>${connected ? '<span class="badge connected"><span class="dot"></span>Demo connected</span>' : `<button class="primary connect" type="button" ${busy || !snapshot ? "disabled" : ""}>${busy ? "Loading…" : "Use demo Twitch account"}${icon("arrow")}</button>`}</section><div class="workspace-grid"><section class="recipe-section" aria-labelledby="recipes-title"><div class="section-top"><div><p class="eyebrow">YOUR PLAYBOOK</p><h2 id="recipes-title">One recipe. A smoother stream.</h2></div><span class="count">${recipes.length} recipes</span></div><div class="recipes">${recipes.map((item, index) => `<button type="button" class="recipe ${item.id === selectedRecipe ? "selected" : ""}" data-recipe="${escape(item.id)}" aria-pressed="${item.id === selectedRecipe}" ${!item.available || busy ? "disabled" : ""}><span class="recipe-number">${String(index + 1).padStart(2, "0")}</span><span class="recipe-body"><span class="recipe-title">${escape(item.name)}</span><span class="recipe-description">${escape(item.description)}</span><span class="recipe-state">${item.available ? "Available in demo" : "Coming later"}</span></span><span class="recipe-end">${item.available ? icon(item.id === selectedRecipe ? "check" : "arrow") : "↗"}</span></button>`).join("") || '<div class="loading-state" role="status">Loading your workspace…</div>'}</div><form id="preview-form" class="recipe-form"><div class="form-heading"><span class="small-icon">${icon("layers")}</span><h3>Set the scene</h3><span class="badge subtle">Sample data</span></div><p class="muted">Draft a title and category for the demo channel.</p><fieldset ${!connected || busy || !recipe?.available ? "disabled" : ""}><label for="channel-title">Stream title</label><input id="channel-title" name="title" type="text" value="${escape(titleDraft)}" placeholder="Tonight: good music, great company" maxlength="140" required /><div class="label-row"><label for="channel-category">Category</label><span>From demo catalog</span></div><select id="channel-category" name="categoryId" required>${snapshot?.categories.map((category) => `<option value="${escape(category.id)}" ${category.id === categoryDraft ? "selected" : ""}>${escape(category.name)}</option>`).join("") ?? ""}</select><button class="primary preview-button" type="submit">${busy ? "Preparing…" : "Preview channel update"}${icon("arrow")}</button></fieldset>${!connected ? '<p class="form-hint">Connect the demo account to start.</p>' : '<p class="form-hint">Preview only · Nothing is published</p>'}</form></section>${renderPreview()}</div><section class="tools-section" aria-labelledby="tools-title"><div class="section-top"><div><p class="eyebrow">BUILT TO CONNECT</p><h2 id="tools-title">Your tools, working together.</h2></div><span class="muted tools-note">Adapters are placeholders in this demo</span></div><div class="capabilities">${snapshot?.capabilities.map((capability) => `<article class="capability"><span class="capability-icon">${icon(capability.location === "local" ? "local" : capability.location === "cloud" ? "cloud" : "layers")}</span><div class="capability-title"><h3>${escape(capability.name)}</h3><span>${capability.location === "local" ? "Desktop MCP" : capability.location === "cloud" ? "Cloud service" : "Flexible runtime"}</span></div><span class="capability-status ${capability.status === "mock" ? "mock" : ""}">${capability.status === "mock" ? "Mock" : "Not configured"}</span><p>${escape(capability.reason)}</p></article>`).join("") ?? ""}</div></section><footer><span class="footer-mark">SM / 001</span><span>Built around your stream.</span><span>Demo environment · No live services</span></footer></details></main></div>`;
  document.querySelector("#live-mount")?.append(liveDemos);
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
  document.documentElement.dataset.theme = context?.theme ?? "dark";
  for (const [name, value] of Object.entries(context?.styles?.variables ?? {})) {
    if (name.startsWith("--") && typeof value === "string") document.documentElement.style.setProperty(name, value);
  }
  const insets = context?.safeAreaInsets;
  for (const edge of ["top", "right", "bottom", "left"] as const) {
    if (typeof insets?.[edge] === "number") document.documentElement.style.setProperty(`--safe-${edge}`, `${insets[edge]}px`);
  }
}

app.ontoolresult = (result) => {
  const data = result.structuredContent;
  if (!data || typeof data !== "object" || !("mode" in data) || data.mode !== "mock") return;
  try { rememberDraft(); accept(result); } catch (cause) { showError(cause instanceof Error ? cause.message : "Could not load the workspace."); }
};
app.addEventListener("hostcontextchanged", applyHost);
render();
if (standalone) {
  void call("stream_machine_open");
} else {
  void app.connect().then(async () => {
    applyHost();
    if (!snapshot) await call("stream_machine_open");
  }).catch(() => showError("Could not connect to the host. Reopen Stream Machine to try again."));
}
