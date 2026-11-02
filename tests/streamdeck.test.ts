import { describe, test, expect } from "bun:test";
import { StreamDeckWorkspace } from "../src/adapters/streamdeck/workspace";
import { actionCommand, openUrlCommand, streamerLayout } from "../src/adapters/streamdeck/layout";
import type { DeckProvider } from "../src/adapters/streamdeck/provider";
import type { SceneReader } from "../src/adapters/streamdeck/obs-scenes";
import { streamDeckResult } from "../src/adapters/streamdeck/register";

class Provider implements DeckProvider {
  calls: string[] = [];
  pages = ["main"];
  current = "main";
  buttons = new Map<string, Map<number, Record<string, unknown>>>();
  tamper = false;
  private page() { if (!this.buttons.has(this.current)) this.buttons.set(this.current, new Map()); return this.buttons.get(this.current)!; }
  async call(name: string, args: Record<string, unknown> = {}) {
    this.calls.push(name);
    if (name === "streamdeck_list_devices") return JSON.stringify([{ serial: "test", deck_type: "Stream Deck Original", key_count: 15 }]);
    if (name === "streamdeck_list_pages") return this.pages.map((page) => `${page === this.current ? "→ " : "  "}${page}`).join("\n");
    if (name === "streamdeck_create_page") this.pages.push(String(args.name));
    if (name === "streamdeck_switch_page") this.current = String(args.name);
    if (name === "streamdeck_delete_page") this.pages = this.pages.filter((page) => page !== args.name);
    if (name === "streamdeck_clear_all") this.page().clear();
    if (name === "streamdeck_clear_button") this.page().delete(Number(args.key));
    if (name === "streamdeck_set_button") this.page().set(Number(args.key), args);
    if (name === "streamdeck_set_buttons") for (const item of args.buttons as Record<string, unknown>[]) this.page().set(Number(item.key), item);
    if (name === "streamdeck_get_button") {
      const stored = this.page().get(Number(args.key)) ?? {};
      return JSON.stringify({ key: args.key, text: stored.text ?? null, action: this.tamper ? "/bin/sh" : stored.action ?? null });
    }
    return "ok";
  }
  async close() { }
}

const scenes: SceneReader = {
  scenes: async () => ({ current: "Show - Starting", scenes: [{ name: "Show - Starting" }, { name: "Show - Be Right Back" }, { name: "Show - Live" }] }),
};
const runner = () => ["/bin/bun", "/plugin/dist/streamdeck-action.js"];
const workspace = (provider = new Provider()) => ({ provider, deck: new StreamDeckWorkspace(provider, scenes, runner) });

