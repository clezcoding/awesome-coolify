---
phase: 07-distribution-docs
plan: 04
subsystem: api
tags: [coolify, mcp, projections, environment_id, emergency]

requires:
  - phase: 06-bulk-emergency-safety
    provides: emergency resolveProjectUuid and mapProjectApps with environment_id matching
provides:
  - buildProjectEnvironmentIndex utility for Coolify 4.1.x environment_id → project mapping
  - Enriched read handlers (resource.list/find, application/service/database get)
  - UAT gaps 19/20 closed with live verification
affects: [07-05, emergency-chaining, read-projections]

tech-stack:
  added: []
  patterns:
    - "Optional ProjectEnvironmentLookup passed into summary projectors"
    - "One index build per handler call — no cross-request cache"

key-files:
  created:
    - src/utils/project-lookup.ts
    - src/utils/project-lookup.test.ts
  modified:
    - src/utils/projections.ts
    - src/utils/projections.test.ts
    - src/mcp/tools/resource.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/database.ts
    - tests/integration/emergency-safety-flow.test.ts
    - .planning/phases/07-distribution-docs/07-UAT.md

key-decisions:
  - "Replace literal 'default' project_name fallback with environment_id lookup or honest 'N/A'"
  - "Reuse fetchProjects + fetchProject (same endpoints as emergency.ts) for index build"

patterns-established:
  - "buildProjectEnvironmentIndex(env) → Map<number, { project_uuid, project_name }>"
  - "Read handlers enrich before project*Summary when nested project absent"

requirements-completed: []

coverage:
  - id: D1
    description: "buildProjectEnvironmentIndex resolves environment_id to project name/uuid"
    verification:
      - kind: unit
        ref: "src/utils/project-lookup.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Summary projectors emit real project_name or N/A for 4.1.x payloads"
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#resolves project from environment_id lookup for Coolify 4.1.x payloads"
        status: pass
    human_judgment: false
  - id: D3
    description: "resource.list and application.get enrich 4.1.x records before projection"
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#resolves project_name from environment_id for Coolify 4.1.x payloads"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#resolves project_name from environment_id for Coolify 4.1.x payloads"
        status: pass
    human_judgment: false
  - id: D4
    description: "resource.list project_name chains to emergency restart/redeploy preview without COOLIFY_404"
    verification:
      - kind: integration
        ref: "tests/integration/emergency-safety-flow.test.ts#read→emergency project_name chain (07-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live UAT tests 19/20 pass against puzzlesstool.online"
    verification:
      - kind: manual_procedural
        ref: "live handler chain 2026-07-16 — project_name MCP UAT Test, would_affect=2"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-16
status: complete
---

# Phase 07 Plan 04 Summary

**Coolify 4.1.x read projections resolve real project names via environment_id index — emergency restart/redeploy preview chains without COOLIFY_404**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-16T18:49:00Z
- **Completed:** 2026-07-16T18:55:00Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added `buildProjectEnvironmentIndex` mapping `environment_id` → `{ project_uuid, project_name }` from `/projects` (+ per-project fetch when list lacks environments)
- Updated summary projectors to accept optional lookup; replaced misleading `'default'` fallback with resolved name or `'N/A'`
- Wired enrichment into `resource.list`/`find` and `application`/`service`/`database` get handlers
- Closed UAT gaps 19/20: live chain returns `project_name=MCP UAT Test`, emergency preview `COOLIFY_CONFIRM_REQUIRED would_affect=2`

## Task Commits

1. **Task 1: project lookup + projection helpers** — `00ab6b6` (feat)
2. **Task 2: read handler wiring + integration tests** — `587f6e1` (feat)
3. **Task 3: UAT 19/20 live verification + doc update** — `16c4865` (docs)

**Additional:** `d552fb3` (test) — mock fetchProjects in service/database/diagnose integration tests

## Files Created/Modified

- `src/utils/project-lookup.ts` — environment index builder
- `src/utils/projections.ts` — lookup-aware summary projectors
- `src/mcp/tools/resource.ts` — list/find enrichment
- `src/mcp/tools/application.ts`, `service.ts`, `database.ts` — get summary enrichment
- `tests/integration/emergency-safety-flow.test.ts` — read→emergency chain tests
- `.planning/phases/07-distribution-docs/07-UAT.md` — tests 19/20 pass, gaps resolved

## Decisions Made

- One index build per handler call (no cross-request cache) — acceptable for gap closure per plan
- Server_name fallback unchanged (out of scope; coincidental localhost match on UAT instance)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test mocks missing fetchProjects/fetchProject after handler enrichment**
- **Found during:** Task 3 full `npm test`
- **Issue:** service/database/diagnose/integration tests failed because get handlers now call `buildProjectEnvironmentIndex`
- **Fix:** Added fetchProjects/fetchProject mocks to affected test files
- **Files modified:** service.test.ts, database.test.ts, integration.test.ts, diagnose-flow.test.ts
- **Verification:** 485/487 tests pass (2 pre-existing docs-parity failures unrelated to 07-04)
- **Committed in:** `d552fb3`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for test suite integrity after handler wiring. No scope creep.

## Issues Encountered

- Running MCP server in Cursor still served pre-build code during Task 3; live verification succeeded via direct handler invocation against built source (`project_name=MCP UAT Test`). MCP reload required for Cursor tool calls to pick up fix.
- `docs-parity.test.ts` (2 failures) pre-existing on branch — README H2 structure drift from Wave 0 scaffold; out of 07-04 scope (07-02 territory).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UAT gap 29 (service stop/start COOLIFY_422) remains — addressed by 07-05
- MCP host reload recommended so live Cursor tool calls reflect new projections

---
*Phase: 07-distribution-docs*
*Completed: 2026-07-16*
