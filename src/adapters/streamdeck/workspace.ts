import { z } from "zod";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { UsbProvider, type DeckProvider, STREAMDECK_REVISION } from "./provider";
import { KEY_COUNT, LAYOUT_PAGE, actionCommand, actionRunner, button, deckAction, streamerLayout, type DeckButton } from "./layout";
import { obsScenes, type SceneReader } from "./obs-scenes";

const devicesSchema = z.array(z.object({ serial: z.string(), deck_type: z.string(), key_count: z.number().int() }));
const buttonSchema = z.object({ key: z.number(), text: z.string().nullable(), action: z.string().nullable() });
const key = z.number().int().min(0).max(KEY_COUNT - 1);
export const layoutInput = z.strictObject({
  serial: z.string().min(1),
  channel: z.string().min(1).max(25).optional().describe("Twitch login for chat, activity, and channel buttons"),
  scenes: z.array(z.string().min(1).max(200)).min(1).max(5).optional().describe("OBS scene names for the top row, in order. Default: the first 5 scenes in OBS order"),
});
export const buttonInput = z.strictObject({ key, label: z.string().min(1).max(24).optional(), action: deckAction });
export const clearInput = z.strictObject({ key });
export const releaseInput = z.strictObject({ deleteLayout: z.boolean().default(false) });

interface Plan { id: string; expires: number; serial: string; buttons: DeckButton[]; commands: string[] }

export class StreamDeckWorkspace {
  private pending: Plan | undefined;
  private busy = false;
  private serial: string | undefined;
  private applied = false;
  constructor(
    private readonly provider: DeckProvider = new UsbProvider(),
    private readonly scenes: SceneReader = obsScenes,
    private readonly runner: () => string[] = actionRunner,
  ) { }

  async inventory() {
    const devices = devicesSchema.parse(JSON.parse(await this.provider.call("streamdeck_list_devices")));
    return {
      provider: "streamdeck-mcp-usb", revision: STREAMDECK_REVISION,
      devices: [...new Map(devices.map((device) => [device.serial, device])).values()].map((device) => ({
        ...device, layout: device.deck_type === "Stream Deck Original" && device.key_count === KEY_COUNT ? { rows: 3, columns: 5 } : null,
      })),
      nativeProfilesAvailable: existsSync(join(homedir(), "Library/Application Support/com.elgato.StreamDeck/ProfilesV3")),
      pages: await this.provider.call("streamdeck_list_pages"),
      layoutApplied: this.applied,
      note: "USB pages are separate from Elgato profiles. Inventory does not connect/reset the deck.",
    };
  }

  async previewLayout(raw: unknown) {
    const input = layoutInput.parse(raw);
    await this.requireDeck(input.serial);
    const obs = await this.scenes.scenes(5, input.scenes);
    if (!obs.scenes.length) throw new Error("OBS has no scenes to place on the deck");
    const buttons = streamerLayout(obs.scenes, input.channel);
    const runner = this.runner();
    const plan: Plan = { id: randomUUID(), expires: Date.now() + 300_000, serial: input.serial, buttons, commands: buttons.map((item) => actionCommand(item.action, runner)) };
    this.pending = plan;
    return {
      previewId: plan.id, expiresAt: new Date(plan.expires).toISOString(), page: LAYOUT_PAGE, currentObsScene: obs.current,
      grid: buttons.map((item) => ({ key: item.key, row: Math.floor(item.key / 5) + 1, column: item.key % 5 + 1, label: item.label, action: item.action, thumbnail: item.image ?? null })),
      deckWrites: false,
      notice: "Apply claims the USB deck and replaces its display. Quit the Elgato Stream Deck app first. Keep this server running so presses reach OBS. GO LIVE toggles streaming in OBS.",
    };
  }

