---
phase: 10-application-crud-safety
plan: 02
subsystem: api
tags: [application-create, zod, discriminated-union, instant-deploy, tdd, wave-2]

requires:
  - phase: 10-application-crud-safety
    provides: Wave 1 CRUD client functions + COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough (10-01)
provides:
  - createActionSchema 5-variant discriminatedUnion by source_type
  - handleApplicationCreate dispatcher with instant_deploy fire-and-forget
  - 409 force_domain_override recovery hint on domain conflicts
  - 11 GREEN application create handler tests (Wave 0 scaffolds flipped)
affects: [10-03, 10-04, 11-service-database-create]

tech-stack:
  added: []
  patterns:
    - "createActionSchema nested via z.union(lifecycleDiscriminatedUnion, createDiscriminatedUnion)"
    - "parseApplicationAction safeParse + throwValidationError inside handleApplicationAction try/catch"
    - "instant_deploy fire-and-forget triggerDeploy with soft success on queue failure (D-08)"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/utils/errors.ts
    - src/mcp/tools/application.test.ts
    - tests/integration/logs-service-db-flow.test.ts

key-decisions:
  - "Schema + handler combined in Task 1 commit — husky full-suite pre-commit (same 10-01 deviation)"
  - "409 force_domain_override hint appended in toStructuredError when conflicts array present — shared by create/update paths"
  - "applicationActionSchema outer z.union — five create variants share action:create discriminator value"

patterns-established:
  - "requireProjectAndEnvironment + rejectDockercomposeBuildPack superRefine helpers on create variants"
  - "buildCreateApiBody resolves project_name via resolveProjectUuid before POST dispatch"

requirements-completed: [APP-12, APP-13, APP-14, APP-15, APP-16, APP-20, APP-21, SAF-03]

coverage:
  - id: D1
    description: "createActionSchema 5 source_type variants with project/env/dockercompose validation"
    requirement: SAF-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application create"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleApplicationCreate dispatches to correct create* client per source_type"
    requirement: APP-12
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application create"
        status: pass
    human_judgment: false
  - id: D3
    description: "instant_deploy fire-and-forget with follow-up hints; soft success on queue failure"
    requirement: APP-20
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#instant_deploy"
        status: pass
    human_judgment: false
  - id: D4
    description: "409 domain conflicts map to COOLIFY_409 with force_domain_override recovery hint"
    requirement: APP-21
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#409"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-19
status: complete
---

# Phase 10 Plan 02: Application Create Handler Summary

**Five-variant application create handler with Zod gate, instant_deploy fire-and-forget, and 409 force_domain_override recovery**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-19T04:59:21Z
- **Completed:** 2026-07-19T05:04:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `createActionSchema` as `z.discriminatedUnion('source_type', [...])` with five strict variants (public_git, private_deploy_key, private_github_app, dockerfile, dockerimage)
- Shared `requireProjectAndEnvironment` and `rejectDockercomposeBuildPack` superRefines emit `COOLIFY_VALIDATION_ERROR` before any API call (D-02, D-04, SAF-03)
- Implemented `handleApplicationCreate` — resolves project_name, builds curated body, dispatches to five create* clients, instant_deploy fire-and-forget via `triggerDeploy`, soft success on queue failure (D-08)
- Flipped 11 Wave 0 `it.fails` create scaffolds to GREEN; 624 passed | 14 expected fail full suite; build green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add createActionSchema — 5-variant discriminated union** - `57b8dca` (feat)
2. **Task 2: Implement handleApplicationCreate — dispatcher, instant_deploy, 409, hints** - `cf0f9dc` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.ts` — createActionSchema, parseApplicationAction, handleApplicationCreate, z.union applicationActionSchema
- `src/utils/errors.ts` — append force_domain_override hint when 409 conflicts array present
- `src/mcp/tools/application.test.ts` — flip 11 create tests GREEN; logs validation uses error envelope
- `tests/integration/logs-service-db-flow.test.ts` — align logs superRefine tests with error envelope

## Decisions Made

- Schema + handler combined in Task 1 commit — husky runs full vitest on pre-commit (documented deviation, same root cause as 10-01)
- 409 force_domain_override hint in `toStructuredError` globally when conflicts present — benefits create and future update 409 paths
- Outer `z.union` for applicationActionSchema — nested create discriminatedUnion cannot share single `action` literal with five variants

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Combined schema + handler in Task 1 commit**
- **Found during:** Task 1 commit attempt
- **Issue:** Pre-commit runs full vitest; flipped create tests require handler to pass
- **Fix:** Committed schema + handleApplicationCreate together in 57b8dca; test flips in cf0f9dc
- **Files modified:** src/mcp/tools/application.ts
- **Verification:** 624 passed | 14 expected fail; npm run build green
- **Committed in:** 57b8dca

**2. [Rule 1 - Bug] Log validation tests expected throw; parse now returns error envelope**
- **Found during:** Task 1 pre-commit
- **Issue:** parseApplicationAction inside try/catch returns wrapMcpError instead of throwing ZodError
- **Fix:** Updated application.test.ts + logs-service-db-flow integration tests to assert isApplicationErrorResult
- **Files modified:** src/mcp/tools/application.test.ts, tests/integration/logs-service-db-flow.test.ts
- **Committed in:** cf0f9dc

**3. [Rule 1 - Bug] Dockerfile create test payload incompatible with strict schema**
- **Found during:** Task 2 test run
- **Issue:** Test included git_repository/git_branch on dockerfile variant — strict schema rejects unknown keys
- **Fix:** Removed git fields from dockerfile create test payload (OpenAPI: Dockerfile without git)
- **Files modified:** src/mcp/tools/application.test.ts
- **Committed in:** cf0f9dc

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** Commit hygiene + test alignment only; create behavior matches plan; no scope change

## TDD Gate Compliance

- RED gate: Wave 0 it.fails scaffolds from 10-00
- GREEN gate: feat(10-application-crud-safety-02) commits 57b8dca, cf0f9dc flip create tests GREEN
- Note: Combined schema+handler in first commit due to husky — gate intent preserved

## Issues Encountered

None beyond pre-commit blocking (resolved via combined commit deviation)

## User Setup Required

None

## Next Phase Readiness

- Plan 10-03 can wire update handler using same parseApplicationAction + COOLIFY_VALIDATION_ERROR patterns
- Plan 10-04 can wire delete/delete_preview handlers
- 14 update/delete it.fails scaffolds remain RED until 10-03/10-04

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts (createActionSchema + handleApplicationCreate)
- FOUND: src/utils/errors.ts (409 force_domain_override hint)
- FOUND: 57b8dca
- FOUND: cf0f9dc
- FOUND: npm run build green
- FOUND: 11 application create tests GREEN

---
*Phase: 10-application-crud-safety*
*Completed: 2026-07-19*
