#!/usr/bin/env bash
# One-shot public-repo GitHub harden for clezcoding/awesome-coolify.
#
# Applies (via gh API — no code push required for settings):
#   1. Repo merge settings (squash-only, delete head, auto-merge, Discussions)
#   2. Secret scanning push protection
#   3. Classic branch protection on main (Kodiak-compatible)
#   4. Rulesets: protect v* tags + block force/delete on main
#   5. Label sync reminder + Kodiak check
#
# Usage:
#   ./scripts/setup-repo.sh           # apply everything
#   ./scripts/setup-repo.sh --dry-run # print planned actions only
#   ./scripts/setup-repo.sh --verify  # run verify-github-setup.sh after

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

DRY_RUN=0
VERIFY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --verify) VERIFY=1; shift ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "==> setup-repo for ${REPO}"
echo

run() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

echo "-- 1. Repo merge / community settings"
run "gh api --method PATCH \"repos/${REPO}\" \
  -f delete_branch_on_merge=true \
  -f allow_merge_commit=false \
  -f allow_squash_merge=true \
  -f allow_rebase_merge=false \
  -f allow_auto_merge=true \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY \
  -f has_discussions=true >/dev/null"
echo "✓ squash-only · delete head · auto-merge · Discussions"

echo "-- 2. Secret scanning push protection"
if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "DRY: enable secret_scanning + push_protection"
else
  gh api --method PATCH "repos/${REPO}" --input - <<'EOF' >/dev/null
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
EOF
fi
echo "✓ secret scanning + push protection"

echo "-- 3. Classic branch protection (main)"
if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "DRY: bash scripts/setup-branch-protection.sh"
else
  bash "${ROOT}/scripts/setup-branch-protection.sh"
fi

echo "-- 4. Rulesets (idempotent: skip if name exists)"
ensure_ruleset() {
  local name="$1"
  local payload="$2"
  local existing
  existing="$(gh api "repos/${REPO}/rulesets" --jq ".[] | select(.name==\"${name}\") | .id" 2>/dev/null || true)"
  if [[ -n "${existing}" ]]; then
    echo "✓ ruleset '${name}' already exists (id=${existing})"
    return 0
  fi
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "DRY: create ruleset '${name}'"
    return 0
  fi
  echo "${payload}" | gh api --method POST "repos/${REPO}/rulesets" --input - >/dev/null
  echo "✓ created ruleset '${name}'"
}

ensure_ruleset "protect tags" "$(cat <<'EOF'
{
  "name": "protect tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "update", "parameters": { "update_allows_fetch_and_merge": false } }
  ],
  "bypass_actors": []
}
EOF
)"

ensure_ruleset "main — block force/delete" "$(cat <<'EOF'
{
  "name": "main — block force/delete",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ],
  "bypass_actors": []
}
EOF
)"

echo "-- 5. Labels + Kodiak"
echo "  Sync labels from .github/labels.yml:"
echo "    gh workflow run labels.yml"
if [[ "${DRY_RUN}" -eq 0 ]]; then
  bash "${ROOT}/scripts/setup-kodiak.sh" || true
fi

echo
echo "==> setup-repo complete"
echo "Manual once: install Kodiak app → https://github.com/marketplace/kodiakhq"
echo "Then: gh workflow run labels.yml && ./scripts/verify-github-setup.sh"

if [[ "${VERIFY}" -eq 1 && "${DRY_RUN}" -eq 0 ]]; then
  bash "${ROOT}/scripts/verify-github-setup.sh"
fi
