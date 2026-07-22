---
phase: 10-application-crud-safety
plan: 01
subsystem: api
tags: [coolify-api, client, errors, tdd, wave-1]

requires:
  - phase: 10-application-crud-safety
    provides: Wave 0 RED scaffolds + client mock stubs in application.test.ts
provides:
  - 7 application CRUD client functions in src/api/client.ts
  - COOLIFY_VALIDATION_ERROR code + RECOVERY_HINTS in src/utils/errors.ts
  - 409 domain conflict enrichment via data.conflicts passthrough
affects: [10-02, 10-03, 10-04]

tech-stack:
  added: []
  patterns:
    - "Application create routes POST /applications/<route> with unknown payload — handler owns Zod"
    - "deleteApplication mirrors deleteServer query-param pattern for SAF-02 flags"
    - "409 conflicts enrichment in toStructuredError — statusToCode unchanged"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts

key-decisions:
  - "TDD RED+GREEN combined per task — husky pre-commit runs full vitest; test-only RED commits blocked (same pattern as 10-00 it.fails deviation)"
  - "conflicts array not redacted in wrapMcpError — domain/resource names are not secrets per OpenAPI 409 schema"

patterns-established:
  - "Application CRUD client block colocated after fetchApplicationLogs in client.ts"
  - "extractConflicts sibling to extractCoolifyMessage for 409 domain vs dependency distinction"

requirements-completed: [APP-12, APP-13, APP-14, APP-15, APP-16, APP-17, APP-18, APP-21]

coverage:
  - id: D1
    description: "7 application CRUD client functions POST/PATCH/DELETE via createCoolifyClient"
    requirement: APP-12
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#application CRUD"
        status: pass
    human_judgment: false
  - id: D2
    description: "COOLIFY_VALIDATION_ERROR code with dockercompose → service.create recovery hint"
    requirement: APP-16
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#COOLIFY_VALIDATION_ERROR"
        status: pass
    human_judgment: false
  - id: D3
    description: "409 domain conflict enrichment passes conflicts array through error envelope"
    requirement: APP-21
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#409 conflicts passthrough"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-19
status: complete
---

# Phase 10 Plan 01: Wave 1 API Client + Error Foundation Summary

**7 application CRUD client functions + COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough for Phase 10 handlers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-19T04:55:00Z
- **Completed:** 2026-07-19T05:03:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `createPublicApplication`, `createPrivateGithubAppApplication`, `createPrivateDeployKeyApplication`, `createDockerfileApplication`, `createDockerimageApplication` — each POSTs to `/applications/<route>` with JSON body
- Added `updateApplication` PATCH `/applications/{uuid}` and `deleteApplication` DELETE with SAF-02 query params
- Added `COOLIFY_VALIDATION_ERROR` to union + RECOVERY_HINTS (MCP Zod rejection + dockercompose → service.create)
- Extended `toStructuredError` with `extractConflicts` — HTTP 409 responses with `conflicts` array attach `data.conflicts` verbatim
- 25 Wave 0 RED scaffolds in `application.test.ts` remain expected-fail (handlers not wired)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 7 application CRUD client functions** - `284f403` (feat)
2. **Task 2: Add COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough** - `1886a5d` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/api/client.ts` — 7 new exported CRUD functions after fetchApplicationLogs block
- `src/api/client.test.ts` — 8 new unit tests for application CRUD routes
- `src/utils/errors.ts` — COOLIFY_VALIDATION_ERROR, extractConflicts, 409 enrichment in toStructuredError
- `src/utils/errors.test.ts` — 6 new tests for validation code and conflicts passthrough

## Decisions Made

- TDD RED+GREEN combined per task commit — husky runs full vitest on pre-commit; isolated RED test commits fail the hook (documented deviation, same root cause as 10-00 it.fails)
- Conflicts array passed through without redaction — OpenAPI 409 schema contains domain/resource names only, not secrets

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Combined TDD RED+GREEN commits due to pre-commit hook**
- **Found during:** Task 1 commit attempt
- **Issue:** Staging test-only changes triggers husky `npm test`; 8 new bare `it` tests fail because functions not yet implemented
- **Fix:** Implemented functions in same session; committed test+implementation together per task (feat commits)
- **Files modified:** src/api/client.ts, src/api/client.test.ts, src/utils/errors.ts, src/utils/errors.test.ts
- **Verification:** 613 passed | 25 expected fail; npm run build green
- **Committed in:** 284f403, 1886a5d

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Commit hygiene adaptation only; TDD behavior verified before each commit; no scope change

## TDD Gate Compliance

- RED gate: tests written before implementation in both tasks; separate test-only commits blocked by pre-commit
- GREEN gate: `feat(10-application-crud-safety-01)` commits present (284f403, 1886a5d)
- Note: Combined RED+GREEN per commit due to husky — gate intent preserved (tests fail before impl, pass after)

## Issues Encountered

None beyond pre-commit blocking (resolved via combined commit deviation)

## User Setup Required

None

## Next Phase Readiness

- Plan 10-02 can wire create handlers importing the 7 client functions
- Plan 10-03/10-04 can use updateApplication/deleteApplication + COOLIFY_VALIDATION_ERROR / conflicts enrichment
- Wave 0 RED scaffolds still expected-fail until handlers land

## Self-Check: PASSED

- FOUND: src/api/client.ts (7 CRUD exports)
- FOUND: src/utils/errors.ts (COOLIFY_VALIDATION_ERROR + conflicts)
- FOUND: 284f403
- FOUND: 1886a5d
- FOUND: npm run build green
- FOUND: 25 application.test.ts expected-fail unchanged

---
*Phase: 10-application-crud-safety*
*Completed: 2026-07-19*
