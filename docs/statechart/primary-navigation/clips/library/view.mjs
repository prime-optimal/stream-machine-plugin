export const title = "Clip library";
const states = {
  connection: "Connect Twitch", loading: "Loading clips", empty: "No clips found", loadError: "Clips failed to load",
  gallery: "Browsing gallery", loadingMore: "Loading more clips", moreError: "More clips failed to load",
  details: "Clip details", playing: "Playing saved clip",
};
export const state = (v) => states[v.phase];
const labels = {
  OpenClips: "you open Clips", LibraryLoaded: "clips arrive", LibraryEmpty: "the channel has no clips",
  LibraryFailed: "the library request fails", RetryLibrary: "you press Try again",
  PressLoadMore: "you press Load more", MoreLoaded: "the next page arrives", MoreFailed: "the next page fails",
  SelectClip: "you select a clip", PressPlay: "you press Play [on a saved clip]",
  BackToClips: "you go back or leave Clips", AccountChanged: "account changes",
};
export const step = (action, from) => {
  if (action === "AccountChanged" && from.phase !== "playing") return null;
  if (["RequestZip", "ZipReady", "ZipFailed", "WaitForUser"].includes(action)) return null;
  return labels[action] ?? action;
};
