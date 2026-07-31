#!/usr/bin/env bash
# Pin all GitHub Actions `uses:` refs in .github/workflows to full commit SHAs.
# Idempotent: skips refs that already look like 40-char hex SHAs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

resolve_sha() {
  local action="$1" ref="$2"
  local repo="${action%%@*}"
  # Strip subpath (e.g. megalinter/flavors/javascript → megalinter)
  # action is owner/name[/sub...]
  local owner name
  owner="$(cut -d/ -f1 <<<"${action}")"
  name="$(cut -d/ -f2 <<<"${action}")"
  local repo_slug="${owner}/${name}"

  # Prefer annotated/lightweight tag → commit
  local sha
  sha="$(gh api "repos/${repo_slug}/git/ref/tags/${ref}" --jq '.object.sha' 2>/dev/null || true)"
  if [[ -n "${sha}" ]]; then
    local typ
    typ="$(gh api "repos/${repo_slug}/git/ref/tags/${ref}" --jq '.object.type' 2>/dev/null || echo commit)"
    if [[ "${typ}" == "tag" ]]; then
      sha="$(gh api "repos/${repo_slug}/git/tags/${sha}" --jq '.object.sha')"
    fi
    echo "${sha}"
    return 0
  fi
  # Fallback: treat ref as branch/commit
  sha="$(gh api "repos/${repo_slug}/commits/${ref}" --jq '.sha' 2>/dev/null || true)"
  if [[ -z "${sha}" ]]; then
    echo "FAILED to resolve ${action}@${ref}" >&2
    return 1
  fi
  echo "${sha}"
}

declare -A CACHE=()

pin_file() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ "${line}" =~ ^([[:space:]]*uses:[[:space:]]+)([^@[:space:]]+)@([^[:space:]#]+)(.*)$ ]]; then
      local prefix="${BASH_REMATCH[1]}"
      local action="${BASH_REMATCH[2]}"
      local ref="${BASH_REMATCH[3]}"
      local rest="${BASH_REMATCH[4]}"
      if [[ "${ref}" =~ ^[0-9a-f]{40}$ ]]; then
        echo "${line}" >>"${tmp}"
        continue
      fi
      local key="${action}@${ref}"
      local sha="${CACHE[${key}]:-}"
      if [[ -z "${sha}" ]]; then
        sha="$(resolve_sha "${action}" "${ref}")"
        CACHE["${key}"]="${sha}"
        echo "  ${key} -> ${sha:0:12}…" >&2
      fi
      # Keep existing comment or add version comment
      if [[ "${rest}" =~ \# ]]; then
        echo "${prefix}${action}@${sha}${rest}" >>"${tmp}"
      else
        echo "${prefix}${action}@${sha} # ${ref}" >>"${tmp}"
      fi
    else
      echo "${line}" >>"${tmp}"
    fi
  done <"${file}"
  mv "${tmp}" "${file}"
}

echo "Pinning actions in .github/workflows …"
for f in .github/workflows/*.yml; do
  echo "== ${f}"
  pin_file "${f}"
done
echo "Done."
