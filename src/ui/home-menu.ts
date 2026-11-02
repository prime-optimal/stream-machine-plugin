import { formatDate, formatViews, safeHttpsUrl, thumbnailHosts, twitchHosts } from "./clips-state";
import {
  clipCountLabel, createHomeState, snapshotNotes, type CacheStorage, type ChannelSnapshot, type HomeAccount,
} from "./home-state";
import {
  canTry, messageParams, priorityFeatures, suggestions, suggestionsHeading, tryLabel, type MessageParams, type PriorityFeature,
} from "./suggestions";
import type { ToolRequest } from "./tool-transport";

type MessageResult = { isError?: boolean };
export type HomeOptions = {
  request: ToolRequest;
  openLink: (url: string) => void;
  openClips: () => void;
  icon: (name: string) => string;
  standalone: boolean;
  messageSupported: () => boolean;
  sendMessage: (params: MessageParams) => Promise<MessageResult>;
  storage: CacheStorage | null;
};

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", className = "") {
  const child = document.createElement(tag);
  if (text) child.textContent = text;
  if (className) child.className = className;
  return child;
}

function image(url: string | null, hosts: readonly string[], alt: string, width: number, height: number, className: string) {
  const safe = safeHttpsUrl(url, hosts);
  if (!safe) return null;
  const img = node("img", "", className);
  img.src = safe; img.alt = alt; img.width = width; img.height = height; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
  return img;
}

