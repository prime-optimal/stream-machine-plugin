import { createServer } from "node:net";
import { expect, test } from "bun:test";
import { canonicalVideo, mediaInput } from "../src/adapters/media/contracts";
import { MediaInfoProvider, verifyPrivateService, verifyLoopbackListeners, type MediaConnection } from "../src/adapters/media/provider";
const url = "https://www.youtube.com/watch?v=BaW_jenozKc";
const input = { url, transcript: false };
const reply = (data: unknown, isError = false) => ({ isError, content: [{ type: "text", text: JSON.stringify(data) }] });
const info = { url, title: "Synthetic test video", duration_seconds: 10 };
function fixture(response: (name: string) => unknown) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let closes = 0;
  const connection: MediaConnection = {
    async call(name, args) { calls.push({ name, args }); return response(name); },
    async close() { closes++; },
  };
  return { provider: new MediaInfoProvider(async () => connection), calls, closes: () => closes };
}
test("only single HTTPS YouTube video URLs pass", () => {
  expect(canonicalVideo("https://youtu.be/BaW_jenozKc?list=secret#time")).toBe(url);
  for (const bad of ["http://youtu.be/BaW_jenozKc", "https://youtube.com.evil.test/watch?v=BaW_jenozKc", "https://u:p@youtube.com/watch?v=BaW_jenozKc", "https://youtube.com:444/watch?v=BaW_jenozKc", "https://youtube.com/playlist?list=x", "https://127.0.0.1/a", "https://youtube.com/@channel"]) {
    expect(mediaInput.safeParse({ url: bad }).success).toBe(false);
  }
  expect(mediaInput.safeParse({ url, endpoint: "http://localhost" }).success).toBe(false);
});
test("listener check rejects missing, wildcard, IPv6, mixed, and ambiguous bindings", () => {
  const header = "COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\n";
  const row = (address: string) => `uvicorn 12 user 4u IPv4 x 0t0 TCP ${address}:8123 (LISTEN)`;
  verifyLoopbackListeners(header + row("127.0.0.1"), "8123");
  for (const output of ["", header, header + row("*"), header + row("[::]"), header + row("127.0.0.1") + "\n" + row("*"), "unexpected"]) {
    expect(() => verifyLoopbackListeners(output, "8123")).toThrow("MEDIA_PRIVATE_SERVICE_REQUIRED");
  }
});
test("real listener inspection accepts loopback and blocks exposed listener without provider launch", async () => {
  for (const host of ["127.0.0.1", "0.0.0.0"]) {
    const listener = createServer();
    await new Promise<void>(resolve => listener.listen(0, host, resolve));
    try {
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("No TCP listener");
      const check = verifyPrivateService(String(address.port), new AbortController().signal);
      if (host === "127.0.0.1") await check;
      else await expect(check).rejects.toThrow("MEDIA_PRIVATE_SERVICE_REQUIRED");
    } finally { await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve())); }
  }
});

test("metadata uses narrow arguments and filters extra fields", async () => {
  const f = fixture(() => reply({ ...info, raw: { password: "must-not-return" } }));
  const result = await f.provider.inspect(input);
  expect(result.title).toBe(info.title);
  expect(result.transcript.state).toBe("not_requested");
  expect(JSON.stringify(result)).not.toContain("must-not-return");
  expect(f.calls).toEqual([{ name: "extract_info", args: { url, include_raw: false, username: null, password: null } }]);
  await f.provider.close(); await f.provider.close(); expect(f.closes()).toBe(1);
  await expect(f.provider.inspect(input)).rejects.toThrow("MEDIA_PROVIDER_CLOSED");
});
test("transcript text is bounded with actual language", async () => {
  const f = fixture(name => reply(name === "extract_info" ? info : { url, language: "es", full_text: "x".repeat(100001) }));
  expect((await f.provider.inspect({ url, transcript: true })).transcript).toEqual({ state: "available", language: "es", text: "x".repeat(100000), truncated: true });
  await f.provider.close();
});
for (const code of ["NO_SUBTITLES", "SUBTITLE_FETCH_FAILED"]) {
  test(`${code} reports unavailable without invented text`, async () => {
    const f = fixture(name => name === "extract_info" ? reply(info) : reply({ code, error: "private diagnostic" }, true));
    expect((await f.provider.inspect({ url, transcript: true })).transcript).toEqual({ state: "unavailable", reason: code });
    await f.provider.close();
  });
}
test("generic failures, malformed data, and mismatched URLs fail closed", async () => {
  for (const bad of [reply({ code: "INTERNAL_SERVER_ERROR", error: "secret" }, true), reply({ ...info, url: "https://youtu.be/abcdefghijk" }), reply({ title: "x" })]) {
    const f = fixture(() => bad);
    await expect(f.provider.inspect(input)).rejects.toThrow(/MEDIA_/);
    expect(f.closes()).toBe(1);
  }
});
test("busy, timeout, fresh retry, and close cancellation", async () => {
  let closes = 0;
  let connects = 0;
  const provider = new MediaInfoProvider(async () => {
    connects++;
    return {
      call: async (_name, _args, signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("secret")), { once: true })),
      close: async () => { closes++; },
    };
  }, 20);
  const request = provider.inspect(input);
  await expect(provider.inspect(input)).rejects.toThrow("MEDIA_PROVIDER_BUSY");
  await expect(request).rejects.toThrow("MEDIA_PROVIDER_TIMEOUT");
  expect(closes).toBe(1);
  const retry = provider.inspect(input);
  const rejected = expect(retry).rejects.toThrow("MEDIA_PROVIDER_TIMEOUT");
  await new Promise(resolve => setTimeout(resolve, 1));
  await provider.close(); await rejected;
  expect(connects).toBe(2); expect(closes).toBe(2);
});