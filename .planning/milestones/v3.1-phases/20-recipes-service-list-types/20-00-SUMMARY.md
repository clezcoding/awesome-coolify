---
phase: 20-recipes-service-list-types
plan: 00
subsystem: testing
tags: [vitest, tdd, recipe, wave-0, red-scaffold, ofetch]

requires:
  - phase: 19-dx-schemas-mcp-prompts
    provides: flat action schemas, actionsCatalog pattern, soft manifest hints (D-20)
provides:
  - 25 it.fails RED tests in recipe.test.ts covering RECIPE-02, RECIPE-03, RECIPE-04
  - vi.mock factories for api/client (18 stubs), ofetch, manifest, node:fs ahead of Plans 20-02/20-03
affects: [20-02, 20-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED via vitest it.fails + dynamic import('./recipe.js') — flip to it when recipe.ts ships"
    - "Dockerfile.* glob detection scaffolded via readdirSync + statSync mocks (D-10 full)"

key-files:
  created:
    - src/mcp/tools/recipe.test.ts
  modified: []

key-decisions:
  - "Used it.fails instead of bare it so husky pre-commit (full vitest) stays green while recipe.ts absent"
  - "Dynamic import per it case keeps tsup build green without recipe.ts on disk"

patterns-established:
  - "recipe.test.ts three describe blocks mirror Phase 10/11 Wave 0 layout for multi-action tool"
  - "D-20 soft manifest hint assertions use recoveryHints stringMatching /instance|manifest/i"

requirements-completed: [RECIPE-02, RECIPE-03, RECIPE-04]

coverage:
  - id: D1
    description: "10 RED create-git-app scaffolds (Dockerfile detection, D-10 glob, D-11/D-12 validation, D-16/D-17)"
    requirement: RECIPE-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-git-app"
        status: pass
    human_judgment: false
  - id: D2
    description: "9 RED create-app-db scaffolds (DATABASE_URL wiring, D-14/D-15 partial failure, D-19 masking, D-20 hint)"
    requirement: RECIPE-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-app-db"
        status: pass
    human_judgment: false
  - id: D3
    description: "6 RED create-one-click scaffolds (list-types validation, D-01 SSRF reject, D-07 delegate, D-20 hint)"
    requirement: RECIPE-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-one-click"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-24
status: complete
---

# Phase 20 Plan 00: Wave 0 RED Test Scaffolds Summary

**25 vitest it.fails RED scaffolds in recipe.test.ts covering create-git-app, create-app-db, and create-one-click before recipe.ts exists**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-24T06:13:16Z
- **Completed:** 2026-07-24T06:15:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/mcp/tools/recipe.test.ts` with `describe('recipe create-git-app')` — 10 `it.fails` cases (RECIPE-02, D-10/D-11/D-12/D-16/D-17)
- Added `describe('recipe create-app-db')` — 9 `it.fails` cases (RECIPE-03, D-13/D-14/D-15/D-16/D-17/D-19/D-20)
- Added `describe('recipe create-one-click')` — 6 `it.fails` cases (RECIPE-04, D-01/D-07/D-16/D-17/D-20)
- vi.mock factories for `../../api/client.js` (18 stubs), `ofetch`, `../../utils/manifest.js`, `node:fs` (incl. readdirSync for Dockerfile.* glob)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recipe.test.ts RED scaffold with dynamic import + vi.mock factories** - `d049ac6` (test)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/tools/recipe.test.ts` — Wave 0 RED scaffolds; 978 existing tests green, 25 expected-fail

## Decisions Made

- Used `it.fails` instead of bare `it` so husky pre-commit (`pnpm test`) passes while `recipe.ts` is absent; Plans 20-02/20-03 flip each block to `it` when GREEN
- Dynamic import inside each `it.fails` body defers `./recipe.js` resolution until runtime — tsup build stays green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched RED scaffolds to vitest it.fails for pre-commit compatibility**
- **Found during:** Task 1 commit attempt (Phase 10-00 precedent)
- **Issue:** Husky runs full `vitest run`; bare `it` with missing `./recipe.js` fails the hook
- **Fix:** Mark all 25 scaffolds as `it.fails` — tests still fail at runtime (expected-fail) but suite exits 0; flip to `it` in 20-02/20-03
- **Files modified:** src/mcp/tools/recipe.test.ts
- **Verification:** `npx vitest run src/mcp/tools/recipe.test.ts` → 25 expected fail; `pnpm test` → 978 passed | 25 expected fail
- **Committed in:** d049ac6

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for commit hygiene; RED contract preserved via expected-fail semantics per Wave 0 precedent

## TDD Gate Compliance

- RED gate: `test(20-recipes-service-list-types-00)` commit present (d049ac6)
- GREEN gate: deferred to plans 20-02/20-03 per Wave 0 contract

## Issues Encountered

None beyond pre-commit blocking (resolved via it.fails deviation)

## User Setup Required

None

## Next Phase Readiness

- Plan 20-01 can add shared infrastructure (service-templates fetch, client helpers)
- Plans 20-02/20-03 flip RED scaffolds GREEN without test rewrites (change `it.fails` → `it`, ship `recipe.ts`)

## Self-Check: PASSED

- FOUND: src/mcp/tools/recipe.test.ts
- FOUND: d049ac6
- FOUND: describe('recipe create-git-app') x1
- FOUND: describe('recipe create-app-db') x1
- FOUND: describe('recipe create-one-click') x1
- FOUND: 25 await import('./recipe.js') occurrences

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-24*
