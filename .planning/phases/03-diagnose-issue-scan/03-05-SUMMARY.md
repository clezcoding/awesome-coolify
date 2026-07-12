---
phase: 03-diagnose-issue-scan
plan: 05
subsystem: api
tags: [hints, retrofit, application, service, database, diagnose-hints, mcp]

requires:
  - phase: 03-diagnose-issue-scan
    provides: generateHints FollowUpHint generator from 03-01, diagnose app handler hint pattern from 03-02
provides:
  - application.get structuredContent.data.hints[] retrofit per D-16
  - service.get structuredContent.data.hints[] retrofit per D-16
  - database.get structuredContent.data.hints[] retrofit per D-16
affects:
  - 03-06

tech-stack:
  added: []
  patterns:
    - "Handler-level hints injection via generateHints — not in projectors (D-16 additive retrofit)"
    - "Hints on both summary and full projections — spread onto sanitized full object"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "Hints attached at handler level after projection — projectors unchanged per PATTERNS 3.7"
  - "health_check_status passed to generateHints when present — mirrors diagnose app branch"

patterns-established:
  - "P2 get retrofit: const hints = generateHints(type, uuid, status, health?); spread onto data before buildReadResponse"

requirements-completed:
  - OUT-06

coverage:
  - id: D1
    description: "application.get summary and full include structured hints[] via generateHints"
    requirement: OUT-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#includes restart hint for unhealthy application"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#includes hints in full projection"
        status: pass
    human_judgment: false
  - id: D2
    description: "service.get includes restart hint for unhealthy status with available_in_phase 5"
    requirement: OUT-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#includes restart hint for unhealthy service"
        status: pass
    human_judgment: false
  - id: D3
    description: "database.get includes start hint for exited:0 status with available_in_phase 5"
    requirement: OUT-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#includes start hint for stopped database"
        status: pass
    human_judgment: false
  - id: D4
    description: "Healthy running resources return empty hints array — no spurious actions"
    requirement: OUT-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns empty hints for healthy running application"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-12
status: complete
---

# Phase 3 Plan 5: P2 Get Hints Retrofit Summary

**OUT-06 abgeschlossen: application/service/database get liefern strukturierte `hints[]` via gemeinsamen `generateHints` — konsistent mit diagnose-Oberfläche.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-12T04:19:00Z
- **Completed:** 2026-07-12T04:20:31Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- `application.get`, `service.get`, `database.get` rüsten `structuredContent.data.hints[]` nach (D-16, OUT-06)
- Hints via `generateHints(type, uuid, status, health?)` aus `diagnose-hints.ts` — Single Source of Truth (D-15, D-17)
- Summary- und Full-Projection: hints additiv, bestehende Felder unverändert
- Unhealthy application → restart/logs/deploy hints (`available_in_phase` 4/5); stopped database → start hint (phase 5)
- Healthy running resources → leeres `hints[]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Retrofit application service database get handlers with hints[] field** - `c580262` (feat)

**Plan metadata:** `c53c2e4` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/application.ts` — generateHints-Import, hints auf summary/full
- `src/mcp/tools/service.ts` — gleiches Pattern für service.get
- `src/mcp/tools/database.ts` — gleiches Pattern für database.get
- `src/mcp/tools/*.test.ts` — Hint-Assertions unhealthy/stopped/healthy

## Decisions Made

- Hints am Handler, nicht in Projektoren — additive Retrofit ohne P2-Contract-Bruch
- `health_check_status` optional an generateHints — wie diagnose app-Branch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-06 kann Integration-Test diagnose-flow mit get-hints erweitern
- Phase 4 kann Forward-Ref-Hints (restart/start/deploy) aktivieren

## Self-Check: PASSED

- `npm run test -- --run --reporter=dot` → 189 tests passed
- `npm run build` → success
- Task commit `c580262` present
- Key files exist on disk

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
