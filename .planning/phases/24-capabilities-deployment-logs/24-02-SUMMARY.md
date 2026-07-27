---
phase: 24-capabilities-deployment-logs
plan: 02
subsystem: api
tags: [mcp, deployment.logs, observability, log-helpers, OBS-01]

requires:
  - phase: 24-00
    provides: Wave 0 RED scaffolds for deployment logs and errors tests
  - phase: 24-01
    provides: capability discovery foundation (independent but same phase)
provides:
  - processDeploymentBuildLogs shared build-log processor
  - deployment.logs action with XOR uuid resolution
  - COOLIFY_NO_DEPLOYMENTS structured error + recovery hints
  - application.logs build path back-compat via shared processor
affects: [24-03, 25-application-log-follow]

tech-stack:
  added: []
  patterns:
    - "processDeploymentBuildLogs in log-helpers; handlers stay thin fetch + buildReadResponse"
    - "deployment.logs XOR schema refine mirroring application.logs runtime/build split"
    - "resolveLatestDeploymentUuid sorts by created_at desc regardless of status"

key-files:
  created: []
  modified:
    - src/utils/log-helpers.ts
    - src/utils/log-helpers.test.ts
    - src/mcp/tools/deployment.ts
    - src/mcp/tools/deployment.test.ts
    - src/mcp/tools/application.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts

key-decisions:
  - "Single implementation commit: lint-staged vitest related runs all dirty deployment.test.ts — XOR task could not land after uuid tracer without failing pre-commit"

patterns-established:
  - "Pattern: deployment.logs on existing deployment tool (D-10) with sharedLogParamsFlatShape + offset"
  - "Pattern: COOLIFY_NO_DEPLOYMENTS hints use application.deploy / deployment.list dot notation for agent discoverability"

requirements-completed: [OBS-01]

coverage:
  - id: D1
    description: "deployment.logs fetches build logs by deployment_uuid with logs_lines envelope"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#returns logs_lines envelope when fetching by deployment_uuid"
        status: pass
    human_judgment: false
  - id: D2
    description: "application_uuid resolves newest deployment by created_at (dep-3)"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#application_uuid resolves newest deployment by created_at (dep-3)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty deployments return COOLIFY_NO_DEPLOYMENTS with deploy/list recovery hints"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#empty deployments list returns COOLIFY_NO_DEPLOYMENTS error"
        status: pass
      - kind: unit
        ref: "src/utils/errors.test.ts#RECOVERY_HINTS defines COOLIFY_NO_DEPLOYMENTS with deploy and list hints"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty logs string returns soft OK with hint (D-16)"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#empty logs string returns soft OK with empty logs_lines and hint"
        status: pass
    human_judgment: false
  - id: D5
    description: "application.logs build path unchanged via shared processor (D-11)"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts (build logs describe)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-27
status: complete
---

# Phase 24 Plan 02: Deployment Logs Summary

**deployment.logs on deployment tool with shared processDeploymentBuildLogs, XOR uuid resolution, and COOLIFY_NO_DEPLOYMENTS structured errors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-27T21:18:00Z
- **Completed:** 2026-07-27T21:22:00Z
- **Tasks:** 2 (tracer + XOR/errors)
- **Files modified:** 7

## Accomplishments

- `processDeploymentBuildLogs` extracted to `log-helpers.ts` — JSON/plain parse, filter, slice, cap, D-16 empty hint, sensitive guard
- `deployment.logs` action registered with param parity (lines, offset, include_hidden, type, format, max_chars)
- XOR schema refine: exactly one of `deployment_uuid` | `application_uuid`
- `resolveLatestDeploymentUuid` picks newest by `created_at` regardless of status
- `COOLIFY_NO_DEPLOYMENTS` error code + `RECOVERY_HINTS` with `application.deploy` / `deployment.list`
- `application.logs` build path refactored to shared processor (back-compat D-11)
- Wave 0 deployment/application/errors/log-helpers scaffolds green (29+ tests)

## Task Commits

Pre-commit lint-staged runs `vitest related` on all dirty files — partial task-1 commit failed while deployment.test.ts had unfixed XOR scaffolds. Both tasks shipped in one commit:

1. **Task 1: End-to-end deployment.logs by deployment_uuid** — `470d67e` (feat)
2. **Task 2: XOR application_uuid resolution + COOLIFY_NO_DEPLOYMENTS** — `470d67e` (feat, same commit)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/utils/log-helpers.ts` — `processDeploymentBuildLogs`, types, D-16 empty hint
- `src/utils/log-helpers.test.ts` — processor unit test green
- `src/mcp/tools/deployment.ts` — logs action, schema, XOR refine, handlers
- `src/mcp/tools/deployment.test.ts` — all deployment logs scaffolds green
- `src/mcp/tools/application.ts` — thin build-path wrapper
- `src/utils/errors.ts` — `COOLIFY_NO_DEPLOYMENTS` + hints
- `src/utils/errors.test.ts` — hints test green

## Decisions Made

- Combined task commits into `470d67e` — husky pre-commit related-test coupling on dirty `deployment.test.ts`

## Deviations from Plan

### Commit granularity

- **Found during:** Task 1 commit attempt
- **Issue:** Staging only log-helpers/application still triggered vitest related on unstaged dirty deployment.test.ts with failing XOR scaffolds
- **Resolution:** Single feat commit covering tracer + XOR/errors tasks
- **Impact:** Atomic per-task commits not achievable without `--no-verify`; functionality and tests complete

None - plan behavior executed as written.

## Issues Encountered

None beyond pre-commit commit-split constraint (documented above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 24-03 can add README/catalog/docs for deployment.logs discovery (D-18)
- Phase 25 can build on deployment.logs for application log follow

---
*Phase: 24-capabilities-deployment-logs*
*Completed: 2026-07-27*

## Self-Check: PASSED

- SUMMARY file present at `.planning/phases/24-capabilities-deployment-logs/24-02-SUMMARY.md`
- Commit `470d67e` verified in git log
- Key files exist: log-helpers.ts, deployment.ts, errors.ts
