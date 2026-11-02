import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import { verifyServer } from "./desktop-smoke";
import { version } from "../src/version";

const root = resolve(process.argv[2] ?? "artifacts/package/stream-machine");
const manifest = await Bun.file(`${root}/plugin.json`).json();
const legacy = await Bun.file(`${root}/.codex-plugin/plugin.json`).json();
assert.equal(manifest.version, legacy.version);
assert.equal(manifest.version, version);
assert.deepEqual(manifest.extensions["com.openai"].interface.defaultPrompt, legacy.interface.defaultPrompt);
const config = await Bun.file(`${root}/mcp.json`).json();
const legacyConfig = await Bun.file(`${root}/.mcp.json`).json();
assert.deepEqual(config.mcpServers, legacyConfig.mcpServers);
for (const [id, file, kind] of [["stream-machine-obs", "obs-server.js", "obs"], ["stream-machine-desktop", "server.js", "desktop"]] as const) {
  assert.deepEqual(config.mcpServers[id], { type: "stdio", command: "bun", args: ["${PLUGIN_ROOT}/dist/" + file], cwd: "${PLUGIN_ROOT}" });
  await verifyServer(`${root}/dist/${file}`, kind);
}
