import { expect, test } from "bun:test";
import { version } from "../src/version";
import { createServer } from "../src/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

test("Commitizen, package, plugin, and MCP server share the product version", async () => {
  const config = Bun.TOML.parse(await Bun.file(resolve(root, ".cz.toml")).text());
  expect(config).toMatchObject({ tool: { commitizen: { version } } });
  for (const path of ["package.json", "plugin.json"]) {
    expect(await Bun.file(resolve(root, path)).json()).toMatchObject({ version });
  }
  const server = createServer("<html></html>");
  const client = new Client({ name: "version-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  try {
    await client.connect(clientTransport);
    expect(client.getServerVersion()).toMatchObject({ version });
  } finally {
    await client.close();
    await server.close();
  }
});

test("UI and preview clients import the shared version", async () => {
  for (const path of ["src/ui/app.ts", "src/preview-bridge.ts", "scripts/package-smoke.ts"]) {
    const source = await Bun.file(resolve(root, path)).text();
    expect(source).toContain('import { version } from ');
    expect(source).not.toMatch(/version: "\d+\.\d+\.\d+"/);
  }
});
