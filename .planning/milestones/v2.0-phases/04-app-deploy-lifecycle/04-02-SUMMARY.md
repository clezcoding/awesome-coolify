---
phase: 04-app-deploy-lifecycle
plan: 02
subsystem: api
tags: [coolify, mcp, deploy, polling, vitest]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: resolveAppMutationUuid, COOLIFY_AMBIGUOUS_MATCH, application mutation patterns from 04-01
provides:
  - triggerDeploy and fetchDeployment client helpers
  - pollDeploymentUntilTerminal with TERMINAL_DEPLOYMENT_STATES and 3s interval
  - logsAvailableHint FollowUpHint helper (available_in_phase 5)
  - projectDeploymentSummary and projectDeploymentFull projectors
  - application.deploy action with force/wait/timeout single-deploy path
affects: [04-03-deployment-tool, 04-04-batch-deploy]

tech-stack:
  added: []
  patterns:
    - Injected fetcher for pollDeploymentUntilTerminal (testable without client)
    - Deploy responses carry logs_available hint only — no inline logs (DEP-03)
    - Timeout returns partial state + re-call hint instead of throw (D-08)
    - Batch deploy schema fields land early; handler guard defers to 04-04

key-files:
  created:
    - src/utils/deploy-poll.ts
    - src/utils/deploy-poll.test.ts
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/utils/diagnose-hints.ts
    - src/utils/diagnose-hints.test.ts
    - src/utils/projections.ts
    - src/utils/projections.test.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "pollDeploymentUntilTerminal uses simple sleep loop — no AbortController per D-context discretion"
  - "Batch uuids/tags/tag schema present but handler throws not-implemented guard until 04-04"
  - "truncateLogs exported from projections.ts for reuse by projectDeploymentFull"
  - "Wait-mode timeout re-call hint points at deployment.get with deployment_uuid (D-08)"

patterns-established:
  - "Deploy poll utility: injected fetcher, terminal state check, timeout partial return with status override"
  - "Deploy response envelope: deployment_uuid, status, logs_available FollowUpHint — never inline logs in P4"

requirements-completed: [APP-04, APP-05, APP-06, DEP-01, DEP-03]

coverage:
  - id: D1
    description: triggerDeploy and fetchDeployment client helpers for POST /deploy and GET /deployments/{uuid}
    requirement: APP-04
    verification:
      - kind: unit
        ref: src/api/client.test.ts#triggerDeploy POST /deploy?uuid=&force=false
        status: pass
      - kind: unit
        ref: src/api/client.test.ts#fetchDeployment GET /deployments/{uuid}
        status: pass
    human_judgment: false
  - id: D2
    description: pollDeploymentUntilTerminal polls at 3s, exits on terminal states, returns timeout partial state
    requirement: APP-06
    verification:
      - kind: unit
        ref: src/utils/deploy-poll.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: logsAvailableHint and projectDeploymentSummary/Full projectors
    requirement: DEP-03
    verification:
      - kind: unit
        ref: src/utils/diagnose-hints.test.ts#logsAvailableHint
        status: pass
      - kind: unit
        ref: src/utils/projections.test.ts#projectDeploymentSummary
        status: pass
    human_judgment: false
  - id: D4
    description: application.deploy single path with wait:false queued response and wait:true terminal polling
    requirement: APP-04
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy by uuid calls triggerDeploy with force=false
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#wait:true returns finished status when fetchDeployment terminal on first poll
        status: pass
    human_judgment: false
  - id: D5
    description: force rebuild, name/fqdn resolution, logs_available on every deploy response, no inline logs
    requirement: APP-05
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy with force=true passes force to triggerDeploy
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy by name single-hit resolves uuid and calls triggerDeploy
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 02 Summary

**Single-app deploy with force rebuild, 3s wait-mode polling, logs_available hint — no inline logs in deploy responses**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-12T23:37:00Z
- **Completed:** 2026-07-12T23:45:04Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- APP-04 shipped: deploy by UUID, name, or FQDN via `resolveAppMutationUuid`
- APP-05 shipped: `force: true` triggers no-cache rebuild (D-20)
- APP-06 shipped: wait-mode polls at 3s, exits on `finished`/`failed`/`cancelled-by-user`, 300s default / 1800s max timeout with partial state + re-call hint
- DEP-01 shipped: deploy by resource name substring matching
- DEP-03 shipped: `logs_available` FollowUpHint on every deploy response — no inline `logs` field
- `pollDeploymentUntilTerminal` extracted for 04-04 batch wait-mode reuse (D-14)

## Task Commits

Each task was committed atomically:

1. **Task 1: Client helpers, projections, deploy-poll utility** - `46ea45c` (feat)
2. **Task 2: application.deploy action with wait-mode** - `e5084c5` (feat)

**Plan metadata:** `708333b` (docs: complete plan)

## Files Created/Modified

- `src/api/client.ts` - Added `triggerDeploy`, `fetchDeployment`
- `src/utils/deploy-poll.ts` - Polling loop with `TERMINAL_DEPLOYMENT_STATES`, `DEFAULT_POLL_INTERVAL_MS=3000`
- `src/utils/diagnose-hints.ts` - Added `logsAvailableHint(deployment_uuid)`
- `src/utils/projections.ts` - Added `projectDeploymentSummary`, `projectDeploymentFull`, exported `truncateLogs`
- `src/mcp/tools/application.ts` - Added `deploy` action schema and `handleApplicationDeploy`
- Test files extended: `deploy-poll.test.ts`, `client.test.ts`, `diagnose-hints.test.ts`, `projections.test.ts`, `application.test.ts`

## Decisions Made

- Simple `sleep` loop for polling — no AbortController (D-context discretion)
- Batch deploy schema fields (`uuids`, `tags`, `tag`) present; handler throws temporary guard until 04-04
- Timeout returns last fetched deployment with `status: 'timeout'` plus re-call hint — no throw (D-08)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 complete; 04-03 can ship `deployment` tool (list/get/cancel) reusing `fetchDeployment` and `projectDeploymentFull`
- `pollDeploymentUntilTerminal` ready for 04-04 sequential batch wait-mode
- Full suite green (240 tests); `npm run build` exit 0

## Self-Check: PASSED

- `npx vitest run src/utils/deploy-poll.test.ts src/mcp/tools/application.test.ts` — PASS (32 tests)
- `npx vitest run` — PASS (240 tests, no regression)
- `npm run build` — PASS (tsup exit 0)

---
*Phase: 04-app-deploy-lifecycle*
*Completed: 2026-07-13*
