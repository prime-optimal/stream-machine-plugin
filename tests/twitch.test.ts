import { describe, expect, test } from "bun:test";
import { TwitchChannelClient } from "../src/adapters/twitch/client";
import { TwitchTitleService, TITLE_SCOPE } from "../src/adapters/twitch/service";
import type { TwitchAccess, TwitchAccountProvider } from "../src/auth/twitch";
import { unavailableAccount } from "../src/auth/twitch";
import { createLocalTwitchRuntime } from "../src/auth/local-runtime";
function fixture() {
  const access: TwitchAccess = { account: { id: "123", login: "creator", displayName: "Creator", scopes: [TITLE_SCOPE] }, accessToken: "SECRET_TOKEN_SENTINEL", clientId: "test-client" };
  const provider: TwitchAccountProvider = { async withAccount(fn) { return fn(access); } };
  let title = "Original", category = "509658", reads = 0, writes = 0, now = 1000, wrongTarget = false, mismatch = false, writeFailure = false;
  const fetcher: typeof fetch = Object.assign(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toBe("https://api.twitch.tv/helix/channels?broadcaster_id=123");
    if (init?.method === "PATCH") {
      writes++;
      const body: unknown = JSON.parse(String(init.body));
      expect(body).toEqual({ title: "Proposed" });
      if (writeFailure) throw new Error(access.accessToken);
      if (!mismatch) title = "Proposed";
      return new Response(null, { status: 204 });
    }
    reads++;
    return Response.json({ data: [{ broadcaster_id: wrongTarget ? "other" : "123", broadcaster_login: "creator", broadcaster_name: "Creator", title, game_id: category, game_name: "Just Chatting" }] });
  }, { preconnect: fetch.preconnect });
  const service = new TwitchTitleService(provider, new TwitchChannelClient(fetcher), () => now);
  return { access, service, stats: () => ({ reads, writes }), title: (s: string) => { title = s; }, category: (s: string) => { category = s; }, advance: () => { now += 300000; }, wrongTarget: () => { wrongTarget = true; }, mismatch: () => { mismatch = true; }, failWrite: () => { writeFailure = true; } };
}
describe("Twitch live boundary with explicit fake provider", () => {
  test("missing local configuration never uses demo account", async () => {
    expect(createLocalTwitchRuntime({})).toBeUndefined();
    await expect(new TwitchTitleService(unavailableAccount).status()).rejects.toThrow("TWITCH_NOT_CONFIGURED");
  });
  test("status/read expose public metadata, preview performs no write", async () => {
    const f = fixture();
    const status = await f.service.status(); const channel = await f.service.channel(); const preview = await f.service.preview("Proposed");
    expect(channel.channel).toMatchObject({ broadcasterId: "123", title: "Original", categoryId: "509658" });
    expect(preview.before.title).toBe("Original"); expect(preview.after.title).toBe("Proposed");
    expect(JSON.stringify({ status, channel, preview })).not.toContain("SECRET_TOKEN_SENTINEL");
    expect(f.stats()).toEqual({ reads: 2, writes: 0 });
  });
  test("exact browser approval then one write and real read-back", async () => {
    const f = fixture(), p = await f.service.preview("Proposed");
    await expect(f.service.apply(p.previewId)).rejects.toThrow("BROWSER_APPROVAL_REQUIRED");
    f.service.approve(p.previewId);
    expect(await f.service.apply(p.previewId)).toMatchObject({ status: "verified", channel: { title: "Proposed" } });
    await expect(f.service.apply(p.previewId)).rejects.toThrow("PREVIEW_CONSUMED");
    expect(f.stats()).toEqual({ reads: 3, writes: 1 });
  });
  test("missing scope, changed identity, stale title/category and expiry prevent writes", async () => {
    for (const change of ["scope", "identity", "title", "category", "expiry"]) {
      const f = fixture(), p = await f.service.preview("Proposed"); f.service.approve(p.previewId);
      if (change === "scope") f.access.account.scopes = [];
      if (change === "identity") f.access.account.id = "other";
      if (change === "title") f.title("External change");
      if (change === "category") f.category("other");
      if (change === "expiry") f.advance();
      await expect(f.service.apply(p.previewId)).rejects.toThrow(); expect(f.stats().writes).toBe(0);
    }
  });
  test("provider wrong target never becomes preview", async () => {
    const f = fixture(); f.wrongTarget(); await expect(f.service.preview("Proposed")).rejects.toThrow("TWITCH_WRONG_ACCOUNT");
  });
  test("read-back mismatch reported honestly", async () => {
    const f = fixture(), p = await f.service.preview("Proposed"); f.service.approve(p.previewId); f.mismatch();
    expect(await f.service.apply(p.previewId)).toMatchObject({ status: "applied_unverified" });
  });
  test("ambiguous mutation consumes preview and never retries", async () => {
    const f = fixture(), p = await f.service.preview("Proposed"); f.service.approve(p.previewId); f.failWrite();
    await expect(f.service.apply(p.previewId)).rejects.toThrow("WRITE_OUTCOME_UNKNOWN");
    await expect(f.service.apply(p.previewId)).rejects.toThrow("PREVIEW_CONSUMED"); expect(f.stats().writes).toBe(1);
  });
  test("parallel execute cannot duplicate write", async () => {
    const f = fixture(), p = await f.service.preview("Proposed"); f.service.approve(p.previewId);
    const results = await Promise.allSettled([f.service.apply(p.previewId), f.service.apply(p.previewId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(f.stats().writes).toBe(1);
  });
});
test("local OAuth callback and human approval form preserve trusted boundary", async () => {
  const port = 42000 + Math.floor(Math.random() * 10000);
  let title = "Original", writes = 0, exchanges = 0;
  const fake: typeof fetch = Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) { exchanges++; return Response.json({ access_token: "LOCAL_TOKEN_SENTINEL", refresh_token: "LOCAL_REFRESH_SENTINEL", expires_in: 3600, token_type: "bearer", scope: [TITLE_SCOPE] }); }
    if (url.includes("/oauth2/validate")) return Response.json({ client_id: "client", user_id: "123", scopes: [TITLE_SCOPE], expires_in: 3600 });
    if (url.includes("/helix/users")) return Response.json({ data: [{ id: "123", login: "creator", display_name: "Creator" }] });
    if (url.includes("/helix/channels")) {
      if (init?.method === "PATCH") { writes++; title = "Proposed"; return new Response(null, { status: 204 }); }
      return Response.json({ data: [{ broadcaster_id: "123", broadcaster_login: "creator", broadcaster_name: "Creator", title, game_id: "1", game_name: "Category" }] });
    }
    throw new Error("Unexpected fake request");
  }, { preconnect: fetch.preconnect });
  const runtime = createLocalTwitchRuntime({ TWITCH_CLIENT_ID: "client", TWITCH_CLIENT_SECRET: "secret", TWITCH_TOKEN_ENCRYPTION_KEY: btoa("a".repeat(32)), STREAM_MACHINE_TWITCH_STORE: ":memory:" }, fake, port);
  if (!runtime) throw new Error("Test runtime missing");
  try {
    const { connectUrl } = runtime.connect(true);
    const start = await fetch(connectUrl, { redirect: "manual" });
    expect(start.status).toBe(302);
    expect(start.headers.get("referrer-policy")).toBe("no-referrer");
    const location = start.headers.get("location"); if (!location) throw new Error("OAuth redirect missing");
    const state = new URL(location).searchParams.get("state");
    expect(new URL(location).searchParams.get("scope")).toBe(TITLE_SCOPE);
    const stateCookie = start.headers.get("set-cookie")?.split(";")[0] ?? "";
    const callback = `http://localhost:${port}/api/twitch/callback?state=${state}&code=test-code`;
    expect((await fetch(callback)).status).toBe(400);
    expect((await fetch(callback, { headers: { cookie: stateCookie } })).status).toBe(200);
    expect((await fetch(callback, { headers: { cookie: stateCookie } })).status).toBe(200);
    expect(exchanges).toBe(1);
    expect((await fetch(callback)).status).toBe(400);
    expect((await fetch(callback, { headers: { cookie: "sm_twitch_state=wrong-browser-state" } })).status).toBe(400);
    expect((await fetch(callback.replace(`state=${state}`, "state=wrong-state"), { headers: { cookie: stateCookie } })).status).toBe(400);
    expect(exchanges).toBe(1);
    expect(runtime.diagnostics().every(f => f.class === "TwitchError" && f.code === "invalid_state" && f.status === 400)).toBe(true);
    const status = await runtime.titles.status(); expect(status.account.id).toBe("123");
    expect(JSON.stringify(status)).not.toContain("LOCAL_TOKEN_SENTINEL");
    const p = await runtime.titles.preview("Proposed"), approvalUrl = runtime.approvalUrl(p.previewId);
    const page = await fetch(approvalUrl); const html = await page.text();
    expect(page.headers.get("referrer-policy")).toBe("same-origin");
    expect(html).toContain("Original"); expect(html).toContain("Proposed"); expect(writes).toBe(0);
    const cookie = page.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect((await fetch(approvalUrl, { method: "POST", headers: { origin: "null", cookie } })).status).toBe(403);
    expect(runtime.diagnostics().at(-1)).toMatchObject({ class: "ApprovalGuard", originIsSameOrigin: false, originIsNull: true, cookiePresent: true });
    expect((await fetch(approvalUrl, { method: "POST", headers: { origin: `http://localhost:${port}` } })).status).toBe(403);
    expect((await fetch(approvalUrl, { method: "POST", headers: { origin: "https://evil.example", cookie } })).status).toBe(403);
    await expect(runtime.titles.apply(p.previewId)).rejects.toThrow("BROWSER_APPROVAL_REQUIRED");
    expect((await fetch(approvalUrl, { method: "POST", headers: { origin: `http://localhost:${port}`, cookie } })).status).toBe(200);
    expect(await runtime.titles.apply(p.previewId)).toMatchObject({ status: "verified" }); expect(writes).toBe(1);
  } finally { runtime.close(); }
});
