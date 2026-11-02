import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export const LAYOUT_PAGE = "stream-machine";
export const KEY_COUNT = 15;
const httpUrl = z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "HTTP(S) URL required");
export const deckAction = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("scene"), scene: z.string().min(1).max(200) }),
  z.strictObject({ type: z.literal("mic") }),
  z.strictObject({ type: z.literal("desktop-audio") }),
  z.strictObject({ type: z.literal("record") }),
  z.strictObject({ type: z.literal("stream") }),
  z.strictObject({ type: z.literal("url"), url: httpUrl }),
]);
export type DeckAction = z.infer<typeof deckAction>;
export type Rgb = [number, number, number];
export interface DeckButton { key: number; label: string; action: DeckAction; image?: string; color: Rgb }
export interface SceneTile { name: string; image?: string }

const colors = {
  scene: [42, 25, 100], mic: [150, 30, 40], "desktop-audio": [120, 60, 20], record: [110, 0, 0], stream: [200, 20, 60], url: [100, 65, 165],
} satisfies Record<DeckAction["type"], Rgb>;
const labels = { mic: "MIC", "desktop-audio": "DESK\nAUDIO", record: "REC", stream: "GO\nLIVE" } as const;

export function button(key: number, action: DeckAction, label?: string, image?: string): DeckButton {
  const fallback = action.type === "scene" ? action.scene : action.type === "url" ? new URL(action.url).hostname : labels[action.type];
  return { key, action, label: (label ?? fallback).slice(0, 24), image, color: [...colors[action.type]] };
}

export function streamerLayout(scenes: SceneTile[], channel?: string): DeckButton[] {
  const login = channel?.trim().toLowerCase();
  if (login && !/^[a-z0-9_]{1,25}$/.test(login)) throw new Error("Twitch channel login must be 1-25 letters, digits, or underscores");
  const buttons = scenes.slice(0, 5).map((scene, index) => button(index, { type: "scene", scene: scene.name }, scene.name, scene.image));
  buttons.push(
    button(5, { type: "mic" }), button(6, { type: "desktop-audio" }), button(8, { type: "record" }), button(9, { type: "stream" }),
    button(10, { type: "url", url: "https://dashboard.twitch.tv/stream-manager" }, "STREAM\nMGR"),
  );
  if (login) buttons.push(
    button(11, { type: "url", url: `https://www.twitch.tv/popout/${login}/chat?popout=` }, "CHAT"),
    button(12, { type: "url", url: `https://dashboard.twitch.tv/popout/u/${login}/stream-manager/activity-feed` }, "ACTIVITY"),
    button(14, { type: "url", url: `https://www.twitch.tv/${login}` }, "MY\nCHANNEL"),
  );
  return buttons;
}

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function openUrlCommand(url: string) {
  const normalized = httpUrl.parse(new URL(url).href);
  return `/usr/bin/open ${shellQuote(normalized)}`;
}

export function actionRunner(): string[] {
  const candidates = [join(dirname(resolve(process.argv[1] ?? ".")), "streamdeck-action.js"), resolve(import.meta.dir, "../../streamdeck-action.ts")];
  const script = candidates.find((path) => existsSync(path));
  if (!script) throw new Error("Stream Deck action runner missing; rebuild with mise run build");
  return [process.execPath, script];
}

export function actionCommand(action: DeckAction, runner: string[]) {
  if (action.type === "url") return openUrlCommand(action.url);
  const args = action.type === "scene" ? [...runner, "scene", action.scene] : [...runner, action.type];
  return args.map(shellQuote).join(" ");
}
