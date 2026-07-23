#!/usr/bin/env bash
# After /gsd-ship creates a PR — ensure changeset + apply ship labels.
# Thin wrapper around gsd-ship-post.sh (kept for CONTRIBUTING / habit).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "${ROOT}/gsd-ship-post.sh" "$@"
