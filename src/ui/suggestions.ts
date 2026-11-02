export type Suggestion = { id: string; icon: string; title: string; description: string; prompt: string; desktopOnly: boolean };

export const suggestionsHeading = "All features";

export const suggestions: readonly Suggestion[] = [
  { id: "channel", icon: "connect", title: "Check my channel", description: "Read my current Twitch title and category.", prompt: "Use Stream Machine to show my current Twitch stream title and category.", desktopOnly: false },
  { id: "title", icon: "layers", title: "Preview a new title", description: "Draft a title and category before anything changes.", prompt: "Use Stream Machine to preview a new Twitch title and category for my next stream. Show me the change before applying it.", desktopOnly: false },
  { id: "clips", icon: "play", title: "Browse my clips", description: "List the latest clips on my channel.", prompt: "Use Stream Machine to show the latest clips from my Twitch channel.", desktopOnly: false },
  { id: "save", icon: "cloud", title: "Save a clip", description: "Keep a stored copy of a clip I pick.", prompt: "Use Stream Machine to save a copy of one of my recent Twitch clips. Ask me which one.", desktopOnly: false },
  { id: "zip", icon: "arrow", title: "Download clips as a ZIP", description: "Bundle saved clips into ZIP downloads.", prompt: "Use Stream Machine to bundle my saved Twitch clips into ZIP downloads.", desktopOnly: false },
  { id: "overlay", icon: "local", title: "Build an OBS overlay", description: "Create a stream overlay and send it to OBS.", prompt: "Use Stream Machine to build a stream overlay and add it to OBS.", desktopOnly: true },
  { id: "deck", icon: "local", title: "Add a Stream Deck button", description: "Put a Stream Machine action on a Stream Deck key.", prompt: "Use Stream Machine to set up a Stream Deck button for my stream.", desktopOnly: true },
];

export type PriorityFeature = Omit<Suggestion, "prompt"> & {
  action: { kind: "message"; prompt: string } | { kind: "navigate"; section: "clips" };
};

export const priorityFeatures: readonly PriorityFeature[] = [
  { id: "brand-kit", icon: "layers", title: "Brand kit", description: "Draft a DESIGN.md with colors, fonts, and visual direction.", desktopOnly: false,
    action: { kind: "message", prompt: "Help me draft DESIGN.md and a visual direction for my stream. Ask about my preferences and confirm the brief first. Check which OpenDesign tools are available before proposing generation. Do not assume a saved brand kit or persistent settings exist." } },
  { id: "stream-assets", icon: "layers", title: "Stream assets", description: "Create overlays, alerts, and other stream graphics.", desktopOnly: false,
    action: { kind: "message", prompt: "Help me create a stream overlay or alert. Confirm the brief and check which OpenDesign tools are available before generation. Keep this task focused on authoring the asset. Do not install it in OBS or apply it to my stream automatically." } },
  { id: "clips", icon: "play", title: "Clips", description: "Browse, play, and download your channel's clips.", desktopOnly: false,
    action: { kind: "navigate", section: "clips" } },
  { id: "local-setup", icon: "local", title: "OBS & Stream Deck setup", description: "Set up OBS and Stream Deck on your desktop.", desktopOnly: true,
    action: { kind: "message", prompt: "Help me set up OBS and Stream Deck with Stream Machine on my desktop. Check which local tools are available first, ask which setup I want, and preview any supported changes before applying them." } },
];

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
