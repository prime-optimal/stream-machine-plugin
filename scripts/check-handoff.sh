#!/usr/bin/env bash
set -euo pipefail
export GIT_OPTIONAL_LOCKS=0

fail() {
  printf 'Handoff blocked: %s\n' "$1" >&2
  exit 1
}

git rev-parse --git-dir >/dev/null 2>&1 || fail "Run inside the task worktree."
branch=$(git symbolic-ref --quiet --short HEAD) || fail "HEAD is detached. Use a task branch."
status=$(git status --porcelain=v1 --untracked-files=all)
[[ -z "$status" ]] || fail "Tracked, staged, or untracked changes remain. Inspect git status."

upstream=$(git rev-parse --symbolic-full-name '@{upstream}' 2>/dev/null) ||
  fail "No upstream exists. Push the task branch with upstream tracking."
case "$upstream" in
  refs/remotes/*) ;;
  *) fail "The upstream must be a remote-tracking branch." ;;
esac
git rev-parse --verify "${upstream}^{commit}" >/dev/null 2>&1 ||
  fail "The upstream ref is missing. Check the remote branch before pushing."

read -r ahead behind < <(git rev-list --left-right --count "HEAD...${upstream}")
[[ "$ahead" == 0 ]] || fail "Unpushed commits: $ahead. Push completed work."
[[ "$behind" == 0 ]] || fail "Upstream commits missing locally: $behind. Reconcile the branch."

printf 'Handoff ready: %s is clean and matches %s.\n' "$branch" "${upstream#refs/remotes/}"
printf 'Tracking refs are local. Fetch first, then inspect other worktrees and running dependencies.\n'
