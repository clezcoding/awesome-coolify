---
phase: 11-service-database-crud
plan: 03
subsystem: mcp
tags: [database-create, zod, 8-engine, instant-deploy, confirm-gate, masking, vitest]

requires:
  - phase: 11-service-database-crud
    provides: 8 create*Database client functions from 11-01
  - phase: 11-service-database-crud
    provides: Wave 0 database create RED scaffolds from 11-00
provides:
  - createDatabaseSchema with 8-engine discriminated union (D-08)
  - handleDatabaseCreate with D-12 confirm gate, D-11 instant_deploy, D-13 soft success
  - parseDatabaseAction + throwValidationError for SAF-03 create validation
  - SAF-04 credential masking on create responses via sanitizeFullProjection
affects: [11-04, 11-05]

tech-stack:
  added: []
  patterns:
    - "createDatabaseSchema nested engine discriminatedUnion inside action union (D-14)"
    - "withCreateRefines helper applies D-03 project/env + D-12 public confirm on all 8 variants"
    - "handleDatabaseCreate fire-and-forget triggerDatabaseStart with D-13 soft success envelope"

key-files:
  created: []
  modified:
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "Schema + handler shipped in single database.ts commit — same-file coupling per 11-02 precedent"
  - "throwValidationError maps create-only strict failures to COOLIFY_VALIDATION_ERROR — update RED scaffolds unchanged"
  - "baseDatabaseCreateScope split from postgres credential fields for 8-engine dispatch strict schema"

patterns-established:
  - "requireConfirmForPublicAccess schema gate — is_public:true requires confirm:true before any API call (D-12)"
  - "buildCreateSharedBody + buildEngineCredentialBody omit undefined curated fields per engine"

requirements-completed: [DB-01, DB-04]

coverage:
  - id: D1
    description: "8-engine create dispatches to matching create*Database client with instant_deploy default true"
    requirement: DB-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database create"
        status: pass
    human_judgment: false
  - id: D2
    description: "Public database create requires confirm:true; credentials masked unless reveal:true"
    requirement: DB-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database create COOLIFY_CONFIRM_REQUIRED|SAF-04"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed create payloads rejected with COOLIFY_VALIDATION_ERROR before client call"
    requirement: DB-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database create rejects"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 03: Database Create Handler Summary

**8-engine database create with D-12 public-access confirm gate, instant_deploy default true, SAF-04 masking, and D-13 soft success on start-queue failure**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T06:56:08Z
- **Completed:** 2026-07-19T06:59:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `createDatabaseSchema` as 8-variant `discriminatedUnion('engine', ...)` with `.strict()` and shared D-03/D-12 superRefines
- Implemented `handleDatabaseCreate` — project_name resolution, curated body per engine, fire-and-forget `triggerDatabaseStart`, masked responses
- Added `parseDatabaseAction` + `throwValidationError` for structured SAF-03 validation before API calls
- Flipped 15 Wave 0 `database create` RED scaffolds to GREEN (691 passed | 17 expected fail full suite); `npm run build` green

## Task Commits

1. **Task 1+2: createDatabaseSchema + handleDatabaseCreate** - `5cac84f` (feat)
2. **Task 2: Flip database create tests GREEN** - `e870c9e` (test)

## Files Created/Modified

- `src/mcp/tools/database.ts` - createDatabaseSchema, handleDatabaseCreate, parseDatabaseAction, engine dispatch helpers
- `src/mcp/tools/database.test.ts` - it.fails → it for create tests; baseDatabaseCreateScope split; triggerDatabaseStart mock

## Decisions Made

- Combined schema + handler in single feat commit (same-file coupling — mirrors 11-02 service create pattern)
- `throwValidationError` only defaults create (not update) to COOLIFY_VALIDATION_ERROR — preserves update RED scaffolds for 11-05
- Dispatch `it.each` uses scope-only payload without postgres credential fields for strict engine variants

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 8-engine dispatch test payload incompatible with strict schema**
- **Found during:** Task 2 (it.each dispatch tests)
- **Issue:** `baseDatabaseCreateFields` included postgres_* keys — strict mysql/mariadb/etc. variants rejected them
- **Fix:** Split `baseDatabaseCreateScope` for engine dispatch tests; keep postgres credentials on postgresql-specific tests
- **Files modified:** src/mcp/tools/database.test.ts
- **Verification:** `npx vitest run src/mcp/tools/database.test.ts -t "database create"` GREEN
- **Committed in:** e870c9e

**2. [Rule 3 - Blocking] throwValidationError update branch greened update RED scaffold**
- **Found during:** Task 1 pre-commit hook
- **Issue:** Mapping `action === 'update'` to COOLIFY_VALIDATION_ERROR made `rejects unknown update fields` it.fails pass accidentally
- **Fix:** Restrict default validation code mapping to `action === 'create'` only (matches service.ts)
- **Files modified:** src/mcp/tools/database.ts
- **Verification:** full suite 691 passed | 17 expected fail
- **Committed in:** 5cac84f

### Plan Structure

**Combined Task 1 schema + Task 2 handler in single database.ts commit** — same-file coupling per 11-02 precedent; test flips isolated in second commit.

## Issues Encountered

None beyond auto-fixed items above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 11-04/11-05: service update/delete + database update/delete — remaining it.fails scaffolds
- Database create surface complete for all 8 engines on existing `database` tool (D-14)

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-03-SUMMARY.md
- FOUND: src/mcp/tools/database.ts
- FOUND: src/mcp/tools/database.test.ts
- FOUND: 5cac84f
- FOUND: e870c9e

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
