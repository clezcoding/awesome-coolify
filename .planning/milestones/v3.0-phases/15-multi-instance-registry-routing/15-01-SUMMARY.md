---
phase: 15-multi-instance-registry-routing
plan: 01
subsystem: infra
tags: [instance-registry, multi-instance, resolveCredentials, atomic-write, chmod, zod]

requires:
  - phase: 15-multi-instance-registry-routing
    provides: Wave 0 RED scaffolds in instance-registry.test.ts
provides:
  - InstanceManager CRUD + atomic locked registry writes
  - Stateless resolveCredentials with D-10/D-11/D-13 precedence
  - COOLIFY_NO_INSTANCE, COOLIFY_INSTANCE_NOT_FOUND, COOLIFY_PARTIAL_ENV error codes
affects:
  - 15-02
  - 15-03
  - 15-04

tech-stack:
  added: []
  patterns:
    - "COOLIFY_MCP_TEST_REGISTRY_DIR test seam for tmp registry path"
    - "Promise write-lock serializes mutating ops + temp rename atomic save"
    - "chmodSync 0o700/0o600 after every write with Windows no-op catch"

key-files:
  created:
    - src/utils/instance-registry.ts
  modified:
    - src/utils/errors.ts
    - src/utils/instance-registry.test.ts

key-decisions:
  - "withWriteLock wraps full load-modify-save — concurrent add race prevented beyond save-only lock"
  - "Sync resolveCredentials error tests use try/catch toMatchObject — .rejects invalid for sync throws"

patterns-established:
  - "Pattern: InstanceManager static API with os.homedir() registry path (never tilde)"
  - "Pattern: token redaction at list/get boundary unless reveal:true"

requirements-completed: [CTX-04, CTX-05, CTX-08, CTX-09]

coverage:
  - id: D1
    description: "InstanceManager load/add/list/set-default/delete/saveRegistry"
    requirement: CTX-04
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — InstanceManager describe (9 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "resolveCredentials precedence param → env → default with partial-env guard"
    requirement: CTX-05
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — resolveCredentials describe (4 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Registry dir 0o700 + file 0o600 + token redaction"
    requirement: CTX-08
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — saveRegistry perms + list redact"
        status: pass
    human_judgment: false
  - id: D4
    description: "Atomic temp+rename write with concurrent save serialization"
    requirement: CTX-09
    verification:
      - kind: unit
        ref: "src/utils/instance-registry.test.ts — concurrent saveRegistry"
        status: pass
    human_judgment: false
  - id: D5
    description: "Multi-instance error codes + RECOVERY_HINTS in errors.ts"
    requirement: CTX-05
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts — no regression (31 tests)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-21
status: complete
---

# Phase 15 Plan 01: InstanceManager Core Summary

**InstanceManager mit atomischen Registry-Writes, Credential-Resolver und drei Multi-Instance-Fehlercodes — 15/15 Tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-21T05:01:00Z
- **Completed:** 2026-07-21T05:05:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `InstanceManager` implementiert: CRUD, `saveRegistry` mit 0o700/0o600 + temp-rename + Write-Lock
- `resolveCredentials` stateless: explicit instance → env (both) → default; partial env → hard error
- Drei neue Fehlercodes in `errors.ts` mit Recovery-Hints (D-12/D-16/D-18/D-20)
- Wave-0 RED scaffolds geflippt: 15/15 GREEN, Gesamtsuite 850 passed | 18 expected fail

## Task Commits

1. **Task 1: InstanceManager — CRUD, atomic writes, resolveCredentials** - `fb8362b` (feat)
2. **Task 2: errors.ts — add COOLIFY_NO_INSTANCE, COOLIFY_INSTANCE_NOT_FOUND, COOLIFY_PARTIAL_ENV** - `ad3ed17` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/utils/instance-registry.ts` — InstanceManager, instanceSchema, Registry interface
- `src/utils/errors.ts` — drei neue CoolifyErrorCode + RECOVERY_HINTS
- `src/utils/instance-registry.test.ts` — it.fails → it (15 Tests GREEN)

## Decisions Made

- `withWriteLock` serialisiert gesamte load-modify-save — nicht nur `saveRegistry` (concurrent-add Race)
- Sync `resolveCredentials`-Fehlertests via try/catch statt `.rejects` (Wave-0 Scaffold-Bug)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sync resolveCredentials tests used await expect().rejects**
- **Found during:** Task 1 (InstanceManager implementation)
- **Issue:** Wave 0 scaffolds treated sync throws as rejected Promises — uncaught CoolifyApiError
- **Fix:** try/catch + toMatchObject auf envelope.code für partial-env und no-instance Cases
- **Files modified:** src/utils/instance-registry.test.ts
- **Committed in:** fb8362b

**2. [Rule 2 - Missing Critical] Write-lock covers full mutation not save-only**
- **Found during:** Task 1 (concurrent add test)
- **Issue:** save-only lock lässt concurrent adds beide leeres Registry lesen — last-write-wins Datenverlust
- **Fix:** `withWriteLock` um add/delete/setDefault/update + executeSave
- **Files modified:** src/utils/instance-registry.ts
- **Committed in:** fb8362b

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Beide Fixes sicherheits-/korrektheitskritisch, kein Scope-Creep

## TDD Gate Compliance

- RED gate: Wave 0 (Plan 15-00) — 15 it.fails scaffolds
- GREEN gate: Task 1 commit fb8362b — all 15 tests pass
- Task 2 commit ad3ed17 — errors.test.ts + instance-registry.test.ts GREEN

## Issues Encountered

None blocking — commitlint subject-case required lowercase „instance manager" in Task 1 message

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-02 kann `instance` tool handler + env soft-start auf InstanceManager aufbauen
- Plan 15-03/15-04 können `resolveCredentials` in domain tools verdrahten

---
*Phase: 15-multi-instance-registry-routing*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/utils/instance-registry.ts
- FOUND: src/utils/errors.ts (extended)
- FOUND: .planning/phases/15-multi-instance-registry-routing/15-01-SUMMARY.md
- FOUND: fb8362b
- FOUND: ad3ed17
