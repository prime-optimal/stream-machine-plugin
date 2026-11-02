import { button, el } from "./clips-dom";
import { siteMediaUrl } from "./clips-state";

export function createPlayer(siteOrigin: () => string) {
  const element = el("div", "", "clip-player");
  let video: HTMLVideoElement | null = null;

  function stop() {
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video = null;
    }
    element.replaceChildren();
  }

  function idle(poster: string | null, playbackUrl: string | null, saveAction?: HTMLElement) {
    stop();
    const stage = el("div", "", "player-stage");
    if (poster) {
      const image = el("img");
      image.src = poster;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      stage.append(image);
    }
    const target = playbackUrl ? siteMediaUrl(playbackUrl, siteOrigin()) : "";
    if (target) stage.append(button("Play clip", () => start(target, poster), "primary play-button"));
    else if (saveAction) stage.append(saveAction);
    else stage.append(el("p", "Not on Site", "not-on-site"));
    element.append(stage);
  }

  function start(url: string, poster: string | null) {
    stop();
    const target = siteMediaUrl(url, siteOrigin());
    if (!target) { element.append(el("p", "The Site playback URL is unavailable. Reload the library.", "player-error")); return; }
    const next = el("video");
    next.controls = true;
    next.preload = "none";
    next.playsInline = true;
    if (poster) next.poster = poster;
    const message = el("p", "", "player-error");
    message.hidden = true;
    const retry = button("Play clip", () => void play(), "primary play-button");
    retry.hidden = true;
    next.addEventListener("error", () => {
      if (video !== next) return;
      message.hidden = false;
      message.textContent = "The saved clip could not be played. Check your connection and try Play again.";
      retry.hidden = false;
    });
    async function play() {
      if (video !== next) return;
      message.hidden = true; retry.hidden = true;
      if (next.error) next.load();
      try { await next.play(); }
      catch {
        if (video !== next) return;
        message.textContent = "Saved. Press Play to start playback.";
        message.hidden = false; retry.hidden = false;
      }
    }
    video = next;
    element.append(next, message, retry);
    next.src = target;
    void play();
  }

  return { element, idle, start, stop, isPlaying: () => video !== null };
}
