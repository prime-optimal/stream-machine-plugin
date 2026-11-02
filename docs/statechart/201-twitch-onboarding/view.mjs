export const title = "Proposed Twitch onboarding";
export const state = (v) => ({
  disconnected: "Connect Twitch",
  connecting: "Waiting for consent",
  verified: "Account verified",
  enriching: "Collecting channel media",
  ready: v.approved ? "Home with your edits" : v.seedStatus === "saved" ? "Personalized home" : "Home; brand draft unsaved",
  partial: v.approved ? "Partial home with your edits" : v.seedStatus === "saved" ? "Home with partial data" : "Partial home; brand draft unsaved",
  required: v.pending ? "Reconnect; old reply pending" : "Connection required",
}[v.phase]);
export const step = (action) => ({
  Connect: "you connect Twitch",
  ConsentFails: "consent fails or is canceled",
  VerifyAccount: "the server verifies the account",
  SeedDraft: "the server creates the first DESIGN draft",
  SaveSeed: "the brand draft saves",
  FailSeed: "the draft save fails",
  RetrySeed: "you retry the draft save",
  StartRequest: "the server spends a request slot",
  RequestSucceeds: "channel data arrives",
  RequestFails: "a request fails or times out",
  Finish: "the five-request pass ends",
  StopEarly: "collection stops early",
  Invalidate: "you disconnect, switch accounts, or consent expires",
  IgnoreLateReply: "the server discards the old reply",
  ApproveEdit: "you save a brand edit",
  MergeEvidence: "new evidence preserves your edits",
  Reopen: "you reopen the same account",
  WaitForUser: "wait for a new connection",
}[action] ?? action);
export const group = (v) => v.phase === "required" ? "connection" : v.phase === "ready" || v.phase === "partial" ? "home" : "setup";
export const colors = { connection: "orange", home: "teal", setup: "blue" };
