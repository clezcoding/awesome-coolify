#!/usr/bin/env bash
# Sets up branch protection for "main" (classic API — required by Kodiak).
# Requires: gh CLI installed and logged in (`gh auth login`),
# run from within the repo's local checkout.
#
# Note: on the GitHub Free plan this only works for PUBLIC repos.
# On private repos on Free, this call returns a 403/upgrade error.
#
# Required checks must run on EVERY PR (no path filters):
#   Lint, Test & Build · MegaLinter
# Do NOT require path-filtered jobs (CodeQL, Dependency Review) — they leave
# docs-only PRs stuck as "Expected — Waiting for status".
#
# Solo maintainer: no required approving reviews (Kodiak + automerge label).
# Enable reviews later in repo settings / this script if the team grows.

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
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "allow_fork_syncing": false,
  "lock_branch": false,
  "block_creations": false
}
EOF

echo "Done. ${BRANCH} is now protected:"
echo "  - PRs only (force-push/delete blocked; linear history)"
echo "  - Required checks: Lint, Test & Build · MegaLinter (strict = up-to-date with ${BRANCH})"
echo "  - Conversation resolution required before merge"
echo "  - Admins included (enforce_admins=true)"
echo "  - No required reviewer (solo + Kodiak) — enable later if needed"
echo
echo "Companion rulesets (tags + force/delete) — apply via:"
echo "  ./scripts/setup-repo.sh"
