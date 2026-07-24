---
phase: 20-recipes-service-list-types
plan: 02
subsystem: api
tags: [recipe, create-git-app, create-one-click, detectBuildPack, MCP, vitest]

requires:
  - phase: 20-recipes-service-list-types
    provides: Wave 0 RED scaffolds (20-00), fetchServiceTemplates + list-types (20-01)
provides:
  - recipe.ts with create-git-app + create-one-click handlers and flat schema
  - detectBuildPack with Dockerfile + Dockerfile.* glob (D-10 full)
  - create-app-db COOLIFY_NOT_IMPLEMENTED stub for Plan 20-03
affects: [20-03]

tech-stack:
  added: []
  patterns:
    - "recipe tool flat schema via createFlatActionSchema with per-action superRefine (D-11/D-12)"
    - "create-one-click validates type via fetchServiceTemplates before createService (T-20-02 SSRF mitigation)"
    - "D-20 soft manifest hints in error recoveryHints for one-click + app-db stub"

key-files:
  created:
    - src/mcp/tools/recipe.ts
  modified:
    - src/mcp/tools/recipe.test.ts
    - src/utils/errors.ts

key-decisions:
  - "Added COOLIFY_NOT_IMPLEMENTED to CoolifyErrorCode union for create-app-db stub until Plan 20-03"
  - "build_pack enum includes dockercompose for superRefine reject with service.create/create-one-click hint (mirrors application.ts)"

patterns-established:
  - "detectBuildPack exported for Dockerfile.* glob detection; safe nixpacks fallback on missing repo_path"
  - "create-app-db tests GREEN via stub assertion — full implementation deferred to 20-03"

requirements-completed: [RECIPE-02, RECIPE-04]

coverage:
  - id: D1
    description: "create-git-app detects build_pack locally, rejects dockercompose, calls createPublicApplication + triggerDeploy"
    requirement: RECIPE-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-git-app"
        status: pass
    human_judgment: false
  - id: D2
    description: "create-one-click validates type against fetchServiceTemplates and delegates to createService"
    requirement: RECIPE-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-one-click"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-24
status: complete
---

# Phase 20 Plan 02: Recipe create-git-app + create-one-click Summary

**Recipe MCP tool with local build_pack detection (Dockerfile + Dockerfile.* glob), createPublicApplication git-app flow, and create-one-click validated against dynamic service-templates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-24T06:20:00Z
- **Completed:** 2026-07-24T06:22:55Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Shipped `src/mcp/tools/recipe.ts` — flat schema, catalog/footer, `handleRecipeAction` dispatch
- `create-git-app`: `detectBuildPack`, D-11/D-12 validation, `createPublicApplication` + deploy on `instant_deploy !== false`
- `create-one-click`: type validated via `fetchServiceTemplates`, unknown types → `COOLIFY_VALIDATION_ERROR`, delegates to `createService`
- `create-app-db`: stub throws `COOLIFY_NOT_IMPLEMENTED` — Plan 20-03 wires full app+db flow
- Flipped 25 recipe tests GREEN (16 implementation + 9 stub assertions)

## Task Commits

Each task was committed atomically:

1. **Task 1: recipe.ts foundation — flat schema, catalog/footer, detectBuildPack, create-git-app handler** - `fa83600` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/tools/recipe.ts` — recipe tool with create-git-app + create-one-click; create-app-db stub
- `src/mcp/tools/recipe.test.ts` — create-git-app/create-one-click GREEN; create-app-db stub assertions
- `src/utils/errors.ts` — `COOLIFY_NOT_IMPLEMENTED` error code + RECOVERY_HINTS

## Decisions Made

- Added `COOLIFY_NOT_IMPLEMENTED` to typed error union — plan referenced code not yet in errors.ts
- Included `dockercompose` in build_pack enum so superRefine can reject with D-12 hint (same as application tool)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added COOLIFY_NOT_IMPLEMENTED to errors.ts**
- **Found during:** Task 1 implementation
- **Issue:** Plan throws `CoolifyApiError({ code: 'COOLIFY_NOT_IMPLEMENTED' })` but code not in `CoolifyErrorCode` union
- **Fix:** Added error code + RECOVERY_HINTS entries
- **Files modified:** src/utils/errors.ts
- **Verification:** TypeScript build green; create-app-db stub tests assert code
- **Committed in:** fa83600

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for typed stub envelope; no scope creep

## Known Stubs

| File | Location | Reason |
|------|----------|--------|
| `src/mcp/tools/recipe.ts` | `handleCreateAppDb` | Intentional stub — Plan 20-03 implements app+db wiring with DATABASE_URL env |

## TDD Gate Compliance

- RED gate: Wave 0 scaffolds from Plan 20-00 (`d049ac6`)
- GREEN gate: `feat(20-recipes-service-list-types-02)` commit `fa83600` — 25 tests pass

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Plan 20-03 can implement `handleCreateAppDb` and flip create-app-db tests to real GREEN assertions
- Plan 20-03 still needs `recipe` registration in `server.ts` + docs

## Self-Check: PASSED

- FOUND: src/mcp/tools/recipe.ts
- FOUND: src/mcp/tools/recipe.test.ts
- FOUND: fa83600
- FOUND: export handleRecipeAction in recipe.ts
- FOUND: npx vitest run src/mcp/tools/recipe.test.ts → 25 passed

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-24*
