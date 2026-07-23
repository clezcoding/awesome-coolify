#!/usr/bin/env bash
# Cursor afterShellExecution hook: after `gh pr create`, run gsd-ship-post.
# Fails open — never blocks the agent.

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

# Only react to successful gh pr create
if ! printf '%s' "$command" | grep -Eq 'gh([[:space:]]+|.*)pr[[:space:]]+create'; then
  printf '%s\n' '{}'
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
POST="${ROOT}/scripts/gsd-ship-post.sh"
if [[ ! -x "$POST" && ! -f "$POST" ]]; then
  printf '%s\n' '{}'
  exit 0
fi

PR="$(printf '%s' "$output" | /usr/bin/python3 -c '
import sys, re
text = sys.stdin.read()
m = re.search(r"github\.com/[^/\s]+/[^/\s]+/pull/(\d+)", text)
print(m.group(1) if m else "")
' 2>/dev/null || true)"

if [[ -z "$PR" ]]; then
  PR="$(cd "$ROOT" && gh pr view --json number -q .number 2>/dev/null || true)"
fi

if [[ -z "$PR" ]]; then
  printf '%s\n' '{"additional_context":"gsd-ship-post: gh pr create detected but PR number not found — run ./scripts/gsd-ship-post.sh <n>"}'
  exit 0
fi

# Run post-ship (changeset + labels + push). Capture summary for agent.
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
