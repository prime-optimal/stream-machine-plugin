import { mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { alertTemplate } from "./template";

export const alertTextSchema = z.string().trim().min(1).refine(text => [...text].length <= 64, "Maximum 64 Unicode codepoints");
export const obsAlertSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("play"), text: alertTextSchema }).strict(),
  z.object({ action: z.literal("replay") }).strict(),
]);
export type ObsAlertInput = z.infer<typeof obsAlertSchema>;
export function obsDataDirectory() {
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Stream Machine", "obs");
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Stream Machine", "obs");
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "stream-machine", "obs");
}
export function renderAlert(text: string) {
  const validated = alertTextSchema.parse(text);
  const payload = JSON.stringify({ type: "follow", displayName: validated }).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  const startup = "<script>document.fonts.ready.then(()=>StreamAlert.play(" + payload + "));</script>";
  return alertTemplate.replace("</body>", startup + "</body>");
}
export async function installAlert(text: string) {
  const directory = obsDataDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "alert.html");
  const temporary = join(directory, crypto.randomUUID() + ".html");
  await Bun.write(temporary, renderAlert(text), { mode: 0o600 });
  await rename(temporary, path);
  return path;
}
