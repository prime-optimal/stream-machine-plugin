export const categories = [
  { id: "demo-just-chatting", name: "Just Chatting (demo)" },
  { id: "demo-street-fighter", name: "Street Fighter 6 (demo)" },
];

export const recipes = [
  {
    id: "prepare-channel", name: "Prepare channel details",
    description: "Preview title and category before your next stream.",
    requiredCapabilities: ["twitch.channel.preview"], available: true,
  },
  {
    id: "clip-kit", name: "Build a clip kit",
    description: "Future: clip metadata, download, and artwork handoff.",
    requiredCapabilities: ["twitch.clips.download", "design.generate"], available: false,
  },
  {
    id: "stream-deck", name: "Prepare a Stream Deck page",
    description: "Future: inspect local actions and preview a button layout.",
    requiredCapabilities: ["streamdeck.profile.preview"], available: false,
  },
];

export const capabilities = [
  { id: "twitch.channel.preview", name: "Channel preview", location: "any", status: "mock", reason: "Fictional account and category data only." },
  { id: "twitch.account.connect", name: "Twitch account", location: "cloud", status: "not_configured", reason: "Live OAuth adapter is planned; demo connection is available." },
  { id: "twitch.clips.download", name: "Clip downloads", location: "cloud", status: "not_configured", reason: "Official download API adapter and account grants required." },
  { id: "twitch.eventsub", name: "EventSub", location: "cloud", status: "not_configured", reason: "Durable receiver and subscription manager planned." },
  { id: "obs.inspect", name: "OBS", location: "local", status: "not_configured", reason: "Optional desktop MCP provider; no bridge required for desktop use." },
  { id: "streamdeck.profile.preview", name: "Stream Deck", location: "local", status: "not_configured", reason: "Optional desktop MCP provider; hardware untouched." },
  { id: "design.generate", name: "Design tools", location: "cloud", status: "not_configured", reason: "Reuse existing OpenDesign Cloud or Canva connection when available." },
  { id: "hyperframes.render", name: "HyperFrames", location: "local", status: "not_configured", reason: "Optional authoring/render adapter; not included in this package." },
] as const;
