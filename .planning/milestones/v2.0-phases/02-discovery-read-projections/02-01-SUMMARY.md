---
phase: 02-discovery-read-projections
plan: 01
subsystem: api
tags: [projections, formatters, pagination, truncation, zod, mcp]

requires:
  - phase: 01-foundation-multi-instance-auth
    provides: Coolify client, Zod action schema pattern, structured errors
provides:
  - D-05/D-06 summary projectors for resources, apps, services, databases
  - D-07 resolveProjection and parseReadParams include_full alias
  - D-09/D-10 formatOutput pretty/json/table renderer
  - D-14/D-15/D-16 truncateAndGuard, paginateArray, applySizeWarning
  - D-21 sharedReadParamsSchema spreadable into read tool actions
affects: [02-02, 02-03, 02-04, 02-05]

tech-stack:
  added: []
  patterns:
    - "Bounded projection mapping: raw API JSON → summary/full with secret mask"
    - "Shared read params schema spread into Zod discriminatedUnion actions"
    - "buildReadResponse pipeline: format → truncate → size warning"

key-files:
  created:
    - src/utils/projections.ts
    - src/utils/projections.test.ts
    - src/utils/formatters.ts
    - src/utils/formatters.test.ts
    - src/mcp/tools/shared-read-params.ts
    - src/mcp/tools/shared-read-params.test.ts
  modified: []

key-decisions:
  - "sanitizeFullProjection masks password/token/secret/private/env keys recursively — OUT-02 reveal deferred to Phase 6"
  - "truncateAndGuard caps final text at max_chars even when footer exceeds small limits"
  - "parseReadParams delegates projection resolution to resolveProjection per D-07"

patterns-established:
  - "Projection layer: projectResourceSummary + per-type get summaries + sanitizeFullProjection for full mode"
  - "Formatter layer: zero-dependency pad table + paginateArray + truncateAndGuard + applySizeWarning at 80%"
  - "Shared read params: sharedReadParamsSchema object spread + parseReadParams normalization"

requirements-completed: [OUT-01, OUT-03, OUT-04, OUT-05, DX-03]

coverage:
  - id: D1
    description: "D-05 resource summary projector with health field derivation"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#projectResourceSummary"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-06 per-type application/service/database summary projectors"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#projectApplicationSummary"
        status: pass
      - kind: unit
        ref: "src/utils/projections.test.ts#projectServiceSummary"
        status: pass
      - kind: unit
        ref: "src/utils/projections.test.ts#projectDatabaseSummary"
        status: pass
    human_judgment: false
  - id: D3
    description: "sanitizeFullProjection recursive secret masking for full projection"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#sanitizeFullProjection"
        status: pass
    human_judgment: false
  - id: D4
    description: "resolveProjection and parseReadParams include_full alias per D-07"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#resolveProjection"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/shared-read-params.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "formatOutput pretty/json/table with pretty default per D-09"
    requirement: OUT-01
    verification:
      - kind: unit
        ref: "src/utils/formatters.test.ts#formatOutput"
        status: pass
    human_judgment: false
  - id: D6
    description: "paginateArray client-side pagination defaults page 1 per_page 10 max 100"
    requirement: OUT-05
    verification:
      - kind: unit
        ref: "src/utils/formatters.test.ts#paginateArray"
        status: pass
    human_judgment: false
  - id: D7
    description: "truncateAndGuard max_chars cap with truncated flag and recovery hint"
    requirement: OUT-03
    verification:
      - kind: unit
        ref: "src/utils/formatters.test.ts#truncateAndGuard"
        status: pass
    human_judgment: false
  - id: D8
    description: "applySizeWarning 80% threshold advisory per DX-03/D-16"
    requirement: DX-03
    verification:
      - kind: unit
        ref: "src/utils/formatters.test.ts#applySizeWarning"
        status: pass
    human_judgment: false
  - id: D9
    description: "sharedReadParamsSchema spreadable with D-21 defaults"
    requirement: OUT-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/shared-read-params.test.ts"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 01: Shared Projections, Formatters, Read Params Summary

**Bounded projection and formatter pipeline — summary/full filtering, pagination, format rendering, max_chars guard, and shared Zod read params for all Phase 2 discovery tools.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-12T02:20:36Z
- **Completed:** 2026-07-12T02:24:22Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Projection helpers (`projectResourceSummary`, per-type summaries, `sanitizeFullProjection`, `resolveProjection`) with D-05 health derivation
- Formatter layer (`formatOutput`, `paginateArray`, `truncateAndGuard`, `applySizeWarning`, `buildReadResponse`) for OUT-01/OUT-03/OUT-05/DX-03
- `sharedReadParamsSchema` + `parseReadParams` ready for resource/application/service/database/system handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Projection helpers and summary field tests** - `82e9e2a` (feat)
2. **Task 2: Formatter pagination truncation and size-warning tests** - `3db8278` (feat)
3. **Task 3: Shared read params Zod schema** - `c238b9e` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/utils/projections.ts` - D-05/D-06 summary projectors, secret mask, projection resolver
- `src/utils/projections.test.ts` - 13 unit tests for projection behavior
- `src/utils/formatters.ts` - Format/pagination/truncation/size-warning pipeline
- `src/utils/formatters.test.ts` - 13 unit tests for formatter behavior
- `src/mcp/tools/shared-read-params.ts` - D-21 shared Zod schema + parseReadParams
- `src/mcp/tools/shared-read-params.test.ts` - 5 unit tests for defaults and alias resolution

## Decisions Made

- sanitizeFullProjection uses `/password|token|secret|private|env/i` key pattern — full OUT-02 reveal deferred to Phase 6
- truncateAndGuard hard-caps output length when footer would exceed small max_chars values
- buildReadResponse exported as reusable helper for downstream P2 tool handlers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shared pipeline ready for 02-02 (infrastructure overview + resource.list)
- Handlers in 02-02 through 02-05 can import projections, formatters, and sharedReadParamsSchema
- Full test suite passes (68 tests)

## Self-Check: PASSED

- `npx vitest run src/utils/projections.test.ts` — 13 passed
- `npx vitest run src/utils/formatters.test.ts` — 13 passed
- `npx vitest run src/mcp/tools/shared-read-params.test.ts` — 5 passed
- `npx vitest run` — 68 passed

---
*Phase: 02-discovery-read-projections*
*Completed: 2026-07-12*
