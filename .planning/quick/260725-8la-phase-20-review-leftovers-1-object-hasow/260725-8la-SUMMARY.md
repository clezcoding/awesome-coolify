---
phase: 20
plan: 01
subsystem: api
tags: [recipe, mcp, security, docs]

requires:
  - phase: 20-recipes-service-list-types
    provides: recipe tool, service.list-types, Phase 20 review feedback
provides:
  - Object.hasOwn template membership on create-one-click
  - deploy.status not_triggered when instant_deploy:false (all 3 create actions)
  - create-git-app soft-ignore triggerDeploy failure (D-16 parity)
  - detectBuildPack cwd realpath allowlist
  - README EN/DE 17 tools / ~91 actions
affects: [20-SECURITY, docs-parity]

tech-stack:
  added: []
  patterns:
    - "Object.hasOwn for own-property template lookup (no prototype chain)"
    - "realpathSync(process.cwd()) allowlist for repo_path (mirrors service.compose_file)"

key-files:
  created: []
  modified:
    - src/mcp/tools/recipe.ts
    - src/mcp/tools/recipe.test.ts
    - README.md
    - README.de.md

key-decisions:
  - "Soft-ignore triggerDeploy failure on create-git-app (not COOLIFY_RECIPE_PARTIAL_FAILURE) — parity with create-app-db D-16"
  - "Action count ~91 in README = prior ~87 + recipe(3) + list-types(1); full catalog grep yields 111"

patterns-established:
  - "detectBuildPack uses same cwd realpath allowlist as readBoundedComposeFile in service.ts"

requirements-completed: [REC-01, REC-02, REC-03, SVC-08, DOCS-01]

coverage:
  - id: D1
    description: "Object.hasOwn rejects prototype-inherited type on create-one-click"
    requirement: REC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#Object.hasOwn rejects prototype-inherited type"
        status: pass
    human_judgment: false
  - id: D2
    description: "deploy.status not_triggered when instant_deploy:false on all three create actions"
    requirement: REC-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#returns deploy.status not_triggered when instant_deploy:false"
        status: pass
    human_judgment: false
  - id: D3
    description: "create-git-app soft-ignores triggerDeploy failure; application_uuid preserved"
    requirement: REC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#soft-ignores triggerDeploy failure after successful create"
        status: pass
    human_judgment: false
  - id: D4
    description: "detectBuildPack rejects repo_path outside cwd with COOLIFY_VALIDATION_ERROR"
    requirement: SVC-08
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#rejects repo_path outside allowlisted cwd root"
        status: pass
    human_judgment: false
  - id: D5
    description: "README EN/DE advertise 17 tools and ~91 actions at lines 301 and 674"
    requirement: DOCS-01
    verification:
      - kind: other
        ref: "grep -n '17 tools|17 Tools' README.md README.de.md"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 20 Plan 01: Review Leftovers Summary

**Recipe hardening (Object.hasOwn, deploy.status, soft-ignore deploy-fail, repo_path allowlist) + README 17 tools / ~91 actions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T04:14:00Z
- **Completed:** 2026-07-25T04:22:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `Object.hasOwn(templates, type)` replaces `in` operator — rejects inherited keys like `toString`
- All three recipe create actions return `deploy.status: 'not_triggered'` when `instant_deploy: false`
- `create-git-app` soft-ignores `triggerDeploy` failure after successful create; `application_uuid` preserved
- `detectBuildPack` enforces cwd realpath allowlist — rejects `/etc/evil-repo` with `COOLIFY_VALIDATION_ERROR`
- README EN/DE updated: 17 tools (lines 301, 674), ~91 actions (line 674)

## Task Commits

1. **Task 1: Harden recipe.ts** — `f90b28d` (feat)
2. **Task 2: Update recipe.test.ts** — `c0182df` (test)
3. **Task 3: README EN/DE** — `4aed33b` (docs)

## Files Created/Modified

- `src/mcp/tools/recipe.ts` — Object.hasOwn, deployStatus, soft-ignore deploy-fail, detectBuildPack allowlist
- `src/mcp/tools/recipe.test.ts` — cwd-relative paths, 5 new tests (34 total)
- `README.md` — 17 tools, ~91 actions
- `README.de.md` — 17 Tools, ~91 Actions

## Decisions Made

- Soft-ignore over `COOLIFY_RECIPE_PARTIAL_FAILURE` for deploy queue failure — app fully created, retryable via `application.deploy` (D-16 parity with `create-app-db`)
- README action count ~91 = prior ~87 + Phase 20 additions (recipe 3 actions + service.list-types 1); full catalog sum is 111 — badges/overview lines outside scope unchanged per plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-commit hook blocked task 1 commit until task 2 test fixes were on disk (husky runs full vitest suite)
- Commitlint rejected `README` in subject — used lowercase `readme`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- T-20-02-02 accepted risk (repo_path path traversal) mitigated via allowlist — flag for next `/gsd-secure-phase` SECURITY.md update
- Badge lines (README L29, L116) still show 16/~87 — out of plan scope; optional follow-up quick task

## Self-Check: PASSED

- FOUND: src/mcp/tools/recipe.ts
- FOUND: src/mcp/tools/recipe.test.ts
- FOUND: README.md
- FOUND: README.de.md
- FOUND: f90b28d
- FOUND: c0182df
- FOUND: 4aed33b

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-25*
