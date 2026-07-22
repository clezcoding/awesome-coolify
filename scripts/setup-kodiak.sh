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
  missing=0
  for ctx in 'Lint, Test & Build' 'MegaLinter'; do
    if grep -qx "${ctx}" <<<"${CI_CONTEXT}"; then
      echo "✓ main branch protection requires CI check '${ctx}'"
    else
      echo "⚠ main protection missing required check '${ctx}' — run scripts/setup-branch-protection.sh" >&2
      missing=1
    fi
  done
  if [[ "${missing}" -ne 0 ]]; then
    fail=1
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
  echo "==> Preparing PR #${PR_NUMBER} for Kodiak automerge"
  # Remove labels that .kodiak.toml lists under merge.blocking_labels
  for blocking in \
    "status: blocked" \
    "status: needs-review" \
    "status: needs-triage" \
    "gsd: discuss" \
    "gsd: plan" \
    "gsd: execute"
  do
    if gh pr view "${PR_NUMBER}" --json labels -q '.labels[].name' | grep -qx "${blocking}"; then
      echo "  removing blocking label: ${blocking}"
      gh pr edit "${PR_NUMBER}" --remove-label "${blocking}" || true
    fi
  done
  gh pr edit "${PR_NUMBER}" --add-label automerge
  # Optional companion status label (not blocking)
  gh pr edit "${PR_NUMBER}" --add-label "status: ready-to-merge" 2>/dev/null || true
  echo "✓ PR #${PR_NUMBER} labeled automerge — Kodiak squash-merges when required checks pass."
  echo "  Watch: gh pr checks ${PR_NUMBER} --watch"
fi

if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi
