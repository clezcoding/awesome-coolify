#!/usr/bin/env bash
# Auto-label PRs by branch, title, diff size, and changed paths.
#
# Usage:
#   gsd-pr-labels.sh --pr <n> [--mode ci|ship|ready] [--dry-run] [--automerge]
#
# Requires gh CLI and GH_TOKEN or gh auth login.

set -euo pipefail

PR=""
MODE="ci"
DRY_RUN=0
# 0 = default for mode; 1 = force on; -1 = force off (--no-automerge)
AUTOMERGE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)
      PR="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --automerge)
      AUTOMERGE=1
      shift
      ;;
    --no-automerge)
      AUTOMERGE=-1
      shift
      ;;
    -h|--help)
      sed -n '2,7p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PR" ]]; then
  echo "Usage: gsd-pr-labels.sh --pr <n> [--mode ci|ship|ready] [--dry-run] [--automerge]" >&2
  exit 1
fi

case "$MODE" in
  ci|ship|ready) ;;
  *)
    echo "Invalid --mode: ${MODE} (expected ci, ship, or ready)" >&2
    exit 1
    ;;
esac

if [[ -z "${GH_TOKEN:-}" ]] && ! gh auth status >/dev/null 2>&1; then
  echo "GH_TOKEN or gh auth login required" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABELS_FILE="${ROOT}/.github/labels.yml"
REPO="${GH_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

label_exists() {
  local name="$1"
  grep -Fq "name: \"${name}\"" "$LABELS_FILE" 2>/dev/null
}

ADDED=()
REMOVED=()

add_label() {
  local label="$1"
  ADDED+=("$label")
  if [[ "$DRY_RUN" -eq 0 ]]; then
    gh pr edit "$PR" --repo "$REPO" --add-label "$label"
  fi
}

remove_label() {
  local label="$1"
  REMOVED+=("$label")
  if [[ "$DRY_RUN" -eq 0 ]]; then
    gh pr edit "$PR" --repo "$REPO" --remove-label "$label" 2>/dev/null || true
  fi
}

BRANCH="$(gh pr view "$PR" --repo "$REPO" --json headRefName -q .headRefName)"
TITLE="$(gh pr view "$PR" --repo "$REPO" --json title -q .title)"
AUTHOR="$(gh pr view "$PR" --repo "$REPO" --json author -q .author.login)"
ADDITIONS="$(gh pr view "$PR" --repo "$REPO" --json additions -q .additions)"
DELETIONS="$(gh pr view "$PR" --repo "$REPO" --json deletions -q .deletions)"

CURRENT_LABELS=()
while IFS= read -r label; do
  [[ -n "$label" ]] && CURRENT_LABELS+=("$label")
done < <(gh pr view "$PR" --repo "$REPO" --json labels -q '.labels[].name')

if [[ "$AUTHOR" == "dependabot[bot]" ]]; then
  echo "Skipping dependabot PR #${PR}"
  exit 0
fi

has_label() {
  local want="$1"
  local label
  for label in "${CURRENT_LABELS[@]}"; do
    [[ "$label" == "$want" ]] && return 0
  done
  return 1
}

current_with_prefix() {
  local prefix="$1"
  local label
  for label in "${CURRENT_LABELS[@]}"; do
    [[ "$label" == "${prefix}"* ]] && printf '%s\n' "$label"
  done
}

reconcile_single() {
  local desired="$1"
  local prefix="${desired%%:*}:"
  local existing=()
  while IFS= read -r label; do
    [[ -n "$label" ]] && existing+=("$label")
  done < <(current_with_prefix "$prefix")
  local label
  for label in "${existing[@]}"; do
    [[ "$label" == "$desired" ]] && continue
    remove_label "$label"
  done
  if ! has_label "$desired"; then
    add_label "$desired"
  fi
}

reconcile_multi() {
  local desired=("$@")
  local existing=()
  while IFS= read -r label; do
    [[ -n "$label" ]] && existing+=("$label")
  done < <(current_with_prefix "scope:")
  local label want found
  for label in "${existing[@]}"; do
    found=0
    for want in "${desired[@]}"; do
      [[ "$label" == "$want" ]] && found=1 && break
    done
    if [[ "$found" -eq 0 ]]; then
      remove_label "$label"
    fi
  done
  for want in "${desired[@]}"; do
    if ! has_label "$want"; then
      add_label "$want"
    fi
  done
}

