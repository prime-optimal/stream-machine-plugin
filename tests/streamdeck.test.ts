import { describe, test, expect } from "bun:test";
import { StreamDeckWorkspace, openUrlCommand } from "../src/adapters/streamdeck/workspace";
import type { DeckProvider } from "../src/adapters/streamdeck/provider";
import { streamDeckResult } from "../src/adapters/streamdeck/register";

class Provider implements DeckProvider {
  calls: string[] = [];
  button: Record<string, unknown> = {};
  async call(name: string, args: Record<string, unknown> = {}) {
    this.calls.push(name);
    if (name === "streamdeck_list_devices") return JSON.stringify([{ serial: "test", deck_type: "Stream Deck Original", key_count: 15 }]);
    if (name === "streamdeck_list_pages") return "main";
    if (name === "streamdeck_set_button") this.button = args;
    if (name === "streamdeck_get_button") return JSON.stringify(this.button);
    return "ok";
  }
  async close() {}
}

describe("Stream Deck demo", () => {
  test("provider errors include structured message for UI", async () => {
    const result = await streamDeckResult(async () => { throw new Error("Missing libhidapi.dylib"); });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error?.message).toBe("Missing libhidapi.dylib");
  });
  test("preview reads only, bounds position, validates URL", async () => {
    const provider = new Provider();
    const workspace = new StreamDeckWorkspace(provider);
    const preview = await workspace.preview({ serial: "test", key: 14, url: "https://example.com" });
    expect(preview.position).toEqual({ row: 3, column: 5 });
    expect(provider.calls).toEqual(["streamdeck_list_devices", "streamdeck_list_pages"]);
    await expect(workspace.preview({ serial: "test", key: 15, url: "https://example.com" })).rejects.toThrow();
    await expect(workspace.preview({ serial: "test", url: "file:///etc/passwd" })).rejects.toThrow();
  });
  test("apply writes one dedicated page, verifies action, cannot repeat", async () => {
    const provider = new Provider();
    const workspace = new StreamDeckWorkspace(provider);
    const preview = await workspace.preview({ serial: "test", url: "https://example.com" });
    const result = await workspace.apply(preview.id);
    expect(result.storedConfigurationVerified).toBe(true);
    expect(result.physicalPressVerified).toBe(false);
    expect(provider.calls.filter((name) => name === "streamdeck_set_button")).toHaveLength(1);
    await expect(workspace.apply(preview.id)).rejects.toThrow();
    expect(provider.calls.filter((name) => name === "streamdeck_set_button")).toHaveLength(1);
    await workspace.close();
    expect(provider.calls.at(-1)).toBe("streamdeck_disconnect");
  });
  test("URL stays one argv item; shell metacharacters cannot introduce command", () => {
    expect(openUrlCommand("https://example.com/$(touch%20/tmp/nope)?q='hello'"))
      .toBe("/usr/bin/open 'https://example.com/$(touch%20/tmp/nope)?q=%27hello%27'");
    expect(() => openUrlCommand("javascript:alert(1)")).toThrow();
  });
});
