#!/usr/bin/env bash
# Sets up branch protection for "main".
# Requires: gh CLI installed and logged in (`gh auth login`),
# run from within the repo's local checkout.
#
# Note: on the GitHub Free plan this only works for PUBLIC repos.
# On private repos on Free, this call returns a 403/upgrade error
# (see section 2 in github-setup-guide.md).

set -euo pipefail

BRANCH="main"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

echo "Setting up branch protection for ${REPO}@${BRANCH} ..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=Lint, Test & Build" \
  -F "enforce_admins=false" \
  -F "required_pull_request_reviews=null" \
  -f "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" \
  -F "required_linear_history=true"

echo "Done. main is now protected:"
echo "  - Force-push/delete blocked"
echo "  - CI check 'Lint, Test & Build' must be green before merging"
echo "  - No required reviewer (solo project) - enable later in repo settings if needed"
