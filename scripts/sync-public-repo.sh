#!/usr/bin/env bash
# Sync a clean snapshot of this (private, dev) repo to the public
# awesome-coolify-mcp repo. Rebuilds a fresh git history every run —
# internal planning/research NEVER enters the public repo's history.
#
# Usage: scripts/sync-public-repo.sh ["commit message"]
#
# Requires: gh CLI authenticated, npm logged in (for the publish reminder).
set -euo pipefail

DEV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_REPO="clezcoding/awesome-coolify-mcp"
PUBLIC_DIR="$(mktemp -d "${TMPDIR:-/tmp}/awesome-coolify-mcp-public.XXXXXX")"
COMMIT_MSG="${1:-chore: sync public repo from dev}"

# Prod-relevant files/dirs only. Keep in sync with docs/ (Pages site),
# src/tests (npm package + CI), and packaging metadata. Everything NOT
# listed here (.planning, .cursor, .claude, .agents, graphify-out,
# mcp_features.md, dev-only scripts) stays private by omission.
INCLUDE=(
  src
  tests
  docs
  README.md
  README.de.md
  LICENSE
  CONTRIBUTING.md
  package.json
  package-lock.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  .env.example
  .gitignore
)

echo "==> Staging clean snapshot in ${PUBLIC_DIR}"
for item in "${INCLUDE[@]}"; do
  if [ -e "${DEV_ROOT}/${item}" ]; then
    cp -R "${DEV_ROOT}/${item}" "${PUBLIC_DIR}/${item}"
  else
    echo "WARN: expected file/dir missing, skipping: ${item}" >&2
  fi
done

mkdir -p "${PUBLIC_DIR}/.github/workflows"
cp "${DEV_ROOT}/.github/workflows/ci.yml" "${PUBLIC_DIR}/.github/workflows/ci.yml"
# pages.yml / publish.yml live only in the public repo (not tracked here) —
# fetch them from the existing public repo so re-syncs don't clobber them.
if git -C "${DEV_ROOT}" ls-remote --exit-code "https://github.com/${PUBLIC_REPO}.git" >/dev/null 2>&1; then
  TMP_CLONE="$(mktemp -d)"
  git clone --quiet --depth 1 "https://github.com/${PUBLIC_REPO}.git" "${TMP_CLONE}"
  [ -f "${TMP_CLONE}/.github/workflows/pages.yml" ] && cp "${TMP_CLONE}/.github/workflows/pages.yml" "${PUBLIC_DIR}/.github/workflows/pages.yml"
  [ -f "${TMP_CLONE}/.github/workflows/publish.yml" ] && cp "${TMP_CLONE}/.github/workflows/publish.yml" "${PUBLIC_DIR}/.github/workflows/publish.yml"
  rm -rf "${TMP_CLONE}"
fi

echo "==> Trimming dev-only script references from package.json (public copy)"
node -e "
const fs = require('fs');
const path = '${PUBLIC_DIR}/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
delete pkg.scripts.start;
delete pkg.scripts.mcp;
delete pkg.scripts['higgsfield:fix'];
delete pkg.scripts['gsd:fix-verification'];
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

echo "==> Verifying clean tree builds and tests green"
(
  cd "${PUBLIC_DIR}"
  npm install --silent
  npm run build --silent
  npm test --silent
)

echo "==> Committing fresh history"
(
  cd "${PUBLIC_DIR}"
  git init -q
  git checkout -q -b main
  git add -A
  git commit -q -m "${COMMIT_MSG}"
)

echo "==> Snapshot ready at ${PUBLIC_DIR}"
echo "Review with: cd ${PUBLIC_DIR} && git show --stat HEAD"
echo "Push with:   cd ${PUBLIC_DIR} && git remote add origin https://github.com/${PUBLIC_REPO}.git && git push --force origin main"
echo ""
echo "NOTE: --force is required because history is rebuilt from scratch every sync."
