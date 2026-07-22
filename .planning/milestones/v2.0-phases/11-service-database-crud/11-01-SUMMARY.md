---
phase: 11-service-database-crud
plan: 01
subsystem: api
tags: [ofetch, yaml, compose, service-crud, database-crud, base64, vitest]

requires:
  - phase: 11-service-database-crud
    provides: Wave 0 RED client specs in client.test.ts (11-00)
provides:
  - 13 service/database CRUD client functions (create/update/delete + 8 engine creators)
  - yaml-validator helper (encodeCompose, decodeCompose, validateCompose, projectServiceCompose)
  - yaml@^2.9.0 dependency for light YAML parse validation
affects: [11-02, 11-03, 11-04, 11-05]

tech-stack:
  added: [yaml@^2.9.0]
  patterns:
    - "Client payloads typed unknown — Zod handlers in 11-02+ own field allowlists"
    - "projectServiceCompose D-06 projection strips docker_compose_raw before agent sees response"
    - "decodeCompose regex-guards invalid base64 — returns empty string defensively"

key-files:
  created:
    - src/utils/yaml-validator.ts
    - src/utils/yaml-validator.test.ts
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - package.json
    - package-lock.json

key-decisions:
  - "decodeCompose validates base64 charset before Buffer decode — Node Buffer does not throw on invalid input"
  - "TDD RED+GREEN combined per task — flip it.fails to it alongside client implementation (10-01 pattern)"

patterns-established:
  - "Service/database CRUD client functions colocated after fetchService/fetchDatabase block"
  - "deleteService/deleteDatabase mirror deleteApplication query-param pattern for SAF-02 flags"

requirements-completed: [SVC-06, SVC-07, SVC-08, SVC-09, DB-01, DB-02, DB-03]

coverage:
  - id: D1
    description: "13 service/database CRUD client functions POST/PATCH/DELETE with createCoolifyClient + withMappedErrors"
    requirement: SVC-06
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#service and database CRUD"
        status: pass
    human_judgment: false
  - id: D2
    description: "yaml-validator encode/decode/validate/projectServiceCompose helper for D-06/D-07 compose I/O"
    requirement: SVC-08
    verification:
      - kind: unit
        ref: "src/utils/yaml-validator.test.ts"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 01: Wave 1 Foundation Summary

**13 service/database CRUD client functions + yaml-validator compose helper (encode/decode/validate/projectServiceCompose) using yaml@^2.9.0**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T06:48:00Z
- **Completed:** 2026-07-19T06:51:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added createService/updateService/deleteService + 8 engine database creators + updateDatabase/deleteDatabase to `src/api/client.ts`
- Flipped 13 Wave 0 RED client specs to GREEN (663 passed | 45 expected fail in full suite)
- Shipped yaml-validator with encodeCompose/decodeCompose/validateCompose/projectServiceCompose and 11 unit tests
- Handler RED scaffolds (45 it.fails in service/database tests) remain RED as expected — no handler changes in this plan

## Task Commits

1. **Task 1: Add 13 service+database CRUD client functions** - `744970f` (feat)
2. **Task 2: Add yaml-validator helper + yaml package** - `7c74b46` (feat)

## Files Created/Modified

- `src/api/client.ts` - 13 new CRUD exports after fetchService/fetchDatabase
- `src/api/client.test.ts` - Wave 0 RED specs flipped to `it`/`it.each`
- `src/utils/yaml-validator.ts` - compose encode/decode/validate + D-06 projection
- `src/utils/yaml-validator.test.ts` - 11 unit tests
- `package.json` / `package-lock.json` - yaml@^2.9.0 dependency

## Decisions Made

- decodeCompose uses base64 charset regex before Buffer decode — Node does not throw on invalid base64
- Combined implementation + test flip in single commits per husky pre-commit pattern (Phase 10-01)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] decodeCompose invalid-base64 guard**
- **Found during:** Task 2 (yaml-validator unit tests)
- **Issue:** `Buffer.from(invalid, 'base64')` does not throw — returns garbage bytes instead of empty string per D-06 defensive contract
- **Fix:** Added `/^[A-Za-z0-9+/]+={0,2}$/` charset check before decode; empty input returns `''`
- **Files modified:** src/utils/yaml-validator.ts
- **Verification:** `npx vitest run src/utils/yaml-validator.test.ts` GREEN
- **Committed in:** 7c74b46 (Task 2 commit)

## Issues Encountered

None beyond the decodeCompose edge case (documented as deviation).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 11-02: wire service create/update handlers using client CRUD + projectServiceCompose
- Plans 11-03/11-04/11-05: database handlers + service delete — flip remaining 45 it.fails scaffolds

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-01-SUMMARY.md
- FOUND: src/api/client.ts
- FOUND: src/utils/yaml-validator.ts
- FOUND: src/utils/yaml-validator.test.ts
- FOUND: 744970f
- FOUND: 7c74b46

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