describe("Stream Deck layout", () => {
  test("provider errors include structured message for UI", async () => {
    const result = await streamDeckResult(async () => { throw new Error("Missing libhidapi.dylib"); });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error?.message).toBe("Missing libhidapi.dylib");
  });

  test("streamer layout maps OBS scenes to the top row and keeps GO LIVE away from MIC", () => {
    const buttons = streamerLayout([{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }, { name: "F" }], "Prime_Optimal");
    expect(buttons.filter((item) => item.action.type === "scene").map((item) => item.key)).toEqual([0, 1, 2, 3, 4]);
    expect(buttons.find((item) => item.action.type === "mic")?.key).toBe(5);
    expect(buttons.find((item) => item.action.type === "stream")?.key).toBe(9);
    expect(buttons.find((item) => item.label === "CHAT")?.action).toEqual({ type: "url", url: "https://www.twitch.tv/popout/prime_optimal/chat?popout=" });
    expect(new Set(buttons.map((item) => item.key)).size).toBe(buttons.length);
    expect(streamerLayout([{ name: "A" }]).some((item) => item.label === "CHAT")).toBe(false);
    expect(() => streamerLayout([{ name: "A" }], "x/../y")).toThrow();
  });

  test("preview reads devices and OBS only; no deck writes", async () => {
    const { provider, deck } = workspace();
    const preview = await deck.previewLayout({ serial: "test" });
    expect(preview.grid.slice(0, 3).map((item) => [item.key, item.label])).toEqual([[0, "STARTING"], [1, "BE RIGHT\nBACK"], [2, "LIVE"]]);
    expect(provider.calls).toEqual(["streamdeck_list_devices", "streamdeck_list_pages"]);
    await expect(deck.previewLayout({ serial: "missing" })).rejects.toThrow("deck missing");
  });

  test("apply writes the layout page, verifies every button, and consumes the preview", async () => {
    const { provider, deck } = workspace();
    const preview = await deck.previewLayout({ serial: "test" });
    const result = await deck.applyLayout(preview.previewId);
    expect(result.buttons).toHaveLength(preview.grid.length);
    expect(provider.current).toBe("stream-machine");
    expect(provider.buttons.get("stream-machine")?.get(0)).toEqual(expect.objectContaining({
      text: "STARTING",
      action: "'/bin/bun' '/plugin/dist/streamdeck-action.js' 'scene' 'Show - Starting'"
    }));
    expect(provider.buttons.get("stream-machine")?.get(0)).not.toHaveProperty("image_path");
    await expect(deck.applyLayout(preview.previewId)).rejects.toThrow("already attempted");
  });

  test("reapplying reuses the page and clears stale buttons", async () => {
    const { provider, deck } = workspace();
    await deck.applyLayout((await deck.previewLayout({ serial: "test" })).previewId);
    await deck.updateButton({ key: 7, action: { type: "url", url: "https://example.com" } });
    await deck.applyLayout((await deck.previewLayout({ serial: "test" })).previewId);
    expect(provider.pages.filter((page) => page === "stream-machine")).toHaveLength(1);
    expect(provider.buttons.get("stream-machine")?.has(7)).toBe(false);
    expect(provider.calls.filter((name) => name === "streamdeck_connect")).toHaveLength(1);
  });

  test("read-back mismatch fails apply", async () => {
    const { provider, deck } = workspace();
    const preview = await deck.previewLayout({ serial: "test" });
    provider.tamper = true;
    await expect(deck.applyLayout(preview.previewId)).rejects.toThrow("read-back differs");
  });

  test("button edits require an applied layout, then update and clear one key", async () => {
    const { provider, deck } = workspace();
    await expect(deck.updateButton({ key: 3, action: { type: "record" } })).rejects.toThrow("Apply a layout first");
    await deck.applyLayout((await deck.previewLayout({ serial: "test" })).previewId);
    const updated = await deck.updateButton({ key: 3, label: "BRB", action: { type: "scene", scene: "Be Right Back" } });
    expect(updated.button).toEqual({ key: 3, label: "BRB", action: { type: "scene", scene: "Be Right Back" } });
    expect(provider.buttons.get("stream-machine")?.get(3)?.action).toBe("'/bin/bun' '/plugin/dist/streamdeck-action.js' 'scene' 'Be Right Back'");
    await deck.clearButton({ key: 3 });
    expect(provider.buttons.get("stream-machine")?.has(3)).toBe(false);
    await expect(deck.updateButton({ key: 15, action: { type: "record" } })).rejects.toThrow();
  });

  test("release keeps the layout unless deleteLayout; always disconnects", async () => {
    const { provider, deck } = workspace();
    await deck.applyLayout((await deck.previewLayout({ serial: "test" })).previewId);
    await deck.release({});
    expect(provider.pages).toContain("stream-machine");
    expect(provider.calls.at(-1)).toBe("streamdeck_disconnect");
    await deck.applyLayout((await deck.previewLayout({ serial: "test" })).previewId);
    await deck.release({ deleteLayout: true });
    expect(provider.pages).toEqual(["main"]);
    await expect(deck.clearButton({ key: 0 })).rejects.toThrow("Apply a layout first");
  });

  test("commands keep scene names and URLs as single argv items", () => {
    expect(actionCommand({ type: "scene", scene: "It's $(rm -rf ~)" }, ["bun", "a.js"])).toBe("'bun' 'a.js' 'scene' 'It'\\''s $(rm -rf ~)'");
    expect(openUrlCommand("https://example.com/$(touch%20/tmp/nope)?q='hello'"))
      .toBe("/usr/bin/open 'https://example.com/$(touch%20/tmp/nope)?q=%27hello%27'");
    expect(() => openUrlCommand("javascript:alert(1)")).toThrow();
  });
});
