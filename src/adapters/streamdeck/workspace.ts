import { z } from "zod";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { UsbProvider, type DeckProvider, STREAMDECK_REVISION } from "./provider";

const devicesSchema = z.array(z.object({ serial: z.string(), deck_type: z.string(), key_count: z.number().int() }));
const buttonSchema = z.object({ key: z.number(), text: z.string().nullable(), action: z.string().nullable() });
export const buttonInput = z.strictObject({
  serial: z.string().min(1), key: z.number().int().min(0).max(14).default(0),
  url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "HTTP(S) URL required"),
});
export type ButtonInput = z.infer<typeof buttonInput>;
export function openUrlCommand(url: string) {
  const normalized = new URL(url).href;
  if (!["http:", "https:"].includes(new URL(normalized).protocol)) throw new Error("HTTP(S) URL required");
  return `/usr/bin/open '${normalized.replaceAll("'", "'\\''")}'`;
}

export class StreamDeckWorkspace {
  private pending: { id: string; expires: number; page: string; input: ButtonInput; action: string } | undefined;
  private busy = false;
  private connected = false;
  private ownedPage: string | undefined;
  constructor(private readonly provider: DeckProvider = new UsbProvider()) {}

  async inventory() {
    const devices = devicesSchema.parse(JSON.parse(await this.provider.call("streamdeck_list_devices")));
    return {
      provider: "streamdeck-mcp-usb", revision: STREAMDECK_REVISION,
      devices: [...new Map(devices.map((device) => [device.serial, device])).values()].map((device) => ({
        ...device, layout: device.deck_type === "Stream Deck Original" && device.key_count === 15 ? { rows: 3, columns: 5 } : null,
      })),
      nativeProfilesAvailable: existsSync(join(homedir(), "Library/Application Support/com.elgato.StreamDeck/ProfilesV3")),
      pages: await this.provider.call("streamdeck_list_pages"),
      note: "USB pages are separate from Elgato profiles. Inventory does not connect/reset the deck. No existing native action is claimed.",
    };
  }

  async preview(raw: unknown) {
    if (this.busy) throw new Error("Stream Deck operation busy");
    const input = buttonInput.parse(raw);
    const inventory = await this.inventory();
    if (!inventory.devices.some((device) => device.serial === input.serial && device.layout)) throw new Error("Selected Original 3×5 deck missing");
    const plan = { id: randomUUID(), expires: Date.now() + 300_000, page: `sm-demo-${randomUUID()}`, input, action: openUrlCommand(input.url) };
    this.pending = plan;
    return { ...plan, position: { row: Math.floor(input.key / 5) + 1, column: input.key % 5 + 1 }, label: "OPEN DEMO", writes: false,
      mode: "usb-test-page", ownership: "Apply claims USB and resets its display. Quit Elgato first. Keeper process must remain running for presses.",
      notice: "Fresh blank deck only. Does not edit Elgato profiles. Fixed native /usr/bin/open action; no generated script." };
  }

  async apply(previewId: string) {
    if (this.busy) throw new Error("Stream Deck operation busy");
    const plan = this.pending;
    if (!plan || plan.id !== previewId || plan.expires < Date.now()) throw new Error("Preview missing, expired, or already attempted");
    if (this.connected) throw new Error("Demo already owns USB; close before replacing demo");
    if (spawnSync("/usr/bin/pgrep", ["-x", "Stream Deck"]).status === 0) throw new Error("Quit Elgato Stream Deck before USB ownership");
    this.busy = true;
    this.pending = undefined;
    try {
      const inventory = await this.inventory();
      if (!inventory.devices.some((device) => device.serial === plan.input.serial && device.layout)) throw new Error("Selected deck missing");
      await this.provider.call("streamdeck_connect", { serial: plan.input.serial });
      this.connected = true;
      await this.provider.call("streamdeck_create_page", { name: plan.page });
      this.ownedPage = plan.page;
      await this.provider.call("streamdeck_switch_page", { name: plan.page });
      await this.provider.call("streamdeck_set_button", { key: plan.input.key, text: "OPEN\nDEMO", bg_color: [42, 25, 100], text_color: [255, 255, 255], font_size: 18, action: plan.action });
      const readback = buttonSchema.parse(JSON.parse(await this.provider.call("streamdeck_get_button", { key: plan.input.key })));
      if (readback.action !== plan.action || readback.text !== "OPEN\nDEMO") throw new Error("Button readback differs; inspect before retrying");
      return { page: plan.page, serial: plan.input.serial, button: readback, storedConfigurationVerified: true, physicalPressVerified: false,
        keeperRequired: true, url: plan.input.url };
    } finally {
      this.busy = false;
    }
  }

  async close() {
    try {
      if (this.ownedPage) {
        await this.provider.call("streamdeck_switch_page", { name: "main" });
        await this.provider.call("streamdeck_delete_page", { name: this.ownedPage });
        this.ownedPage = undefined;
      }
    } finally {
      if (this.connected) await this.provider.call("streamdeck_disconnect").catch(() => undefined);
      await this.provider.close();
      this.connected = false;
    }
  }
}
