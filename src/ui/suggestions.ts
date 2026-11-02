export type Suggestion = { id: string; icon: string; title: string; description: string; prompt: string; desktopOnly: boolean };

export const suggestionsHeading = "💡 See what Stream Machine can do";

export const suggestions: readonly Suggestion[] = [
  { id: "channel", icon: "connect", title: "Check my channel", description: "Read my current Twitch title and category.", prompt: "Use Stream Machine to show my current Twitch stream title and category.", desktopOnly: false },
  { id: "title", icon: "layers", title: "Preview a new title", description: "Draft a title and category before anything changes.", prompt: "Use Stream Machine to preview a new Twitch title and category for my next stream. Show me the change before applying it.", desktopOnly: false },
  { id: "clips", icon: "play", title: "Browse my clips", description: "List the latest clips on my channel.", prompt: "Use Stream Machine to show the latest clips from my Twitch channel.", desktopOnly: false },
  { id: "save", icon: "cloud", title: "Save a clip", description: "Keep a stored copy of a clip I pick.", prompt: "Use Stream Machine to save a copy of one of my recent Twitch clips. Ask me which one.", desktopOnly: false },
  { id: "zip", icon: "arrow", title: "Download clips as a ZIP", description: "Bundle saved clips into ZIP downloads.", prompt: "Use Stream Machine to bundle my saved Twitch clips into ZIP downloads.", desktopOnly: false },
  { id: "overlay", icon: "local", title: "Build an OBS overlay", description: "Create a stream overlay and send it to OBS.", prompt: "Use Stream Machine to build a stream overlay and add it to OBS.", desktopOnly: true },
  { id: "deck", icon: "local", title: "Add a Stream Deck button", description: "Put a Stream Machine action on a Stream Deck key.", prompt: "Use Stream Machine to set up a Stream Deck button for my stream.", desktopOnly: true },
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
  if (host.standalone) return "Try is available inside ChatGPT.";
  return host.messageSupported ? "" : "This host cannot send messages from the app.";
}

export function messageParams(prompt: string) {
  return { role: "user" as const, content: [{ type: "text" as const, text: prompt }] };
}

export type MessageParams = { role: "user"; content: { type: "text"; text: string }[] };
