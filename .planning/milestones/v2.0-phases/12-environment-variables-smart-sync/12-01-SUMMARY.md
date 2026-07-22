---
phase: 12-environment-variables-smart-sync
plan: 01
subsystem: api
tags: [env-vars, ofetch, dotenv-parser, bulk-patch, conflict-policy]

requires:
  - phase: 12-00
    provides: RED Vitest-Scaffolds für client + env-parser
provides:
  - Parameterisierte Env-CRUD-Client-Methoden (application|service|database)
  - Reiner .env-Parser mit diffEnvs und detectConflicts
affects: [12-02, 12-03, 12-04, 12-05]

tech-stack:
  added: []
  patterns:
    - ResourceType-Union mit pluralisierten API-Pfaden
    - Client-seitiger is_preview-Guard für Datenbanken (D-16)
    - ConflictPolicy overwrite|keep_remote|abort ohne COOLIFY_SYNC_CONFLICT (D-08)

key-files:
  created:
    - src/utils/env-parser.ts
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/utils/env-parser.test.ts

key-decisions:
  - "fetchApplicationEnvs delegiert an fetchEnvs('application', ...) — bestehende Aufrufer unverändert"
  - "detectConflicts(local, remote, baseline, policy) — Baseline = Remote-Snapshot zu Sync-Start für Out-of-Band-Erkennung"
  - "TDD RED+GREEN pro Task in einem Commit — Husky blockiert test-only RED-Commits (10-01-Muster)"

patterns-established:
  - "Env-HTTP zentral in client.ts; Parser rein ohne client-Import"
  - "Database is_preview wirft COOLIFY_VALIDATION_ERROR vor HTTP (Pitfall 1)"

requirements-completed: [ENV-01, ENV-02, ENV-03, ENV-04, ENV-05]

coverage:
  - id: D1
    description: Env-CRUD + Bulk-Client-Methoden nach ResourceType
    requirement: ENV-01
    verification:
      - kind: unit
        ref: src/api/client.test.ts#fetchEnvs/createEnv/updateEnvViaBulk/deleteEnv
        status: pass
    human_judgment: false
  - id: D2
    description: Database is_preview client-seitig abgelehnt
    requirement: ENV-06
    verification:
      - kind: unit
        ref: src/api/client.test.ts#createEnv(database) rejects is_preview
        status: pass
    human_judgment: false
  - id: D3
    description: Reiner .env-Parser mit Diff und Conflict-Detection
    requirement: ENV-05
    verification:
      - kind: unit
        ref: src/utils/env-parser.test.ts
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 01: Env-Client + Parser Summary

**Parameterisierte Env-CRUD-Client-Methoden und reiner .env-Parser/Diff-Engine — Grundlage für envs:*-Handler in 12-02..12-05**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-20T23:30:00Z
- **Completed:** 2026-07-20T23:34:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `fetchEnvs`, `createEnv`, `updateEnvViaBulk`, `bulkUpdateEnvs`, `deleteEnv` in `client.ts` — Pfade `applications|services|databases/{uuid}/envs`
- Database-Guard: `is_preview === true` → `COOLIFY_VALIDATION_ERROR` vor HTTP (create + bulk)
- `env-parser.ts`: `parseEnvFile`, `diffEnvs`, `detectConflicts` — rein, ohne Netzwerk
- Alle 12-00 RED-Tests für Client + Parser auf GREEN geflippt (86 Tests)

## Task Commits

1. **Task 1: Env CRUD + bulk client methods** — `8b1b437` (feat)
2. **Task 2: env-parser.ts** — `1f74040` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/api/client.ts` — ResourceType, Env-Typen, fünf Env-Methoden, Database-Guard
- `src/utils/env-parser.ts` — Parser, Diff, Conflict-Detection (D-08 Enum)
- `src/api/client.test.ts` — it.fails → it für Env-Client-Tests
- `src/utils/env-parser.test.ts` — it.fails → it für Parser-Tests

## Decisions Made

- `fetchApplicationEnvs` bleibt als Thin-Wrapper für Abwärtskompatibilität
- `detectConflicts` nutzt expliziten Baseline-Parameter (Remote bei Sync-Start) statt impliziter Ableitung
- Kein `COOLIFY_SYNC_CONFLICT` — D-08 bleibt Handler-Schicht mit `COOLIFY_CONFIRM_REQUIRED`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-02 kann envs:list/get-Handler auf `fetchEnvs` aufbauen
- 12-05 Sync-Engine kann `parseEnvFile`, `diffEnvs`, `detectConflicts` importieren
- Handler-Masking bleibt in projections.ts — nicht im Client

## Self-Check: PASSED

- FOUND: src/utils/env-parser.ts
- FOUND: src/api/client.ts (env methods)
- FOUND: commit 8b1b437
- FOUND: commit 1f74040

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*
