import { describe, expect, test } from "bun:test";
import { createDesktopBrowserLauncher } from "../src/auth/desktop-browser";
import { TwitchFault } from "../src/auth/twitch";

const url = "http://localhost:4017/connect";

describe("desktop Twitch authorization browser", () => {
  test("uses the platform launcher once with the fixed URL and no shell", async () => {
    const cases = [
      { platform: "darwin", command: ["open", url] },
      { platform: "linux", command: ["xdg-open", url] },
      { platform: "win32", command: ["rundll32.exe", "url.dll,FileProtocolHandler", url] },
    ];
    for (const { platform, command } of cases) {
      const calls: string[][] = [];
      const open = createDesktopBrowserLauncher(platform, async args => { calls.push(args); return 0; });
      await open(url);
      expect(calls).toEqual([command]);
    }
  });

  test("rejects arbitrary addresses before invoking a command", async () => {
    let calls = 0;
    const open = createDesktopBrowserLauncher("darwin", async () => { calls++; return 0; });
    for (const value of [
      "javascript:alert(1)", "https://example.com/connect", "http://127.0.0.1:4017/connect",
      "http://localhost:4018/connect", "http://localhost:4017/approve",
      "http://owner:password@localhost:4017/connect", url + "?next=other", url + "#token",
    ]) await expect(open(value)).rejects.toThrow("TWITCH_BROWSER_OPEN_FAILED");
    expect(calls).toBe(0);
  });

  test("sanitizes launch failures and never retries", async () => {
    for (const outcome of ["exit", "throw"]) {
      let calls = 0;
      const open = createDesktopBrowserLauncher("darwin", async () => {
        calls++;
        if (outcome === "throw") throw new Error("PRIVATE_PROCESS_SENTINEL");
        return 1;
      });
      try { await open(url); throw new Error("Expected launch failure"); }
      catch (error) {
        expect(error).toBeInstanceOf(TwitchFault);
        expect(String(error)).toBe("Error: TWITCH_BROWSER_OPEN_FAILED");
        expect(String(error)).not.toContain("PRIVATE_PROCESS_SENTINEL");
      }
      expect(calls).toBe(1);
    }
  });

  test("rejects unsupported systems without starting a process", async () => {
    let calls = 0;
    const open = createDesktopBrowserLauncher("unsupported", async () => { calls++; return 0; });
    await expect(open(url)).rejects.toThrow("TWITCH_BROWSER_OPEN_FAILED");
    expect(calls).toBe(0);
  });

  test("bounds a stalled launcher and aborts it without retrying", async () => {
    let calls = 0;
    let signal: AbortSignal | undefined;
    const open = createDesktopBrowserLauncher("darwin", async (_args, cancellation) => {
      calls++; signal = cancellation; return new Promise<number>(() => {});
    }, 10);
    await expect(open(url)).rejects.toThrow("TWITCH_BROWSER_OPEN_FAILED");
    expect(calls).toBe(1);
    expect(signal?.aborted).toBe(true);
  });
});
