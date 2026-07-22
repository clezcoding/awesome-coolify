---
phase: 12-environment-variables-smart-sync
plan: 02
subsystem: api
tags: [env-vars, zod, application-tool, bulk-patch, secret-masking]

requires:
  - phase: 12-01
    provides: fetchEnvs/createEnv/updateEnvViaBulk/deleteEnv Client-Methoden
provides:
  - application envs:list/get/create/update/delete/bulk-update Handler
  - resolveEnvIdentity mit COOLIFY_AMBIGUOUS_MATCH
  - D-15 ask_human_reveal Recovery-Hint bei reveal:true
affects: [12-03, 12-04, 12-05]

tech-stack:
  added: []
  patterns:
    - Sechs envs:* Zod-Schemas in applicationActionSchema discriminatedUnion
    - env_uuid XOR key via superRefine auf get/update
    - Explizite value-Feld-Maskierung für Env-Objekte (D-14)
    - Confirm-Gates via validateEnvMutationConfirm + COOLIFY_CONFIRM_REQUIRED

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "Env value-Feld immer als *** maskieren — sanitizeFullProjection allein reicht nicht für generisches value-Feld"
  - "ask_human_reveal als top-level recoveryHints auf ReadResponse bei reveal:true (D-15)"
  - "envs:update per env_uuid löst Key aus Liste auf, dann single-element bulk PATCH"

patterns-established:
  - "maskEnvRecord: sanitizeFullProjection + explizites value-Masking"
  - "withRevealRecoveryHints: D-15 Hint auf allen reveal:true-Pfaden"

requirements-completed: [ENV-01, ENV-02, ENV-03, ENV-04, ENV-06]

coverage:
  - id: D1
    description: application envs:list/get mit Standard-Maskierung und reveal-Opt-in
    requirement: ENV-01
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:list
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:get
        status: pass
    human_judgment: false
  - id: D2
    description: envs:create/update/delete mit Flags und Confirm-Gates
    requirement: ENV-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:create
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:update
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:delete
        status: pass
    human_judgment: false
  - id: D3
    description: envs:bulk-update mit confirm-Gate und Eintrags-Array
    requirement: ENV-04
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:bulk-update
        status: pass
    human_judgment: false
  - id: D4
    description: Vier Env-Flags auf create und bulk-update (ENV-06)
    requirement: ENV-06
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#creates env with all four flags
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 02: Application envs:* CRUD Summary

**Sechs envs:*-Actions im Application-Tool — CRUD, Bulk-Patch, Maskierung, Confirm-Gates und D-15 reveal-Hint**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-20T23:34:00Z
- **Completed:** 2026-07-20T23:39:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Zod-Schemas für envs:list/get/create/update/delete/bulk-update in `applicationActionSchema`
- Handler-Dispatch mit `fetchEnvs`, `createEnv`, `updateEnvViaBulk`, `deleteEnv`, `bulkUpdateEnvs`
- `resolveEnvIdentity` — env_uuid bevorzugt, Key-Lookup mit `COOLIFY_AMBIGUOUS_MATCH`
- Alle 12 envs:* CRUD/Bulk-Tests GREEN; envs:sync bleibt RED für Plan 12-05

## Task Commits

1. **Task 1: Zod schemas for application envs:*** — `d945055` (feat)
2. **Task 2: Implement application envs:* handler branches** — `79cfd01` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.ts` — Schemas, Helper, sechs Handler-Branches
- `src/mcp/tools/application.test.ts` — 11 it.fails → it für CRUD/Bulk

## Decisions Made

- Explizites Maskieren des `value`-Felds in `maskEnvRecord` — `sanitizeFullProjection` maskiert Env-Werte nicht zuverlässig
- `ask_human_reveal`-Hint als top-level `recoveryHints` auf der Response (JSON.stringify erfasst ihn)
- envs:update per env_uuid: Key aus Liste, nie Caller-supplied Key bei UUID-Pfad (T-12-02-05)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Explizite Env-value-Maskierung**
- **Found during:** Task 2 (Handler-Implementierung)
- **Issue:** `sanitizeFullProjection` maskiert das generische Feld `value` auf Env-Objekten nicht — Tests erwarteten `***`
- **Fix:** `maskEnvRecord` setzt `value = '***'` wenn `reveal !== true`
- **Files modified:** `src/mcp/tools/application.ts`
- **Verification:** envs:list/get masked tests GREEN
- **Committed in:** `79cfd01`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Korrektheits-Fix für D-14/SAF-04. Kein Scope-Creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-03/12-04 können dasselbe envs:*-Muster auf service/database kopieren
- 12-05 envs:sync baut auf denselben Handlern + env-parser auf
- envs:sync-Tests (10) bleiben bewusst RED

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts (envs handlers)
- FOUND: commit d945055
- FOUND: commit 79cfd01

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*
