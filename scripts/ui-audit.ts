import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Status = "used" | "partial" | "missing";
interface Row { id: string; status: Status; evidence: string }
type Meta = Record<string, unknown> | undefined;

const root = resolve(import.meta.dir, "..");
const args = process.argv.slice(2);
const json = args.includes("--json");
const serverPath = args.find(arg => !arg.startsWith("--")) ?? resolve(root, "dist/server.js");
const rows: Row[] = [];
const add = (id: string, status: Status, evidence: string) => rows.push({ id, status, evidence });
const obj = (value: unknown): Record<string, unknown> | undefined => (value && typeof value === "object" ? value as Record<string, unknown> : undefined);
const names = (list: string[]) => (list.length ? list.slice(0, 3).join(", ") + (list.length > 3 ? `, +${list.length - 3}` : "") : "none");

function walk(dir: string, accept: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path, accept) : accept(path) ? [path] : [];
  });
}

const client = new Client({ name: "stream-machine-ui-audit", version: "0.1.0" });
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: dirname(serverPath), stderr: "pipe" });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const { resources } = await client.listResources();
  const contents = await Promise.all(resources.map(resource => client.readResource({ uri: resource.uri })));
  const resourceMeta = contents.flatMap(result => result.contents.map(item => obj(item._meta)));
  const capabilities = obj(client.getServerCapabilities());
  const serverInfo = obj(client.getServerVersion());
  const sources = walk(resolve(root, "src"), file => /\.(ts|css|html)$/.test(file) && !file.endsWith(".test.ts")).map(file => readFileSync(file, "utf8"));
  const uiSource = walk(resolve(root, "src/ui"), file => /\.(ts|css|html)$/.test(file)).map(file => readFileSync(file, "utf8")).join("\n");
  const ui = uiSource; // built HTML bundles SDK code that mentions every API, so scan app sources only
  const plugin = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8")) as Record<string, unknown>;
  const openai = obj(obj(plugin.extensions)?.["com.openai"]);

  const ep = (meta: Meta) => (Array.isArray(obj(meta?.["openai/ui"])?.entrypoints) ? obj(meta?.["openai/ui"])!.entrypoints as { type?: string }[] : []);
  const byType = (type: string) => tools.filter(tool => ep(tool._meta).some(entry => entry.type === type)).map(tool => tool.name);
  for (const type of ["global", "thread", "file"]) {
    const found = byType(type);
    add(`${type}-entrypoint`, found.length ? "used" : "missing", found.length ? `_meta["openai/ui"].entrypoints type=${type}: ${names(found)}` : `no tool declares a ${type} entrypoint`);
  }

  const withIcons = tools.filter(tool => Array.isArray(tool.icons) && tool.icons.length).map(tool => tool.name);
  const serverIcons = Array.isArray(serverInfo?.icons) && serverInfo.icons.length > 0;
  const pluginIcons = [obj(plugin.interface), obj(openai?.interface)].flatMap(item => Object.keys(item ?? {})).filter(key => /icon|logo/i.test(key));
  add("entrypoint-icons", withIcons.length || serverIcons ? "used" : pluginIcons.length ? "partial" : "missing",
    `tool icons: ${names(withIcons)}; serverInfo icons: ${serverIcons ? "yes" : "no"}; plugin.json icon keys: ${names(pluginIcons)}`);

  const titled = tools.filter(tool => tool.title || tool.annotations?.title);
  add("tool-titles", titled.length === tools.length ? "used" : titled.length ? "partial" : "missing", `${titled.length}/${tools.length} tools have title or annotations.title`);

  const settingsCap = obj([obj(capabilities?.extensions)?.["openai/settings"], obj(capabilities?.experimental)?.["openai/settings"]].find(Boolean));
  const settingsTools = tools.filter(tool => tool.name === settingsCap?.readTool || tool.name === settingsCap?.updateTool || /settings/.test(tool.name)).map(tool => tool.name);
  add("settings", settingsCap ? "used" : settingsTools.length ? "partial" : "missing",
    settingsCap ? `capability openai/settings ${JSON.stringify(settingsCap)}` : settingsTools.length ? `settings-like tools without openai/settings capability: ${names(settingsTools)}` : "no openai/settings capability and no settings tools");

  const mentionsCap = obj([obj(capabilities?.extensions)?.["openai/mentions"], obj(capabilities?.experimental)?.["openai/mentions"]].find(Boolean));
  const mentionTool = tools.find(tool => tool.name === mentionsCap?.searchTool);
  add("mentions", mentionsCap && mentionTool ? "used" : mentionsCap || mentionTool ? "partial" : "missing",
    `capability openai/mentions: ${mentionsCap ? JSON.stringify(mentionsCap) : "absent"}; search tool: ${mentionTool?.name ?? "absent"}`);

  const modes = resourceMeta.map(meta => obj(meta?.["openai/ui"])).find(Boolean);
  const available = Array.isArray(modes?.availableDisplayModes) ? modes.availableDisplayModes as string[] : [];
  const requests = /requestDisplayMode/.test(ui);
  add("display-modes", available.length && requests ? "used" : available.length || requests ? "partial" : "missing",
    `resource preferred=${String(modes?.preferredDisplayMode ?? "none")} available=[${available.join(", ")}]; requestDisplayMode in UI (static): ${requests ? "yes" : "no"}`);

  const skillRel = typeof openai?.onboardingSkill === "string" ? openai.onboardingSkill : undefined;
  const skillOk = skillRel !== undefined && existsSync(resolve(root, skillRel));
  add("onboarding-skill", skillOk ? "used" : skillRel ? "partial" : "missing", skillRel ? `plugin.json onboardingSkill=${skillRel}; file ${skillOk ? "exists" : "not found"}` : "plugin.json has no onboardingSkill");

  const mcUpdate = /modelContext\??\.update\(/.test(ui);
  const rich = /modelContext[\s\S]{0,400}?\bcontent\s*:|modelContext[\s\S]{0,400}?\btitle\s*:/.test(ui);
  add("model-context", mcUpdate && rich ? "used" : mcUpdate ? "partial" : "missing",
    `modelContext.update (static): ${mcUpdate ? "found" : "absent"}; ${rich ? "sends content/titles" : "structuredContent only"}`);
  add("send-message", /sendMessage|extensions\.message|\.message\.send/.test(ui) ? "used" : "missing", "sendMessage in UI (static)");
  add("deep-link", /openai\/deepLink|deepLink/.test(ui) ? "used" : "missing", "openai/deepLink in UI (static)");

  const elicit = sources.some(code => /elicit(Input|Form|ation)|requestFormInput/i.test(code));
  add("form-elicitation", elicit ? "used" : "missing", `elicitation calls in src/ (static): ${elicit ? "found" : "absent"}`);

  const varsApplied = /styles\??\.variables/.test(ui);
  const stylesheet = /mcp-extensions\/app\/styles\.css|mcp-extensions[^"']*styles\.css/.test(uiSource);
  add("host-styles", stylesheet ? "used" : varsApplied ? "partial" : "missing",
    `host variables copied to <html>: ${varsApplied ? "yes" : "no"}; app styles.css imported: ${stylesheet ? "yes" : "no"} (static)`);

  const csp = resourceMeta.map(meta => obj(obj(meta?.ui)?.csp)).find(Boolean);
  const domains = csp ? Object.values(csp).reduce((sum: number, list) => sum + (Array.isArray(list) ? list.length : 0), 0) : 0;
  add("csp", csp ? "used" : "missing", csp ? `resource _meta.ui.csp declared with ${domains} allowed domain(s)` : "no _meta.ui.csp on UI resource");
} finally {
  await client.close().catch(() => undefined);
}

const count = (status: Status) => rows.filter(row => row.status === status).length;
const summary = `${count("used")} used, ${count("partial")} partial, ${count("missing")} missing`;
if (json) console.log(JSON.stringify({ features: rows, summary: { used: count("used"), partial: count("partial"), missing: count("missing") } }, null, 2));
else console.log(["| Feature | Status | Evidence |", "|---|---|---|", ...rows.map(row => `| ${row.id} | ${row.status} | ${row.evidence.replaceAll("|", "\\|")} |`), "", summary].join("\n"));
