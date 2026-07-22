---
phase: 02-discovery-read-projections
plan: 02
subsystem: api
tags: [mcp, infrastructure-overview, resource-list, read-tools, coolify-api]

requires:
  - phase: 02-discovery-read-projections
    provides: Shared projections, formatters, sharedReadParamsSchema from 02-01
provides:
  - fetchResources fetchServers fetchProjects API client helpers
  - system.infrastructure_overview health rollup per D-08
  - resource.list unified summary listing with type filter per D-02
  - MCP resource tool registration with readOnlyHint per D-22
affects: [02-03, 02-04, 02-05]

tech-stack:
  added: []
  patterns:
    - "Parallel-fetch overview aggregator: resources + servers + projects"
    - "Read handler schema.parse for Zod default application on read params"
    - "buildReadResponse pipeline for list and overview formatted output"

key-files:
  created:
    - src/mcp/tools/resource.ts
    - src/mcp/tools/resource.test.ts
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/mcp/tools/system.ts
    - src/mcp/tools/system.test.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts

key-decisions:
  - "Handlers parse args through Zod schema at entry so page/per_page/max_chars defaults apply in unit tests and MCP calls"
  - "infrastructure_overview on system tool per ecosystem spike — not separate meta tool"
  - "resource.find deferred to 02-04 — list-only schema in this slice"

patterns-established:
  - "Overview aggregator: parallel fetchResources/fetchServers/fetchProjects → per-category health rollup"
  - "Resource list: projectResourceSummary → optional type filter → paginateArray → buildReadResponse"
  - "MCP registration: _formattedText in content, structuredContent ok/data/_meta"

requirements-completed: [SYS-01, SYS-02, APP-01, SVC-01]

coverage:
  - id: D1
    description: "fetchResources fetchServers fetchProjects GET helpers with array normalization"
    requirement: SYS-02
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#fetchResources fetchServers fetchProjects"
        status: pass
    human_judgment: false
  - id: D2
    description: "system.infrastructure_overview health rollup per category per D-08"
    requirement: SYS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#handleSystemAction infrastructure_overview"
        status: pass
    human_judgment: false
  - id: D3
    description: "resource.list summary-projected unified listing with pagination metadata"
    requirement: SYS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#handleResourceAction list"
        status: pass
    human_judgment: false
  - id: D4
    description: "resource list type filter application satisfies APP-01"
    requirement: APP-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#filters to applications only when type application"
        status: pass
    human_judgment: false
  - id: D5
    description: "resource list type filter service and database satisfies SVC-01"
    requirement: SVC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#filters to services when type service"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#filters to databases when type database"
        status: pass
    human_judgment: false
  - id: D6
    description: "resource and system tools register with readOnlyHint true per D-22"
    requirement: SYS-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#registers resource tool with readOnlyHint true"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 02: Infrastructure Overview + Resource List Summary

**First vertical read slice — agent can call system.infrastructure_overview and resource.list via MCP with bounded summary output.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-12T02:25:00Z
- **Completed:** 2026-07-12T02:30:12Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- API client helpers `fetchResources`, `fetchServers`, `fetchProjects` with array normalization
- `system.infrastructure_overview` aggregates health rollup (running/stopped/unhealthy) per D-08
- `resource.list` returns summary-projected resources with type filter, pagination, and max_chars guard
- MCP server registers `resource` tool with `readOnlyHint: true` per D-01/D-22

## Task Commits

Each task was committed atomically:

1. **Task 1: Coolify read API client helpers** - `d1d6a8d` (feat)
2. **Task 2: infrastructure_overview and resource.list handlers** - `653f5b9` (feat)
3. **Task 3: Register resource tool and wire overview in MCP server** - `22db8d0` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/api/client.ts` - GET helpers for /resources, /servers, /projects
- `src/api/client.test.ts` - 6 unit tests for fetch helpers
- `src/mcp/tools/system.ts` - infrastructure_overview action with health rollup
- `src/mcp/tools/system.test.ts` - overview schema and aggregation tests
- `src/mcp/tools/resource.ts` - list action with type filter and buildReadResponse
- `src/mcp/tools/resource.test.ts` - list projection and filter tests
- `src/mcp/server.ts` - resource tool registration, _formattedText for overview
- `src/mcp/server.test.ts` - 3-tool registration and readOnlyHint assertions

## Decisions Made

- Handlers call `schema.parse(args)` at entry so Zod defaults apply without MCP server pre-processing
- infrastructure_overview placed on system tool aligning ecosystem spike (D-04)
- resource.find intentionally omitted — ships in 02-04

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent can orient via MCP: infrastructure overview + unified resource list
- 02-03 can add application/service/database get handlers reusing same client helpers pattern
- 02-04 adds resource.find and docs.search
- Full test suite passes (84 tests)

## Self-Check: PASSED

- `npx vitest run src/api/client.test.ts` — 10 passed
- `npx vitest run src/mcp/tools/system.test.ts src/mcp/tools/resource.test.ts` — 16 passed
- `npx vitest run` — 84 passed

---
*Phase: 02-discovery-read-projections*
*Completed: 2026-07-12*
