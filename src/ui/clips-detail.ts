import { button, el, externalLink, type OpenLink } from "./clips-dom";
import { createPlayer } from "./clips-player";
import {
  formatBytes, formatDate, formatDuration, formatOffset, formatViews, safeHttpsUrl, thumbnailHosts, twitchHosts,
  type ClipItem,
} from "./clips-state";

export function createDetail(options: { openLink: OpenLink; zip: HTMLElement; back: () => void; save: (clip: ClipItem) => Promise<string | null> }) {
  const element = el("section", "", "clip-detail");
  element.hidden = true;
  const player = createPlayer();
  const body = el("div");
  const heading = el("h2", "", "clip-detail-title");
  heading.tabIndex = -1;
  const back = button("← Back to clips", options.back, "live-button");
  const rows = el("dl", "", "clip-facts");
  const storage = el("div", "", "clip-storage");
  const zipSlot = el("div");
  zipSlot.append(options.zip);
  body.append(player.element, rows, storage);
  element.append(back, heading, body);

  function fact(label: string, value: string | Node) {
    rows.append(el("dt", label), el("dd", typeof value === "string" ? value : ""));
    if (typeof value !== "string") rows.lastElementChild!.append(value);
  }

  function show(clip: ClipItem, library: "site" | "local") {
    heading.textContent = clip.title || "Untitled clip";
    const poster = safeHttpsUrl(clip.thumbnailUrl, thumbnailHosts) || null;
    rows.replaceChildren();
    fact("Clipper", clip.creator.name ?? "Unknown");
    fact("Category", clip.game.name ?? "Unknown category");
    fact("Duration", formatDuration(clip.durationSeconds));
    fact("Views", formatViews(clip.viewCount));
    fact("Created on Twitch", formatDate(clip.createdAt));
    fact("Saved to Site", clip.stored ? formatDate(clip.stored.storedAt) : "Not saved");
    if (clip.stored) fact("File size", formatBytes(clip.stored.bytes));
    if (clip.videoId) fact("Source VOD", clip.vodOffsetSeconds === null ? clip.videoId : `${clip.videoId} at ${formatOffset(clip.vodOffsetSeconds)}`);
    fact("Clip ID", clip.id);
    const twitchUrl = safeHttpsUrl(clip.url, twitchHosts);
    if (twitchUrl) fact("Twitch", externalLink("Open on Twitch", twitchUrl, options.openLink, "clip-link"));

    storage.replaceChildren();
    let saveAction: HTMLElement | undefined;
    if (clip.stored) {
      const file = safeHttpsUrl(clip.stored.downloadUrl);
      storage.append(el("p", "Saved on the Site.", "clips-note"));
      if (file) storage.append(externalLink("Download MP4", file, options.openLink, "clip-link"));
    } else if (library === "site") {
      const message = el("p", "", "clips-error");
      message.hidden = true;
      const save = button("Save to play", () => void (async () => {
        save.disabled = true; save.textContent = "Saving…"; message.hidden = true;
        const failure = await options.save(clip);
        if (failure === null) return;
        save.disabled = false; save.textContent = "Save to play";
        message.textContent = failure; message.hidden = false;
      })(), "primary play-button");
      saveAction = save;
      storage.append(el("p", "Save a copy to the Site to play it here and include it in ZIP downloads."), message);
    } else {
      storage.append(el("p", "Not on Site", "clips-note"), el("p", "This is the local server. It cannot read or write Site storage, so saving and ZIP downloads are unavailable here."));
    }
    player.idle(poster, clip.stored?.playbackUrl ?? null, saveAction);
    if (library === "site") storage.append(zipSlot);
    element.hidden = false;
    heading.focus();
  }

  function hide() {
    player.stop();
    element.hidden = true;
  }

  return { element, show, hide };
}
