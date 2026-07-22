---
phase: 09-project-environment-crud
plan: 01
subsystem: api
tags: [coolify-api, project-crud, environment-crud, resource-list, name-resolution]

requires:
  - phase: 09-project-environment-crud
    provides: Wave 0 RED scaffolds (09-00)
provides:
  - 7 project/environment HTTP helpers in client.ts
  - resource.list type=project|environment per D-04
  - resolveProjectUuid + resolveEnvironmentUuid in project-lookup.ts
affects: [09-02, 09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "createCoolifyClient CRUD pattern for project/environment endpoints"
    - "resource.list branches before default fetchResources path for new types"
    - "Name-to-UUID resolvers throw CoolifyApiError with COOLIFY_404/AMBIGUOUS_MATCH"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/mcp/tools/resource.ts
    - src/utils/project-lookup.ts
    - src/api/client.test.ts
    - src/mcp/tools/resource.test.ts
    - src/utils/project-lookup.test.ts

key-decisions:
  - "No updateEnvironment — Coolify API has no PATCH (PROHIB_ABSENT enforced)"
  - "resolveEnvironmentUuid returns matched env uuid (name_or_uuid passthrough available at HTTP layer per D-13)"
  - "project_uuid wins over project_name when both provided (existing emergency.ts pattern)"

patterns-established:
  - "Wave 1 shared infra: client CRUD + resource.list discovery + resolvers before handler plans 09-02/09-03"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05]

coverage:
  - id: D1
    description: "7 project/environment CRUD client functions with createCoolifyClient + withMappedErrors"
    requirement: PROJ-01
    verification:
      - kind: unit
        ref: "npx vitest run src/api/client.test.ts -t 'project and environment CRUD'"
        status: pass
    human_judgment: false
  - id: D2
    description: "resource.list serves type=project summaries with environment_count"
    requirement: PROJ-02
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/resource.test.ts -t 'type=project'"
        status: pass
    human_judgment: false
  - id: D3
    description: "resource.list serves type=environment summaries with project_uuid + project_name"
    requirement: PROJ-04
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/resource.test.ts -t 'type=environment'"
        status: pass
    human_judgment: false
  - id: D4
    description: "resolveProjectUuid and resolveEnvironmentUuid with structured error envelopes"
    requirement: PROJ-03
    verification:
      - kind: unit
        ref: "npx vitest run src/utils/project-lookup.test.ts -t 'resolveProjectUuid|resolveEnvironmentUuid'"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 01: Wave 1 Shared Infrastructure Summary

**Project/environment CRUD client, resource.list discovery types, and name-to-UUID resolvers for 09-02/09-03 handlers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T03:24:23Z
- **Completed:** 2026-07-17T03:29:30Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- `client.ts` — 7 neue Funktionen: create/update/delete Project, fetch/create/delete Environment; kein updateEnvironment
- `resource.ts` — `type=project|environment` in Schema + Handler mit `projectProjectSummary` / `projectEnvironmentSummary`
- `project-lookup.ts` — `resolveProjectUuid` + `resolveEnvironmentUuid` mit COOLIFY_404 / COOLIFY_AMBIGUOUS_MATCH

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Add project + environment CRUD to client.ts** - `2307818` (test) + `9eba9e2` (feat)
2. **Task 2: Extend resource.list with type=project|environment** - `9734bb0` (test) + `b92889b` (feat)
3. **Task 3: Add resolveProjectUuid + resolveEnvironmentUuid** - `a3ec5b0` (test) + `56662e1` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/api/client.ts` — 7 HTTP-Helper für Project/Environment CRUD
- `src/mcp/tools/resource.ts` — list-Branches für project/environment per D-04
- `src/utils/project-lookup.ts` — Name→UUID Resolver für D-12/D-13/D-14
- `src/api/client.test.ts` — 9 neue CRUD-Tests
- `src/mcp/tools/resource.test.ts` — Schema + list-Tests für project/environment
- `src/utils/project-lookup.test.ts` — 8 Resolver-Tests

## Decisions Made

- Kein `updateEnvironment` — API hat kein PATCH (Prohibition enforced, grep=0)
- Resolver geben matched UUID zurück; Coolify akzeptiert name_or_uuid im Path (D-13)
- Bestehende application/service/database/server list-Branches unverändert

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 09-02/09-03 können client + resolver + resource.list importieren ohne weitere Shared-Code-Änderungen
- Wave 0 RED tests (project.test.ts, environment.test.ts) bleiben RED bis Handler in 09-02/09-03
- 566 bestehende Tests grün; 2 erwartete RED-Import-Fails aus 09-00

## Self-Check: PASSED

- [x] `src/api/client.ts` — 7 CRUD functions exported
- [x] `src/mcp/tools/resource.ts` — project/environment list branches
- [x] `src/utils/project-lookup.ts` — both resolvers exported
- [x] Task commits: 2307818, 9eba9e2, 9734bb0, b92889b, a3ec5b0, 56662e1
- [x] npm test: 566 passed (2 expected RED from 09-00)

---
*Phase: 09-project-environment-crud*
*Completed: 2026-07-17*
