import { expect, test } from "bun:test";
import { TwitchClipClient } from "../src/adapters/twitch/clips-client";
import { TwitchClipService } from "../src/adapters/twitch/clips-service";
import type { TwitchAccess, TwitchAccountProvider } from "../src/auth/twitch";
const access: TwitchAccess = { account: { id: "123", login: "owner", displayName: "Owner", scopes: ["channel:manage:clips"] }, clientId: "client", accessToken: "TOKEN_SENTINEL" };
const clip = { id: "Clip-1", broadcaster_id: "123", title: "Clip", url: "https://clips.twitch.tv/Clip-1" };
function fixture(options: { status?: number; metadata?: unknown; download?: unknown; scopes?: string[] } = {}) {
  const calls: URL[] = [];
  let inAccount = false;
  const accounts: TwitchAccountProvider = { async withAccount(fn) { inAccount = true; try { return await fn({ ...access, account: { ...access.account, scopes: options.scopes ?? access.account.scopes } }); } finally { inAccount = false; } } };
  const fetcher: typeof fetch = Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input)); calls.push(url);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer TOKEN_SENTINEL");
    expect(init?.redirect).toBe("manual");
    if (options.status) return new Response(null, { status: options.status });
    return Response.json(url.pathname.endsWith("downloads") ? options.download ?? { data: [{ clip_id: "Clip-1", landscape_download_url: "https://production.assets.clips.twitchcdn.net/test?sig=SIGNED_SENTINEL", portrait_download_url: null }] } : options.metadata ?? { data: [clip] });
  }, { preconnect: fetch.preconnect });
  const writer = { async write(url: string) { expect(inAccount).toBe(false); expect(url).toContain("SIGNED_SENTINEL"); return { id: "artifact", path: "/private/test.mp4", bytes: 4, sha256: "hash", completedAt: "now" }; } };
  return { service: new TwitchClipService(accounts, new TwitchClipClient(fetcher), writer), calls };
}
test("official parameters use connected owner and result excludes secrets", async () => {
  const f = fixture(), result = await f.service.download("Clip-1");
  expect(f.calls[0]?.searchParams.get("id")).toBe("Clip-1");
  expect(f.calls[1]?.searchParams.get("editor_id")).toBe("123");
  expect(f.calls[1]?.searchParams.get("broadcaster_id")).toBe("123");
  expect(f.calls[1]?.searchParams.get("clip_id")).toBe("Clip-1");
  expect(result).toMatchObject({ mode: "live", format: "landscape", artifact: { path: "/private/test.mp4" } });
  expect(JSON.stringify(result)).not.toMatch(/TOKEN_SENTINEL|SIGNED_SENTINEL/);
});
test("scope and ownership fail before download lookup", async () => {
  const missing = fixture({ scopes: [] });
  await expect(missing.service.download("Clip-1")).rejects.toThrow("TWITCH_SCOPE_REQUIRED"); expect(missing.calls).toHaveLength(0);
  const wrong = fixture({ metadata: { data: [{ ...clip, broadcaster_id: "other" }] } });
  await expect(wrong.service.download("Clip-1")).rejects.toThrow("CLIP_WRONG_BROADCASTER"); expect(wrong.calls).toHaveLength(1);
});
test("metadata needs no download scope and validates input and returned ID", async () => {
  expect(await fixture({ scopes: [] }).service.clip("Clip-1")).toMatchObject({ clip: { id: "Clip-1" } });
  for (const id of ["", "../bad", "a".repeat(257)]) await expect(fixture().service.clip(id)).rejects.toThrow("INVALID_CLIP_ID");
  await expect(fixture({ metadata: { data: [{ ...clip, id: "wrong" }] } }).service.clip("Clip-1")).rejects.toThrow("TWITCH_INVALID_RESPONSE");
});
test("not found, absent formats, wrong download ID and malformed data fail clearly", async () => {
  await expect(fixture({ metadata: { data: [] } }).service.clip("Clip-1")).rejects.toThrow("CLIP_NOT_FOUND");
  await expect(fixture({ download: { data: [{ clip_id: "Clip-1", landscape_download_url: null, portrait_download_url: null }] } }).service.download("Clip-1")).rejects.toThrow("CLIP_FORMAT_UNAVAILABLE");
  for (const download of [{ data: [] }, { data: [{ clip_id: "wrong", landscape_download_url: "https://example.com", portrait_download_url: null }] }, { data: [{}] }]) await expect(fixture({ download }).service.download("Clip-1")).rejects.toThrow();
});
test("portrait fallback and sanitized API failures", async () => {
  expect(await fixture({ download: { data: [{ clip_id: "Clip-1", landscape_download_url: null, portrait_download_url: "https://production.assets.clips.twitchcdn.net/test?SIGNED_SENTINEL" }] } }).service.download("Clip-1")).toMatchObject({ format: "portrait" });
  for (const [status, code] of [[401, "TWITCH_RECONNECT_REQUIRED"], [403, "TWITCH_SCOPE_REQUIRED"], [429, "TWITCH_RATE_LIMITED"], [500, "TWITCH_UNAVAILABLE"]] as const) await expect(fixture({ status }).service.clip("Clip-1")).rejects.toThrow(code);
});
test("all Helix 3xx statuses fail before parsing redirect bodies", async () => {
  for (let status = 300; status < 400; status++) {
    const calls: string[] = [];
    const fetcher: typeof fetch = Object.assign(async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response(null, { status, headers: { Location: "https://redirect.example/" } });
    }, { preconnect: fetch.preconnect });
    const client = new TwitchClipClient(fetcher);
    await expect(client.read(access, "Clip-1")).rejects.toThrow("TWITCH_UNAVAILABLE");
    await expect(client.download(access, "Clip-1")).rejects.toThrow("TWITCH_UNAVAILABLE");
    expect(calls).toHaveLength(2);
    expect(calls.every(url => url.startsWith("https://api.twitch.tv/helix/"))).toBe(true);
  }
});
test("concurrent download fails without a second provider request", async () => {
  const f = fixture(); const first = f.service.download("Clip-1");
  await expect(f.service.download("Clip-1")).rejects.toThrow("CLIP_DOWNLOAD_BUSY"); await first;
});
