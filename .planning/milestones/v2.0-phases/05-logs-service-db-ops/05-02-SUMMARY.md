---
phase: 05-logs-service-db-ops
plan: 02
subsystem: api
tags: [service, lifecycle, coolify-api, zod, vitest, mutation]

requires:
  - phase: 05-logs-service-db-ops
    provides: 05-01 application.logs foundation, P4 resolveAppMutationUuid pattern
provides:
  - triggerServiceStart/Stop/Restart client helpers (restart with ?latest=true)
  - resolveServiceMutationUuid with project+environment ambiguity hints
  - service start/stop/restart/deploy actions (fire-and-forget)
  - service tool drops readOnlyHint (mutating lifecycle)
affects: [05-03, 05-05]

tech-stack:
  added: []
  patterns:
    - "service.deploy maps to POST /services/{uuid}/restart?latest=true (no dedicated deploy endpoint)"
    - "Service mutation ambiguity includes project_name + environment_name per match"
    - "restart .strict() rejects pull_latest — deploy-only flag mirrors P4 D-22"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts
    - src/mcp/server.ts

key-decisions:
  - "environment_name derived from raw.environment.name in resolveServiceMutationUuid (not on ResourceSummary)"
  - "Service mutations fire-and-forget — no deployment_uuid or wait field (D-20)"
  - "Multi-match COOLIFY_AMBIGUOUS_MATCH includes project+environment context (RESEARCH finding 7)"

patterns-established:
  - "Service identifier: uuid|name only — no fqdn (D-13)"
  - "handleServiceDeploy → triggerServiceRestart(latest=pull_latest) (D-17)"

requirements-completed: [SVC-03, SVC-05]

coverage:
  - id: D1
    description: "triggerServiceStart/Stop/Restart client helpers with latest query param on restart"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#triggerServiceStart triggerServiceStop triggerServiceRestart"
        status: pass
    human_judgment: false
  - id: D2
    description: "service start/stop/restart by uuid or name with fire-and-forget response"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#handleServiceAction lifecycle mutations"
        status: pass
    human_judgment: false
  - id: D3
    description: "service.deploy with pull_latest maps to triggerServiceRestart latest=true/false"
    requirement: SVC-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#deploy by uuid with pull_latest"
        status: pass
    human_judgment: false
  - id: D4
    description: "Multi-match COOLIFY_AMBIGUOUS_MATCH with project+environment recoveryHints, no mutation"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH"
        status: pass
    human_judgment: false
  - id: D5
    description: "restart schema .strict() rejects pull_latest (D-16)"
    requirement: SVC-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#restart rejects pull_latest param"
        status: pass
    human_judgment: false
  - id: D6
    description: "service tool registration drops readOnlyHint (D-14)"
    requirement: SVC-03
    verification:
      - kind: other
        ref: "grep readOnlyHint src/mcp/server.ts service block — no match"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 2: Service Lifecycle + Deploy Summary

**Service-Tool liefert start/stop/restart/deploy per UUID oder Name — deploy nutzt POST /services/{uuid}/restart?latest=true, Mehrdeutigkeit mit Projekt+Environment-Kontext, fire-and-forget ohne deployment_uuid.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T00:55:00Z
- **Completed:** 2026-07-16T00:59:17Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `triggerServiceStart`/`triggerServiceStop`/`triggerServiceRestart` Client-Helper (restart mit optionalem `?latest=true`)
- `service({ action: 'start'|'stop'|'restart'|'deploy' })` mit uuid|name-Auflösung via `resolveServiceMutationUuid`
- `service.deploy` mappt auf `triggerServiceRestart(latest=pull_latest)` — kein dedizierter Deploy-Endpoint
- Multi-Match wirft `COOLIFY_AMBIGUOUS_MATCH` mit `project=` + `environment=` pro Treffer; Zero-Match → `COOLIFY_404`
- `service`-Tool: `readOnlyHint` entfernt, Beschreibung erweitert (D-14)

## Task Commits

1. **Task 1: triggerService* helpers + RED scaffold** — `ae80f2c` (feat)
2. **Task 2: Schema + resolver + handlers + server.ts** — `4a63e73` (feat)

**Plan metadata:** `TBD` (docs commit pending)

## Files Created/Modified

- `src/api/client.ts` — triggerServiceStart/Stop/Restart
- `src/api/client.test.ts` — Helper-Pfad- und Query-Param-Tests
- `src/mcp/tools/service.ts` — Schema, resolveServiceMutationUuid, handleServiceMutation/Deploy
- `src/mcp/tools/service.test.ts` — 20 Tests (Lifecycle, Deploy, Ambiguity, Schema)
- `src/mcp/server.ts` — readOnlyHint entfernt, Beschreibung aktualisiert

## Decisions Made

- `environment_name` aus `raw.environment.name` in Resolver abgeleitet (ResourceSummary hat kein Feld)
- Fire-and-forget Response `{ uuid, action, status: 'requested', pull_latest? }` — kein wait/deployment_uuid (D-20)
- P3 Forward-Ref-Hints `start`/`restart` mit `available_in_phase: 5` jetzt aufrufbar

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bereit für 05-03 (Database lifecycle start/stop/restart — kein deploy per D-18)
- Resolver-Muster (project+env context) wiederverwendbar für database.ts

## Self-Check: PASSED

- [x] `src/api/client.ts` exports triggerServiceStart/Stop/Restart
- [x] `git log --oneline --grep="05-02"` → 2 task commits (ae80f2c, 4a63e73)
- [x] `npx vitest run src/api/client.test.ts src/mcp/tools/service.test.ts` → 48 passed
- [x] `npx vitest run` → 336 passed
- [x] `npm run build` → exit 0
- [x] `grep readOnlyHint` in service registration block → no match

---
*Phase: 05-logs-service-db-ops*
*Completed: 2026-07-16*
