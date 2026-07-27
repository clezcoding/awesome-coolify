#!/usr/bin/env bash
# Post-/gsd-ship automation: labels + optional changeset + push.
#
# Usage:
#   gsd-ship-post.sh [<pr-number>] [--dry-run] [--no-push] [--with-changeset] [--bump patch|minor|major]
#
# Called automatically by:
#   - GSD ship.md create_pr step (when this script exists)
#   - Cursor afterShellExecution hook on `gh pr create` (gsd/* branches only)
#   - ./scripts/gsd-ship-labels.sh (delegates here)
#
# Default: apply ship labels + automerge only (no changeset). Pass --with-changeset
# for hotfix/out-of-band releases. Fail-closed: ensure-changeset errors abort before labels.

set -euo pipefail

PR=""
DRY_RUN=0
NO_PUSH=0
WITH_CHANGESET=0
BUMP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --no-push) NO_PUSH=1; shift ;;
    --with-changeset) WITH_CHANGESET=1; shift ;;
    --bump)
      BUMP_ARGS=(--bump "${2:-}")
      shift 2
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
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

# Branch protection binds required checks to PR HEAD. A tip with [ci skip] / [skip ci]
# never reports Lint/MegaLinter → Kodiak waits forever (only kodiakhq: skipping).
ensure_pr_tip_triggers_ci() {
  local head_msg branch
  head_msg="$(git log -1 --format=%B 2>/dev/null || true)"
  if ! grep -qiE '\[(ci skip|skip ci)\]' <<<"$head_msg"; then
    return 0
  fi
  echo "gsd-ship-post: WARN PR tip skips CI ([ci skip] on HEAD) — required checks will not report"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "gsd-ship-post: dry-run would push empty commit to trigger Lint, Test & Build + MegaLinter"
    return 0
  fi
  if [[ "$NO_PUSH" -eq 1 ]]; then
    echo "gsd-ship-post: --no-push set; fix manually: empty commit without [ci skip] on PR branch" >&2
    return 1
  fi
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "$branch" ]]; then
    echo "gsd-ship-post: not on a branch; cannot auto-fix ci skip on tip" >&2
    return 1
  fi
  git commit --allow-empty -m "$(cat <<EOF
ci: trigger required checks

Prior tip had [ci skip]; empty commit so branch protection checks can report.
EOF
)"
  git push -u origin "$branch"
  echo "gsd-ship-post: pushed empty CI trigger commit on ${branch}"
}

ensure_pr_tip_triggers_ci || true

DRY_FLAG=()
if [[ "$DRY_RUN" -eq 1 ]]; then
  DRY_FLAG=(--dry-run)
fi

CREATED_FILE=""

if [[ "$WITH_CHANGESET" -eq 1 ]]; then
  # Ensure changeset — fail closed (no || true). Exit 0 = skip or wrote.
  CHANGESET_OUT="$(
    bash "${ROOT}/scripts/gsd-ensure-changeset.sh" --pr "$PR" "${BUMP_ARGS[@]+"${BUMP_ARGS[@]}"}" "${DRY_FLAG[@]+"${DRY_FLAG[@]}"}"
  )"
  echo "$CHANGESET_OUT"

  if echo "$CHANGESET_OUT" | grep -q '^changeset: wrote '; then
    CREATED_FILE="$(echo "$CHANGESET_OUT" | awk '/^changeset: wrote /{print $3}')"
  fi
  if [[ -z "$CREATED_FILE" ]]; then
    CREATED_FILE="$(echo "$CHANGESET_OUT" | awk '/^\.changeset\//{print; exit}')"
  fi

  # Commit + push changeset if we created one
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
else
  echo "gsd-ship-post: changeset skipped (pass --with-changeset to create)"
fi

# Ship labels + Kodiak automerge (merge still waits for green required checks).
bash "${ROOT}/scripts/gsd-pr-labels.sh" --pr "$PR" --mode ship "${DRY_FLAG[@]+"${DRY_FLAG[@]}"}"

echo "==> gsd-ship-post done for PR #${PR} (labels applied; Kodiak waits for CI + non-blocking labels)"
