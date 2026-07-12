---
phase: 02-discovery-read-projections
plan: 03
subsystem: api
tags: [mcp, application-get, service-get, database-get, projections, coolify-api]

requires:
  - phase: 02-discovery-read-projections
    provides: Shared projections, formatters, sharedReadParamsSchema from 02-01; resource.list from 02-02
provides:
  - fetchApplication fetchService fetchDatabase API client helpers
  - application.get service.get database.get with summary/full projections per D-06 D-07
  - rejectTableFormatOnFullProjection guard per D-11
  - MCP registration for application service database domain tools per D-01 D-22
affects: [02-04, 02-05, 03-01]

tech-stack:
  added: []
  patterns:
    - "Per-type get handler: resolveProjection → project/sanitize → buildReadResponse"
    - "D-11 table format rejected on full projection with COOLIFY_422 recovery hints"
    - "Domain tools get-only — list via resource tool per D-02"

key-files:
  created:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts
  modified:
    - src/api/client.ts
    - src/mcp/tools/shared-read-params.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts

key-decisions:
  - "rejectTableFormatOnFullProjection shared helper throws COOLIFY_422 with pretty/json recovery hints per D-11"
  - "Domain tool descriptions state get-details-only — list via resource tool per D-02"
  - "Handlers call resolveProjection at entry for include_full alias per D-07"

patterns-established:
  - "Get handler pipeline mirrors resource.list: schema.parse → projection resolve → API fetch → project/sanitize → buildReadResponse"
  - "MCP domain tool registration: isXErrorResult guard, _formattedText content, structuredContent ok/data/_meta"

requirements-completed: [APP-02, SVC-02, OUT-04]

coverage:
  - id: D1
    description: "application.get with summary default and sanitized full projection via include_full"
    requirement: APP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns summary projection by default"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns sanitized full projection with include_full alias per D-07"
        status: pass
    human_judgment: false
  - id: D2
    description: "service.get and database.get mirror application projection behavior"
    requirement: SVC-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#returns summary projection by default"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#returns summary projection by default"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#returns sanitized full projection with include_full alias"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#returns sanitized full projection with include_full alias"
        status: pass
    human_judgment: false
  - id: D3
    description: "format table rejected on full projection with recovery hint per D-11"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#rejects format table on full projection with recovery hint per D-11"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#rejects format table on full projection per D-11"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#rejects format table on full projection per D-11"
        status: pass
    human_judgment: false
  - id: D4
    description: "application service database tools registered with readOnlyHint true get-only"
    requirement: APP-02
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#registers read tools with readOnlyHint true per D-22"
        status: pass
      - kind: unit
        ref: "src/mcp/server.test.ts#domain tools expose get-only actions per D-02"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 03: Per-Type Get Handlers Summary

**application.get, service.get, and database.get deliver summary-by-default and sanitized full projections via MCP with D-11 table guard on domain tools.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-12T02:29:00Z
- **Completed:** 2026-07-12T02:36:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- API client helpers `fetchApplication`, `fetchService`, `fetchDatabase` for per-type GET endpoints
- `application.get`, `service.get`, `database.get` handlers with `resolveProjection`, summary projectors, and `sanitizeFullProjection`
- `rejectTableFormatOnFullProjection` shared guard returns COOLIFY_422 with recovery hints per D-11
- MCP server registers three domain tools with `readOnlyHint: true` and get-only schemas per D-01/D-02/D-22

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-type API get helpers and application.get handler** - `daa6384` (feat)
2. **Task 2: service.get and database.get handlers** - `cd9809a` (feat)
3. **Task 3: Register application service database tools in MCP server** - `18fc9c0` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/api/client.ts` - fetchApplication, fetchService, fetchDatabase GET helpers
- `src/mcp/tools/shared-read-params.ts` - rejectTableFormatOnFullProjection D-11 guard
- `src/mcp/tools/application.ts` - application.get handler with projection pipeline
- `src/mcp/tools/application.test.ts` - 6 unit tests for summary, full, table guard
- `src/mcp/tools/service.ts` - service.get handler mirroring application pattern
- `src/mcp/tools/service.test.ts` - 5 unit tests
- `src/mcp/tools/database.ts` - database.get handler mirroring application pattern
- `src/mcp/tools/database.test.ts` - 5 unit tests
- `src/mcp/server.ts` - registers application, service, database tools
- `src/mcp/server.test.ts` - six-tool registration and readOnlyHint assertions

## Decisions Made

- rejectTableFormatOnFullProjection centralized in shared-read-params.ts — reused across all three get handlers
- Domain tool descriptions explicitly reference resource tool for listing per D-02
- COOLIFY_422 used for D-11 validation rejection with English recovery hints

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent can drill into application, service, or database details after resource.list
- 02-04 can add resource.find and docs.search
- Full test suite passes (101 tests)

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/application.test.ts` — 6 passed
- `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts` — 10 passed
- `npx vitest run` — 101 passed
- `grep -v '^#' src/mcp/server.ts | grep -c "'application'"` — ≥1

---
*Phase: 02-discovery-read-projections*
*Completed: 2026-07-12*
