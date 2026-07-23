#!/usr/bin/env bash
# Called after /gsd-ship creates a PR
set -euo pipefail
PR="${1:-}"
if [[ -z "$PR" ]]; then
  PR=$(gh pr view --json number -q .number 2>/dev/null || true)
fi
[[ -n "$PR" ]] || { echo "Usage: gsd-ship-labels.sh <pr-number>"; exit 1; }
exec bash "$(dirname "$0")/gsd-pr-labels.sh" --pr "$PR" --mode ship
