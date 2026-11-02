import { App } from "@modelcontextprotocol/ext-apps";
import { z } from "zod";
import { version } from "../version";

const app = new App({ name: "Stream Machine creative", version });
const root = document.querySelector<HTMLElement>("#app")!;
root.innerHTML = `<h1>Stream graphics</h1><p>Create editable HTML overlays and brand kits with OpenDesign. Desktop workspace; generation writes to OpenDesign, not Twitch or OBS.</p><div class="actions"><button id="refresh" disabled>Refresh projects</button></div><label>New project name<input id="project-name" maxlength="100" value="My stream graphics"></label><button id="create" disabled>Create project</button><label>Project<select id="project"></select></label><label>Recipe<select id="recipe"><option value="hyperframes-html">Editable HTML overlay</option><option value="overlay">Static overlay</option><option value="brand-kit">Brand kit</option></select></label><label>Overlay heading<input id="title" maxlength="48" value="WEEKEND / STUDIO"></label><label id="brief-label" hidden>Brand brief<textarea id="brief" maxlength="4000"></textarea></label><div class="actions"><button id="start" disabled>Start generation</button><button id="retry" hidden>Retry same request</button><button id="poll" disabled>Check status</button><button id="artifact" disabled>Read artifact</button><button id="new" disabled>New request</button></div><p id="status" role="status" aria-live="polite">Connecting to creative server…</p><pre id="output" hidden></pre>`;
const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
const project = get<HTMLSelectElement>("project"), recipe = get<HTMLSelectElement>("recipe"), title = get<HTMLInputElement>("title"), brief = get<HTMLTextAreaElement>("brief");
const refresh = get<HTMLButtonElement>("refresh"), start = get<HTMLButtonElement>("start"), retry = get<HTMLButtonElement>("retry"), poll = get<HTMLButtonElement>("poll"), artifact = get<HTMLButtonElement>("artifact"), reset = get<HTMLButtonElement>("new");
const create = get<HTMLButtonElement>("create"), projectName = get<HTMLInputElement>("project-name");
const status = get<HTMLElement>("status"), output = get<HTMLElement>("output");
const envelope = z.object({ mode: z.literal("live"), result: z.unknown() });
const operationSchema = z.object({ requestId: z.string(), project: z.string(), status: z.string(), file: z.string().optional(), source: z.string().optional(), runId: z.string().optional() }).passthrough();
type Request = { requestId: string; project: string; recipe: string; title: string; brief?: string };
let submitted: Request | undefined, operation: z.infer<typeof operationSchema> | undefined, busy = false, connected = false, uncertain = false;
function update() {
  const locked = !!submitted || busy;
  project.disabled = recipe.disabled = title.disabled = brief.disabled = locked;
  refresh.disabled = busy || !connected; create.disabled = locked || !connected; projectName.disabled = locked; start.disabled = locked || !connected || !project.value;
  poll.disabled = busy || !submitted; artifact.disabled = busy || operation?.status !== "succeeded" || !operation.file;
  reset.disabled = busy || !submitted; retry.hidden = !uncertain; retry.disabled = busy;
  get<HTMLElement>("brief-label").hidden = recipe.value !== "brand-kit";
}
async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await app.callServerTool({ name: `stream_machine_creative_${name}`, arguments: args });
  if (result.isError) {
    const failure = z.object({ code: z.string(), message: z.string() }).safeParse(result.structuredContent);
    throw new Error(failure.success ? `${failure.data.code}: ${failure.data.message}` : "Creative action failed.");
  }
  return envelope.parse(result.structuredContent).result;
}
async function perform(action: () => Promise<void>) {
  if (busy) return;
  busy = true; update();
  try { await action(); } catch (error) { status.textContent = error instanceof Error ? error.message : "Creative action failed."; }
  finally { busy = false; update(); }
}
function showOperation(value: unknown) {
  operation = operationSchema.parse(value); uncertain = false;
  status.textContent = `Request ${operation.requestId}: ${operation.status}. ${operation.status === "unknown" ? "Inspect the provider before starting another request." : ""}`;
  output.hidden = false; output.textContent = JSON.stringify(operation, null, 2);
}
refresh.onclick = () => void perform(async () => {
  const result = z.object({ projects: z.array(z.object({ id: z.string(), name: z.string().optional() })) }).parse(await call("list"));
  project.replaceChildren(...result.projects.map(item => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.name ? `${item.name} (${item.id})` : item.id; return option; }));
  status.textContent = result.projects.length ? "Choose a project and recipe." : "No projects found. Create a project with the creative project tool, then refresh.";
});
recipe.onchange = update;
create.onclick = () => void perform(async () => {
  const name = projectName.value.trim(); if (!name) throw new Error("Enter a project name.");
  const id = `stream-machine-${crypto.randomUUID()}`;
  status.textContent = `Creating ${id}. If the result is unclear, refresh projects before trying again.`;
  output.hidden = false; output.textContent = `Project request: ${id}. If the result is unclear, refresh projects before trying again.`;
  const result = z.object({ project: z.object({ id: z.string(), name: z.string() }) }).parse(await call("project", { id, name }));
  const option = document.createElement("option"); option.value = result.project.id; option.textContent = result.project.name; project.append(option); project.value = option.value;
  status.textContent = "Project created. Choose a recipe.";
});
start.onclick = () => void perform(async () => {
  const heading = title.value.trim(), text = brief.value.trim();
  if (!project.value || !heading || (recipe.value === "brand-kit" && !text)) throw new Error("Choose a project and complete the required fields.");
  submitted = { requestId: crypto.randomUUID(), project: project.value, recipe: recipe.value, title: heading, ...(recipe.value === "brand-kit" ? { brief: text } : {}) };
  uncertain = true; showOperation(await call("start", submitted));
});
retry.onclick = () => void perform(async () => { if (submitted) showOperation(await call("start", submitted)); });
poll.onclick = () => void perform(async () => { if (submitted) showOperation(await call("run", { requestId: submitted.requestId })); });
artifact.onclick = () => void perform(async () => {
  if (!operation?.file) return;
  const value = await call("artifact", { project: operation.project, entry: operation.file });
  output.hidden = false; output.textContent = JSON.stringify(value, null, 2); status.textContent = "Artifact returned. Review its contents before use.";
});
reset.onclick = () => { if (operation && !["succeeded", "failed", "canceled"].includes(operation.status) || uncertain) { if (!window.confirm("This request may still be running. Starting another could duplicate work. Continue?")) return; } submitted = undefined; operation = undefined; uncertain = false; output.hidden = true; status.textContent = "New request ready."; update(); };
function applyHost() { const context = app.getHostContext(); document.documentElement.dataset.theme = context?.theme ?? ""; for (const [name, value] of Object.entries(context?.styles?.variables ?? {})) if (name.startsWith("--") && typeof value === "string") document.documentElement.style.setProperty(name, value); }
app.addEventListener("hostcontextchanged", applyHost);
app.onteardown = async () => ({});
void app.connect().then(() => { connected = true; applyHost(); status.textContent = "Connected. Refresh projects to begin."; update(); }).catch(() => { status.textContent = "Could not connect to the host. Reopen the creative workspace."; });
