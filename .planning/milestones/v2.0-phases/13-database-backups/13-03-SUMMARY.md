---
phase: 13-database-backups
plan: 03
subsystem: mcp
tags: [backup, database, zod, confirm-gate, BAK-03, BAK-04, BAK-05]

requires:
  - phase: 13-02
    provides: backup:create/list/history handlers and backupParentFields pattern
provides:
  - backup:update, backup:delete, backup:now handlers in database.ts
  - 12 GREEN tests for update/delete/now (RED→GREEN flip)
affects: [13-04]

tech-stack:
  added: []
  patterns:
    - "backup:update frequency via backupFrequencyUpdateSchema (Presets only — Pitfall 1)"
    - "backup:delete confirm via validateBackupDeleteConfirm (D-08, D-09)"
    - "backup:now via updateDatabaseBackup PATCH { backup_now: true } (D-12)"

key-files:
  created: []
  modified:
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "throwValidationError nur für backup:update (nicht globales backup:*-Prefix) — Cron-Ablehnung liefert COOLIFY_VALIDATION_ERROR"
  - "backup:delete Schema mit explizitem uuid|name statt backupParentFields — strict() ohne Parent-Felder ergab COOLIFY_422"

patterns-established:
  - "backup:update re-fetcht Schedules nach PATCH und maskiert via maskBackupConfig (D-15)"
  - "backup:now surfaced message/uuid aus PATCH-Response (BAK-05)"

requirements-completed: [BAK-03, BAK-04, BAK-05]

coverage:
  - id: D1
    description: "backup:update mit Preset-Frequenz, Cron-Ablehnung, kein Confirm-Gate"
    requirement: BAK-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:update"
        status: pass
    human_judgment: false
  - id: D2
    description: "backup:delete mit Confirm-Gate und delete_s3 default false"
    requirement: BAK-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:delete"
        status: pass
    human_judgment: false
  - id: D3
    description: "backup:now via PATCH backup_now:true ohne Confirm"
    requirement: BAK-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:now"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-21
status: complete
---

# Phase 13 Plan 03: Backup Update/Delete/Now Summary

**Mutierende backup:* Actions — Schedule aktualisieren (Presets only), löschen (Confirm-Gate), sofort auslösen (PATCH backup_now)**

## Performance

- **Dauer:** ~8 Min
- **Gestartet:** 2026-07-21T02:32:00Z
- **Abgeschlossen:** 2026-07-21T02:40:00Z
- **Tasks:** 2/2
- **Geänderte Dateien:** 2

## Ergebnisse

- `database.ts`: drei neue Action-Schemas (`backupUpdateActionSchema`, `backupDeleteActionSchema`, `backupNowActionSchema`) in discriminatedUnion
- Handler: `handleDatabaseBackupUpdate`, `handleDatabaseBackupDelete`, `handleDatabaseBackupNow` + Dispatch-Cases
- `backup:update`: `buildBackupUpdatePayload` + `updateDatabaseBackup`, Re-Fetch + `maskBackupConfig`, Cron via Zod-Enum abgelehnt (Pitfall 1)
- `backup:delete`: `validateBackupDeleteConfirm` vor HTTP, `deleteDatabaseBackup` mit `delete_s3` default false
- `backup:now`: `updateDatabaseBackup` mit `{ backup_now: true }` (D-12), kein separates Trigger-Endpoint
- 12 Tests (4 update + 4 delete + 4 now) von `it.fails` → `it` — alle GREEN
- Gesamtsuite: 835 passed (83 database.test.ts)

## Task Commits

1. **Task 1+2: Handler-Implementierung (BAK-03–05)** — `f44c415`
2. **Task 2: RED→GREEN Test-Flip** — `f072939`

## Geänderte Dateien

- `src/mcp/tools/database.ts` — Schemas, Handler, Dispatch, Result-Types, throwValidationError für backup:update
- `src/mcp/tools/database.test.ts` — RED→GREEN für update/delete/now

## Entscheidungen

- `throwValidationError` erweitert nur für `backup:update` (nicht globales `backup:*`) — liefert COOLIFY_VALIDATION_ERROR bei ungültiger Cron-Frequenz ohne false-positives auf unimplementierte Actions
- `backupDeleteActionSchema` nutzt explizite `uuid|name`-Felder statt `backupParentFields` — fehlende Parent-Felder verursachten COOLIFY_422 bei strict()

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] backup:delete Schema ohne uuid|name**
- **Found during:** Task 2 (Test-Lauf)
- **Issue:** strict() Schema verworf `uuid`/`name` → COOLIFY_422 statt Confirm/Ambiguous-Match
- **Fix:** Explizite `uuid`/`name` optional fields im delete-Schema
- **Files modified:** `src/mcp/tools/database.ts`
- **Commit:** `f44c415`

## Probleme

Keine — STATE.md und ROADMAP.md bewusst nicht aktualisiert (Orchestrator-Vorgabe).

## Nächste Schritte

- **13-04:** Tool-Beschreibungen und Docs-Parität für backup:* Namespace

## Self-Check: PASSED

- FOUND: src/mcp/tools/database.ts
- FOUND: src/mcp/tools/database.test.ts
- FOUND: .planning/phases/13-database-backups/13-03-SUMMARY.md
- FOUND: f44c415
- FOUND: f072939
- Vitest database.test.ts: 83 passed
- npm run build: success

---
*Phase: 13-database-backups*
*Completed: 2026-07-21*
