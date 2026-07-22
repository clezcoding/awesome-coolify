---
phase: 13-database-backups
plan: 02
subsystem: mcp
tags: [backup, database, zod, masking, ask-human-reveal, BAK-01, BAK-02, BAK-06]

requires:
  - phase: 13-01
    provides: backup-shared.ts helpers and backup API client methods
provides:
  - backup:create, backup:list, backup:history handlers in database.ts
  - 13 GREEN tests for create/list/history (RED→GREEN flip)
affects: [13-03, 13-04]

tech-stack:
  added: []
  patterns:
    - "backupParentFields shared across backup:create/list/history schemas"
    - "withRevealRecoveryHints für D-16 auf reveal-Pfaden"
    - "Execution-Projection auf uuid/filename/size/created_at/message/status (D-14)"

key-files:
  created: []
  modified:
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "Optional confirm-Feld in backupParentFields — akzeptiert confirm:false ohne Gate (D-10, 13-00-Tests)"
  - "Create-Response flach: uuid + maskierte Schedule-Felder + hints (Test-Vertrag 13-00)"
  - "throwValidationError nicht auf backup:* erweitert — verhindert false-positive it.fails für backup:update"

patterns-established:
  - "Backup-Handler nutzen resolveDatabaseUuid + backup-shared maskBackupConfig/buildBackupCreatePayload"
  - "History liefert { scheduled_backup_uuid, executions: [...] } Envelope"

requirements-completed: [BAK-01, BAK-02, BAK-06]

coverage:
  - id: D1
    description: "backup:create mit Frequenz preset/cron, save_s3-Validierung, S3-Masking"
    requirement: BAK-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:create"
        status: pass
    human_judgment: false
  - id: D2
    description: "backup:list maskiert Schedule-Summaries und ask_human_reveal bei reveal"
    requirement: BAK-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:list"
        status: pass
    human_judgment: false
  - id: D3
    description: "backup:history projiziert Executions mit status/timestamps/size (D-14)"
    requirement: BAK-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:history"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-21
status: complete
---

# Phase 13 Plan 02: Backup Create/List/History Summary

**backup:create, backup:list, backup:history im database-Tool — Schedule anlegen, listen, History lesen mit S3-Masking und ask_human_reveal**

## Performance

- **Dauer:** ~5 Min
- **Gestartet:** 2026-07-21T02:28:00Z
- **Abgeschlossen:** 2026-07-21T02:33:00Z
- **Tasks:** 2/2
- **Geänderte Dateien:** 2

## Ergebnisse

- `database.ts`: drei neue Action-Schemas (`backupCreateActionSchema`, `backupListActionSchema`, `backupHistoryActionSchema`) in discriminatedUnion
- Handler: `handleDatabaseBackupCreate`, `handleDatabaseBackupList`, `handleDatabaseBackupHistory` + Dispatch-Cases
- `backup:create`: `buildBackupCreatePayload` + `createDatabaseBackup`, superRefine für D-06, flache maskierte Response
- `backup:list`: `fetchDatabaseBackups` + per-Schedule `maskBackupConfig`
- `backup:history`: `fetchBackupExecutions` + D-14-Projection, reveal-Hint via `withRevealRecoveryHints`
- 13 Tests (6 create + 3 list + 4 history) von `it.fails` → `it` — alle GREEN
- Gesamtsuite: 823 passed | 12 expected fail (backup:update/delete/now bleiben RED für 13-03)

## Task Commits

1. **Task 1: backup:create schema + handler + dispatch (BAK-01)** — `4f10c30`
2. **Task 2: backup:list + backup:history handlers (BAK-02, BAK-06)** — `61c431b`

## Geänderte Dateien

- `src/mcp/tools/database.ts` — Schemas, Handler, Dispatch, Result-Types
- `src/mcp/tools/database.test.ts` — RED→GREEN für create/list/history

## Entscheidungen

- Optionales `confirm`-Feld in `backupParentFields` — 13-00-Tests übergeben `confirm: false` und erwarten Erfolg (D-10: kein Gate, aber Feld tolerant akzeptieren)
- Kein globales `backup:*`-Prefix in `throwValidationError` — sonst schlagen 13-03-`it.fails`-Tests für unimplementierte Actions fehl

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Optionales confirm-Feld für D-10-Tests**
- **Found during:** Task 1
- **Issue:** `.strict()` Schema verwirft `confirm: false` aus 13-00-Tests
- **Fix:** `confirm: z.boolean().optional()` in `backupParentFields` (ignoriert, kein Gate)
- **Files modified:** `src/mcp/tools/database.ts`
- **Commit:** `4f10c30`

**2. [Rule 1 - Bug] throwValidationError backup:*-Prefix**
- **Found during:** Task 1 (pre-commit hook)
- **Issue:** Globales `backup:*`-Prefix setzte COOLIFY_VALIDATION_ERROR für unbekannte Actions → `backup:update`-it.fails schlug fehl
- **Fix:** Prefix-Revert; superRefine behält expliziten COOLIFY_VALIDATION_ERROR-Code
- **Files modified:** `src/mcp/tools/database.ts`
- **Commit:** `4f10c30`

## Probleme

Keine — STATE.md und ROADMAP.md bewusst nicht aktualisiert (Orchestrator-Vorgabe).

## Nächste Schritte

- **13-03:** `backup:update`, `backup:delete`, `backup:now` Handler
- **13-04:** Tool-Beschreibungen und Docs-Parität

## Self-Check: PASSED

- FOUND: src/mcp/tools/database.ts
- FOUND: src/mcp/tools/database.test.ts
- FOUND: .planning/phases/13-database-backups/13-02-SUMMARY.md
- FOUND: 4f10c30
- FOUND: 61c431b
- Vitest backup:create/list/history: 13 passed
- npm run build: success

---
*Phase: 13-database-backups*
*Completed: 2026-07-21*
