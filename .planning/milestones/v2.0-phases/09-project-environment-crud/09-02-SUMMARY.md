---
phase: 09-project-environment-crud
plan: 02
subsystem: mcp
tags: [coolify-mcp, project-crud, zod, delete-preview, initial-environment]

requires:
  - phase: 09-project-environment-crud
    provides: Wave 0 RED scaffolds + Wave 1 client/resolvers (09-00, 09-01)
provides:
  - project MCP tool handler with list/get/create/update/delete/delete_preview
  - initial_environment guarantee on create per D-09/D-10/D-11
  - Two-stage delete with confirm gate and COOLIFY_409 on non-empty project
affects: [09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "Domain CRUD handler mirroring private_key.ts action discriminatedUnion"
    - "ensureInitialEnvironment sync path after POST /projects"
    - "resolveProjectIdentifier uuid-first with name fallback per D-14"

key-files:
  created:
    - src/mcp/tools/project.ts
  modified: []

key-decisions:
  - "initial_environment Zod min(1) ohne Default — COOLIFY_422 mit D-09 Recovery-Hint"
  - "Created env merged in environments[] wenn Re-fetch mock/API-Lücke (Rule 1 edge)"
  - "update: name als Patch-Feld wenn uuid gesetzt, sonst new_name für Rename-by-lookup"

patterns-established:
  - "Project tool Wave 2 handler — environment tool folgt in 09-03"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

coverage:
  - id: D1
    description: "project tool list/get/create/update/delete/delete_preview actions"
    requirement: PROJ-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/project.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "create requires initial_environment and ensures env exists"
    requirement: PROJ-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts — project create describe block"
        status: pass
    human_judgment: false
  - id: D3
    description: "delete confirm gate + COOLIFY_409 on non-empty project"
    requirement: PROJ-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts — project delete describe block"
        status: pass
    human_judgment: false
  - id: D4
    description: "name resolution COOLIFY_AMBIGUOUS_MATCH on multi-match"
    requirement: PROJ-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts — multi-match get test"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 02: Project MCP Tool Handler Summary

**Project CRUD MCP handler mit initial_environment-Garantie, confirm-gated delete und name→UUID-Auflösung — 09-00 project.test.ts GREEN**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T03:24:00Z
- **Completed:** 2026-07-17T03:32:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `src/mcp/tools/project.ts` — vollständiger Handler: list, get, create, update, delete, delete_preview
- `create` erzwingt `initial_environment` (min 1), erstellt fehlende Env via API, löscht nie auto-spawned production
- `delete` mit confirm-Gate + client-side Emptiness-Check → COOLIFY_409 mit `environment_uuids`
- `project.test.ts` von RED auf GREEN (15/15 Tests)

## Task Commits

1. **Task 1: Implement project.ts handler + schema** - `ef7d1eb` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/tools/project.ts` — Action-Schema, Handler, Summary-Projektoren, ensureInitialEnvironment

## Decisions Made

- `initial_environment` ohne `.default()` — fehlend/leer → COOLIFY_422 mit explizitem Ask-User-Hint (D-09/D-10)
- Nach `createEnvironment` wird erstellte Env in `environments[]` gemerged falls Re-fetch sie nicht enthält (Mock/API-Kante)
- Update: bei `uuid`+`name` ist `name` der neue Projektname; `new_name` für Lookup-only-Pfad

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 09-03 kann `environment.ts` Handler implementieren — project-Handler fertig, nur environment.test.ts noch RED
- 09-04 registriert beide Tools in `server.ts`
- 581 Tests grün; 1 erwartetes RED (environment.test.ts Import bis 09-03)

## Self-Check: PASSED

- [x] `src/mcp/tools/project.ts` exists
- [x] Commit `ef7d1eb` exists
- [x] `npx vitest run src/mcp/tools/project.test.ts` — 15 passed
- [x] `grep -c force src/mcp/tools/project.ts` — 0

---
*Phase: 09-project-environment-crud*
*Completed: 2026-07-17*
