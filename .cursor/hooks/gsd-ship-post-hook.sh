#!/usr/bin/env bash
# Cursor afterShellExecution hook: after successful `gh pr create` on a gsd/*
# branch, run gsd-ship-post. Fails open — never blocks the agent.

set -u

input="$(cat || true)"
command="$(printf '%s' "$input" | /usr/bin/python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get("command") or d.get("tool_input", {}).get("command") or "")
' 2>/dev/null || true)"

output="$(printf '%s' "$input" | /usr/bin/python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get("output") or d.get("result") or d.get("stdout") or "")
' 2>/dev/null || true)"

# Only react to gh pr create
if ! printf '%s' "$command" | grep -Eq 'gh([[:space:]]+|.*)pr[[:space:]]+create'; then
  printf '%s\n' '{}'
  exit 0
fi

# Fail-closed on create failure / missing URL — never fall back to an unrelated PR.
if printf '%s' "$output" | grep -Eiq 'error:|failed to create|HTTP |GraphQL:'; then
  printf '%s\n' '{"additional_context":"gsd-ship-post: gh pr create looks failed — skipping auto post. Re-run: ./scripts/gsd-ship-post.sh <n>"}'
  exit 0
fi

PR="$(printf '%s' "$output" | /usr/bin/python3 -c '
import sys, re
text = sys.stdin.read()
m = re.search(r"github\.com/[^/\s]+/[^/\s]+/pull/(\d+)", text)
print(m.group(1) if m else "")
' 2>/dev/null || true)"

if [[ -z "$PR" ]]; then
  # No URL in create output → do NOT guess via `gh pr view` (wrong-PR footgun).
  printf '%s\n' '{"additional_context":"gsd-ship-post: gh pr create detected but no PR URL in output — run ./scripts/gsd-ship-post.sh <n> manually"}'
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
POST="${ROOT}/scripts/gsd-ship-post.sh"
if [[ ! -x "$POST" && ! -f "$POST" ]]; then
  printf '%s\n' '{}'
  exit 0
fi

# Restrict auto-post to GSD phase/quick branches (or explicit GSD_SHIP=1).
BRANCH="$(cd "$ROOT" && git branch --show-current 2>/dev/null || true)"
if [[ "${GSD_SHIP:-}" != "1" && ! "$BRANCH" =~ ^gsd/ ]]; then
  printf '%s\n' "{\"additional_context\":\"gsd-ship-post: skipped auto-post on branch ${BRANCH:-unknown} (not gsd/*). Run: ./scripts/gsd-ship-post.sh ${PR}\"}"
  exit 0
fi

# Verify the extracted PR number belongs to the current branch head.
PR_HEAD="$(cd "$ROOT" && gh pr view "$PR" --json headRefName -q .headRefName 2>/dev/null || true)"
if [[ -n "$BRANCH" && -n "$PR_HEAD" && "$PR_HEAD" != "$BRANCH" ]]; then
  printf '%s\n' "{\"additional_context\":\"gsd-ship-post: PR #${PR} head (${PR_HEAD}) != current branch (${BRANCH}) — skipping\"}"
  exit 0
fi

log="$(mktemp 2>/dev/null || echo /tmp/gsd-ship-post-hook.log)"
if bash "$POST" "$PR" >"$log" 2>&1; then
  summary="$(tail -n 20 "$log" | tr '\n' ' ' | cut -c1-500)"
  printf '%s\n' "{\"additional_context\":\"gsd-ship-post auto-ran for PR #${PR}: ${summary}\"}"
else
  summary="$(tail -n 30 "$log" | tr '\n' ' ' | cut -c1-500)"
  printf '%s\n' "{\"additional_context\":\"gsd-ship-post failed for PR #${PR} (non-blocking): ${summary}. Re-run: ./scripts/gsd-ship-post.sh ${PR}\"}"
fi
rm -f "$log" 2>/dev/null || true
exit 0
