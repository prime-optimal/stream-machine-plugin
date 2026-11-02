import { TwitchFault } from "./twitch";

type BrowserCommand = (command: string[], signal: AbortSignal) => Promise<number>;

async function runCommand(command: string[], signal: AbortSignal): Promise<number> {
  const child = Bun.spawn(command, { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  const abort = () => { child.kill(); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (signal.aborted) abort();
    return await child.exited;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export function createDesktopBrowserLauncher(platform: string, run: BrowserCommand, timeoutMs = 10_000) {
  return async (value: string): Promise<void> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const url = new URL(value);
      if (url.href !== "http://localhost:4017/connect" || url.username || url.password || url.search || url.hash) {
        throw new Error("Invalid authorization address");
      }
      let command: string[];
      if (platform === "darwin") command = ["open", url.href];
      else if (platform === "linux") command = ["xdg-open", url.href];
      else if (platform === "win32") command = ["rundll32.exe", "url.dll,FileProtocolHandler", url.href];
      else throw new Error("Unsupported desktop platform");
      const controller = new AbortController();
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Browser request timed out")); }, timeoutMs);
      });
      if (await Promise.race([run(command, controller.signal), timeout]) !== 0) throw new Error("Browser request failed");
    } catch {
      throw new TwitchFault("TWITCH_BROWSER_OPEN_FAILED");
    } finally {
      clearTimeout(timer);
    }
  };
}

export const openDesktopBrowser = createDesktopBrowserLauncher(process.platform, runCommand);
