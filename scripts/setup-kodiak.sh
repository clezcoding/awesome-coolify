#!/usr/bin/env bash
# Verify Kodiak setup for clezcoding/awesome-coolify.
#
# Kodiak is a GitHub App (not Actions). This script checks repo-side config;
# the app itself must be installed once by the repo owner:
#   https://github.com/marketplace/kodiakhq
#
# Usage:
#   ./scripts/setup-kodiak.sh           # config + label + branch protection
#   ./scripts/setup-kodiak.sh --pr 23   # also label a PR with automerge

set -euo pipefail

PR_NUMBER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)
      PR_NUMBER="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Kodiak setup check for ${REPO}"
echo

fail=0

if [[ ! -f "${ROOT}/.kodiak.toml" ]]; then
  echo "✗ Missing .kodiak.toml in repo root" >&2
  fail=1
else
  echo "✓ .kodiak.toml present"
fi

if gh label list --limit 500 --json name -q '.[].name' | grep -qx 'automerge'; then
  echo "✓ automerge label exists on GitHub"
else
  echo "✗ automerge label missing — sync labels:" >&2
  echo "    gh workflow run labels.yml" >&2
  fail=1
fi

if gh api "repos/${REPO}/branches/main/protection" >/dev/null 2>&1; then
  CI_CONTEXT="$(gh api "repos/${REPO}/branches/main/protection/required_status_checks" -q '.contexts[]' 2>/dev/null || true)"
  if grep -qx 'Lint, Test & Build' <<<"${CI_CONTEXT}"; then
    echo "✓ main branch protection requires CI check 'Lint, Test & Build'"
  else
    echo "⚠ main is protected but CI context may differ — run scripts/setup-branch-protection.sh" >&2
  fi
else
  echo "⚠ main branch protection not configured — run scripts/setup-branch-protection.sh" >&2
fi

echo
echo "GitHub App install (manual, once per org/user):"
echo "  https://github.com/marketplace/kodiakhq"
echo "  Select repository: ${REPO}"
echo
echo "After install, label a ready PR:"
echo "  gh pr edit <number> --add-label automerge"
echo "Kodiak will keep the branch updated and squash-merge when CI is green."

if [[ -n "${PR_NUMBER}" ]]; then
  echo
  echo "==> Labeling PR #${PR_NUMBER} with automerge"
  gh pr edit "${PR_NUMBER}" --add-label automerge
  echo "✓ PR #${PR_NUMBER} labeled — Kodiak merges when 'Lint, Test & Build' passes."
fi

if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi
