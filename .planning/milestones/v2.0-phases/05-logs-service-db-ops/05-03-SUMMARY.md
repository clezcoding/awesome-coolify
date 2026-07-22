---
phase: 05-logs-service-db-ops
plan: 03
subsystem: api
tags: [database, lifecycle, coolify-api, zod, vitest, mutation]

requires:
  - phase: 05-logs-service-db-ops
    provides: 05-02 resolveServiceMutationUuid pattern, P4 COOLIFY_AMBIGUOUS_MATCH
provides:
  - triggerDatabaseStart/Stop/Restart client helpers (no latest param on restart)
  - resolveDatabaseMutationUuid with project+environment ambiguity hints
  - database start/stop/restart actions (fire-and-forget, no deploy per D-18)
  - database tool drops readOnlyHint (mutating lifecycle)
affects: [05-05]

tech-stack:
  added: []
  patterns:
    - "Database restart is pure container restart — no pull_latest (D-16/D-18)"
    - "Database mutation ambiguity includes project_name + environment_name per match"
    - "databaseActionSchema has no deploy member — D-18 enforced at schema level"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts
    - src/mcp/server.ts
    - src/mcp/integration.test.ts

key-decisions:
  - "environment_name derived from raw.environment.name in resolveDatabaseMutationUuid (mirrors 05-02)"
  - "Database mutations fire-and-forget — no deployment_uuid, wait, or pull_latest (D-20/D-18)"
  - "P3 generateHints database start/restart forward-refs now callable"

patterns-established:
  - "Database identifier: uuid|name only — no fqdn, no deploy action (D-13/D-18)"
  - "handleDatabaseMutation routes to triggerDatabase{Start,Stop,Restart} without latest param"

requirements-completed: [SVC-03]

coverage:
  - id: D1
    description: "triggerDatabaseStart/Stop/Restart client helpers POST /databases/{uuid}/{action}"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#triggerDatabaseStart triggerDatabaseStop triggerDatabaseRestart"
        status: pass
    human_judgment: false
  - id: D2
    description: "database start/stop/restart by uuid or name with fire-and-forget response"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#handleDatabaseAction lifecycle mutations"
        status: pass
    human_judgment: false
  - id: D3
    description: "Multi-match COOLIFY_AMBIGUOUS_MATCH with project+environment recoveryHints, no mutation"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH"
        status: pass
    human_judgment: false
  - id: D4
    description: "restart schema .strict() rejects pull_latest; no deploy action in schema (D-16/D-18)"
    requirement: SVC-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#restart rejects pull_latest param per D-16/D-18"
        status: pass
    human_judgment: false
  - id: D5
    description: "database tool registration drops readOnlyHint (D-14)"
    requirement: SVC-03
    verification:
      - kind: other
        ref: "grep readOnlyHint database block in src/mcp/server.ts — no match"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 3: Database Lifecycle Summary

**Database-Tool liefert start/stop/restart per UUID oder Name — fire-and-forget ohne deploy/pull_latest, Mehrdeutigkeit mit Projekt+Environment-Kontext, P3-Forward-Ref-Hints jetzt aufrufbar.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-16T01:00:00Z
- **Completed:** 2026-07-16T01:05:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `triggerDatabaseStart`/`triggerDatabaseStop`/`triggerDatabaseRestart` Client-Helper (POST `/databases/{uuid}/start|stop|restart`, kein `latest`-Query-Param)
- `database({ action: 'start'|'stop'|'restart' })` mit uuid|name-Auflösung via `resolveDatabaseMutationUuid`
- Multi-Match wirft `COOLIFY_AMBIGUOUS_MATCH` mit `project=` + `environment=` pro Treffer; Zero-Match → `COOLIFY_404`
- Kein `deploy`-Action (D-18); `restart` lehnt `pull_latest` per `.strict()` ab (D-16)
- `database`-Tool: `readOnlyHint` entfernt, Beschreibung erweitert (D-14)

## Task Commits

1. **Task 1: triggerDatabase helpers + RED lifecycle scaffold** — `160bb7f` (feat)
2. **Task 2: Schema + resolver + handlers + server.ts** — `252a2ea` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/api/client.ts` — triggerDatabaseStart/Stop/Restart
- `src/api/client.test.ts` — Helper-Pfad-Tests (kein Query-Param auf restart)
- `src/mcp/tools/database.ts` — Schema, resolveDatabaseMutationUuid, handleDatabaseMutation
- `src/mcp/tools/database.test.ts` — 15 Tests (Lifecycle, Ambiguity, Schema-Guards)
- `src/mcp/server.ts` — readOnlyHint entfernt, Beschreibung aktualisiert
- `src/mcp/integration.test.ts` — readOnlyHint-Erwartungen für mutierende Domain-Tools angepasst

## Decisions Made

- `environment_name` aus `raw.environment.name` abgeleitet (ResourceSummary hat kein Feld)
- Fire-and-forget Response `{ uuid, action, status: 'requested' }` — kein wait/deployment_uuid/pull_latest (D-20/D-18)
- P3 Forward-Ref-Hints `database.start`/`database.restart` mit `available_in_phase: 5` jetzt aufrufbar

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Regression] integration.test.ts readOnlyHint-Erwartung veraltet**
- **Found during:** Plan-level verification (`npx vitest run` full suite)
- **Issue:** P2-Integrationstest erwartete readOnlyHint auf application/service/database; P4/P5 haben readOnlyHint auf mutierenden Tools entfernt (D-14)
- **Fix:** Test aktualisiert — 4 read-only Tools (system, meta, resource, docs); application/service/database explizit ohne readOnlyHint
- **Files modified:** src/mcp/integration.test.ts
- **Verification:** 348 Tests green, `npm run build` exit 0
- **Committed in:** 252a2ea

---

**Total deviations:** 1 auto-fixed (integration test stale from P4/P5 readOnlyHint drops)
**Impact on plan:** Minimal — Test spiegelt D-14 korrekt wider; kein Scope-Creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bereit für 05-04 (SVC-04 deferral doc — ROADMAP amend, no code)
- Database lifecycle komplett; SVC-03 database half erfüllt

## Self-Check: PASSED

- [x] `src/api/client.ts` exports triggerDatabaseStart/Stop/Restart
- [x] `git log --oneline --grep="05-03"` → 2 task commits (160bb7f, 252a2ea)
- [x] `npx vitest run src/api/client.test.ts src/mcp/tools/database.test.ts` → 47 passed
- [x] `npx vitest run` → 348 passed
- [x] `npm run build` → exit 0
- [x] `grep readOnlyHint` in database registration block → no match

---
*Phase: 05-logs-service-db-ops*
*Completed: 2026-07-16*
