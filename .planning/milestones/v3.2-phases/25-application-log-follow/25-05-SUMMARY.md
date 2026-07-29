---
phase: 25-application-log-follow
plan: 05
subsystem: api
tags: [mcp, zod, COOLIFY_422, log-follow, OBS-02, schema-split]

requires:
  - phase: 25-application-log-follow
    plan: 04
    provides: WR-01/WR-03 regression tests; verification baseline
provides:
  - applicationActionMcpSchema boundary-only registration on server.ts
  - applicationActionSchema handler parse with applicationExtraRefine COOLIFY_422 guards
  - handleApplicationAction follow+deployment_uuid structured COOLIFY_422 regression test
affects:
  - UAT G-25-1 closure
  - live MCP application.logs validation envelope

tech-stack:
  added: []
  patterns:
    - "MCP SDK inputSchema = structural allowlist; handler parseApplicationAction runs full superRefine"
    - "buildApplicationActionSchema(extraRefine?) factory — single shape, dual export"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/server.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/server.test.ts

key-decisions:
  - "applicationActionMcpSchema omits applicationExtraRefine so MCP SDK passes follow+deployment_uuid to handler"
  - "buildApplicationActionSchema wraps createFlatActionSchema — avoids duplicating 550-line shape block"

patterns-established:
  - "Boundary vs handler schema split pattern for tools whose superRefine emits params.code for throwValidationError"

requirements-completed: [OBS-02]

coverage:
  - id: D1
    description: "handleApplicationAction follow:true + deployment_uuid returns structuredContent.error.code COOLIFY_422 (G-25-1 / D-02)"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#handleApplicationAction follow true with deployment_uuid returns COOLIFY_422"
        status: pass
    human_judgment: false
  - id: D2
    description: "server.registerTool application uses applicationActionMcpSchema boundary schema"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#wraps action schemas with withInstanceRoutingSchema"
        status: pass
      - kind: unit
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live MCP UAT test 5 — follow+deployment_uuid returns code COOLIFY_422 not generic Input validation error"
    requirement: OBS-02
    verification:
      - kind: manual_procedural
        ref: "Re-run UAT test 5 against live MCP stdio"
        status: unknown
    human_judgment: true
    rationale: "Stdio E2E against live Coolify instance is MANUAL-ONLY per phase precedent; unit test proves handler path"

duration: 5min
completed: 2026-07-28
status: complete
---

# Phase 25 Plan 05: MCP Boundary Schema Split Summary

**Split application MCP boundary vs handler Zod schemas so follow+deployment_uuid reaches throwValidationError and returns structured COOLIFY_422**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-28T01:13:00Z
- **Completed:** 2026-07-28T01:15:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extracted `applicationExtraRefine` guards from inline `createFlatActionSchema` callback
- Exported `applicationActionMcpSchema` (boundary) and `applicationActionSchema` (handler) via `buildApplicationActionSchema`
- Wired `server.ts` registerTool to boundary schema; handler still parses full schema
- Added handler regression test proving COOLIFY_422 envelope for follow+deployment_uuid

## Task Commits

Each task was committed atomically:

1. **Task 1: Split application MCP boundary vs handler schemas** - `af10595` (feat)
2. **Task 2: Wire boundary schema in server + regression test** - `d71c01b` (feat)

## Files Created/Modified

- `src/mcp/tools/application.ts` - `applicationExtraRefine`, `buildApplicationActionSchema`, dual schema exports
- `src/mcp/server.ts` - `inputSchema: withInstanceRoutingSchema(applicationActionMcpSchema)`
- `src/mcp/tools/application.test.ts` - handler COOLIFY_422 regression for follow+deployment_uuid
- `src/mcp/server.test.ts` - routing list expects `applicationActionMcpSchema`

## Decisions Made

- Used `buildApplicationActionSchema(extraRefine?)` factory instead of duplicating two full `createFlatActionSchema` calls — same runtime behavior, smaller diff surface
- Kept `parseApplicationAction` on `applicationActionSchema` unchanged so all existing handler validation paths preserved

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-25-1 handler path closed; manual UAT test 5 re-run recommended to confirm live MCP envelope
- Plan 25-06 (if any) can proceed; follow poll loop behavior untouched

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts
- FOUND: .planning/phases/25-application-log-follow/25-05-SUMMARY.md
- FOUND: commit af10595 (task 1)
- FOUND: commit d71c01b (task 2)

---
*Phase: 25-application-log-follow*
*Completed: 2026-07-28*
