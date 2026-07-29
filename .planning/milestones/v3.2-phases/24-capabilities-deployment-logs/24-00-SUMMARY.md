---
phase: 24-capabilities-deployment-logs
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, capabilities, deployment-logs]

requires: []
provides:
  - "Wave 0 RED scaffolds for system.version capabilities shape (CAP-01, CAP-02)"
  - "Wave 0 RED scaffolds for deployment.logs handler contract (OBS-01)"
  - "coverage-map.yaml deployment.logs row"
affects:
  - 24-01
  - 24-02
  - 24-03

tech-stack:
  added: []
  patterns:
    - "vitest it.fails RED scaffolds — husky green until Plan 24-01/24-02 flip GREEN"

key-files:
  created: []
  modified:
    - src/mcp/tools/system.test.ts
    - src/mcp/tools/meta.test.ts
    - src/mcp/tools/deployment.test.ts
    - src/utils/errors.test.ts
    - src/utils/log-helpers.test.ts
    - docs/coverage-map.yaml

key-decisions:
  - "Schema reject cases (both/neither uuid) use regular it — already pass before logs action exists"
  - "Token exclusion merged into main version it.fails — standalone test passed on old { version } shape"

patterns-established:
  - "Phase 24 Wave 0 mirrors Phase 21: it.fails locks acceptance intent; production handlers untouched"

requirements-completed: [CAP-01, CAP-02, OBS-01]

coverage:
  - id: D1
    description: "system.version RED scaffolds for coolifyVersion/mcpVersion/serverName/capabilities + four D-03 keys"
    requirement: CAP-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false
  - id: D2
    description: "meta.version RED scaffold for readPackageVersion() parity"
    requirement: CAP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/meta.test.ts#mcpVersion matches readPackageVersion"
        status: pass
    human_judgment: false
  - id: D3
    description: "deployment.logs RED scaffolds (schema XOR, fetch, latest, no-deployments, empty logs, sensitive-required)"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#deployment logs"
        status: pass
    human_judgment: false
  - id: D4
    description: "COOLIFY_NO_DEPLOYMENTS recovery hints scaffold"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#COOLIFY_NO_DEPLOYMENTS"
        status: pass
    human_judgment: false
  - id: D5
    description: "coverage-map.yaml deployment.logs row"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "docs/coverage-map.yaml#deployment.logs"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-27
status: complete
---

# Phase 24 Plan 00: Wave 0 Nyquist RED Scaffolds Summary

**14 it.fails RED targets lock CAP-01/CAP-02/OBS-01 acceptance before implementation; production handlers untouched**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-27T20:50:36Z
- **Completed:** 2026-07-27T20:53:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `system.test.ts`: version shape + `describe('capabilities')` with four D-03 keys (`application_logs`, `deployment_logs`, `deployment_watch`, `deploy_watch`)
- `meta.test.ts`: `readPackageVersion()` parity scaffold via dynamic import
- `deployment.test.ts`: `describe('deployment logs')` with 8 `it.fails` + 2 passing schema-reject `it` cases
- `errors.test.ts`: `COOLIFY_NO_DEPLOYMENTS` hints scaffold (`application.deploy`, `deployment.list`)
- `log-helpers.test.ts`: `processDeploymentBuildLogs` it.fails scaffold
- `docs/coverage-map.yaml`: `deployment.logs` row with `fetchDeployment` + `fetchAppDeployments`

## Task Commits

1. **Task 1: RED scaffolds for system.version shape + meta package version** - `5083037` (test)
2. **Task 2: RED scaffolds for deployment.logs + NO_DEPLOYMENTS + coverage row** - `ec4c358` (test)

## Files Created/Modified

- `src/mcp/tools/system.test.ts` - version/capabilities it.fails scaffolds
- `src/mcp/tools/meta.test.ts` - readPackageVersion parity it.fails
- `src/mcp/tools/deployment.test.ts` - deployment logs describe block
- `src/utils/errors.test.ts` - COOLIFY_NO_DEPLOYMENTS hints scaffold
- `src/utils/log-helpers.test.ts` - processDeploymentBuildLogs scaffold
- `docs/coverage-map.yaml` - deployment.logs coverage row

## Decisions Made

- Schema reject tests (both/neither uuid) stay as regular `it` — they pass today because `logs` action is not yet registered; acceptance cases use `it.fails`
- Token leak assertion folded into main version it.fails — standalone test incorrectly passed on legacy `{ version }` response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Token exclusion it.fails passed on legacy shape**
- **Found during:** Task 1
- **Issue:** Separate no-token it.fails passed because `{ version: '4.1.0' }` never contains token — vitest reported "Expect test to fail"
- **Fix:** Merged token assertions into main version shape it.fails
- **Files modified:** `src/mcp/tools/system.test.ts`
- **Commit:** `5083037`

**2. [Rule 1 - Bug] Schema reject it.fails passed before logs action exists**
- **Found during:** Task 2
- **Issue:** Both/neither uuid reject tests passed (unknown action) — vitest reported "Expect test to fail"
- **Fix:** Changed to regular `it` for reject cases; kept `it.fails` for accept/handler paths
- **Files modified:** `src/mcp/tools/deployment.test.ts`
- **Commit:** `ec4c358`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Correct RED/GREEN gate behavior; no production code touched

## TDD Gate Compliance

- RED gate: `test(24-00)` commits present (`5083037`, `ec4c358`)
- GREEN gate: N/A — Wave 0 scaffolds only; Plans 24-01..24-02 flip to `it`

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 24-01 can implement `readPackageVersion`, `capabilities.ts`, and extended `system.version` / `meta.version` to flip system/meta scaffolds GREEN
- Plan 24-02 can implement `deployment.logs` handler + `COOLIFY_NO_DEPLOYMENTS` to flip deployment/errors scaffolds GREEN
- Plan 24-03 regenerates `docs/COVERAGE.md` from updated coverage-map

## Self-Check: PASSED

- FOUND: `.planning/phases/24-capabilities-deployment-logs/24-00-SUMMARY.md`
- FOUND: commit `5083037`
- FOUND: commit `ec4c358`
- Verification: 106 tests (92 pass, 14 expected fail)

---
*Phase: 24-capabilities-deployment-logs*
*Completed: 2026-07-27*
