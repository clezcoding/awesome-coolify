---
phase: 11-service-database-crud
plan: 00
subsystem: testing
tags: [vitest, tdd, service-crud, database-crud, wave-0, it.fails]

requires:
  - phase: 10-application-crud-safety
    provides: RED scaffold pattern with it.fails, confirm/safe-delete/masking test contracts
provides:
  - 21 service CRUD RED scaffolds (SVC-06..SVC-10, D-06, D-18)
  - 24 database CRUD RED scaffolds (DB-01..DB-04, D-18, SAF-04)
  - 13 client CRUD RED specs for plan 11-01
affects: [11-01, 11-02, 11-03, 11-04, 11-05]

tech-stack:
  added: []
  patterns:
    - "Wave 0 it.fails RED scaffolds — husky green, flip to it in 11-02/11-03/11-04/11-05"
    - "client.test.ts namespace import for pre-export RED specs"

key-files:
  created: []
  modified:
    - src/mcp/tools/service.test.ts
    - src/mcp/tools/database.test.ts
    - src/api/client.test.ts

key-decisions:
  - "it.fails for all new CRUD tests — mirrors Phase 10-00; pre-commit npm test stays green"
  - "fetchResources (not fetchServices/fetchDatabases) for D-18 ambiguous-match mocks — matches existing resolve* helpers"

patterns-established:
  - "service/database vi.mock extended with 13 new client function stubs before 11-01"
  - "D-06 compose decode tests mock docker_compose_raw base64, assert decoded compose field"

requirements-completed: [SVC-06, SVC-07, SVC-08, SVC-09, SVC-10, DB-01, DB-02, DB-03, DB-04]

coverage:
  - id: D1
    description: "service.test.ts RED scaffolds for create/update/delete/delete_preview (SVC-06..SVC-10, D-06, D-18)"
    requirement: SVC-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service create|update|delete|delete_preview"
        status: pass
    human_judgment: false
  - id: D2
    description: "database.test.ts RED scaffolds for 8-engine create, update, delete, delete_preview (DB-01..DB-04)"
    requirement: DB-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database create|update|delete|delete_preview"
        status: pass
    human_judgment: false
  - id: D3
    description: "client.test.ts RED specs for 13 service/database CRUD client functions"
    requirement: SVC-06
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#service and database CRUD (Wave 0 RED)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 00: Wave 0 RED Scaffolds Summary

**58 it.fails RED tests for service/database CRUD handlers + 13 client HTTP specs — flip GREEN in plans 11-01 through 11-05**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-19T06:44:05Z
- **Completed:** 2026-07-19T06:48:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended `service.test.ts` with 21 `it.fails` tests covering one-click/compose create, base64 encode, D-06 decode, 409 conflicts, confirm gates, safe delete defaults, ambiguous match
- Extended `database.test.ts` with 24 `it.fails` tests covering 8-engine dispatcher, instant_deploy default true, public access confirm gate, masking, update-path confirm gate
- Added 13 `it.fails` client specs asserting POST/PATCH/DELETE routes before exports ship in 11-01
- Full suite: 639 passed | 58 expected fail (697 total); `npm run build` green

## Task Commits

1. **Task 1: service.test.ts RED scaffolds** - `8d97079` (test)
2. **Task 2: database.test.ts RED scaffolds** - `05e6416` (test)
3. **Task 3: client.test.ts RED specs** - `1e9f67b` (test)

## Files Created/Modified

- `src/mcp/tools/service.test.ts` - vi.mock + 21 it.fails CRUD/D-06/D-18 scaffolds
- `src/mcp/tools/database.test.ts` - vi.mock + 24 it.fails CRUD/SAF-04 scaffolds
- `src/api/client.test.ts` - 13 it.fails HTTP routing specs via namespace import

## Decisions Made

- Used `it.fails` (Phase 10-00 precedent) so husky `npm test` pre-commit hook stays green while handlers absent
- D-18 ambiguous-match mocks use `fetchResources` to match existing `resolveServiceMutationUuid` / `resolveDatabaseUuid` implementation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 11-01: ship 13 client CRUD functions — flip client.test.ts RED specs to `it`
- Plans 11-02/11-04/11-05: implement handlers/schemas — flip service/database `it.fails` to `it` without test rewrites

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-00-SUMMARY.md
- FOUND: src/mcp/tools/service.test.ts
- FOUND: src/mcp/tools/database.test.ts
- FOUND: src/api/client.test.ts
- FOUND: 8d97079
- FOUND: 05e6416
- FOUND: 1e9f67b

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
