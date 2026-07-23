#!/usr/bin/env bash
# Ensure a Changeset exists for release-relevant PR branches.
#
# Usage:
#   gsd-ensure-changeset.sh [--pr <n>] [--bump patch|minor|major] [--dry-run]
#
# Creates .changeset/<slug>.md when the branch touches src/mcp, src/api, or
# package.json and no pending .changeset/*.md (besides README) exists.

set -euo pipefail

PR=""
BUMP=""
DRY_RUN=0
BASE_REF="${GSD_BASE_REF:-origin/main}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr) PR="${2:-}"; shift 2 ;;
    --bump) BUMP="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
CHANGESET_DIR="${ROOT}/.changeset"

has_changeset=0
for f in "${CHANGESET_DIR}"/*.md; do
  [[ -e "$f" ]] || continue
  base="$(basename "$f")"
  [[ "$base" == "README.md" ]] && continue
  has_changeset=1
  echo "changeset: already present (${base})"
  break
done

if [[ "$has_changeset" -eq 1 ]]; then
  exit 0
fi

TMP_FILES="$(mktemp)"
trap 'rm -f "$TMP_FILES"' EXIT

if [[ -n "$PR" ]]; then
  gh pr diff "$PR" --name-only >"$TMP_FILES" 2>/dev/null || true
else
  git fetch -q "$(echo "$BASE_REF" | cut -d/ -f1)" "$(echo "$BASE_REF" | cut -d/ -f2-)" 2>/dev/null || true
  git diff --name-only "${BASE_REF}...HEAD" >"$TMP_FILES" 2>/dev/null \
    || git diff --name-only "${BASE_REF}" HEAD >"$TMP_FILES" 2>/dev/null \
    || true
fi

release_relevant=0
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    src/mcp/*|src/api/*|package.json|src/utils/errors.ts|src/utils/manifest.ts|src/utils/instance-registry.ts)
      release_relevant=1
      break
      ;;
  esac
done <"$TMP_FILES"

if [[ "$release_relevant" -eq 0 ]]; then
  echo "changeset: skip (no release-relevant paths)"
  exit 0
fi

BRANCH="$(git branch --show-current 2>/dev/null || echo unknown)"
TITLE=""
if [[ -n "$PR" ]]; then
  TITLE="$(gh pr view "$PR" --json title -q .title 2>/dev/null || true)"
fi
if [[ -z "$TITLE" ]]; then
  TITLE="$(git log -1 --pretty=%s 2>/dev/null || echo "Release changes")"
fi

if [[ -z "$BUMP" ]]; then
  if echo "${TITLE}${BRANCH}" | grep -Eiq 'breaking|major'; then
    BUMP="major"
  elif echo "${TITLE}${BRANCH}" | grep -Eiq 'phase[[:space:]-]*[0-9]|feat(\(|:|/)|feature|minor'; then
    BUMP="minor"
  else
    BUMP="patch"
  fi
fi

SLUG="$(echo "$BRANCH" | tr '/_' '-' | tr -cd 'a-zA-Z0-9-' | cut -c1-48)"
if [[ -z "$SLUG" || "$SLUG" == "HEAD" || "$SLUG" == "unknown" ]]; then
  SLUG="ship-$(date +%Y%m%d%H%M%S)"
fi
FILE="${CHANGESET_DIR}/${SLUG}.md"

SUMMARY="$TITLE"
if [[ ${#SUMMARY} -gt 200 ]]; then
  SUMMARY="$(printf '%s' "$SUMMARY" | cut -c1-197)..."
fi

CONTENT=$(cat <<EOF
---
"${PKG_NAME}": ${BUMP}
---

${SUMMARY}
EOF
)

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "changeset: would write ${FILE} (${BUMP})"
  printf '%s\n' "$CONTENT"
  exit 0
fi

printf '%s\n' "$CONTENT" > "$FILE"
echo "changeset: wrote ${FILE} (${BUMP})"
echo "$FILE"
