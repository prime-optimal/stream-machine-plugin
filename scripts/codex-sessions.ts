import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";

const periodStart = Date.parse("2026-10-23T00:00:00-07:00") / 1000;
const out = process.argv[2] ?? "docs/submission/codex-sessions.html";
const db = new Database(join(homedir(), ".codex/state_5.sqlite"), { readonly: true });

type Row = { id: string; created_at: number; source: string; cwd: string; title: string; name: string | null; model: string | null; tokens_used: number; matches: number };
type Session = Row & { parent?: string; nickname?: string; role?: string; children: Session[] };

const rows = db.query<Row, [number]>(`
  select id, created_at, source, cwd, title, name, model, tokens_used,
    (cwd like '%stream-machine%' or cwd like '%twitchcon%' or cwd like '%Open Design%'
     or title like '%Stream Machine%' or first_user_message like '%stream-machine%' or first_user_message like '%Stream Machine%') as matches
  from threads where created_at >= ?1 order by created_at`).all(periodStart);

const sessions = new Map<string, Session>();
for (const row of rows) {
 const spawn = row.source.startsWith("{") ? JSON.parse(row.source).subagent?.thread_spawn : undefined;
 sessions.set(row.id, { ...row, parent: spawn?.parent_thread_id, nickname: spawn?.agent_nickname, role: spawn?.agent_path?.replace(/^\/root\//, ""), children: [] });
}
for (const session of sessions.values()) if (session.parent) sessions.get(session.parent)?.children.push(session);
const roots = [...sessions.values()].filter(session => !session.parent && session.matches);
const descendants = (session: Session): Session[] => [session, ...session.children.flatMap(descendants)];
const all = roots.flatMap(descendants);

const groups = [
 { key: "makeover", title: "Prototype: stream-makeover", blurb: "Hackathon strategy, Twitch OAuth, OBS alerts and the first ChatGPT Site, in prime-optimal/stream-makeover." },
 { key: "plugin", title: "Build: Stream Machine plugin", blurb: "Architecture, MCP servers, hosted Twitch OAuth, releases, reviews and issue work in prime-optimal/stream-machine-plugin." },
 { key: "testing", title: "Testing in Codex", blurb: "The installed plugin exercised in the Codex app, and hosted MCP checks plus Site publishing through codex exec." },
 { key: "design", title: "Brand: Open Design on Codex", blurb: "Open Design used Codex as its agent to build the Stream Machine design system, plus its memory extraction runs." },
] as const;

function group(session: Session) {
 const cwd = session.cwd;
 if (cwd.includes("Open Design")) return "design";
 if (cwd.includes("twitchcon")) return session.title.includes("plugin://plugin-creator") ? "plugin" : "makeover";
 if (session.source === "exec" || cwd.includes("/ChatGPT/test")) return "testing";
 return "plugin";
}

function label(session: Session) {
 const text = (session.name ?? session.title).trim();
 if (text.startsWith("You are a memory extractor")) return "Open Design memory extraction";
 if (text.startsWith("<open_design_prompt_bundle")) return "Open Design brand-system run";
 const line = text.split("\n")[0];
 return line.length > 90 ? `${line.slice(0, 87)}…` : line;
}

const total = (session: Session) => descendants(session).reduce((sum, s) => sum + s.tokens_used, 0);
const html = (text: string) => text.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const when = (seconds: number) => new Date(seconds * 1000).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const tokens = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

const grandTokens = roots.reduce((sum, root) => sum + total(root), 0);
const principal = roots.filter(root => group(root) === "plugin").sort((a, b) => total(b) - total(a))[0];
const models = [...new Set(all.flatMap(s => s.model ?? []))].sort();
const days = new Set(all.map(s => new Date(s.created_at * 1000).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }))).size;

function row(session: Session, depth = 0): string {
 const kids = session.children.map(child => row(child, depth + 1)).join("");
 const sub = session.children.length ? ` <span class="muted">+${session.children.length} subagent${session.children.length > 1 ? "s" : ""}</span>` : "";
 const title = session.parent ? `${html(session.nickname ?? "agent")} <span class="muted">${html(session.role ?? "")}</span>` : html(label(session));
 const surface = session.parent ? "subagent" : session.source === "exec" ? "codex exec" : "Codex app";
 return `<tr class="d${depth}${session.id === principal?.id ? " principal" : ""}"><td>${when(session.created_at)}</td><td><code>${session.id}</code></td><td>${title}${sub}</td><td>${surface}</td><td>${html(session.model ?? "")}</td><td class="num">${tokens(depth ? session.tokens_used : total(session))}</td></tr>${kids}`;
}

const sections = groups.map(g => {
 const members = roots.filter(root => group(root) === g.key);
 if (!members.length) return "";
 const n = members.reduce((sum, root) => sum + descendants(root).length, 0);
 const t = members.reduce((sum, root) => sum + total(root), 0);
 return `<section><h2>${g.title}</h2><p class="muted">${g.blurb} ${n} sessions, ${tokens(t)} tokens.</p>
<table><thead><tr><th>Started (PT)</th><th>Session ID</th><th>Thread</th><th>Surface</th><th>Model</th><th class="num">Tokens</th></tr></thead><tbody>${members.map(root => row(root)).join("")}</tbody></table></section>`;
}).join("\n");

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stream Machine: Codex sessions</title>
<style>
:root{--bg:#080c0d;--fg:#edf2f7;--metal:#11191b;--muted:#aab8c6;--steel:#617477;--phosphor:#9aff57}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 "Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace;padding:32px}
h1,h2{font-family:"Geist Serif",Georgia,serif;font-weight:500;margin:0 0 8px}h1{font-size:32px}h2{font-size:22px;margin-top:40px}
.muted{color:var(--muted)}.stats{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}.stat{background:var(--metal);border:1px solid var(--steel);border-radius:4px;padding:12px 16px;min-width:150px}
.stat b{display:block;font-size:24px;color:var(--phosphor)}.principal-box{background:var(--metal);border-left:4px solid var(--phosphor);border-radius:4px;padding:12px 16px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--metal);vertical-align:top}th{color:var(--muted);font-weight:400}
.num{text-align:right;white-space:nowrap}td:first-child{white-space:nowrap}code{user-select:all;color:var(--fg)}
tr.d1 td,tr.d2 td{color:var(--muted);font-size:12px}tr.d1 td:nth-child(3),tr.d2 td:nth-child(3){padding-left:28px}
tr.principal td{background:var(--metal)}tr.principal code{color:var(--phosphor)}
</style></head><body>
<h1>Stream Machine: Codex sessions</h1>
<p class="muted">Every Codex session that built, tested or designed Stream Machine during the submission period (Oct 23 to Nov 2, 2026), read from the local Codex state database. Subagent sessions are nested under the thread that started them. Token counts are the totals Codex recorded for each thread, including cached input.</p>
<div class="stats"><div class="stat"><b>${all.length}</b>Codex sessions</div><div class="stat"><b>${roots.length}</b>top-level threads</div><div class="stat"><b>${all.length - roots.length}</b>subagents</div><div class="stat"><b>${tokens(grandTokens)}</b>tokens</div><div class="stat"><b>${days}</b>days</div><div class="stat"><b>${models.length}</b>models</div></div>
${principal ? `<div class="principal-box">Principal session: <code>${principal.id}</code><br><span class="muted">${html(label(principal))}: the largest thread that built the plugin itself (${descendants(principal).length} sessions, ${tokens(total(principal))} tokens). Highlighted below.</span></div>` : ""}
${sections}
<p class="muted">Models: ${models.map(html).join(", ")}. Generated ${when(Date.now() / 1000)} PT by <code>scripts/codex-sessions.ts</code>.</p>
</body></html>
`;
await Bun.write(out, page);
console.log(`${all.length} sessions (${roots.length} top-level), ${tokens(grandTokens)} tokens, principal ${principal?.id} -> ${out}`);
