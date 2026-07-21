#!/usr/bin/env bash
# Verify GitHub Actions, bots, and repo-side automation for clezcoding/awesome-coolify.
#
# Exit 0: repo-side config OK (warnings allowed for manual follow-ups).
# Exit 1: critical repo-side config missing or broken.
#
# Requires: gh CLI logged in, npm registry reachable, run from repo root.
#
# Usage: ./scripts/verify-github-setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
EXPECTED_PAGES="https://clezcoding.github.io/awesome-coolify/"
EXPECTED_CI_CONTEXTS=("Lint, Test & Build" "MegaLinter")

fail=0
warn=0

pass() { echo "✓ $*"; }
crit() { echo "✗ $*" >&2; fail=1; }
warn_msg() { echo "⚠ $*" >&2; warn=1; }

echo "==> GitHub setup verification for ${REPO}"
echo

# --- Workflows active ---
echo "-- Workflows"
REQUIRED_WORKFLOWS=(ci.yml labels.yml pages.yml release.yml publish.yml release-drafter.yml)
for wf in "${REQUIRED_WORKFLOWS[@]}"; do
  state="$(gh workflow list --json name,state,path -q ".[] | select(.path==\".github/workflows/${wf}\") | .state" 2>/dev/null || true)"
  if [[ "${state}" == "active" ]]; then
    pass "${wf} active"
  elif [[ -n "${state}" ]]; then
    crit "${wf} not active (state: ${state})"
  else
    crit "${wf} missing or not found"
  fi
done
echo

# --- Branch protection ---
echo "-- Branch protection"
if gh api "repos/${REPO}/branches/main/protection" >/dev/null 2>&1; then
  contexts="$(gh api "repos/${REPO}/branches/main/protection/required_status_checks" -q '.contexts[]' 2>/dev/null || true)"
  for ctx in "${EXPECTED_CI_CONTEXTS[@]}"; do
    if grep -qx "${ctx}" <<<"${contexts}"; then
      pass "main requires '${ctx}'"
    else
      crit "main protection missing required check '${ctx}' (found: ${contexts:-none})"
    fi
  done
else
  crit "main branch protection not configured — run scripts/setup-branch-protection.sh"
fi
echo

# --- Labels ---
echo "-- Labels"
if gh label list --limit 500 --json name -q '.[].name' | grep -qx 'automerge'; then
  pass "automerge label present"
else
  crit "automerge label missing — run: gh workflow run labels.yml"
fi
echo

# --- Recent CI ---
echo "-- Recent CI"
latest_ci="$(gh run list --workflow=ci.yml --limit 1 --json conclusion,status -q '.[0]' 2>/dev/null || echo '{}')"
ci_conclusion="$(echo "${latest_ci}" | jq -r '.conclusion // empty')"
ci_status="$(echo "${latest_ci}" | jq -r '.status // empty')"
if [[ "${ci_status}" == "completed" && "${ci_conclusion}" == "success" ]]; then
  pass "latest CI run succeeded"
else
  crit "latest CI run not successful (status=${ci_status:-unknown}, conclusion=${ci_conclusion:-unknown})"
fi
echo

# --- npm version vs package.json ---
echo "-- npm publish"
pkg_version="$(node -p "require('./package.json').version" 2>/dev/null || jq -r .version package.json)"
npm_version="$(npm view awesome-coolify-mcp version 2>/dev/null || true)"
if [[ -z "${npm_version}" ]]; then
  crit "awesome-coolify-mcp not found on npm registry"
elif [[ "${npm_version}" == "${pkg_version}" ]]; then
  pass "npm version ${npm_version} matches package.json"
else
  crit "npm version ${npm_version} != package.json ${pkg_version}"
fi
echo

# --- GitHub Pages ---
echo "-- GitHub Pages"
pages_url="$(gh api "repos/${REPO}/pages" -q '.html_url' 2>/dev/null || true)"
if [[ "${pages_url}" == "${EXPECTED_PAGES}" ]]; then
  pass "Pages URL ${pages_url}"
else
  if [[ -z "${pages_url}" ]]; then
    crit "GitHub Pages not configured"
  else
    crit "Pages URL mismatch (got: ${pages_url}, expected: ${EXPECTED_PAGES})"
  fi
fi
echo

# --- Kodiak ---
echo "-- Kodiak"
if gh pr list --limit 1 --json number -q '.[0].number' 2>/dev/null | grep -q .; then
  pr_num="$(gh pr list --limit 1 --json number -q '.[0].number')"
  if gh pr checks "${pr_num}" 2>/dev/null | grep -q 'kodiakhq'; then
    pass "Kodiak GitHub App active (kodiakhq check on PR #${pr_num})"
  else
    warn_msg "Kodiak app not detected on latest PR — install: https://github.com/marketplace/kodiakhq"
  fi
else
  warn_msg "No open PRs — Kodiak app install not verified via checks"
fi
if [[ -f .kodiak.toml ]]; then
  pass ".kodiak.toml present"
else
  crit ".kodiak.toml missing"
fi
echo

# --- Manual follow-ups (warnings only) ---
echo "-- Manual follow-ups"
warn_msg "Label ready PRs with automerge for Kodiak squash-merge after CI passes"
echo

echo "==> Summary"
if [[ "${fail}" -ne 0 ]]; then
  echo "FAILED: ${fail} critical issue(s) — fix repo-side config before release." >&2
  exit 1
fi

if [[ "${warn}" -ne 0 ]]; then
  echo "PASSED with warnings — manual follow-ups listed above."
else
  echo "PASSED — all checks green."
fi
exit 0
