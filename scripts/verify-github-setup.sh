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
EXPECTED_CI_CONTEXT="Lint, Test & Build"
EXPECTED_MCP_NAME="io.github.clezcoding/awesome-coolify"

fail=0
warn=0

pass() { echo "✓ $*"; }
crit() { echo "✗ $*" >&2; fail=1; }
warn_msg() { echo "⚠ $*" >&2; warn=1; }

echo "==> GitHub setup verification for ${REPO}"
echo

# --- Workflows active ---
echo "-- Workflows"
REQUIRED_WORKFLOWS=(ci.yml labels.yml pages.yml release.yml publish.yml publish-mcp.yml release-drafter.yml)
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
  if grep -qx "${EXPECTED_CI_CONTEXT}" <<<"${contexts}"; then
    pass "main requires '${EXPECTED_CI_CONTEXT}'"
  else
    crit "main protection missing required check '${EXPECTED_CI_CONTEXT}' (found: ${contexts:-none})"
  fi
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

mcp_name="$(node -p "require('./package.json').mcpName // ''" 2>/dev/null || jq -r '.mcpName // empty' package.json)"
if [[ "${mcp_name}" == "${EXPECTED_MCP_NAME}" ]]; then
  pass "package.json mcpName matches publish-mcp.yml (${EXPECTED_MCP_NAME})"
else
  crit "package.json mcpName missing or wrong (got: ${mcp_name:-<empty>}, expected: ${EXPECTED_MCP_NAME})"
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

# --- MCP publish history ---
echo "-- MCP Registry publish"
mcp_runs="$(gh run list --workflow=publish-mcp.yml --limit 20 --json databaseId -q 'length' 2>/dev/null || echo 0)"
if [[ "${mcp_runs}" -gt 0 ]]; then
  pass "publish-mcp.yml has ${mcp_runs} run(s)"
else
  warn_msg "publish-mcp.yml never ran — backfill needed: gh workflow run publish-mcp.yml -f version=${pkg_version}"
fi
echo

# --- Manual follow-ups (warnings only) ---
echo "-- Manual follow-ups"
warn_msg "Kodiak GitHub App install — verify at https://github.com/marketplace/kodiakhq (repo: ${REPO})"
warn_msg "Run ./scripts/setup-kodiak.sh after app install to confirm label + branch protection"
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
