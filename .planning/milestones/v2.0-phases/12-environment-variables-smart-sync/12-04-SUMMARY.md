---
phase: 12-environment-variables-smart-sync
plan: 04
subsystem: api
tags: [env-vars, zod, database-tool, bulk-patch, secret-masking, is_preview-omission]

requires:
  - phase: 12-01
    provides: fetchEnvs/createEnv/updateEnvViaBulk/deleteEnv Client-Methoden
  - phase: 12-02
    provides: envs:* Handler-Muster für application (maskEnvRecord, withRevealRecoveryHints)
provides:
  - database envs:list/get/create/update/delete/bulk-update Handler
  - resolveDatabaseEnvIdentity mit COOLIFY_AMBIGUOUS_MATCH
  - Schema-level is_preview rejection via .strict() (D-16 Pitfall 1)
  - D-15 ask_human_reveal Recovery-Hint bei reveal:true
affects: [12-05, 12-06]

tech-stack:
  added: []
  patterns:
    - Sechs envs:* Zod-Schemas ohne is_preview in databaseActionSchema
    - databaseEnvFlagFields nur is_literal/is_multiline/is_shown_once
    - env_uuid XOR key via superRefine auf get/update
    - Confirm-Gates via validateEnvMutationConfirm + COOLIFY_CONFIRM_REQUIRED

key-files:
  created: []
  modified:
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "is_preview vollständig aus database-Schemas und Handlern entfernt — OpenAPI-Gap D-16"
  - "Env value-Feld immer als *** maskieren — maskEnvRecord wie 12-02/12-03"
  - "ask_human_reveal als top-level recoveryHints auf ReadResponse bei reveal:true (D-15)"
  - "envs:update per env_uuid löst Key aus Liste auf, dann single-element bulk PATCH"
  - "Kein envs:sync auf database — D-09 app-only"

patterns-established:
  - "databaseEnvFlagFields: drei Flags ohne is_preview"
  - "throwValidationError mappt envs:* strict()-Fehler auf COOLIFY_VALIDATION_ERROR"

requirements-completed: [ENV-01, ENV-02, ENV-03, ENV-04, ENV-06]

coverage:
  - id: D1
    description: database envs:list/get mit Standard-Maskierung und reveal-Opt-in
    requirement: ENV-01
    verification:
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:list
        status: pass
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:get
        status: pass
    human_judgment: false
  - id: D2
    description: envs:create/update/delete mit drei Flags (ohne is_preview) und Confirm-Gates
    requirement: ENV-02
    verification:
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:create
        status: pass
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:update
        status: pass
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:delete
        status: pass
    human_judgment: false
  - id: D3
    description: envs:bulk-update mit confirm-Gate und Eintrags-Array
    requirement: ENV-04
    verification:
      - kind: unit
        ref: src/mcp/tools/database.test.ts#database envs:bulk-update
        status: pass
    human_judgment: false
  - id: D4
    description: is_preview abgelehnt auf create/update/bulk per D-16 Pitfall 1
    requirement: ENV-06
    verification:
      - kind: unit
        ref: src/mcp/tools/database.test.ts#rejects is_preview with COOLIFY_VALIDATION_ERROR
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 04: Database envs:* CRUD Summary

**Sechs database envs:*-Actions ohne is_preview — CRUD, Bulk-Patch, Schema-Reject, Maskierung, kein sync (D-09)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-20T23:41:56Z
- **Completed:** 2026-07-20T23:44:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Zod-Schemas für envs:list/get/create/update/delete/bulk-update ohne is_preview in `databaseActionSchema`
- `.strict()` auf create/update/bulk-entry lehnt is_preview mit COOLIFY_VALIDATION_ERROR ab
- Sechs Handler-Branches mit resource `'database'`, maskEnvRecord, confirm-Gates, D-15 reveal-Hint
- Alle 11 database envs:* Tests GREEN; kein envs:sync (D-09 app-only)

## Task Commits

1. **Task 1: Zod schemas for database envs:*** — `0e04ef8` (feat)
2. **Task 2: Implement database envs:* handler branches** — `b3ab4df` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/database.ts` — Schemas, Helper, sechs Handler-Branches ohne is_preview
- `src/mcp/tools/database.test.ts` — 11 it.fails → it für CRUD/Bulk/is_preview-Reject

## Decisions Made

- is_preview komplett aus database-Schemas und Handlern entfernt (OpenAPI Pitfall 1, D-16)
- Explizites Maskieren des `value`-Felds in `maskEnvRecord` — Pattern aus 12-02/12-03
- `ask_human_reveal`-Hint als top-level `recoveryHints` auf allen reveal:true-Pfaden (D-15)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] is_preview-Tests in Task 1 geflippt für Husky pre-commit**
- **Found during:** Task 1 (Schema commit)
- **Issue:** Husky vitest schlägt fehl wenn is_preview-Tests it.fails sind aber Schema-Validierung bereits GREEN
- **Fix:** Drei is_preview-Rejection-Tests von it.fails auf it geflippt in Task-1-Commit
- **Files modified:** src/mcp/tools/database.test.ts
- **Verification:** vitest database.test.ts exit 0
- **Committed in:** 0e04ef8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Husky-kompatibel; Handler-Tests blieben it.fails bis Task 2

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-05 envs:sync auf application baut auf 12-02 Handlern auf
- 12-06 Tool-Registrierung + README kann alle drei domain envs:*-Surfaces dokumentieren
- Database envs:* vollständig GREEN

## Self-Check: PASSED

- FOUND: .planning/phases/12-environment-variables-smart-sync/12-04-SUMMARY.md
- FOUND: src/mcp/tools/database.ts (envs handlers)
- FOUND: commit 0e04ef8
- FOUND: commit b3ab4df

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*
