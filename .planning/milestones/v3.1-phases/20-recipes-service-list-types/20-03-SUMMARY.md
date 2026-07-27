---
phase: 20-recipes-service-list-types
plan: 03
subsystem: api
tags: [recipe, create-app-db, MCP, bulkUpdateEnvs, sanitizeFullProjection, RECIPE-03]

requires:
  - phase: 20-recipes-service-list-types
    provides: create-git-app + create-one-click handlers and Wave 0 tests (20-02)
provides:
  - handleCreateAppDb with engine dispatch, internal_db_url read, env wiring, partial-failure posture
  - recipe tool registered in server.ts (17th domain tool)
  - README EN/DE Recipes section with safety posture and examples
affects: []

tech-stack:
  added: []
  patterns:
    - "create-app-db sequential DB → app → fetchDatabase → bulkUpdateEnvs with COOLIFY_RECIPE_PARTIAL_FAILURE (D-15)"
    - "connection_string masked via sanitizeFullProjection on field only — env_key left visible"
    - "constructFallbackUrl engine switch when internal_db_url absent (D-14)"

key-files:
  created: []
  modified:
    - src/mcp/tools/recipe.ts
    - src/mcp/tools/recipe.test.ts
    - src/utils/errors.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts
    - README.md
    - README.de.md

key-decisions:
  - "Added COOLIFY_RECIPE_PARTIAL_FAILURE to CoolifyErrorCode union for typed partial-failure envelope"
  - "Mask connection_string only — full-object sanitizeFullProjection incorrectly masked env_key"

patterns-established:
  - "recipe tool registered with openWorldHint and withInstanceRoutingSchema(recipeActionSchema)"
  - "instant_deploy default true triggers triggerDatabaseStart + triggerDeploy with soft-ignore on failure"

requirements-completed: [RECIPE-03]

coverage:
  - id: D1
    description: "create-app-db creates DB+app, wires DATABASE_URL/env_key, masks connection_string unless reveal"
    requirement: RECIPE-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe create-app-db"
        status: pass
    human_judgment: false
  - id: D2
    description: "recipe tool registered in server.ts with instance routing and README EN/DE documentation"
    requirement: RECIPE-03
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#MCP server tool registration"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-24
status: complete
---

# Phase 20 Plan 03: create-app-db + Recipe Registration Summary

**create-app-db end-to-end with engine-dispatched DB create, DATABASE_URL wiring, partial-failure UUIDs, connection_string masking, and recipe tool registered as 17th MCP domain tool**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-24T06:24:00Z
- **Completed:** 2026-07-24T06:28:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Shipped `handleCreateAppDb` — engine dispatch, `internal_db_url` read, fallback URL, `bulkUpdateEnvs`, `COOLIFY_RECIPE_PARTIAL_FAILURE` on app/env partial failure (no rollback)
- Flipped 12 create-app-db tests GREEN (success, env_key, fallback, partial failure, masking, instant_deploy, engine dispatch, D-20 hint)
- Registered `recipe` tool in `server.ts` with `openWorldHint: true` and instance routing schema
- Documented all three recipe actions + safety posture in README.md and README.de.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement create-app-db handler with engine dispatch, internal_db_url read, env wiring, partial-failure posture** - `2b7ed89` (feat)
2. **Task 2: Register recipe tool in server.ts + document in README** - `fc87027` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/tools/recipe.ts` — real `handleCreateAppDb`, `dispatchCreateDatabase`, `constructFallbackUrl`
- `src/mcp/tools/recipe.test.ts` — 12 GREEN create-app-db tests
- `src/utils/errors.ts` — `COOLIFY_RECIPE_PARTIAL_FAILURE` error code
- `src/mcp/server.ts` — `registerTool('recipe', ...)`
- `src/mcp/server.test.ts` — 16→17 tool count, recipe schema assertions
- `README.md` / `README.de.md` — Recipes section with examples and safety note

## Decisions Made

- Added `COOLIFY_RECIPE_PARTIAL_FAILURE` to typed error union — plan referenced code not yet in errors.ts
- Mask `connection_string` field only — `sanitizeFullProjection` on full response incorrectly masked `env_key` (contains `env` substring)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added COOLIFY_RECIPE_PARTIAL_FAILURE to errors.ts**
- **Found during:** Task 1 implementation
- **Issue:** Plan throws `CoolifyApiError({ code: 'COOLIFY_RECIPE_PARTIAL_FAILURE' })` but code not in `CoolifyErrorCode` union
- **Fix:** Added error code + RECOVERY_HINTS entries
- **Files modified:** src/utils/errors.ts
- **Verification:** TypeScript build green; partial-failure tests assert code
- **Committed in:** 2b7ed89

**2. [Rule 1 - Bug] Mask connection_string only, not entire response**
- **Found during:** Task 1 verification (create-app-db tests)
- **Issue:** `sanitizeFullProjection` on full response masked `env_key` to `***`
- **Fix:** Apply `sanitizeFullProjection` only to `{ connection_string }` wrapper
- **Files modified:** src/mcp/tools/recipe.ts
- **Verification:** `npx vitest run src/mcp/tools/recipe.test.ts -t create-app-db` green
- **Committed in:** 2b7ed89

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Required for typed errors and correct response shape; no scope creep

## TDD Gate Compliance

- RED gate: Wave 0 scaffolds from Plan 20-00 (`d049ac6`)
- GREEN gate: Task 1 commit `2b7ed89` — create-app-db tests pass (combined RED+GREEN per husky pre-commit precedent)

## Issues Encountered

None beyond env_key masking bug (resolved via Rule 1)

## User Setup Required

None

## Next Phase Readiness

- Phase 20 complete — RECIPE-01/02/03/04 shipped across Plans 20-01/20-02/20-03
- Ready for phase verification (`/gsd-verify-work 20`) and ship

## Self-Check: PASSED

- FOUND: src/mcp/tools/recipe.ts (handleCreateAppDb)
- FOUND: src/mcp/server.ts (registerTool recipe)
- FOUND: README.md (create-git-app|create-app-db|create-one-click)
- FOUND: 2b7ed89
- FOUND: fc87027
- FOUND: npx vitest run src/mcp/tools/recipe.test.ts → 28 passed
- FOUND: npx vitest run src/mcp/server.test.ts → 27 passed

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-24*
