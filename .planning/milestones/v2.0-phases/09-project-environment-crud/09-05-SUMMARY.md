---
phase: 09-project-environment-crud
plan: 05
subsystem: mcp
tags: [project, validation, COOLIFY_422, D-11, gap-closure, initial_environment]

requires:
  - phase: 09-project-environment-crud
    provides: 09-02 project handler with initial_environment business rule
provides:
  - Live MCP project.create returns COOLIFY_422 + recoveryHints when initial_environment omitted (not SDK validation error)
  - Dual-layer validation pattern for initial_environment (optional schema, required handler) per D-11
affects:
  - 09-UAT
  - gap G-09-10
  - gap G-09-2

tech-stack:
  added: []
  patterns:
    - "MCP schema accepts optional initial_environment; handler rejects missing/empty with COOLIFY_422 (D-09/D-10/D-11)"

key-files:
  created: []
  modified:
    - src/mcp/tools/project.ts
    - src/mcp/tools/project.test.ts

key-decisions:
  - "initial_environment stays required at handler — no auto-default to production (D-09/D-10)"
  - "Schema optional + handler guard mirrors Phase 8 private_key reveal D-11 pattern"

patterns-established:
  - "Gap closure: unit tests calling handleProjectAction directly must also test schema acceptance for MCP passthrough fields"

requirements-completed: []

coverage:
  - id: D1
    description: "MCP schema accepts project.create without initial_environment"
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts#create schema accepts missing initial_environment (handler rejects)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Handler rejects missing/empty initial_environment with COOLIFY_422 and recoveryHints before createProject"
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts#rejects create without initial_environment with COOLIFY_422 and recovery hint per D-09/D-10"
        status: pass
    human_judgment: false
  - id: D3
    description: "Valid create with initial_environment production unchanged"
    verification:
      - kind: unit
        ref: "src/mcp/tools/project.test.ts#creates project with initial_environment production and ensures production env per D-09/D-11"
        status: pass
    human_judgment: false
  - id: D4
    description: "Live MCP project.create without initial_environment returns COOLIFY_422 envelope"
    verification: []
    human_judgment: true
    rationale: "Live MCP stdio E2E per project precedent — unit tests prove handler path; UAT Test 10 re-run required"

duration: 2min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 05: Gap Closure — initial_environment MCP Validation Envelope Summary

**Dual-layer validation for project.create initial_environment — optional MCP schema, handler COOLIFY_422 with recovery hints (D-11 pattern)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-17T04:10:00Z
- **Completed:** 2026-07-17T04:11:41Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments

- `initial_environment` optional at MCP JSON Schema layer — live SDK no longer rejects before handler
- Handler guard at `case 'create'` rejects missing/empty with `COOLIFY_422` + `INITIAL_ENV_RECOVERY_HINTS` before `createProject`
- Schema acceptance test added; existing handler rejection tests remain green (599 tests)

## Task Commits

Tasks 1–3 shipped in one atomic commit (interdependent schema + handler + tests):

1. **Tasks 1–3: Schema optional, handler guard, tests** - `c7a3a65` (fix)
2. **Task 4: Verify** - no commit (vitest + npm test + build green)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/mcp/tools/project.ts` - Optional schema, D-09/D-10 comment, handler guard with trim
- `src/mcp/tools/project.test.ts` - Schema accepts missing field; renamed provided-value test

## Decisions Made

- Followed Phase 8 D-11 dual-layer pattern — schema passthrough, handler enforces business rule
- No auto-default to `production` — explicit user choice required per D-09/D-10

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT Test 10 and Test 2 should pass on live MCP re-run
- Phase 9 verify-work can proceed after UAT confirmation

## Self-Check: PASSED

- FOUND: src/mcp/tools/project.ts
- FOUND: src/mcp/tools/project.test.ts
- FOUND: c7a3a65

---
*Phase: 09-project-environment-crud*
*Completed: 2026-07-17*
