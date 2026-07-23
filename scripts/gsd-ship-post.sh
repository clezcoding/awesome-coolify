#!/usr/bin/env bash
# Post-/gsd-ship automation: changeset + labels + push.
#
# Usage:
#   gsd-ship-post.sh [<pr-number>] [--dry-run] [--no-push] [--bump patch|minor|major]
#
# Called automatically by:
#   - GSD ship.md create_pr step (when this script exists)
#   - Cursor afterShellExecution hook on `gh pr create`
#   - ./scripts/gsd-ship-labels.sh (delegates here)

set -euo pipefail

PR=""
DRY_RUN=0
NO_PUSH=0
BUMP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --no-push) NO_PUSH=1; shift ;;
    --bump)
      BUMP_ARGS=(--bump "${2:-}")
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$PR" && "$1" =~ ^[0-9]+$ ]]; then
        PR="$1"
        shift
      else
        echo "Unknown argument: $1" >&2
        exit 1
      fi
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "$PR" ]]; then
  PR="$(gh pr view --json number -q .number 2>/dev/null || true)"
fi
if [[ -z "$PR" ]]; then
  PR="$(gh pr list --head "$(git branch --show-current)" --json number -q '.[0].number' 2>/dev/null || true)"
fi
if [[ -z "$PR" ]]; then
  echo "gsd-ship-post: no PR number (pass <n> or run on a PR branch)" >&2
  exit 1
fi

echo "==> gsd-ship-post PR #${PR}"

DRY_FLAG=()
if [[ "$DRY_RUN" -eq 1 ]]; then
  DRY_FLAG=(--dry-run)
fi

# 1) Ensure changeset (before labels so needs-changeset can clear)
CHANGESET_OUT="$(
  bash "${ROOT}/scripts/gsd-ensure-changeset.sh" --pr "$PR" "${BUMP_ARGS[@]+"${BUMP_ARGS[@]}"}" "${DRY_FLAG[@]+"${DRY_FLAG[@]}"}" || true
)"
echo "$CHANGESET_OUT"

CREATED_FILE=""
if echo "$CHANGESET_OUT" | grep -q '^changeset: wrote '; then
  CREATED_FILE="$(echo "$CHANGESET_OUT" | awk '/^changeset: wrote /{print $3}')"
fi
# Also capture bare path line
if [[ -z "$CREATED_FILE" ]]; then
  CREATED_FILE="$(echo "$CHANGESET_OUT" | awk '/^\.changeset\//{print; exit}')"
fi

# 2) Commit + push changeset if we created one
if [[ -n "$CREATED_FILE" && -f "$CREATED_FILE" && "$DRY_RUN" -eq 0 ]]; then
  git add "$CREATED_FILE"
  if ! git diff --cached --quiet; then
    git commit -m "$(cat <<EOF
chore: add changeset for PR #${PR}

EOF
)"
    if [[ "$NO_PUSH" -eq 0 ]]; then
      BRANCH="$(git branch --show-current)"
      git push -u origin "$BRANCH"
      echo "gsd-ship-post: pushed changeset on ${BRANCH}"
    fi
  fi
elif [[ "$DRY_RUN" -eq 1 && -n "$CREATED_FILE" ]]; then
  echo "gsd-ship-post: dry-run would commit+push ${CREATED_FILE}"
fi

# 3) Ship labels + Kodiak automerge (merge still waits for green required checks)
bash "${ROOT}/scripts/gsd-pr-labels.sh" --pr "$PR" --mode ship "${DRY_FLAG[@]+"${DRY_FLAG[@]}"}"

echo "==> gsd-ship-post done for PR #${PR} (automerge set; Kodiak waits for CI)"
