---
phase: 10-application-crud-safety
plan: 00
subsystem: testing
tags: [vitest, tdd, application, wave-0, red-scaffold]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: resolveAppMutationUuid, lifecycle mutation patterns
  - phase: 08-keys-server-crud
    provides: delete_preview + confirm gate test patterns
  - phase: 09-project-environment-crud
    provides: CRUD RED scaffold precedent
provides:
  - 25 it.fails RED tests in application.test.ts covering APP-12..21 and SAF-01..04
  - Extended vi.mock client stubs for 7 CRUD functions (10-01 target)
affects: [10-01, 10-02, 10-03, 10-04]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED via vitest it.fails — flip to it when handlers land in 10-02/10-03/10-04"
    - "Client mock stubs ahead of 10-01 API client implementation"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.test.ts

key-decisions:
  - "Used it.fails instead of bare it so husky pre-commit (full vitest) stays green while handlers absent"
  - "deleteApplication mock assertion includes all four SAF-02 flags including delete_connected_networks:false"

patterns-established:
  - "application create/update/delete/delete_preview describe blocks mirror Phase 8/9 Wave 0 layout"
  - "409 conflict tests use ofetch-shaped reject with response.status 409 and response._data.conflicts"

requirements-completed: [APP-12, APP-13, APP-14, APP-15, APP-16, APP-17, APP-18, APP-19, APP-20, APP-21, SAF-01, SAF-02, SAF-03, SAF-04]

coverage:
  - id: D1
    description: "11 RED create scaffolds (five source types, instant_deploy, 409/override, Zod validation)"
    requirement: APP-12
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application create"
        status: pass
    human_judgment: false
  - id: D2
    description: "14 RED update/delete/delete_preview scaffolds (basic auth, masking, confirm, safe defaults, identity)"
    requirement: APP-17
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application update|delete|delete_preview"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-19
status: complete
---

# Phase 10 Plan 00: Wave 0 RED Test Scaffolds Summary

**25 vitest it.fails RED scaffolds in application.test.ts covering all Phase 10 requirements before handler implementation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-19T04:48:38Z
- **Completed:** 2026-07-19T04:54:10Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Extended `application.test.ts` with `describe('application create')` — 11 `it.fails` cases (APP-12..16, APP-20, APP-21 409 + override, SAF-03, D-02, D-04)
- Added `describe('application update')` — 9 `it.fails` cases (APP-17, APP-19, SAF-03/04, APP-21, D-21)
- Added `describe('application delete')` — 4 `it.fails` cases (APP-18, SAF-01, SAF-02 with all four flags, D-21)
- Added `describe('application delete_preview')` — 1 `it.fails` case (Phase 8/9 parity)
- Extended `vi.mock('../../api/client.js')` with 7 CRUD function stubs for plan 10-01

## Task Commits

Each task was committed atomically:

1. **Task 1: RED create scaffolds** - `11020cb` (test)
2. **Task 2: RED update/delete/delete_preview scaffolds** - `e89e7d2` (test)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.test.ts` — Wave 0 RED scaffolds; 599 existing tests green, 25 expected-fail

## Decisions Made

- Used `it.fails` instead of bare `it` so husky pre-commit (`npm test`) passes while handlers are absent; plans 10-02/10-03/10-04 flip each block to `it` when GREEN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched RED scaffolds to vitest it.fails for pre-commit compatibility**
- **Found during:** Task 1 commit attempt
- **Issue:** Husky runs full `vitest run`; bare `it` RED tests fail the hook (added after Phase 8/9 Wave 0)
- **Fix:** Mark all 25 new scaffolds as `it.fails` — tests still fail at runtime (expected-fail) but suite exits 0; flip to `it` in 10-02/10-03/10-04
- **Files modified:** src/mcp/tools/application.test.ts
- **Verification:** `npm test` → 599 passed | 25 expected fail
- **Committed in:** 11020cb, e89e7d2

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for commit hygiene; RED contract preserved via expected-fail semantics

## TDD Gate Compliance

- RED gate: `test(10-application-crud-safety-00)` commits present (11020cb, e89e7d2)
- GREEN gate: deferred to plans 10-02/10-03/10-04 per Wave 0 contract

## Issues Encountered

None beyond pre-commit blocking (resolved via it.fails deviation)

## User Setup Required

None

## Next Phase Readiness

- Plan 10-01 can add real client functions matching the 7 mock stubs
- Plans 10-02/10-03/10-04 flip RED scaffolds GREEN without test rewrites (change `it.fails` → `it`)

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.test.ts
- FOUND: 11020cb
- FOUND: e89e7d2
- FOUND: describe('application create') x1
- FOUND: describe('application update') x1
- FOUND: describe('application delete') x1

---
*Phase: 10-application-crud-safety*
*Completed: 2026-07-19*
