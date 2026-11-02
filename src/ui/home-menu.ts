import { formatDate, formatViews, safeHttpsUrl, thumbnailHosts, twitchHosts } from "./clips-state";
import {
  clipCountLabel, createHomeState, snapshotNotes, type CacheStorage, type ChannelSnapshot, type HomeAccount,
} from "./home-state";
import {
  canTry, carouselState, messageParams, scrollTarget, suggestions, suggestionsHeading, tryLabel, type MessageParams, type Suggestion,
} from "./suggestions";
import type { ToolRequest } from "./tool-transport";

type MessageResult = { isError?: boolean };
export type HomeOptions = {
  request: ToolRequest;
  openLink: (url: string) => void;
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
  suggestionArea.setAttribute("aria-labelledby", "home-suggestions-title");
  const model = createHomeState(options.request, render, options.storage);
  let sendStatus = "";
  let sending = false;

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

  const row = node("div", "", "home-carousel-row");
  const prev = node("button", "", "home-arrow"); prev.type = "button"; prev.setAttribute("aria-label", "Previous suggestions");
  const next = node("button", "", "home-arrow"); next.type = "button"; next.setAttribute("aria-label", "Next suggestions");
  prev.innerHTML = options.icon("arrow"); next.innerHTML = options.icon("arrow");
  prev.classList.add("home-arrow-prev");
  const track = node("ul", "", "home-carousel");
  track.setAttribute("aria-label", "Suggestions"); track.tabIndex = 0;
  const feedback = node("p", "", "home-quiet");
  feedback.setAttribute("role", "status");
  const tryButtons: { card: Suggestion; button: HTMLButtonElement }[] = [];

  function host() { return { standalone: options.standalone, messageSupported: options.messageSupported() }; }
  function metrics() { return { scrollLeft: track.scrollLeft, clientWidth: track.clientWidth, scrollWidth: track.scrollWidth }; }
  function updateArrows() {
    const state = carouselState(metrics());
    row.classList.toggle("no-overflow", !state.overflow);
    prev.hidden = next.hidden = !state.overflow;
    prev.disabled = !state.canPrev; next.disabled = !state.canNext;
  }
  function scrollBy(direction: -1 | 1) {
    const first = track.querySelector("li");
    const width = (first?.getBoundingClientRect().width ?? track.clientWidth) + 12;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: scrollTarget(metrics(), width, direction), behavior: reduced ? "auto" : "smooth" });
  }
  async function send(card: Suggestion) {
    if (sending || !canTry(host())) return;
    sending = true; feedback.textContent = ""; updateTry();
    try {
      const result = await options.sendMessage(messageParams(card.prompt));
      sendStatus = result.isError ? "Could not send that to the chat. Try again." : "";
    } catch { sendStatus = "Could not send that to the chat. Try again."; }
    sending = false; feedback.textContent = sendStatus; updateTry();
  }
  function updateTry() {
    const allowed = canTry(host());
    for (const { button } of tryButtons) button.disabled = !allowed || sending;
    if (!sendStatus) feedback.textContent = tryLabel(host());
  }
  prev.addEventListener("click", () => scrollBy(-1));
  next.addEventListener("click", () => scrollBy(1));
  track.addEventListener("scroll", updateArrows, { passive: true });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateArrows).observe(track);
  for (const card of suggestions) {
    const item = node("li", "", "home-suggestion");
    const head = node("span", "", "home-suggestion-head");
    const tile = node("span", "", "home-suggestion-icon"); tile.innerHTML = options.icon(card.icon);
    head.append(tile);
    if (card.desktopOnly) head.append(node("span", "Desktop only", "badge subtle"));
    const button = node("button", "Try", "live-button"); button.type = "button"; button.dataset.suggestion = card.id;
    button.setAttribute("aria-label", `Try: ${card.title}`);
    button.addEventListener("click", () => void send(card));
    item.append(head, node("h3", card.title), node("p", card.description, "home-quiet"), button);
    track.append(item); tryButtons.push({ card, button });
  }
  const heading = node("h2", suggestionsHeading); heading.id = "home-suggestions-title";
  row.append(prev, track, next);
  suggestionArea.append(heading, row, feedback);

  function render() {
    const { status } = model.state();
    const connected = status.kind === "connected";
    confirmation.hidden = !connected;
    confirmation.textContent = connected ? `Connected to Twitch as ${status.account.displayName}` : "";
    renderSnapshot();
    updateTry();
    requestAnimationFrame(updateArrows);
  }

  element.append(confirmation, snapshotArea, suggestionArea);
  return {
    element,
    activate(hosted: boolean) { element.hidden = !hosted; if (hosted) void model.open(); },
    verified(account: HomeAccount) { return model.verified(account); },
    connectedAccountId(): string | null { const { status } = model.state(); return status.kind === "connected" ? status.account.id : null; },
    refresh: render,
    dispose: model.dispose,
  };
}
