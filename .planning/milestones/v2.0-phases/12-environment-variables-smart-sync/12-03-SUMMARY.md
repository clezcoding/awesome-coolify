---
phase: 12-environment-variables-smart-sync
plan: 03
subsystem: api
tags: [env-vars, zod, service-tool, bulk-patch, secret-masking]

requires:
  - phase: 12-01
    provides: fetchEnvs/createEnv/updateEnvViaBulk/deleteEnv Client-Methoden
  - phase: 12-02
    provides: envs:* Handler-Muster für application (maskEnvRecord, withRevealRecoveryHints)
provides:
  - service envs:list/get/create/update/delete/bulk-update Handler
  - resolveServiceEnvIdentity mit COOLIFY_AMBIGUOUS_MATCH
  - D-15 ask_human_reveal Recovery-Hint bei reveal:true
affects: [12-04, 12-05, 12-06]

tech-stack:
  added: []
  patterns:
    - Sechs envs:* Zod-Schemas in serviceActionSchema discriminatedUnion
    - env_uuid XOR key via superRefine auf get/update
    - Explizite value-Feld-Maskierung für Env-Objekte (D-14)
    - Confirm-Gates via validateEnvMutationConfirm + COOLIFY_CONFIRM_REQUIRED

key-files:
  created: []
  modified:
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts

key-decisions:
  - "Env value-Feld immer als *** maskieren — maskEnvRecord wie 12-02, sanitizeFullProjection allein reicht nicht"
  - "ask_human_reveal als top-level recoveryHints auf ReadResponse bei reveal:true (D-15)"
  - "envs:update per env_uuid löst Key aus Liste auf, dann single-element bulk PATCH"
  - "Kein envs:sync auf service — D-09 app-only"

patterns-established:
  - "maskEnvRecord: sanitizeFullProjection + explizites value-Masking"
  - "withRevealRecoveryHints: D-15 Hint auf allen reveal:true-Pfaden"

requirements-completed: [ENV-01, ENV-02, ENV-03, ENV-04, ENV-06]

coverage:
  - id: D1
    description: service envs:list/get mit Standard-Maskierung und reveal-Opt-in
    requirement: ENV-01
    verification:
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:list
        status: pass
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:get
        status: pass
    human_judgment: false
  - id: D2
    description: envs:create/update/delete mit Flags und Confirm-Gates
    requirement: ENV-02
    verification:
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:create
        status: pass
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:update
        status: pass
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:delete
        status: pass
    human_judgment: false
  - id: D3
    description: envs:bulk-update mit confirm-Gate und Eintrags-Array
    requirement: ENV-04
    verification:
      - kind: unit
        ref: src/mcp/tools/service.test.ts#service envs:bulk-update
        status: pass
    human_judgment: false
  - id: D4
    description: Vier Env-Flags auf create und bulk-update inkl. is_preview (ENV-06)
    requirement: ENV-06
    verification:
      - kind: unit
        ref: src/mcp/tools/service.test.ts#creates env with all four flags
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 03: Service envs:* CRUD Summary

**Sechs envs:*-Actions im Service-Tool — CRUD, Bulk-Patch, Maskierung, Confirm-Gates, kein sync (D-09)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-20T23:39:00Z
- **Completed:** 2026-07-20T23:42:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Zod-Schemas für envs:list/get/create/update/delete/bulk-update in `serviceActionSchema`
- Handler-Dispatch mit `fetchEnvs`, `createEnv`, `updateEnvViaBulk`, `bulkUpdateEnvs`, `deleteEnv` und resource `'service'`
- `resolveServiceEnvIdentity` — env_uuid bevorzugt, Key-Lookup mit `COOLIFY_AMBIGUOUS_MATCH`
- Alle 9 service envs:* Tests GREEN; kein envs:sync (D-09 app-only)

## Task Commits

1. **Task 1: Zod schemas for service envs:*** — `3eae81a` (feat)
2. **Task 2: Implement service envs:* handler branches** — `daf340d` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/service.ts` — Schemas, Helper, sechs Handler-Branches
- `src/mcp/tools/service.test.ts` — 9 it.fails → it für CRUD/Bulk

## Decisions Made

- Explizites Maskieren des `value`-Felds in `maskEnvRecord` — Pattern aus 12-02 übernommen
- `ask_human_reveal`-Hint als top-level `recoveryHints` auf der Response (D-15)
- envs:update per env_uuid: Key aus Liste, nie Caller-supplied Key bei UUID-Pfad

## Deviations from Plan

None - plan executed exactly as written (maskEnvRecord folgt etabliertem 12-02-Muster).

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 12-04 kann dasselbe envs:*-Muster auf database kopieren (ohne is_preview falls OpenAPI fehlt)
- 12-05 envs:sync baut auf application-Handlern auf
- Service envs:* vollständig GREEN

## Self-Check: PASSED

- FOUND: src/mcp/tools/service.ts (envs handlers)
- FOUND: commit 3eae81a
- FOUND: commit daf340d

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*
