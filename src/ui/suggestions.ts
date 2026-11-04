export type Suggestion = { id: string; icon: string; title: string; description: string; prompt: string; desktopOnly: boolean };

export const suggestionsHeading = "Try asking";

export const suggestions: readonly Suggestion[] = [
  { id: "channel", icon: "connect", title: "Check my channel", description: "See my current title and category.", prompt: "Use Stream Machine to show my current Twitch stream title and category.", desktopOnly: false },
  { id: "title", icon: "layers", title: "Preview a new title", description: "Draft a title and category before applying it.", prompt: "Use Stream Machine to preview a new Twitch title and category for my next stream. Show me the change before applying it.", desktopOnly: false },
  { id: "clips", icon: "play", title: "Browse my clips", description: "See my latest clips.", prompt: "Use Stream Machine to show the latest clips from my Twitch channel.", desktopOnly: false },
  { id: "save", icon: "cloud", title: "Save a clip", description: "Keep a copy of a clip.", prompt: "Use Stream Machine to save a copy of one of my recent Twitch clips. Ask me which one.", desktopOnly: false },
  { id: "zip", icon: "arrow", title: "Download clips as a ZIP", description: "Bundle saved clips into ZIP files.", prompt: "Use Stream Machine to bundle my saved Twitch clips into ZIP downloads.", desktopOnly: false },
  { id: "overlay", icon: "local", title: "Build an OBS overlay", description: "Make an overlay and add it to OBS.", prompt: "Use Stream Machine to build a stream overlay and add it to OBS.", desktopOnly: true },
  { id: "deck", icon: "local", title: "Add a Stream Deck button", description: "Put an action on a Stream Deck key.", prompt: "Use Stream Machine to set up a Stream Deck button for my stream.", desktopOnly: true },
];

export type CarouselMetrics = { scrollLeft: number; clientWidth: number; scrollWidth: number };
export type CarouselState = { overflow: boolean; canPrev: boolean; canNext: boolean };

const edgeTolerance = 2;

export function carouselState(metrics: CarouselMetrics): CarouselState {
  const max = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  const overflow = max > edgeTolerance;
  return {
    overflow,
    canPrev: overflow && metrics.scrollLeft > edgeTolerance,
    canNext: overflow && metrics.scrollLeft < max - edgeTolerance,
  };
}

export function scrollTarget(metrics: CarouselMetrics, cardWidth: number, direction: -1 | 1): number {
  const max = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  return Math.min(max, Math.max(0, metrics.scrollLeft + direction * cardWidth));
}

export function canTry(host: { standalone: boolean; messageSupported: boolean }): boolean {
  return !host.standalone && host.messageSupported;
}

export function tryLabel(host: { standalone: boolean; messageSupported: boolean }): string {
  if (host.standalone) return "Try works inside ChatGPT.";
  return host.messageSupported ? "" : "Try isn't available here.";
}

export function messageParams(prompt: string) {
  return { role: "user" as const, content: [{ type: "text" as const, text: prompt }] };
}

export type MessageParams = { role: "user"; content: { type: "text"; text: string }[] };
