#!/usr/bin/env bash
# Sets up branch protection for "main".
# Requires: gh CLI installed and logged in (`gh auth login`),
# run from within the repo's local checkout.
#
# Note: on the GitHub Free plan this only works for PUBLIC repos.
# On private repos on Free, this call returns a 403/upgrade error.

set -euo pipefail

BRANCH="main"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

echo "Setting up branch protection for ${REPO}@${BRANCH} ..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "Lint, Test & Build", "app_id": 15368 },
      { "context": "MegaLinter", "app_id": 15368 }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF

echo "Done. main is now protected:"
echo "  - Force-push/delete blocked"
echo "  - CI checks 'Lint, Test & Build' and 'MegaLinter' must be green before merging"
echo "  - Admins included (enforce_admins=true) — CI must pass even for repo owners"
echo "  - No required reviewer (solo project) - enable later in repo settings if needed"
