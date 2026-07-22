---
phase: 09-project-environment-crud
plan: 00
subsystem: testing
tags: [vitest, tdd, project, environment, wave-0, red-scaffold]

requires:
  - phase: 08-keys-server-crud
    provides: RED scaffold pattern, confirm-gate tests, delete_preview tests
provides:
  - RED vitest scaffold for project tool (PROJ-01..03, D-01..D-11, D-14)
  - RED vitest scaffold for environment tool (PROJ-04..05, D-03, D-05..D-08, D-12, D-13, D-15)
affects: [09-01, 09-02, 09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED: test files import non-existent handlers; vitest fails at module load"
    - "SC#4 integration asserts resource.list type=environment after environment.create"

key-files:
  created:
    - src/mcp/tools/project.test.ts
    - src/mcp/tools/environment.test.ts
  modified: []

key-decisions:
  - "15 project it() blocks cover list/get/create/update/delete/delete_preview plus initial_environment 422 gates"
  - "17 environment it() blocks cover deleting/destroying child pre-check (RESEARCH pitfall 2) and SC#4 resource.list integration"
  - "Prohibition tests reject environment update action and force:true on delete schemas"

patterns-established:
  - "Pattern: RED scaffold imports ./project.js and ./environment.js before handlers exist — 09-02/09-03 flip GREEN without test rewrites"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05]

coverage:
  - id: D1
    description: "project.test.ts RED scaffold with 15 behaviors for PROJ-01..03 and locked decisions"
    requirement: PROJ-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/project.test.ts (exit 1 — module load fail)"
        status: pass
      - kind: other
        ref: "grep -c '^  it(' src/mcp/tools/project.test.ts >= 12"
        status: pass
    human_judgment: false
  - id: D2
    description: "environment.test.ts RED scaffold with 17 behaviors including SC#4 resource.list integration"
    requirement: PROJ-04
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/environment.test.ts (exit 1 — module load fail)"
        status: pass
      - kind: other
        ref: "grep -c '^  it(' src/mcp/tools/environment.test.ts >= 11"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 00: Wave 0 RED Test Scaffolds Summary

**Two failing vitest files lock PROJ-01..05 and D-01..D-15 before project/environment handlers exist**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T03:21:21Z
- **Completed:** 2026-07-17T03:29:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `project.test.ts` — 15 `it()` blocks covering list/get/create/update/delete/delete_preview, initial_environment required (422), staging create path, COOLIFY_409 on non-empty delete, no-force schema
- `environment.test.ts` — 17 `it()` blocks covering scoped list/get/create/delete/delete_preview, duplicate-name 409, deleting/destroying child hard-block, SC#4 resource.list-after-create integration
- Both files fail RED at import (`./project.js` / `./environment.js` missing) — ready for 09-02/09-03 GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RED project.test.ts scaffold** - `6c491e8` (test)
2. **Task 2: Create RED environment.test.ts scaffold** - `1156557` (test)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/tools/project.test.ts` — RED vitest for project handler (PROJ-01..03, D-01..D-11, D-14)
- `src/mcp/tools/environment.test.ts` — RED vitest for environment handler (PROJ-04..05, D-03, D-05..D-08, D-12, D-13, D-15)

## Decisions Made

- Followed private_key.test.ts mock/assertion patterns from Phase 8
- SC#4 integration imports handleResourceAction from resource.js in environment.test.ts
- Prohibition enforced via schema rejection tests (no update action, no force:true success)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete — 09-01 can add API client CRUD + shared infrastructure
- 09-02/09-03 have full behavioral spec in test files; only need handlers to flip GREEN
- Combined RED verify: `npx vitest run src/mcp/tools/project.test.ts src/mcp/tools/environment.test.ts` exits 1 (expected)

## Self-Check: PASSED

- [x] `project.test.ts` exists — 15 `it()` blocks
- [x] `environment.test.ts` exists — 17 `it()` blocks
- [x] Both vitest runs fail RED (import error for missing handlers)
- [x] Task commits: 6c491e8, 1156557

---
*Phase: 09-project-environment-crud*
*Completed: 2026-07-17*
