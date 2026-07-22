---
phase: 11-service-database-crud
plan: 02
subsystem: mcp
tags: [service-create, compose, base64, zod, instant-deploy, vitest, COOLIFY_409]

requires:
  - phase: 11-service-database-crud
    provides: createService client + yaml-validator helpers from 11-01
  - phase: 11-service-database-crud
    provides: Wave 0 service create RED scaffolds from 11-00
provides:
  - createActionSchema with type XOR compose/compose_file validation (D-01, D-03, D-04, SAF-03)
  - handleServiceCreate one-click + custom compose paths (SVC-06, SVC-07)
  - instant_deploy default true fire-and-forget + soft success on queue failure (D-11, D-13)
  - 409 domain conflict COOLIFY_409 + force_domain_override hint (SVC-10, D-19)
  - projectServiceCompose on create response and service.get full projection (D-06)
affects: [11-03, 11-04, 11-05]

tech-stack:
  added: []
  patterns:
    - "readFileSync for compose_file — mirrors private_key key_file pattern and Wave 0 test mocks"
    - "parseServiceAction + throwValidationError maps create strict/superRefine to COOLIFY_VALIDATION_ERROR"
    - "handleServiceCreate soft-success on triggerServiceStart failure — no auto-rollback (D-13)"

key-files:
  created: []
  modified:
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts

key-decisions:
  - "readFileSync (not fs.promises.readFile) for compose_file — matches private_key.ts and existing test vi.mock"
  - "409 force_domain_override hint appended in handler catch when conflicts present — redundant with toStructuredError but mirrors Phase 10 create handler"
  - "Schema + handler shipped in single service.ts commit; test flips in second commit (same-file coupling)"

patterns-established:
  - "requireServiceCreateSource XOR helper colocated in service.ts (copy-paste from application requireProjectAndEnvironment per D-17)"
  - "Create response merges projected compose + deploy status envelope via buildReadResponse"

requirements-completed: [SVC-06, SVC-07, SVC-10]

coverage:
  - id: D1
    description: "createActionSchema rejects type/compose XOR violations and missing project/env before API call"
    requirement: SVC-07
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service create rejects"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleServiceCreate one-click and compose paths with transparent base64 encode"
    requirement: SVC-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service create creates"
        status: pass
    human_judgment: false
  - id: D3
    description: "409 domain conflicts map to COOLIFY_409 with force_domain_override recovery hint"
    requirement: SVC-10
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service create maps HTTP 409"
        status: pass
    human_judgment: false
  - id: D4
    description: "service.get and create responses expose decoded compose via projectServiceCompose (D-06)"
    requirement: SVC-07
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service get compose decode|returns decoded compose on create"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 02: Service Create Handler Summary

**Service create with one-click type XOR compose paths, transparent base64 encode, instant_deploy default true, and D-06 compose decode on create/get responses**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T06:52:00Z
- **Completed:** 2026-07-19T06:55:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `createActionSchema` with type XOR compose/compose_file superRefines, project/env required fields, instant_deploy default true, force_domain_override default false
- Implemented `handleServiceCreate` — compose validation/encode, project_name resolution, fire-and-forget instant_deploy, soft success on start queue failure
- Wired `projectServiceCompose` into create 201 response and existing `service.get` full projection (D-06)
- Flipped 13 Wave 0 `service create` + 1 D-06 get RED scaffolds to GREEN (676 passed | 32 expected fail full suite)

## Task Commits

1. **Task 1: Add createActionSchema — one-click type XOR compose** - `1577b29` (feat)
2. **Task 2: Implement handleServiceCreate + flip tests GREEN** - `55091ef` (feat)

## Files Created/Modified

- `src/mcp/tools/service.ts` - createActionSchema, handleServiceCreate, parseServiceAction, D-06 get projection
- `src/mcp/tools/service.test.ts` - flipped 14 it.fails → it for create + get compose decode

## Decisions Made

- Used `readFileSync` for `compose_file` to match `private_key.ts` and Wave 0 test mocks (plan specified `fs.promises.readFile`)
- Combined schema + handler in Task 1 commit file (same-file); test flips isolated to Task 2 commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] readFileSync instead of fs.promises.readFile for compose_file**
- **Found during:** Task 2 (compose_file read path)
- **Issue:** Plan specified `fs.promises.readFile`; Wave 0 tests mock `readFileSync` and `private_key.ts` uses sync read for local path XOR pattern
- **Fix:** Used `readFileSync(path, 'utf8')` with 1 MiB size cap and COOLIFY_VALIDATION_ERROR on read failure
- **Files modified:** src/mcp/tools/service.ts
- **Verification:** `reads compose_file and encodes to base64` test GREEN
- **Committed in:** 1577b29

None other — plan executed as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 11-03/11-04: service update/delete handlers — remaining service it.fails scaffolds
- Plan 11-05: database create/update/delete handlers

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-02-SUMMARY.md
- FOUND: src/mcp/tools/service.ts
- FOUND: src/mcp/tools/service.test.ts
- FOUND: 1577b29
- FOUND: 55091ef

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
