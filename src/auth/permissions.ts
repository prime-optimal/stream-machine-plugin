export const BROADCAST_SCOPE = "channel:manage:broadcast";
export const CLIP_SCOPE = "channel:manage:clips";
type Feature = {
  tools: string[]; endpoints: string[]; events: string[];
  token: "user"; identity: string; scopes: string[];
};
export const twitchFeatures = {
  connection: { tools: ["stream_machine_twitch_connect", "stream_machine_twitch_status", "stream_machine_twitch_preflight"], endpoints: [], events: [], token: "user", identity: "Connected user", scopes: [] },
  profile: { tools: ["stream_machine_twitch_profile"], endpoints: ["GET /helix/users"], events: [], token: "user", identity: "Connected user", scopes: [] },
  channel: { tools: ["stream_machine_twitch_channel"], endpoints: ["GET /helix/channels"], events: [], token: "user", identity: "Connected broadcaster", scopes: [] },
  title: {
    tools: ["stream_machine_twitch_preview_title", "stream_machine_twitch_apply_title"],
    endpoints: ["PATCH /helix/channels"], events: [], token: "user", identity: "Token user is broadcaster", scopes: [BROADCAST_SCOPE],
  },
  clipMetadata: { tools: ["stream_machine_twitch_clip"], endpoints: ["GET /helix/clips"], events: [], token: "user", identity: "Connected user; any broadcaster's clip", scopes: [] },
  clipLibrary: {
    tools: ["stream_machine_clips_library"], endpoints: ["GET /helix/clips", "GET /helix/games"], events: [],
    token: "user", identity: "Connected broadcaster; own clips only", scopes: [],
  },
  clipDownload: {
    tools: ["stream_machine_twitch_download_clip"], endpoints: ["GET /helix/clips/downloads"], events: [],
    token: "user", identity: "Token user is both broadcaster and editor; own clips only", scopes: [CLIP_SCOPE],
  },
  channelUpdate: {
    tools: [], endpoints: ["POST /helix/eventsub/subscriptions"], events: ["channel.update:2"],
    token: "user", identity: "WebSocket; connected broadcaster condition", scopes: [],
  },
} satisfies Record<string, Feature>;
export const implementedTwitchScopes = [...new Set(Object.values(twitchFeatures).flatMap(feature => feature.scopes))].sort();
export const futureTwitchPermissions = [
  { scope: "user:read:chat", purpose: "Read chat" },
  { scope: "user:write:chat", purpose: "Send chat" },
  { scope: "moderator:read:followers", purpose: "Read followers" },
  { scope: "channel:read:subscriptions", purpose: "Read subscriptions" },
  { scope: "bits:read", purpose: "Read cheers" },
  { scope: "channel:read:redemptions", purpose: "Read rewards and redemptions" },
  { scope: "channel:manage:redemptions", purpose: "Manage rewards and redemptions" },
  { scope: "clips:edit", purpose: "Create clips" },
  { scope: "user:bot", purpose: "Authorize this user as a bot" },
  { scope: "channel:bot", purpose: "Authorize a bot in this channel" },
];
export const requiredTwitchScopes = [...implementedTwitchScopes, ...futureTwitchPermissions.map(permission => permission.scope)].sort();
export const twitchConsentSummary = [
  "Current features use title updates and own-channel clip downloads, with broader broadcast and clip management access.",
  "Future permissions, not active features: read/send chat; read followers, subscriptions, and cheers; read/manage rewards; create clips; bot use.",
  "Requesting unused permissions conflicts with Twitch policy and risks API access suspension.",
  "Consent does not authorize a separate bot account.",
].join(" ");
export const twitchConsentDisclosure = `${twitchConsentSummary} Exact requested scopes: ${requiredTwitchScopes.join(", ")}.`;
export function requestedTwitchScopes(granted: string[], additional: string[] = []) {
  return [...new Set([...requiredTwitchScopes, ...granted, ...additional])].sort();
}
export function twitchPermissions(granted: string[]) {
  const grantedScopes = [...new Set(granted)].sort();
  const missingScopes = requiredTwitchScopes.filter(scope => !grantedScopes.includes(scope));
  return {
    requiredScopes: [...requiredTwitchScopes], implementedScopes: [...implementedTwitchScopes],
    futureScopes: futureTwitchPermissions.map(permission => permission.scope).sort(),
    grantedScopes, missingScopes, reconnectRequired: missingScopes.length > 0,
  };
}
