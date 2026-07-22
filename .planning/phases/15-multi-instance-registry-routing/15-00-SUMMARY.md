---
phase: 15-multi-instance-registry-routing
plan: 00
subsystem: testing
tags: [vitest, tdd, instance-registry, multi-instance, red-scaffold, it.fails]

requires: []
provides:
  - RED-Testgerüste für InstanceManager (CTX-04/05/08/09)
  - RED-Testgerüste für instance-Tool CRUD-Aktionen
  - RED soft-start + partial-env Cases in env.test.ts
  - RED CTX-06 Routing-Stubs in integration.test.ts
affects:
  - 15-01
  - 15-02
  - 15-03
  - 15-04

tech-stack:
  added: []
  patterns:
    - "Wave-0 RED via vitest it.fails + dynamic import() — husky pre-commit bleibt grün"
    - "Per-test tmp registry via COOLIFY_MCP_TEST_REGISTRY_DIR (Plan 15-01 verdrahtet Pfad)"
    - "Keine Produktionscode-Änderungen in Wave 0"

key-files:
  created:
    - src/utils/instance-registry.test.ts
    - src/mcp/tools/instance.test.ts
  modified:
    - src/config/env.test.ts
    - src/mcp/integration.test.ts

key-decisions:
  - "it.fails + dynamic import statt bare static import — npm test bleibt grün unter husky"
  - "COOLIFY_MCP_TEST_REGISTRY_DIR als Test-Hook mit TODO für Plan 15-01"
  - "integration.test.ts: CTX-06 describe angehängt, bestehende P2-Tests unverändert"

patterns-established:
  - "Pattern: 15 it.fails in instance-registry.test.ts für InstanceManager + resolveCredentials"
  - "Pattern: 12 it.fails in instance.test.ts für alle instance-Tool-Aktionen inkl. D-03 schema reject"
  - "Pattern: 4 it.fails Routing-Stubs in integration.test.ts mocken createCoolifyClient"

requirements-completed: [CTX-04, CTX-05, CTX-08, CTX-09]

coverage:
  - id: D1
    description: "InstanceManager RED contract (load/add/list/set-default/delete/saveRegistry/resolveCredentials)"
    requirement: CTX-04
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — 15 it.fails"
        status: pass
    human_judgment: false
  - id: D2
    description: "instance tool CRUD RED scaffolds (list/get/add/update/delete/set-default/import-env)"
    requirement: CTX-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts — 12 it.fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "Credential resolution precedence RED (env override, partial env, no instance)"
    requirement: CTX-05
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — resolveCredentials describe"
        status: pass
    human_judgment: false
  - id: D4
    description: "Registry permissions + token redaction RED"
    requirement: CTX-08
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — saveRegistry 0o700/0o600 + list redact"
        status: pass
    human_judgment: false
  - id: D5
    description: "Atomic write + concurrent save serialization RED"
    requirement: CTX-09
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — concurrent saveRegistry it.fails"
        status: pass
    human_judgment: false
  - id: D6
    description: "loadEnv soft-start + COOLIFY_PARTIAL_ENV RED"
    requirement: CTX-05
    verification:
      - kind: unit
        ref: "src/config/env.test.ts — 2 neue it.fails"
        status: pass
    human_judgment: false
  - id: D7
    description: "application.get instance routing RED stubs (CTX-06)"
    verification:
      - kind: integration
        ref: "src/mcp/integration.test.ts — 4 it.fails CTX-06 describe"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-21
status: complete
---

# Phase 15 Plan 00: Wave-0 RED TDD Scaffolds Summary

**33 it.fails-RED-Spezifikationen für InstanceManager, instance-Tool, env soft-start und CTX-06-Routing — ausführbar ab Plan 15-01**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-21T04:57:24Z
- **Completed:** 2026-07-21T05:00:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `instance-registry.test.ts` mit 15 it.fails für InstanceManager + resolveCredentials (CTX-04/05/08/09)
- `instance.test.ts` mit 12 it.fails für alle instance-Tool-Aktionen inkl. schema reject für routing param (D-03)
- `env.test.ts` um soft-start + partial-env it.fails erweitert (Plan 15-02 flippt GREEN)
- `integration.test.ts` um 4 CTX-06 Routing-Stubs erweitert (Plan 15-03 flippt GREEN)
- Gesamtsuite: 835 passed | 33 expected fail — husky pre-commit grün

## Task Commits

1. **Task 1: RED scaffold instance-registry.test.ts** - `c7fd4a7` (test)
2. **Task 2: RED scaffold instance.test.ts + env + integration** - `e5d0e61` (test)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/utils/instance-registry.test.ts` — InstanceManager contract RED (15 it.fails)
- `src/mcp/tools/instance.test.ts` — instance tool CRUD RED (12 it.fails)
- `src/config/env.test.ts` — soft-start + partial-env RED (2 it.fails appended)
- `src/mcp/integration.test.ts` — CTX-06 routing RED (4 it.fails appended)

## Decisions Made

- it.fails + dynamic import statt static import failure — npm test bleibt grün
- COOLIFY_MCP_TEST_REGISTRY_DIR als Test-Hook mit TODO für Plan 15-01
- integration.test.ts erweitert statt ersetzt — P2 read slice Tests bleiben GREEN

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: 2 test commits (`c7fd4a7`, `e5d0e61`) — Wave 0 scaffold only, no feat commit expected until Plans 15-01..15-04

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-01 kann InstanceManager implementieren und instance-registry.test.ts it.fails → it flippen
- Plan 15-02 softens env.ts und flippt env.test.ts soft-start cases
- Plan 15-03 verdrahtet resolveCredentials + instance param in domain tools, flippt integration stubs

---
*Phase: 15-multi-instance-registry-routing*
*Completed: 2026-07-21*

## Self-Check: PASSED

- All 4 test files + SUMMARY.md exist on disk
- Task commits c7fd4a7 and e5d0e61 verified in git log
