---
phase: 12-environment-variables-smart-sync
plan: 06
subsystem: api
tags: [mcp, envs, documentation, discoverability, readme]

requires:
  - phase: 12-02
    provides: application envs:* handlers (list/get/create/update/delete/bulk)
  - phase: 12-03
    provides: service envs:* handlers
  - phase: 12-04
    provides: database envs:* handlers (is_preview omitted)
  - phase: 12-05
    provides: application envs:sync engine
provides:
  - MCP tool descriptions advertising envs:* per tool in src/mcp/server.ts
  - Bilingual README action tables and env behavior docs (confirm, reveal, sync, is_preview)
affects: [phase-12-verify, phase-13]

tech-stack:
  added: []
  patterns:
    - "Tool discoverability via registerTool description strings in server.ts (not handler modules)"
    - "EN/DE README parity for envs:* action inventory and safety semantics"

key-files:
  created: []
  modified:
    - src/mcp/server.ts
    - README.md
    - README.de.md

key-decisions:
  - "Service/database descriptions say 'local .env sync is application-only' without envs:sync literal — avoids false grep matches in non-app tool regions"
  - "Resource env vars documented as Tools reference subsection, not mixed into COOLIFY_URL config section"

patterns-established:
  - "envs:* discoverability layer: server.ts descriptions + README tables stay aligned with handler action unions from 12-02..05"

requirements-completed: [ENV-01, ENV-02, ENV-03, ENV-04, ENV-05, ENV-06]

coverage:
  - id: D1
    description: "application/service/database registerTool descriptions list envs:* actions with confirm/reveal/sync/is_preview notes"
    requirement: ENV-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/application.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "README.md and README.de.md document envs:* per tool, confirm gates, reveal policy, sync semantics, database is_preview omission"
    requirement: ENV-05
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 06: Tool Descriptions & README Discoverability Summary

**MCP tool descriptions and bilingual README advertise envs:* actions with confirm/reveal/sync semantics aligned to 12-02..05 handlers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-20T23:48:31Z
- **Completed:** 2026-07-20T23:50:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `application`, `service`, and `database` tool description strings in `src/mcp/server.ts` with full `envs:*` action lists, confirm gates, reveal policy, sync semantics (app-only), and database `is_preview` omission
- Added Resource environment variables (`envs:*`) subsection to README.md and README.de.md with per-tool action matrix, confirm/reveal docs, and `envs:sync` examples using placeholder values
- Extended Safety model in both READMEs with environment-variable confirm gates and ask-human reveal policy

## Task Commits

Each task was committed atomically:

1. **Task 1: Update application/service/database tool descriptions in src/mcp/server.ts** - `f143d1a` (docs)
2. **Task 2: Update README.md and README.de.md action lists and env behavior docs** - `52492c8` (docs)

**Plan metadata:** skipped (commit_docs disabled)

## Files Created/Modified

- `src/mcp/server.ts` - registerTool description strings for application/service/database
- `README.md` - envs:* action tables, Resource env vars section, Safety model env gates
- `README.de.md` - German mirror of README env documentation

## Decisions Made

- Service/database descriptions use "local .env sync is application-only" phrasing instead of `envs:sync` literal so acceptance grep for app-only sync stays unambiguous
- Env behavior docs live under Tools reference, separate from the COOLIFY_URL/COOLIFY_TOKEN configuration section

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 discoverability layer complete — agents can see envs:* actions in tool descriptions and README
- Ready for phase verify-work / integration sign-off

## Self-Check: PASSED

- FOUND: src/mcp/server.ts
- FOUND: README.md
- FOUND: README.de.md
- FOUND: f143d1a
- FOUND: 52492c8

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*
