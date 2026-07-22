---
phase: 13-database-backups
plan: 00
subsystem: testing
tags: [vitest, tdd, backup, database, red-scaffold]

requires: []
provides:
  - RED test scaffolds for six backup:* MCP actions in database.test.ts
  - RED test scaffolds for five backup API client methods in client.test.ts
  - Executable specs for Pitfall 1 cron asymmetry, confirm gates, S3 masking, reveal hints
affects: [13-01, 13-02, 13-03, 13-04]

tech-stack:
  added: []
  patterns:
    - "it.fails RED gate (Phase-12-Muster) für husky-grünen Pre-Commit"
    - "clientCrud dynamischer Zugriff für noch nicht exportierte Client-Methoden"

key-files:
  created: []
  modified:
    - src/mcp/tools/database.test.ts
    - src/api/client.test.ts

key-decisions:
  - "it.fails statt rohem it() — etabliertes Projekt-Muster für Wave-0 RED (Phase 12)"
  - "Synthetische Fixtures (FAKE_S3_SECRET) — keine echten Credentials in Tests"

patterns-established:
  - "backup:* describe-Blöcke spiegeln envs:*-Struktur in database.test.ts"
  - "Client-Tests assertieren exakte OpenAPI-Pfade und HTTP-Verben"

requirements-completed: [BAK-01, BAK-02, BAK-03, BAK-04, BAK-05, BAK-06]

coverage:
  - id: D1
    description: "Sechs backup:* RED describe-Blöcke in database.test.ts"
    requirement: BAK-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:create"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fünf Backup-Client-Methoden RED describe-Blöcke in client.test.ts"
    requirement: BAK-01
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#fetchDatabaseBackups"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pitfall-1 Cron-Asymmetrie (create akzeptiert, update lehnt ab) als Test-Spec"
    requirement: BAK-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#rejects cron expression frequency"
        status: pass
    human_judgment: false
  - id: D4
    description: "Confirm-Gate und delete_s3-Default in backup:delete Tests"
    requirement: BAK-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:delete"
        status: pass
    human_judgment: false
  - id: D5
    description: "backup:now PATCH backup_now:true Semantik spezifiziert"
    requirement: BAK-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:now"
        status: pass
    human_judgment: false
  - id: D6
    description: "backup:history Executions-Projektion und ask_human_reveal"
    requirement: BAK-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database backup:history"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-21
status: complete
---

# Phase 13 Plan 00: Database Backups RED Scaffolds Summary

**37 RED-Tests (it.fails) für backup:*-Actions und Backup-Client-Methoden — ausführbare Specs vor Implementierung in 13-01..13-04**

## Performance

- **Dauer:** ~4 Min
- **Gestartet:** 2026-07-21T02:18:00Z
- **Abgeschlossen:** 2026-07-21T02:22:00Z
- **Tasks:** 2/2
- **Geänderte Dateien:** 2

## Ergebnisse

- `database.test.ts`: 6 describe-Blöcke (`backup:create`, `list`, `update`, `delete`, `now`, `history`) mit 25 `it.fails`-Tests
- `client.test.ts`: 5 describe-Blöcke für Backup-Client-Methoden mit 12 `it.fails`-Tests
- Pitfall 1 (Cron nur bei create), Confirm-Gates (D-08/D-09), S3-Masking (D-15), `ask_human_reveal` (D-16) als Test-Erwartungen codiert
- Gesamtsuite husky-grün: 798 passed | 37 expected fail

## Task Commits

1. **Task 1: RED scaffolds database.test.ts backup:* actions** — `d7fe8e6` (test)
2. **Task 2: RED scaffolds client.test.ts backup methods** — `477e4ec` (test)

## Geänderte Dateien

- `src/mcp/tools/database.test.ts` — backup:* Handler-Specs (Mock-Stubs für Client-Methoden)
- `src/api/client.test.ts` — OpenAPI-konforme Client-Methoden-Specs

## Entscheidungen

- `it.fails` für RED-Gate (Phase-12-Konvention) — Pre-Commit-Hook läuft `npm test` und würde bei rohen Failures blockieren
- Keine Produktions-Implementierung in diesem Plan (Wave 0)

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] it.fails statt roher failing tests für Husky**
- **Gefunden während:** Task 1 (Commit)
- **Problem:** Pre-Commit (`npm test`) blockierte Commit wegen 25 failing tests
- **Fix:** Alle neuen Backup-Tests auf `it.fails` umgestellt (identisch Phase 12 `test(12-00)`)
- **Dateien:** `src/mcp/tools/database.test.ts`, `src/api/client.test.ts`
- **Commit:** `d7fe8e6`, `477e4ec`

---

**Abweichungen gesamt:** 1 (Rule 3 — etabliertes Projekt-Muster)
**Plan-Impact:** Kein Scope-Creep — RED-Semantik bleibt (37 expected fail), nur Vitest-Markierung angepasst

## Probleme

Keine — STATE.md und ROADMAP.md bewusst nicht aktualisiert (Orchestrator-Vorgabe).

## Nächste Schritte

- **13-01:** Backup-Client-Methoden in `src/api/client.ts` implementieren → client.test.ts `it.fails` → `it` umwandeln
- **13-02/13-03:** `backup:*` Handler in `database.ts` → database.test.ts GREEN
- **13-04:** Tool-Beschreibungen und Docs-Parität

## Self-Check: PASSED

- FOUND: src/mcp/tools/database.test.ts
- FOUND: src/api/client.test.ts
- FOUND: .planning/phases/13-database-backups/13-00-SUMMARY.md
- FOUND: d7fe8e6
- FOUND: 477e4ec
- Vitest: 25 expected fail (database) + 12 expected fail (client) = 37 RED specs

---
*Phase: 13-database-backups*
*Completed: 2026-07-21*
