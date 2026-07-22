---
phase: 04-app-deploy-lifecycle
plan: 03
subsystem: api
tags: [coolify, mcp, deployment, cancel, vitest]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: fetchDeployment, projectDeploymentSummary/Full, fetchAppDeployments from 04-02 and P3
provides:
  - cancelDeployment client helper (POST /deployments/{uuid}/cancel)
  - HTTP 400 → COOLIFY_422 mapping for graceful cancel detection (D-21)
  - deployment tool with list/get/cancel discriminatedUnion actions (D-03)
  - Graceful cancel envelope on already-terminal deployments (D-21)
  - deployment tool registered as mutating with openWorldHint only (D-05)
affects: [04-04-batch-deploy, 04-05-integration-signoff]

tech-stack:
  added: []
  patterns:
    - Per-app deployment list via /deployments/applications/{uuid} not global /deployments (APP-07)
    - Cancel 400 caught and resolved via fetchDeployment status fetch — no error thrown (D-21)
    - deployment.list per_page capped at 50 via schema override

key-files:
  created:
    - src/mcp/tools/deployment.ts
    - src/mcp/tools/deployment.test.ts
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts

key-decisions:
  - "statusToCode maps HTTP 400 to COOLIFY_422 alongside 422 — enables D-21 detection via code or httpStatus"
  - "deployment.list overrides sharedReadParamsSchema per_page max to 50 per CONTEXT discretion"
  - "Cancel action schema carries format/max_chars only — no pagination/projection on mutations"

patterns-established:
  - "deployment tool mirrors diagnose.ts handler routing with wrapMcpError envelope"
  - "Graceful cancel: catch CoolifyApiError 400/COOLIFY_422, fetch current status, return already_finished envelope"

requirements-completed: [APP-07, APP-08, APP-09]

coverage:
  - id: D1
    description: Agent can list deployments per app with pagination (APP-07)
    requirement: APP-07
    verification:
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#returns paginated DeploymentSummary[] with _meta
        status: pass
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#defaults per_page to 10 and caps page slice
        status: pass
    human_judgment: false
  - id: D2
    description: Agent can get deployment details summary and full projection with redaction (APP-08)
    requirement: APP-08
    verification:
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#returns summary projection by default
        status: pass
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#full projection includes capped logs and sanitized raw_deployment
        status: pass
    human_judgment: false
  - id: D3
    description: Agent can cancel in-flight deployment with graceful 400 on terminal state (APP-09, D-21)
    requirement: APP-09
    verification:
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#returns cancelled true on in-progress deployment
        status: pass
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#returns graceful envelope on already-finished 400 without throwing
        status: pass
    human_judgment: false
  - id: D4
    description: deployment tool registered as mutating with openWorldHint only (D-05)
    requirement: APP-09
    verification:
      - kind: unit
        ref: src/mcp/server.test.ts#deployment tool has openWorldHint without readOnlyHint per D-05
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 03 Summary

**Per-app deployment list/get/cancel tool with graceful 400 handling, full projection redaction, and mutating MCP registration**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-12T23:40:00Z
- **Completed:** 2026-07-12T23:50:09Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- APP-07 shipped: `deployment.list` per-app via `/deployments/applications/{uuid}` with paginateArray (default per_page 10, max 50)
- APP-08 shipped: `deployment.get` summary (status/commit/timestamps) and full projection (capped logs + sanitizeFullProjection)
- APP-09 shipped: `deployment.cancel` with D-21 graceful envelope on already-terminal — never throws on HTTP 400
- `cancelDeployment` client helper and HTTP 400 → `COOLIFY_422` error mapping for detection
- `deployment` tool registered with `openWorldHint: true`, no `readOnlyHint` (D-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: cancelDeployment client + statusToCode 400→COOLIFY_422 + RED tests** - `c15f69e` (test)
2. **Task 2: deployment.ts handler + server registration** - `5aecd9a` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/mcp/tools/deployment.ts` - list/get/cancel handlers with discriminatedUnion schema
- `src/mcp/tools/deployment.test.ts` - 11 unit tests covering list pagination, get projections, cancel graceful-400
- `src/api/client.ts` - Added `cancelDeployment` POST helper
- `src/utils/errors.ts` - HTTP 400 maps to `COOLIFY_422`
- `src/mcp/server.ts` - Registered `deployment` tool with mutating annotations
- `src/mcp/server.test.ts` - Updated tool count and D-05 annotation test

## Decisions Made

- `statusToCode` maps both 400 and 422 to `COOLIFY_422` — cancel handler checks `httpStatus === 400 || code === 'COOLIFY_422'`
- `deployment.list` re-declares `per_page` max 50 overriding sharedReadParamsSchema default max 100
- Cancel schema omits pagination/projection — only `format` and `max_chars` for confirmation envelope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] deployment.test.ts max_chars below schema minimum**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** Full projection test used `max_chars: 100` but `sharedReadParamsSchema` requires min 1000
- **Fix:** Changed test to `max_chars: 1000` with adjusted truncation assertion
- **Files modified:** `src/mcp/tools/deployment.test.ts`
- **Verification:** `npx vitest run src/mcp/tools/deployment.test.ts` — 11/11 pass
- **Committed in:** `5aecd9a` (Task 2 commit)

**2. [Rule 2 - Missing Critical] server.test.ts tool count regression**
- **Found during:** Task 2 (full suite verification)
- **Issue:** New `deployment` registration increased `registerTool` count from 8 to 9
- **Fix:** Updated server.test.ts count and added D-05 annotation test for deployment tool
- **Files modified:** `src/mcp/server.test.ts`
- **Verification:** `npx vitest run` — 255/255 pass
- **Committed in:** `5aecd9a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Test fixes required for schema constraints and registration count — no scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 3 complete; 04-04 can ship batch deploy reusing `pollDeploymentUntilTerminal` and `resolveAppMutationUuid`
- `deployment.get` ready for wait-mode timeout re-call hints from 04-02
- Full suite green (255 tests); `npm run build` exit 0

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/deployment.test.ts` — PASS (11 tests)
- `npx vitest run` — PASS (255 tests, no regression)
- `npm run build` — PASS (tsup exit 0)

---
*Phase: 04-app-deploy-lifecycle*
*Completed: 2026-07-13*
