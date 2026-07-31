---
phase: 29-drift-heal
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, manifest, audit, envs-promote, DRIFT-01, DRIFT-02, DRIFT-03]

requires: []
provides:
  - "Wave 0 RED scaffolds for manifest.audit findings, missing manifest, soft partials, read-only (DRIFT-01, DRIFT-03)"
  - "Wave 0 RED scaffolds for application envs:promote preview/apply safety (DRIFT-02, DRIFT-03)"
  - "system.test.ts it.fails for manifest_audit and envs_promote capability keys (D-15)"
affects:
  - 29-01
  - 29-02
  - 29-03

tech-stack:
  added: []
  patterns:
    - "vitest it.fails RED scaffolds — husky green while audit/promote handlers absent"
    - "manifest.audit fixture seeds local orphan, domain/type/nesting drift, remote-only resource"

key-files:
  created: []
  modified:
    - src/mcp/tools/manifest.test.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/tools/system.test.ts

key-decisions:
  - "system.test.ts keeps eleven-key green it; thirteen-key count is it.fails only (Phase 28 pattern)"
  - "envs:promote delete guard asserts successful apply first so scaffold stays RED pre-implementation"

patterns-established:
  - "Phase 29 Wave 0 mirrors Phase 28: it.fails locks DRIFT acceptance before production handlers ship"

requirements-completed: [DRIFT-01, DRIFT-02, DRIFT-03]

coverage:
  - id: D1
    description: "manifest.test.ts it.fails scaffolds for manifest.audit findings, missing manifest, COOLIFY_NO_INSTANCE, drift axes, soft partial, read-only"
    requirement: DRIFT-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts#manifest.audit"
        status: pass
    human_judgment: false
  - id: D2
    description: "application.test.ts it.fails scaffolds for envs:promote preview buckets, masking, confirm gate, conflict policies"
    requirement: DRIFT-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application envs:promote"
        status: pass
    human_judgment: false
  - id: D3
    description: "system.version capabilities expect manifest_audit and envs_promote keys"
    requirement: DRIFT-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-30
status: complete
---

# Phase 29 Plan 00: Wave 0 Nyquist RED Scaffolds Summary

**Eighteen `it.fails` RED scaffolds lock manifest.audit, envs:promote, and capability discoverability before production handlers ship — husky stays green.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-30T03:15:00Z
- **Completed:** 2026-07-30T03:17:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `manifest.test.ts` — nine `it.fails` cases under `manifest.audit` (findings envelope, missing manifest, COOLIFY_NO_INSTANCE, domain/type/nesting drift, soft partial, read-only, D-03 separation from diff)
- `application.test.ts` — nine `it.fails` cases under `application envs:promote` (preview buckets, masked values, confirm gate, keep_remote, overwrite, abort, no deletion, dual fetchEnvs)
- `system.test.ts` — parallel `it.fails` for thirteen capability keys including `manifest_audit` and `envs_promote` (D-15)
- No production files modified (`manifest.ts`, `application.ts`, `capabilities.ts` untouched)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED scaffolds for manifest.audit** - `5d291fc` (test)
2. **Task 2: RED scaffolds for envs:promote and capabilities** - `2666098` (test)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/tools/manifest.test.ts` — nine `manifest.audit` `it.fails` scaffolds (+388 lines)
- `src/mcp/tools/application.test.ts` — nine `envs:promote` `it.fails` scaffolds
- `src/mcp/tools/system.test.ts` — thirteen-key capabilities `it.fails` scaffold

## Decisions Made

- Kept existing eleven-key green capabilities `it`; thirteen-key assertion lives in `it.fails` only (Phase 28 precedent)
- `apply never deletes only_in_target keys` scaffold requires successful apply before asserting `deleteEnv` — prevents false GREEN when handler absent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tightened envs:promote no-deletion scaffold**
- **Found during:** Task 2 verify
- **Issue:** `deleteEnv` not-called assertion passed vacuously when `envs:promote` handler missing — `it.fails` reported unexpected pass
- **Fix:** Assert `isApplicationErrorResult(result)` is false before delete guard
- **Files modified:** `src/mcp/tools/application.test.ts`
- **Verification:** `npx vitest run src/mcp/tools/application.test.ts -t "envs:promote"` → 9 expected fail
- **Committed in:** `2666098`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for correct RED semantics; no scope change

## TDD Gate Compliance

- RED gate: `test(29-00)` commits present (`5d291fc`, `2666098`)
- GREEN gate: deferred to plans 29-01, 29-02, 29-03 per Wave 0 contract

## Issues Encountered

- Vitest 4.1.10 rejects `-x` CLI flag from plan verify strings — ran without `-x` (exit 0 with expected-fail counts)

## User Setup Required

None

## Next Phase Readiness

- Plan 29-01 can implement `manifest.audit` and flip `manifest.audit` `it.fails` → `it`
- Plan 29-02 can implement `envs:promote` and flip promote scaffolds GREEN
- Plan 29-03 can add capability keys and flip system capabilities `it.fails` GREEN

## Self-Check: PASSED

- FOUND: src/mcp/tools/manifest.test.ts
- FOUND: src/mcp/tools/application.test.ts
- FOUND: src/mcp/tools/system.test.ts
- FOUND: 5d291fc
- FOUND: 2666098
- FOUND: describe('manifest.audit')
- FOUND: describe('application envs:promote')

---
*Phase: 29-drift-heal*
*Completed: 2026-07-30*
