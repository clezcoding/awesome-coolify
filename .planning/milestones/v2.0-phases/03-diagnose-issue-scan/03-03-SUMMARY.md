---
phase: 03-diagnose-issue-scan
plan: 03
subsystem: api
tags: [diagnose, mcp, promise-allSettled, server-validate, resources-counts, domains, coolify-api]

requires:
  - phase: 03-diagnose-issue-scan
    provides: fetchServer, fetchServerResources, fetchServerDomains, triggerServerValidate, projectServerDiagnose, find-helpers
provides:
  - handleDiagnoseAction server branch end-to-end (SYS-05 vertical slice)
  - 4-way Promise.allSettled composition with validate-trigger side-effect (D-10)
  - D-12 resources_counts aggregation, D-11 full domain render
affects:
  - 03-04
  - 03-05
  - 03-06

tech-stack:
  added: []
  patterns:
    - "Promise.allSettled hybrid: fetchServer critical, resources/domains/validate non-critical"
    - "trigger_validate boolean default true with read-only opt-out (D-10)"
    - "Multi-match Top 10 with re-run UUID hint (D-04)"

key-files:
  created: []
  modified:
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/diagnose.test.ts

key-decisions:
  - "Inline test mocks in diagnose.test.ts — avoids tsc rootDir fixture import error"
  - "Reachable server yields empty hints[] — hints only for unreachable per generateHints server branch"
  - "scan branch remains not-implemented stub for 03-04"

patterns-established:
  - "resolveServerUuid: explicit uuid skips fetchServers; else projectServerSummary + find-helpers"
  - "Server diagnose envelope mirrors app: zero/multi { matches, hint }; D-09 fields for single match"

requirements-completed:
  - SYS-05

coverage:
  - id: D1
    description: "diagnose action server end-to-end with D-09 composed view and validation_started"
    requirement: SYS-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#handleDiagnoseAction server"
        status: pass
    human_judgment: false
  - id: D2
    description: "Promise.allSettled partial failure — resources zeros on 403, domains [] on 403, validate false on 500"
    requirement: SYS-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#returns resources_counts with zeros on 403"
        status: pass
    human_judgment: false
  - id: D3
    description: "Multi-match ranked Top 10 with re-run UUID hint"
    requirement: SYS-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#returns multi-match ranked Top 10"
        status: pass
    human_judgment: false
  - id: D4
    description: "trigger_validate opt-out skips validate endpoint and returns validation_started false"
    requirement: SYS-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#skips triggerServerValidate when trigger_validate is false"
        status: pass
    human_judgment: false
  - id: D5
    description: "Unreachable server yields diagnose server hint with available_in_phase 3"
    requirement: SYS-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#yields unreachable server hint"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-12
status: complete
---

# Phase 3 Plan 3: Server Diagnose Vertical Slice Summary

**Zweiter agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'server' })` liefert D-09-komponierte Server-Ansicht mit paralleler 4-Wege-Composition, Validate-Trigger und Graceful Degradation.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-12T04:07:00Z
- **Completed:** 2026-07-12T04:13:26Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `handleDiagnoseAction` server-Branch: Input-Resolution via `projectServerSummary` + find-helpers, Zero/Multi-Match mit Hint, Single-Match mit `Promise.allSettled` über 4 Endpoints
- `resources_counts` nach Typ (applications/databases/services) mit total/running/stopped/unhealthy — keine volle Ressourcenliste (D-12)
- `domains` vollständig mit ip/ipv4/ipv6/domain (D-11)
- `triggerServerValidate` Side-Effect default true; `trigger_validate: false` für read-only Opt-out (D-10)
- `validation_started` reflektiert Validate-Erfolg; Auxiliary-Fehler degradieren sicher
- Unreachable-Server liefert strukturierten Hint `{ tool: 'diagnose', action: 'server', available_in_phase: 3 }`
- Scan bleibt `not-implemented` Stub für 03-04; App-Branch unverändert funktionsfähig

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement diagnose server handler with 4-way parallel composition and validate-trigger** - `696c45e` (feat)

**Plan metadata:** `b845700` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/diagnose.ts` — Server-Handler mit resolveServerUuid, 4-Wege-Composition, Hint-Anbindung
- `src/mcp/tools/diagnose.test.ts` — 11 neue Server-Tests (zero/multi/single, 403/500-Degradation, trigger_validate, COOLIFY_422, unreachable hints)

## Decisions Made

- Test-Fixtures inline statt `tests/fixtures`-Import — vermeidet tsc rootDir-Fehler (Fortführung 03-02-Pattern)
- Erreichbare Server haben leeres `hints[]` — Hints nur bei unreachable per `generateHints` server branch
- Scan bewusst nicht implementiert — Scope 03-03 = SYS-05 server slice only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-04 kann global scan mit `classifyIssues` auf gleichem Handler-Pattern implementieren
- 03-05/03-06 können Integration-Tests und UAT auf app+server happy-path erweitern

## Self-Check: PASSED

- `npm run test -- --run src/mcp/tools/diagnose.test.ts` → 34 tests passed
- `npm run test -- --run --reporter=dot` → 175 tests passed
- `npm run build` → success
- Task commit `696c45e` present
- Key files exist on disk

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
