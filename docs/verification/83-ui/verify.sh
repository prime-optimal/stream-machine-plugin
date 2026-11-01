#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix issue83-ui-proof)"
mise exec -- bun docs/verification/83-ui/serve.ts &
server_pid=$!
cleanup() {
  agent-browser close >/dev/null 2>&1 || true
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT
for attempt in {1..50}; do
  if curl --fail --silent http://127.0.0.1:48383/ >/dev/null; then break; fi
  sleep 0.1
done
agent-browser open http://127.0.0.1:48383/
agent-browser set viewport 1120 1800
agent-browser click '.live-card:nth-child(3) summary'
agent-browser click '.live-card:nth-child(3) button:nth-of-type(1)'
agent-browser screenshot '.live-card:nth-child(3)' docs/verification/83-ui/missing-grants.png
agent-browser click '.live-card:nth-child(3) button:nth-of-type(2)'
agent-browser screenshot '.live-card:nth-child(3)' docs/verification/83-ui/connect-disclosure.png
agent-browser eval '(() => {
  const text = document.querySelector(".live-card:nth-child(3)").innerText;
  const calls = JSON.parse(document.body.dataset.mockCalls);
  const errors = JSON.parse(document.body.dataset.errors);
  if (JSON.stringify(calls) !== JSON.stringify(["stream_machine_twitch_status", "stream_machine_twitch_connect"])) throw new Error("Unexpected mock calls");
  if (errors.length) throw new Error("Browser errors");
  if (!document.querySelector(".live-card:nth-child(3) details").open) throw new Error("Exact permissions not expanded");
  if (!text.includes("12 permissions") || !text.includes("not active features") || !text.includes("API access suspension")) throw new Error("Missing disclosure");
  if (!text.includes("missingScopes:") || !text.includes("reconnectRequired: true")) throw new Error("Missing permission status");
  if (location.href !== "http://127.0.0.1:48383/") throw new Error("Unexpected navigation");
  const links = [...document.querySelectorAll(".live-card:nth-child(3) a")].map(a => a.href);
  if (JSON.stringify(links) !== JSON.stringify(["http://127.0.0.1:48383/mock-consent-do-not-open"])) throw new Error("Unexpected consent link");
  return { calls, errors, location: location.href, userAgent: navigator.userAgent };
})()'
agent-browser errors
agent-browser console
