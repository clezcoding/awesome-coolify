---
phase: 25-application-log-follow
plan: 02
subsystem: api
tags: [log-follow, schema, OBS-02, OBS-03, zodDefaultFields, vitest]

requires:
  - phase: 25-application-log-follow
    plan: 01
    provides: follow handler branch and applicationLogsSchema follow fields
provides:
  - applicationActionSchema follow params on logs action only via actionAllowedFields + zodDefaultFields
  - follow+deployment_uuid and follow+offset COOLIFY_422 guards on flat and nested schemas
  - OBS-03 golden tests locking one-shot runtime/build paths
  - integration follow schema acceptance and runtime one-shot regression
affects:
  - 25-03

tech-stack:
  added: []
  patterns:
    - "zodDefaultFields follow:false strips phantom follow from deploy/get actions (deployment watch analog)"
    - "Golden fetchApplicationLogs call-arg parity for follow absent vs follow false"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - tests/integration/logs-service-db-flow.test.ts

key-decisions:
  - "zodDefaultFields carries follow:false only — no global timeout 120 to preserve deploy wait defaults"
  - "Reject offset>0 with follow:true at schema level for clarity (RESEARCH A3)"

patterns-established:
  - "OBS-03 regression: explicit follow false vs omit parity test on fetchApplicationLogs args"

requirements-completed: [OBS-02, OBS-03]

coverage:
  - id: D1
    description: "applicationActionSchema accepts follow on logs only with zodDefaultFields strip"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#accepts follow true on logs action"
        status: pass
    human_judgment: false
  - id: D2
    description: "follow+deployment_uuid COOLIFY_422 on flat and nested schemas"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#rejects follow true with deployment_uuid"
        status: pass
    human_judgment: false
  - id: D3
    description: "One-shot runtime logs unchanged when follow absent or false"
    requirement: OBS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#runtime logs follow false uses identical"
        status: pass
    human_judgment: false
  - id: D4
    description: "Build logs path uses fetchDeployment not follow poll"
    requirement: OBS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#build logs path calls fetchDeployment"
        status: pass
    human_judgment: false
  - id: D5
    description: "Integration accepts follow:true schema and runtime one-shot unchanged"
    requirement: OBS-02
    verification:
      - kind: integration
        ref: "tests/integration/logs-service-db-flow.test.ts#accepts follow:true"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-28
status: complete
---

# Phase 25 Plan 02: Schema Hardening + OBS-03 Regression Summary

**Flat applicationActionSchema follow wiring with zodDefaultFields strip, XOR guards, and golden one-shot runtime/build regression tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T00:01:00Z
- **Completed:** 2026-07-28T00:03:29Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `zodDefaultFields: { follow: false }` on `applicationActionSchema` — deploy/get no longer inherit follow param leakage
- Schema guards: follow+deployment_uuid, follow+offset, min_interval≤max_interval on logs action
- `applicationActionsCatalog` lists follow params + `system.version` capability note
- OBS-03 locked: follow false identical to omit; build path never hits runtime follow poll

## Task Commits

1. **Task 1: Flat action schema wiring + follow/build XOR guards** - `0598890` (feat)
2. **Task 2: OBS-03 golden regression + integration follow acceptance** - `89458b4` (test)

## Files Created/Modified

- `src/mcp/tools/application.ts` - zodDefaultFields, extraRefine guards, catalog update
- `src/mcp/tools/application.test.ts` - schema guard + OBS-03 golden tests
- `tests/integration/logs-service-db-flow.test.ts` - runtime one-shot regression assertion

## Decisions Made

- Handler-only 120s follow timeout default preserved — not in zodDefaultFields (deploy wait unaffected)
- offset rejected at schema when follow:true instead of silent ignore

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 25-03 can add capability flag, README/coverage docs, incident prompt untouched per D-21
- deploy-watch-poll tests green (7 passed)

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts
- FOUND: .planning/phases/25-application-log-follow/25-02-SUMMARY.md
- FOUND: commit 0598890
- FOUND: commit 89458b4

---
*Phase: 25-application-log-follow*
*Completed: 2026-07-28*
