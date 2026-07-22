---
phase: quick-260719-8ol
plan: 01
status: complete
subsystem: infra
tags: [github-actions, kodiak, megalinter, publint, release-drafter, oidc, mcp-registry]

requires: []
provides:
  - Kodiak squash-merge config with automerge-label gate
  - Release Drafter workflow + config alongside Changesets
  - Comfy publish stub gated by COMFY_PUBLISH_ENABLED
  - MCP Registry publish on v* tags via OIDC
  - publint script + CI step
  - narrow MegaLinter config + CI step
  - updated github-setup-overview.md
affects: [ci, release, distribution]

tech-stack:
  added: [publint, megalinter, release-drafter, kodiak-config, mcp-publish-action, comfy-publish-action]
  patterns: [pinned-action-versions, oidc-trusted-publishing, variable-gated-stub-workflows]

key-files:
  created:
    - .kodiak.toml
    - .megalinter.yml
    - .github/release-drafter.yml
    - .github/workflows/release-drafter.yml
    - .github/workflows/publish-comfy.yml
    - .github/workflows/publish-mcp.yml
    - dev-docs/github-setup-overview.md
  modified:
    - .github/workflows/ci.yml
    - package.json
    - package-lock.json

key-decisions:
  - "Kept existing OIDC publish.yml and Changesets release.yml untouched per locked CONTEXT"
  - "Comfy publish stub gated by COMFY_PUBLISH_ENABLED repo variable to prevent release failures"
  - "MegaLinter narrow scope via ENABLE list in .megalinter.yml, not full flavor"

patterns-established:
  - "Pinned GitHub Actions to tagged versions (@v7, @v6, @v8, @v1) across new workflows"
  - "MCP registry identifier matches package.json name: awesome-coolify-mcp"

requirements-completed: [D-1-comfy-publish, D-2-mcp-publish, D-3-keep-oidc-publish, D-4-release-drafter, D-5-setup-node-pin, D-6-kodiak, D-7-publint, D-8-megalinter, D-9-docs-update]

coverage:
  - id: D1
    description: Comfy publish-to-registry stub workflow with variable gate and prerequisite comments
    requirement: D-1-comfy-publish
    verification:
      - kind: other
        ref: "grep Comfy-Org/publish-node-action@v1 .github/workflows/publish-comfy.yml"
        status: pass
    human_judgment: true
    rationale: Workflow is intentionally gated; full publish requires manual pyproject.toml and secret setup
  - id: D2
    description: MCP publish workflow on v* tags with OIDC and npm registry identifier
    requirement: D-2-mcp-publish
    verification:
      - kind: other
        ref: "grep OtherVibes/mcp-publish-action@v1 .github/workflows/publish-mcp.yml"
        status: pass
    human_judgment: true
    rationale: MCP Registry publish requires live tag push and registry credentials
  - id: D3
    description: Existing OIDC publish.yml preserved unchanged
    requirement: D-3-keep-oidc-publish
    verification:
      - kind: other
        ref: "git diff --quiet .github/workflows/publish.yml"
        status: pass
    human_judgment: false
  - id: D4
    description: Release Drafter workflow and config alongside Changesets
    requirement: D-4-release-drafter
    verification:
      - kind: other
        ref: "test -f .github/workflows/release-drafter.yml && test -f .github/release-drafter.yml"
        status: pass
    human_judgment: false
  - id: D5
    description: setup-node@v7 + Node 24 consistent across workflows
    requirement: D-5-setup-node-pin
    verification:
      - kind: other
        ref: "grep actions/setup-node@v7 .github/workflows/ci.yml"
        status: pass
    human_judgment: false
  - id: D6
    description: Kodiak config with squash merge and automerge label requirement
    requirement: D-6-kodiak
    verification:
      - kind: other
        ref: "grep automerge .kodiak.toml"
        status: pass
    human_judgment: true
    rationale: Kodiak GitHub App requires manual install by repo owner
  - id: D7
    description: publint npm script and CI step
    requirement: D-7-publint
    verification:
      - kind: unit
        ref: "npm run publint"
        status: pass
    human_judgment: false
  - id: D8
    description: narrow MegaLinter config and CI step
    requirement: D-8-megalinter
    verification:
      - kind: other
        ref: "grep ENABLE: .megalinter.yml && grep oxsecurity/megalinter .github/workflows/ci.yml"
        status: pass
    human_judgment: true
    rationale: Full MegaLinter run only executes in CI against full codebase
  - id: D9
    description: dev-docs/github-setup-overview.md documents all new pieces
    requirement: D-9-docs-update
    verification:
      - kind: other
        ref: "grep release-drafter|publish-comfy|publish-mcp|kodiak|megalinter|publint dev-docs/github-setup-overview.md"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Quick Task 260719-8ol: Install GitHub Repo Tooling Summary

**Kodiak + Release Drafter + Comfy/MCP publish workflows + publint/MegaLinter CI, OIDC publish unchanged**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T04:18:00Z
- **Completed:** 2026-07-19T04:21:08Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `.kodiak.toml`, `.megalinter.yml`, and `.github/release-drafter.yml` config files
- Added Release Drafter, Comfy publish stub, and MCP publish workflows without touching existing OIDC `publish.yml` or Changesets `release.yml`
- Extended `ci.yml` with `publint` and MegaLinter steps; added `publint` script + devDependency
- Updated `dev-docs/github-setup-overview.md` with all new tooling, prerequisites, and manual Kodiak install steps

## Task Commits

Each task was committed atomically:

1. **Task 1: Add repo config files** - `459e38c` (chore)
2. **Task 2: Add workflows + CI + package.json** - `6729a7f` (feat)
3. **Task 3: Update dev-docs** - `56965a2` (docs)

## Files Created/Modified

- `.kodiak.toml` - Squash merge, automerge-label gate, no auto-approve
- `.megalinter.yml` - Narrow linter scope (TS/JS/YAML/Markdown/actionlint)
- `.github/release-drafter.yml` - Draft release template + conventional commit categories
- `.github/workflows/release-drafter.yml` - Draft release on push/PR to main
- `.github/workflows/publish-comfy.yml` - Comfy registry stub, gated by `COMFY_PUBLISH_ENABLED`
- `.github/workflows/publish-mcp.yml` - MCP Registry publish on `v*` tags via OIDC
- `.github/workflows/ci.yml` - Added publint + MegaLinter steps
- `package.json` / `package-lock.json` - Added publint script and devDependency
- `dev-docs/github-setup-overview.md` - Documented all new pieces

## Decisions Made

None - followed locked CONTEXT decisions exactly as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

- **Kodiak:** Install GitHub App at https://kodiakhq.com for `clezcoding/awesome-coolify`
- **Comfy publish (optional):** Set repo variable `COMFY_PUBLISH_ENABLED=true`, add `REGISTRY_ACCESS_TOKEN` secret, create `pyproject.toml`
- **MCP publish:** Runs automatically on `v*` tags; npm package still published via existing OIDC `publish.yml`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: pat-auth | `.github/workflows/publish-comfy.yml` | Comfy registry uses PAT when enabled; gated by repo variable |
| threat_flag: oidc-publish | `.github/workflows/publish-mcp.yml` | MCP Registry OIDC publish on tag push |

## Self-Check: PASSED

- All config and workflow files exist on disk
- Commits `459e38c`, `6729a7f`, `56965a2` verified in git log
- `npm run publint` passes locally
- `publish.yml` and `release.yml` byte-identical to pre-task versions

---
*Phase: quick-260719-8ol*
*Completed: 2026-07-19*
