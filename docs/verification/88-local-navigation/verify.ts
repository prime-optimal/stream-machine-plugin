import { strict as assert } from "node:assert";
import { writeFile } from "node:fs/promises";

const directory = import.meta.dir;
const session = "issue88-synthetic-qa";
const results: { check: string; result: unknown }[] = [];
function run(...args: string[]) {
  const process = Bun.spawnSync(["agent-browser", ...args], { env: { ...Bun.env, AGENT_BROWSER_SESSION: session } });
  if (process.exitCode !== 0) throw new Error(`agent-browser ${args[0]} failed (${process.exitCode}): ${process.stderr.toString()}`);
  return process.stdout.toString().trim();
}
function evaluate(code: string) { return JSON.parse(run("eval", code)); }
function record(check: string, result: unknown) { results.push({ check, result }); }
run("set", "viewport", "1440", "900");
run("screenshot", `${directory}/home-wide.png`);
const navigation = evaluate(`(async () => {
  const before = (await (await fetch("/calls")).json()).length;
  const views = [];
  for (const section of ["assets","clips","streamdeck","connections","tools","mock","home"]) {
    document.querySelector('nav [data-section="'+section+'"]').click();
    const active = document.querySelector('[data-view="'+section+'"]');
    views.push({section,visible:!active.hidden,focus:document.activeElement===active.querySelector("h1")});
  }
  return {before,after:(await (await fetch("/calls")).json()).length,views};
})()`);
assert.equal(navigation.before, navigation.after);
assert(navigation.views.every((view: { visible: boolean; focus: boolean }) => view.visible && view.focus));
record("all menu destinations; focus heading; zero navigation tool calls", navigation);
const retain = evaluate(`(() => {
  const assets=document.querySelector('[data-view="assets"] input');
  const deck=document.querySelector('[data-view="streamdeck"] input');
  const title=[...document.querySelectorAll('[data-view="tools"] label')].find(x=>x.textContent.startsWith("Proposed stream title")).querySelector("input");
  window.__qaNodes={assets,deck,title};
  assets.value="stream-machine-synthetic-draft";deck.value="SYNTHETIC-SERIAL";title.value="Synthetic title draft";
  for(const section of ["assets","streamdeck","tools","connections","mock"]) document.querySelector('nav [data-section="'+section+'"]').click();
  return {assets:assets.value,deck:deck.value,title:title.value};
})()`);
record("live drafts before mock reset", retain);
evaluate("document.querySelector('.mock-workspace').open=false");
run("click", ".reset");
run("wait", "--fn", "!document.querySelector('.reset').disabled");
const retained = evaluate(`(() => {
  const {assets,deck,title}=window.__qaNodes;
  return {sameAssets:assets===document.querySelector('[data-view="assets"] input'),sameDeck:deck===document.querySelector('[data-view="streamdeck"] input'),
    sameTitle:[...document.querySelectorAll('[data-view="tools"] input')].includes(title),
    assets:assets.value,deck:deck.value,title:title.value};
})()`);
assert(retained.sameAssets && retained.sameDeck && retained.sameTitle);
assert.equal(retained.assets, retain.assets);assert.equal(retained.deck,retain.deck);assert.equal(retained.title,retain.title);
record("same live nodes and drafts after mock reset", retained);
assert.equal(evaluate("document.querySelector('.mock-workspace').open"),false);
record("mock collapse survives reset rerender",false);
run("focus", 'nav [data-section="connections"]');run("press", "Enter");
assert.equal(evaluate("document.activeElement.textContent"),"Connections");
evaluate('fetch("/mode?status=slow").then(x=>x.json())');
run("focus", '[data-view="connections"] button');run("press", "Enter");
assert.equal(evaluate("document.activeElement.getAttribute('role')"),"status");
run("wait", "--text", "Account verified by explicit check.");
assert.equal(evaluate("document.activeElement.textContent"),"Recheck Twitch access");
record("keyboard check focuses status while pending, restores initiating button on completion",true);
record("explicit status and missing grants", evaluate("document.querySelector('.connections-panel .live-result').textContent"));
assert(evaluate("document.querySelector('.connections-panel .live-result').textContent.includes('11 required permissions missing.')"));
assert(evaluate("document.querySelector('.connections-panel details').textContent.includes('Missing:')"));
run("screenshot", `${directory}/connections-wide.png`);
run("focus", '[data-view="connections"] button');run("press", "Enter");
run("click", 'nav [data-section="assets"]');
await Bun.sleep(1400);
assert.equal(evaluate("document.activeElement.textContent"),"Assets");
record("completion after leaving Connections does not steal heading focus",true);
run("click", 'nav [data-section="connections"]');
evaluate('fetch("/mode?status=fail").then(x=>x.json())');
run("click", '[data-view="connections"] button');run("wait", "--text", "Stale. Previous check");
record("failed refresh retains stale account", evaluate("document.querySelector('.connections-panel .live-result').textContent"));
evaluate('fetch("/mode?status=slow").then(x=>x.json())');
run("click", '[data-view="connections"] button');
run("find", "role", "button", "click", "--name", "Connect or reconnect Twitch · 12 permissions");
run("wait", "--text", "Connection link ready.");
await Bun.sleep(1400);
assert.equal(evaluate("document.querySelector('.connections-panel .live-result').textContent"),"Not checked");
record("reconnect suppresses older delayed status; URL is not verification", evaluate("document.querySelector('.connections-panel .live-result').textContent"));
run("set", "viewport", "375", "812");
const narrow = evaluate(`(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,menu:[...document.querySelectorAll("nav button")].map(x=>x.textContent)}))()`);
assert(narrow.scroll<=narrow.width);record("375x812 no horizontal overflow; all menu labels visible",narrow);
run("screenshot", `${directory}/connections-narrow.png`);
run("click", 'nav [data-section="clips"]');
assert(evaluate("document.querySelector('[data-view=clips]').textContent.includes('unavailable')"));
run("screenshot", `${directory}/clips-narrow.png`);
const allWidths = evaluate(`(() => {
  const result=[];
  for(const section of ["home","assets","clips","streamdeck","connections","tools","mock"]) {
    document.querySelector('nav [data-section="'+section+'"]').click();
    result.push({section,width:innerWidth,scroll:document.documentElement.scrollWidth});
  }
  return result;
})()`);
assert(allWidths.every((value: { width: number; scroll: number })=>value.scroll<=value.width));
record("375x812 all destinations fit viewport",allWidths);
run("open","http://127.0.0.1:4388/link-fallback");
run("find","role","button","click","--name","Connect or reconnect Twitch · 12 permissions");
run("wait","--text","Connection link ready.");
run("find","role","link","click","--name","Open Twitch authorization");
run("wait","--text","Host could not open authorization.");
assert.equal(run("get","url"),"http://127.0.0.1:4388/link-fallback");
record("injected SDK denial leaves page and provides safe copy fallback",evaluate("document.body.textContent"));
const errors=run("errors");record("browser errors",errors);assert(!errors.includes("Error"));
const calls=await (await fetch("http://127.0.0.1:4388/calls")).json();
record("synthetic tool request log",calls);
await writeFile(`${directory}/observations.json`,JSON.stringify({session,head: "864eaf262409ce72a65882aece32037c154c7d37",results},null,2)+"\n");
console.log(`PASS ${results.length} synthetic browser checks`);
