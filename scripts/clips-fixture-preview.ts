const port = Number(process.env.STREAM_MACHINE_PREVIEW_PORT ?? "4319");
const origin = `http://127.0.0.1:${port}`;
const publicClip = "https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/user-data/files/438ccd0e-237e-4684-9eda-cc1051d1da0e";
const logo = "https://static-cdn.jtvnw.net/ttv-static-metadata/twitch_logo3.jpg";

function fixtureClip(n: number, over: Record<string, unknown> = {}) {
  return {
    id: `FixtureClip${n}`, title: `FIXTURE clip ${n}`, url: `https://clips.twitch.tv/FixtureClip${n}`,
    createdAt: new Date(Date.UTC(2026, 9, 30 - n * 3, 20, n)).toISOString(), durationSeconds: 15 + n * 7, viewCount: n * 137,
    creator: { id: `${n}`, name: `fixture_clipper_${n % 3}` }, game: { id: `${n % 3}`, name: ["Just Chatting", "Chess", "Fixture Racing"][n % 3] },
    thumbnailUrl: n % 2 ? logo : null, videoId: n % 2 ? `${2000 + n}` : null, vodOffsetSeconds: n % 2 ? n * 600 : null, stored: null, ...over,
  };
}

const pages: Record<string, unknown[]> = {
  first: [
    fixtureClip(1, { title: "FIXTURE clip 1 · stored real public clip", stored: {
      fileId: "438ccd0e-237e-4684-9eda-cc1051d1da0e", playbackUrl: publicClip, downloadUrl: publicClip, bytes: 21_208_110, storedAt: "2026-10-31T09:15:00Z",
    } }),
    fixtureClip(2), fixtureClip(3), fixtureClip(4),
  ],
  page2: [fixtureClip(5), fixtureClip(6)],
};

Bun.serve({
  hostname: "127.0.0.1", port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && ["/", "/clips"].includes(url.pathname)) return new Response(Bun.file(new URL("../dist/app.html", import.meta.url)), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    if (request.method !== "POST" || url.pathname !== "/api/tool") return new Response("Not found", { status: 404 });
    const { name, arguments: args } = await request.json() as { name: string; arguments: { cursor?: string; clipId?: string; first?: number } };
    if (name === "stream_machine_open") return Response.json({ structuredContent: { runtime: "hosted", siteOrigin: "https://stream-machine-oauth-test.tinycocoa22.chatgpt.site" } });
    if (name === "stream_machine_twitch_status") return Response.json({ structuredContent: { twitch: { mode: "live", account: { id: "0", login: "fixture_channel", displayName: "Fixture channel", scopes: [] } } } });
    if (name === "stream_machine_clips_library") {
      const second = args.cursor === "page2";
      return Response.json({ structuredContent: { clips: {
        account: { id: "0", login: "fixture_channel", displayName: "Fixture channel" },
        items: args.first === 100 ? [...pages.first!, ...pages.page2!] : second ? pages.page2 : pages.first,
        cursor: args.first === 100 || second ? null : "page2", storage: "site",
      } } });
    }
    if (name === "stream_machine_clips_archive") {
      if (args.clipId === "FixtureClip2") {
        const stored = { fileId: "fixture", playbackUrl: publicClip, downloadUrl: publicClip, bytes: 21_208_110, storedAt: "2026-10-31T09:15:00Z" };
        pages.first![1] = fixtureClip(2, { stored });
        return Response.json({ structuredContent: { archive: { saved: [{ clipId: args.clipId, stored }], skipped: [], failed: [] } } });
      }
      return Response.json({ structuredContent: { archive: { saved: [], skipped: [], failed: [{ clipId: args.clipId, code: "FIXTURE_FAILURE", outcome: "failed" }] } } });
    }
    if (name === "stream_machine_clips_zip") {
      return Response.json({ structuredContent: { zip: { clipCount: 1, bytes: 4_812_345, batches: [{
        url: "https://example.invalid/fixture-zip-batch-1", clipCount: 1, bytes: 4_812_345, expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }] } } });
    }
    return Response.json({ isError: true, structuredContent: { error: { code: "FIXTURE_ONLY" } } });
  },
});
process.stdout.write(`Clip library fixture preview (fake data): ${origin}/?preview=1\n`);
