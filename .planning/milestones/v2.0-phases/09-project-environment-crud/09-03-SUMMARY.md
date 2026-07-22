---
phase: 09-project-environment-crud
plan: 03
subsystem: mcp
tags: [coolify-mcp, environment-crud, zod, delete-preview, child-resource-precheck]

requires:
  - phase: 09-project-environment-crud
    provides: Wave 0 RED scaffolds + Wave 1 client/resolvers (09-00, 09-01)
provides:
  - environment MCP tool handler with list/get/create/delete/delete_preview
  - project-scoped env name resolution per D-12/D-13
  - child-resource emptiness pre-check incl. deleting/destroying async state
affects: [09-04]

tech-stack:
  added: []
  patterns:
    - "Domain CRUD handler mirroring private_key.ts + project.ts"
    - "findEnvironmentChildResources via fetchResources environment_id match"
    - "DUPLICATE_ENV_RECOVERY_HINTS on create 409 per D-15"

key-files:
  created:
    - src/mcp/tools/environment.ts
  modified: []

key-decisions:
  - "Kein update-Action — Coolify API hat kein PATCH (PROHIB_ABSENT)"
  - "deleting/destroying Kinder zählen als blockierend — async Coolify-Löschung per RESEARCH pitfall 2"
  - "create 409 via isDuplicateEnvironmentError — mock + HTTP 409 abgedeckt"

patterns-established:
  - "Environment tool Wave 2 handler — bereit für 09-04 registration"

requirements-completed: [PROJ-04, PROJ-05]

coverage:
  - id: D1
    description: "environment tool list/get/create/delete/delete_preview actions"
    requirement: PROJ-04
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/environment.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "create with project_name resolution and duplicate 409 recovery hint"
    requirement: PROJ-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/environment.test.ts — environment create describe block"
        status: pass
    human_judgment: false
  - id: D3
    description: "delete confirm gate + COOLIFY_409 on non-empty env with child_resource_uuids"
    requirement: PROJ-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/environment.test.ts — environment delete describe block"
        status: pass
    human_judgment: false
  - id: D4
    description: "delete_preview returns child_resources without DELETE call"
    requirement: PROJ-05
    verification:
      - kind: unit
        ref: "src/mcp/tools/environment.test.ts — environment delete_preview describe block"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 03: Environment MCP Tool Handler Summary

**Environment-CRUD mit project-scoped Auflösung, confirm-gated delete, Child-Resource-Pre-Check und 409-Duplikat-Hint — 09-00 environment.test.ts GREEN (17/17)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T03:34:00Z
- **Completed:** 2026-07-17T03:36:41Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `src/mcp/tools/environment.ts` — Handler: list, get, create, delete, delete_preview (kein update)
- `list`/`create` mit `project_uuid` XOR `project_name` via `resolveProjectUuid` (D-12)
- `get`/`delete` mit env `uuid` XOR `name` innerhalb Parent-Project (D-13)
- `delete` mit confirm-Gate + `fetchResources`-Pre-Check → COOLIFY_409 mit `child_resource_uuids` (inkl. deleting/destroying)
- `environment.test.ts` von RED auf GREEN (17/17 Tests); Gesamtsuite 598 grün

## Task Commits

1. **Task 1: Implement environment.ts handler + schema** - `d4ba5b7` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/tools/environment.ts` — Action-Schema, Handler, Summary-Projektion, Child-Resource-Filter

## Decisions Made

- Kein `update`-Action — API-Gap explizit per Schema-Prohibition
- `deleting`/`destroying` Ressourcen blockieren Env-Delete (async Coolify-Zustand)
- Duplicate-create: eigener Recovery-Hint statt generischem COOLIFY_409

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 09-04 kann `environment` + `project` in `server.ts` registrieren
- Beide Handler GREEN; nur noch Tool-Registration + MCP-Schema offen
- 598 Tests grün, keine Regressionen

## Self-Check: PASSED

- [x] `src/mcp/tools/environment.ts` exists
- [x] Commit `d4ba5b7` exists
- [x] `npx vitest run src/mcp/tools/environment.test.ts` — 17 passed
- [x] `grep -c "action: z.literal('update')" src/mcp/tools/environment.ts` — 0
- [x] `grep -c force src/mcp/tools/environment.ts` — 0

---
*Phase: 09-project-environment-crud*
*Completed: 2026-07-17*
