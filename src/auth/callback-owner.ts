import { dirname, join } from "node:path";

async function output(command: string[]): Promise<string> {
  const child = Bun.spawn(command, { stdin: "ignore", stdout: "pipe", stderr: "ignore" });
  const [text, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  return code === 0 ? text : "";
}

export async function findPluginListener(port: number): Promise<number | null> {
  if (process.platform !== "darwin" && process.platform !== "linux") return null;
  try {
    const pids = [...new Set((await output(["lsof", "-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"])).split("\n").filter(Boolean))];
    if (pids.length !== 1) return null;
    const pid = Number(pids[0]);
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return null;
    const cwd = (await output(["lsof", "-a", "-p", String(pid), "-d", "cwd", "-Fn"])).split("\n").find(line => line.startsWith("n"))?.slice(1);
    const args = (await output(["ps", "-ww", "-o", "args=", "-p", String(pid)])).trim();
    if (!cwd || !args) return null;
    for (const root of [cwd, dirname(cwd)]) {
      if (!args.endsWith(` ${join(root, "dist/server.js")}`)) continue;
      const manifest: unknown = await Bun.file(join(root, "plugin.json")).json().catch(() => null);
      if (manifest && typeof manifest === "object" && "name" in manifest && manifest.name === "stream-machine") return pid;
    }
  } catch { }
  return null;
}