CHANGED_FILES=()
while IFS= read -r file; do
  [[ -n "$file" ]] && CHANGED_FILES+=("$file")
done < <(gh api "repos/${REPO}/pulls/${PR}/files" --paginate -q '.[].filename')

if [[ "$AUTHOR" == "imgbot[bot]" ]]; then
  reconcile_single "type: chore"
  echo "PR #${PR} (${MODE})"
  if ((${#ADDED[@]})); then
    echo "  added: ${ADDED[*]}"
  else
    echo "  added: (none)"
  fi
  if ((${#REMOVED[@]})); then
    echo "  removed: ${REMOVED[*]}"
  else
    echo "  removed: (none)"
  fi
  exit 0
fi

DESIRED_TYPE=()
DESIRED_GSD=()
DESIRED_SIZE=()
DESIRED_SCOPE=()
DESIRED_STATUS=()
NEEDS_CHANGESET=""
TOUCH_AUTOMERGE=0
ADD_AUTOMERGE=0

title_lower="$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]')"

if [[ "$BRANCH" =~ ^gsd/phase- ]] || [[ "$TITLE" =~ ^Phase\ [0-9] ]]; then
  DESIRED_GSD+=("gsd: ship")
  if [[ "$title_lower" =~ (^|[[:space:][:punct:]])(bug|fix)([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: bug")
  else
    DESIRED_TYPE+=("type: feature")
  fi
elif [[ "$BRANCH" =~ ^gsd/quick- ]]; then
  DESIRED_GSD+=("gsd: execute")
fi

if ((${#DESIRED_TYPE[@]} == 0)); then
  case "$BRANCH" in
    fix/*) DESIRED_TYPE+=("type: bug") ;;
    docs/*) DESIRED_TYPE+=("type: docs") ;;
    chore/*) DESIRED_TYPE+=("type: chore") ;;
    feat/*) DESIRED_TYPE+=("type: feature") ;;
  esac
fi

if ((${#DESIRED_TYPE[@]} == 0)); then
  if [[ "$title_lower" =~ (^|[[:space:][:punct:]])(fix|bug|hotfix)([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: bug")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])(doc|readme)([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: docs")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])(chore|deps|depend)([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: chore")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])refactor([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: refactor")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])test([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: test")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])perf([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: perf")
  elif [[ "$title_lower" =~ (^|[[:space:][:punct:]])security([[:space:][:punct:]]|$) ]]; then
    DESIRED_TYPE+=("type: security")
  else
    DESIRED_TYPE+=("type: feature")
  fi
fi

total=$((ADDITIONS + DELETIONS))
if [[ "$total" -lt 10 ]]; then
  DESIRED_SIZE+=("size: XS")
elif [[ "$total" -lt 50 ]]; then
  DESIRED_SIZE+=("size: S")
elif [[ "$total" -lt 200 ]]; then
  DESIRED_SIZE+=("size: M")
elif [[ "$total" -lt 500 ]]; then
  DESIRED_SIZE+=("size: L")
else
  DESIRED_SIZE+=("size: XL")
fi

scope_already() {
  local want="$1"
  local s
  for s in "${DESIRED_SCOPE[@]}"; do
    [[ "$s" == "$want" ]] && return 0
  done
  return 1
}

maybe_scope() {
  local label="$1"
  label_exists "$label" || return 0
  scope_already "$label" && return 0
  DESIRED_SCOPE+=("$label")
}

for file in "${CHANGED_FILES[@]}"; do
  case "$file" in
    */application.ts|application.ts)
      maybe_scope "scope: application"
      ;;
    */service.ts|service.ts)
      maybe_scope "scope: service"
      ;;
    */database.ts|database.ts)
      maybe_scope "scope: database"
      ;;
    */diagnose.ts|*/diagnose-*)
      maybe_scope "scope: diagnose"
      ;;
    */deployment.ts|*/deployment-*)
      maybe_scope "scope: deployment"
      ;;
    */emergency.ts|*/emergency-*)
      maybe_scope "scope: emergency"
      ;;
    */docs.ts|*/docs-*)
      maybe_scope "scope: docs"
      ;;
    src/api/*|*/errors.ts)
      maybe_scope "scope: coolify-api"
      ;;
    */server.ts|*/manifest.ts|*/instance.ts|*/instance-*)
      maybe_scope "scope: mcp-core"
      ;;
    .github/workflows/*)
      maybe_scope "scope: ci"
      ;;
    docs/*|README*|README.*)
      maybe_scope "scope: docs-site"
      ;;
  esac
done

if ((${#DESIRED_SCOPE[@]} > 4)); then
  DESIRED_SCOPE=("${DESIRED_SCOPE[@]:0:4}")
fi

release_relevant=0
has_changeset=0
for file in "${CHANGED_FILES[@]}"; do
  case "$file" in
    src/mcp/*|src/api/*|package.json)
      release_relevant=1
      ;;
    .changeset/*.md)
      has_changeset=1
      ;;
  esac
done

if [[ "$release_relevant" -eq 1 ]]; then
  if [[ "$has_changeset" -eq 0 ]]; then
    NEEDS_CHANGESET="add"
  else
    NEEDS_CHANGESET="remove"
  fi
fi

case "$MODE" in
  ship|ready)
    # Ship and ready are Kodiak-opt-in: set automerge + strip blockers.
    # Kodiak still waits for required checks (Lint/Test/Build, MegaLinter)
    # and will not merge while blocking_labels are present (.kodiak.toml).
    for blocker in \
      "status: blocked" \
      "status: needs-review" \
      "status: needs-triage" \
      "gsd: discuss" \
      "gsd: plan" \
      "gsd: execute" \
      "gsd: verify"
    do
      has_label "$blocker" && remove_label "$blocker"
    done
    if label_exists "status: ready-to-merge"; then
      DESIRED_STATUS+=("status: ready-to-merge")
    elif has_label "status: in-progress"; then
      remove_label "status: in-progress"
    fi
    # Default: always set automerge on ship/ready (CI gate is the real brake).
    # Pass --no-automerge to opt out (handled below via AUTOMERGE=-1).
    TOUCH_AUTOMERGE=1
    if [[ "$AUTOMERGE" -eq -1 ]]; then
      ADD_AUTOMERGE=0
    else
      ADD_AUTOMERGE=1
    fi
    ;;
esac

if ((${#DESIRED_TYPE[@]})); then
  reconcile_single "${DESIRED_TYPE[0]}"
fi

if ((${#DESIRED_GSD[@]})); then
  reconcile_single "${DESIRED_GSD[0]}"
fi

if ((${#DESIRED_SIZE[@]})); then
  reconcile_single "${DESIRED_SIZE[0]}"
fi

if ((${#DESIRED_SCOPE[@]})); then
  reconcile_multi "${DESIRED_SCOPE[@]}"
else
  stale_scope=()
  while IFS= read -r label; do
    [[ -n "$label" ]] && stale_scope+=("$label")
  done < <(current_with_prefix "scope:")
  for label in "${stale_scope[@]}"; do
    remove_label "$label"
  done
fi

if [[ "$MODE" != "ci" ]] && ((${#DESIRED_STATUS[@]})); then
  reconcile_single "${DESIRED_STATUS[0]}"
fi

if [[ "$NEEDS_CHANGESET" == "add" ]]; then
  if ! has_label "needs-changeset"; then
    add_label "needs-changeset"
  fi
elif [[ "$NEEDS_CHANGESET" == "remove" ]]; then
  has_label "needs-changeset" && remove_label "needs-changeset"
fi

if [[ "$TOUCH_AUTOMERGE" -eq 1 ]]; then
  if [[ "$ADD_AUTOMERGE" -eq 1 ]]; then
    if ! has_label "automerge"; then
      add_label "automerge"
    fi
  elif has_label "automerge"; then
    remove_label "automerge"
  fi
fi

echo "PR #${PR} (${MODE}) branch=${BRANCH} author=${AUTHOR} +/-=${ADDITIONS}/${DELETIONS}"
if ((${#ADDED[@]})); then
  echo "  added: ${ADDED[*]}"
else
  echo "  added: (none)"
fi
if ((${#REMOVED[@]})); then
  echo "  removed: ${REMOVED[*]}"
else
  echo "  removed: (none)"
fi