export function createHome(options: HomeOptions) {
  const element = node("div", "", "home-menu");
  element.hidden = true;
  const confirmation = node("p", "", "home-confirmation");
  confirmation.setAttribute("role", "status");
  const snapshotArea = node("section", "", "home-snapshot");
  snapshotArea.setAttribute("aria-label", "Twitch channel snapshot");
  const suggestionArea = node("section", "", "home-suggestions");
  suggestionArea.setAttribute("aria-labelledby", "home-priority-title");
  const model = createHomeState(options.request, render, options.storage);
  let sendStatus = "";
  let sending = false;
  let disposed = false;

  function externalLink(label: string, url: string, className = "") {
    const safe = safeHttpsUrl(url, twitchHosts);
    if (!safe) return node("span", label, className);
    const link = node("a", label, className);
    link.href = safe; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.addEventListener("click", event => { event.preventDefault(); options.openLink(safe); });
    return link;
  }

  function fact(label: string, value: string) {
    const row = node("div", "", "home-fact");
    row.append(node("dt", label), node("dd", value));
    return row;
  }

  function renderProfile(data: ChannelSnapshot, cached: boolean) {
    const card = node("article", "", "home-card");
    const banner = node("div", "", "home-banner");
    const offline = image(data.account.offlineImageUrl, thumbnailHosts, "", 1280, 360, "home-banner-image");
    if (offline) banner.append(offline);
    const head = node("div", "", "home-profile");
    const avatar = image(data.account.profileImageUrl, thumbnailHosts, `${data.account.displayName} profile picture`, 64, 64, "home-avatar");
    head.append(avatar ?? node("span", data.account.displayName.slice(0, 1).toUpperCase(), "home-avatar home-avatar-fallback"));
    const who = node("div", "", "home-who");
    who.append(node("h2", data.account.displayName));
    if (data.channel) who.append(node("p", [data.channel.title, data.channel.category].filter(Boolean).join(" · "), "home-title"));
    head.append(who);
    if (cached) head.append(node("span", "Updating…", "badge home-cached"));
    const facts = node("dl", "", "home-facts");
    if (data.followers) facts.append(fact("Followers", data.followers.total.toLocaleString("en-US")));
    if (data.clips) facts.append(fact("Clips", clipCountLabel(data.clips)));
    if (data.lastStream) {
      const row = node("div", "", "home-fact");
      const value = node("dd", "");
      value.append(externalLink(data.lastStream.title || "Untitled stream", data.lastStream.url),
        node("span", ` · ${formatDate(data.lastStream.createdAt)} · ${data.lastStream.duration}`, "home-quiet"));
      row.append(node("dt", "Last stream"), value);
      facts.append(row);
    }
    card.append(banner, head, facts);
    const stream = data.lastStream && image(data.lastStream.thumbnailUrl, thumbnailHosts, "", 320, 180, "home-thumb-image");
    if (stream) { const frame = node("span", "", "home-thumb"); frame.append(stream); card.append(frame); }
    return card;
  }

  function renderClips(data: ChannelSnapshot) {
    if (!data.clips?.recent.length) return null;
    const list = node("ul", "", "home-clips");
    list.setAttribute("aria-label", "Top clips");
    for (const clip of data.clips.recent) {
      const item = node("li");
      const link = externalLink("", clip.url, "home-clip");
      const frame = node("span", "", "home-thumb");
      const thumb = image(clip.thumbnailUrl, thumbnailHosts, "", 320, 180, "home-thumb-image");
      if (thumb) frame.append(thumb);
      link.append(frame, node("span", clip.title || "Untitled clip", "home-clip-title"), node("span", formatViews(clip.viewCount), "home-quiet"));
      item.append(link); list.append(item);
    }
    return list;
  }

  function renderSnapshot() {
    const { snapshot } = model.state();
    snapshotArea.replaceChildren();
    if (snapshot.kind === "idle") return;
    const data = snapshot.data;
    if (!data) {
      if (snapshot.kind === "loading") snapshotArea.append(node("p", "Loading your channel…", "home-quiet"));
    } else {
      snapshotArea.append(renderProfile(data, snapshot.kind === "loading" && snapshot.cached));
      const clips = renderClips(data);
      if (clips) snapshotArea.append(clips);
      for (const note of snapshotNotes(data)) snapshotArea.append(node("p", note, "home-quiet"));
    }
    if (snapshot.kind === "failed") {
      const failure = node("div", "", "home-failure");
      failure.setAttribute("role", "alert");
      const retry = node("button", "Retry", "live-button"); retry.type = "button";
      retry.addEventListener("click", () => void model.retry());
      failure.append(node("span", snapshot.message), retry);
      snapshotArea.append(failure);
    }
  }

  const priorityView = node("div", "", "home-feature-view");
  const priorityHeading = node("h2", "What would you like to do?"); priorityHeading.id = "home-priority-title";
  const priorityGrid = node("ul", "", "home-feature-grid"); priorityGrid.setAttribute("aria-labelledby", priorityHeading.id);
  const allView = node("div", "", "home-feature-view"); allView.id = "home-all-features"; allView.hidden = true;
  const allHeading = node("h2", suggestionsHeading); allHeading.id = "home-all-features-title"; allHeading.tabIndex = -1;
  const allGrid = node("ul", "", "home-feature-grid"); allGrid.setAttribute("aria-labelledby", allHeading.id);
  const explore = node("button", "", "live-button home-explore"); explore.type = "button";
  explore.innerHTML = options.icon("lightbulb"); explore.append(node("span", "Explore all features"));
  explore.setAttribute("aria-controls", allView.id); explore.setAttribute("aria-expanded", "false");
  const back = node("button", "Back", "live-button home-explore"); back.type = "button";
  back.setAttribute("aria-label", "Back to priority features");
  const feedback = node("p", "", "home-quiet");
  feedback.setAttribute("role", "status");
  const tryButtons: HTMLButtonElement[] = [];

  function host() { return { standalone: options.standalone, messageSupported: options.messageSupported() }; }
  async function send(prompt: string) {
    if (disposed || sending || !canTry(host())) return;
    sending = true; sendStatus = ""; updateTry();
    let failure = "";
    try {
      const result = await options.sendMessage(messageParams(prompt));
      failure = result.isError ? "Could not send that to the chat. Try again." : "";
    } catch { failure = "Could not send that to the chat. Try again."; }
    if (disposed) return;
    sendStatus = failure; sending = false; updateTry();
  }
  function updateTry() {
    const allowed = canTry(host());
    for (const button of tryButtons) button.disabled = !allowed || sending;
    feedback.textContent = sendStatus || tryLabel(host());
  }
  function featureCard(card: PriorityFeature, localLabel: string) {
    const item = node("li", "", "home-feature-card");
    const head = node("span", "", "home-suggestion-head");
    const tile = node("span", "", "home-suggestion-icon"); tile.innerHTML = options.icon(card.icon);
    head.append(tile);
    if (card.desktopOnly) head.append(node("span", localLabel, "badge subtle"));
    const action = card.action;
    const label = action.kind === "navigate" ? "Open Clips" : "Try";
    const button = node("button", label, "live-button"); button.type = "button"; button.dataset.suggestion = card.id;
    button.setAttribute("aria-label", action.kind === "navigate" ? label : `Try: ${card.title}`);
    if (action.kind === "navigate") button.addEventListener("click", () => { if (!disposed) options.openClips(); });
    else { button.addEventListener("click", () => void send(action.prompt)); tryButtons.push(button); }
    item.append(head, node("h3", card.title), node("p", card.description, "home-quiet"), button);
    return item;
  }
  for (const card of priorityFeatures) priorityGrid.append(featureCard(card, "Local only"));
  for (const card of suggestions) allGrid.append(featureCard({ ...card, action: { kind: "message", prompt: card.prompt } }, "Desktop only"));
  priorityView.append(priorityHeading, priorityGrid, explore);
  allView.append(back, allHeading, allGrid);
  explore.addEventListener("click", () => {
    if (disposed) return;
    priorityView.hidden = true; allView.hidden = false;
    explore.setAttribute("aria-expanded", "true"); suggestionArea.setAttribute("aria-labelledby", allHeading.id); allHeading.focus();
  });
  back.addEventListener("click", () => {
    if (disposed) return;
    allView.hidden = true; priorityView.hidden = false;
    explore.setAttribute("aria-expanded", "false"); suggestionArea.setAttribute("aria-labelledby", priorityHeading.id); explore.focus();
  });
  suggestionArea.append(priorityView, allView, feedback);

  function render() {
    if (disposed) return;
    const { status } = model.state();
    const connected = status.kind === "connected";
    confirmation.hidden = !connected;
    confirmation.textContent = connected ? `Connected to Twitch as ${status.account.displayName}` : "";
    renderSnapshot();
    updateTry();
  }

  element.append(confirmation, snapshotArea, suggestionArea);
  return {
    element,
    activate(hosted: boolean) { element.hidden = !hosted; if (hosted) void model.open(); },
    verified(account: HomeAccount) { return model.verified(account); },
    connectedAccountId(): string | null { const { status } = model.state(); return status.kind === "connected" ? status.account.id : null; },
    refresh: render,
    dispose() { disposed = true; model.dispose(); },
  };
}
