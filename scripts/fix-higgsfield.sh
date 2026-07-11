#!/usr/bin/env bash
# Fix common Higgsfield CLI + MCP workspace issues.
# Error patterns: workspace_membership_required, No workspace selected

set -euo pipefail

CONFIG_DIR="${HOME}/.config/higgsfield"
CONFIG_FILE="${CONFIG_DIR}/config.json"

if ! command -v higgsfield >/dev/null 2>&1; then
  echo "higgsfield CLI not found. Install: brew install higgsfield-ai/tap/higgsfield"
  exit 1
fi

echo "==> Higgsfield CLI $(higgsfield version 2>/dev/null | head -1)"

if ! higgsfield auth token >/dev/null 2>&1; then
  echo "==> Not logged in. Run: higgsfield auth login"
  exit 1
fi

mkdir -p "${CONFIG_DIR}"

echo "==> Listing workspaces..."
WORKSPACES_JSON="$(higgsfield workspace list --json 2>/dev/null || true)"

if [[ -z "${WORKSPACES_JSON}" ]]; then
  echo "Failed to list workspaces. Try: higgsfield auth login"
  exit 1
fi

# Pick workspace: already selected, else first Private, else first row
WORKSPACE_ID="$(node -e "
const rows = JSON.parse(process.argv[1]);
if (!rows.length) process.exit(2);
const selected = rows.find(r => r.selected || r.SELECTED);
if (selected) {
  console.log(selected.id || selected.ID);
  process.exit(0);
}
const priv = rows.find(r => /^private$/i.test(r.name || r.NAME || ''));
const pick = priv || rows[0];
console.log(pick.id || pick.ID);
" "${WORKSPACES_JSON}" 2>/dev/null || true)"

if [[ -z "${WORKSPACE_ID}" ]]; then
  # Fallback: parse table output
  WORKSPACE_ID="$(higgsfield workspace list 2>/dev/null | awk 'NR==2 {print $1}')"
fi

if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "No workspace found for this account."
  exit 1
fi

echo "==> Selecting workspace ${WORKSPACE_ID}"
higgsfield workspace set "${WORKSPACE_ID}"

echo "==> Verifying account..."
higgsfield account status

echo ""
echo "CLI OK."
echo ""
echo "If Cursor MCP still fails (balance/generate errors):"
echo "  1. Cursor Settings -> Tools & MCPs -> higgsfield"
echo "  2. Disconnect and reconnect (re-authenticate)"
echo "  3. Developer: Reload Window"
echo "  4. Run: higgsfield workspace list && select your Private workspace in MCP via select_workspace tool"
