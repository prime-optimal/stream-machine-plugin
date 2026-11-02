import { button, el } from "./clips-dom";
import { safeHttpsUrl } from "./clips-state";

export function createPlayer() {
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

  function idle(poster: string | null, playbackUrl: string | null) {
    stop();
    const stage = el("div", "", "player-stage");
    if (poster) {
      const image = el("img");
      image.src = poster;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      stage.append(image);
    }
    const target = playbackUrl ? safeHttpsUrl(playbackUrl) : "";
    if (target) stage.append(button("Play clip", () => start(target, poster), "primary play-button"));
    else stage.append(el("p", "Not on Site", "not-on-site"));
    element.append(stage);
  }

  function start(url: string, poster: string | null) {
    stop();
    const next = el("video");
    next.controls = true;
    next.preload = "none";
    next.playsInline = true;
    if (poster) next.poster = poster;
    const message = el("p", "", "player-error");
    message.hidden = true;
    next.addEventListener("error", () => {
      message.hidden = false;
      message.textContent = "The clip could not be played. Check your connection and try Play again.";
    });
    video = next;
    element.append(next, message);
    next.src = url;
    void next.play().catch(() => {});
  }

  return { element, idle, stop, isPlaying: () => video !== null };
}