  async applyLayout(previewId: string) {
    const plan = this.pending;
    if (!plan || plan.id !== previewId || plan.expires < Date.now()) throw new Error("Preview missing, expired, or already attempted");
    this.pending = undefined;
    return this.exclusive(async () => {
      await this.requireDeck(plan.serial);
      if (this.serial && this.serial !== plan.serial) throw new Error("Another deck is claimed; release it first");
      if (!this.serial) {
        if (spawnSync("/usr/bin/pgrep", ["-x", "Stream Deck"]).status === 0) throw new Error("Quit Elgato Stream Deck before USB ownership");
        await this.provider.call("streamdeck_connect", { serial: plan.serial });
        this.serial = plan.serial;
      }
      const pages = (await this.provider.call("streamdeck_list_pages")).split("\n").map((line) => line.replace(/^\W+/u, "").trim());
      if (!pages.includes(LAYOUT_PAGE)) await this.provider.call("streamdeck_create_page", { name: LAYOUT_PAGE });
      await this.provider.call("streamdeck_switch_page", { name: LAYOUT_PAGE });
      this.applied = true;
      await this.provider.call("streamdeck_clear_all");
      await this.provider.call("streamdeck_set_buttons", { buttons: plan.buttons.map((item, index) => this.providerButton(item, plan.commands[index]!)) });
      const verified = [];
      for (const [index, item] of plan.buttons.entries()) verified.push(await this.readback(item, plan.commands[index]!));
      return { page: LAYOUT_PAGE, serial: plan.serial, buttons: verified, storedConfigurationVerified: true, physicalPressVerified: false, keeperRequired: true };
    });
  }

  async updateButton(raw: unknown) {
    const input = buttonInput.parse(raw);
    return this.exclusive(async () => {
      this.requireApplied();
      const image = input.action.type === "scene" ? await this.scenes.thumbnail(input.action.scene).catch(() => undefined) : undefined;
      const item = button(input.key, input.action, input.label, image);
      const command = actionCommand(item.action, this.runner());
      await this.provider.call("streamdeck_clear_button", { key: item.key });
      await this.provider.call("streamdeck_set_button", this.providerButton(item, command));
      return { page: LAYOUT_PAGE, button: await this.readback(item, command), physicalPressVerified: false };
    });
  }

  async clearButton(raw: unknown) {
    const input = clearInput.parse(raw);
    return this.exclusive(async () => {
      this.requireApplied();
      await this.provider.call("streamdeck_clear_button", { key: input.key });
      const readback = buttonSchema.parse({ text: null, action: null, ...JSON.parse(await this.provider.call("streamdeck_get_button", { key: input.key })) });
      if (readback.text || readback.action) throw new Error("Button still configured after clear; inspect before retrying");
      return { page: LAYOUT_PAGE, key: input.key, cleared: true };
    });
  }

  async release(raw: unknown = {}) {
    const input = releaseInput.parse(raw);
    await this.close(input.deleteLayout);
    return { released: true, layoutDeleted: input.deleteLayout };
  }

  async close(deleteLayout = false) {
    try {
      if (this.serial && this.applied && deleteLayout) {
        await this.provider.call("streamdeck_switch_page", { name: "main" });
        await this.provider.call("streamdeck_delete_page", { name: LAYOUT_PAGE });
      }
    } finally {
      if (this.serial) await this.provider.call("streamdeck_disconnect").catch(() => undefined);
      await this.provider.close();
      this.serial = undefined;
      this.applied = false;
      this.pending = undefined;
    }
  }

  private async requireDeck(serial: string) {
    const inventory = await this.inventory();
    if (!inventory.devices.some((device) => device.serial === serial && device.layout)) throw new Error("Selected Original 3×5 deck missing");
  }

  private requireApplied() {
    if (!this.serial || !this.applied) throw new Error("Apply a layout first; this server does not own the deck");
  }

  private async exclusive<T>(run: () => Promise<T>) {
    if (this.busy) throw new Error("Stream Deck operation busy");
    this.busy = true;
    try { return await run(); } finally { this.busy = false; }
  }

  private providerButton(item: DeckButton, command: string) {
    return { key: item.key, text: item.label, ...(item.image ? { image_path: item.image } : {}), bg_color: item.color, text_color: [255, 255, 255], font_size: 16, action: command };
  }

  private async readback(item: DeckButton, command: string) {
    const readback = buttonSchema.parse(JSON.parse(await this.provider.call("streamdeck_get_button", { key: item.key })));
    if (readback.action !== command || readback.text !== item.label) throw new Error(`Button ${item.key} read-back differs; inspect before retrying`);
    return { key: item.key, label: item.label, action: item.action, thumbnail: item.image ?? null };
  }
}
