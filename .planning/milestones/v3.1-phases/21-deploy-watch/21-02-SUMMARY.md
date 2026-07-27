---
phase: 21-deploy-watch
plan: 02
subsystem: api
tags: [deploy-watch, deployment.watch, backoff, dual-signal, vitest, zod-defaults]

requires:
  - phase: 21-deploy-watch
    plan: 01
    provides: pollDeploymentWithBackoff + HTTP 429 retry_after in toStructuredError
provides:
  - deployment.watch action on existing deployment tool with Zod defaults and dual-signal errors
  - COOLIFY_WATCH_TIMEOUT, COOLIFY_DEPLOYMENT_FAILED, COOLIFY_DEPLOYMENT_CANCELLED codes + RECOVERY_HINTS
  - createFlatActionSchema zodDefaultFields for action-specific Zod defaults without cross-action pollution
affects: [21-03]

tech-stack:
  added: []
  patterns:
    - "Watch handler throws CoolifyApiError for timeout/failed/cancelled; wrapMcpError dual-signal"
    - "pollDeploymentWithBackoff exclusive for watch — pollDeploymentUntilTerminal untouched for wait:true"
    - "zodDefaultFields strips phantom defaulted keys on disallowed actions in flat schema"

key-files:
  created: []
  modified:
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - src/mcp/tools/deployment.ts
    - src/mcp/tools/deployment.test.ts
    - src/mcp/tools/shared-read-params.ts

key-decisions:
  - "Timeout integration test uses fake timers with min_interval/max_interval 1s — schema min timeout stays 10s"
  - "Recursive redactEnvelopeData preserves nested deployment summary objects in error.data"
  - "zodDefaultFields 6th param on createFlatActionSchema — watch .default() without breaking list/get/cancel"

patterns-established:
  - "handleDeploymentWatch maps WatchPollOutcome terminal finished → buildReadResponse; failed/cancelled/timeout → CoolifyApiError"
  - "isRetryableRateLimit reads toStructuredError httpStatus 429 + data.retry_after ms"

requirements-completed: [WATCH-01]

coverage:
  - id: D1
    description: "Watch error codes + RECOVERY_HINTS (timeout re-watch, fail/cancel log guidance)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts — deployment watch error codes describe"
        status: pass
    human_judgment: false
  - id: D2
    description: "deployment.watch schema defaults, bounds refine, handler outcomes (OK/timeout/failed/cancelled)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts — deployment watch describe (8 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "deploy-poll.ts wait:true regression unchanged"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-poll.test.ts"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-25
status: complete
---

# Phase 21 Plan 02: deployment.watch Action + Dual-Signal Errors Summary

**deployment.watch on existing deployment tool with Equal Jitter polling, Zod defaults (300/3/30/false), and dual-signal COOLIFY_WATCH_TIMEOUT / FAILED / CANCELLED envelopes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-25T06:24:00Z
- **Completed:** 2026-07-25T06:28:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `COOLIFY_WATCH_TIMEOUT`, `COOLIFY_DEPLOYMENT_FAILED`, `COOLIFY_DEPLOYMENT_CANCELLED` to `CoolifyErrorCode` with agent-oriented `RECOVERY_HINTS` (re-call `deployment.watch`, fetch logs via `deployment.get` / `include_logs`)
- Wired `deployment.watch` into catalog, flat Zod schema (defaults + min_interval ≤ max_interval refine), and `handleDeploymentWatch` using `pollDeploymentWithBackoff` with HTTP 429 continue via `isRetryableRateLimit`
- Flipped all 8 Wave 0 `deployment watch` scaffolds GREEN; full deployment.test.ts (22) green; deploy-poll regression intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Add watch error codes and RECOVERY_HINTS** - `550cf3e` (feat)
2. **Task 2: Implement deployment.watch action + flip watch tests GREEN** - `7ea0d43` (feat)

## Files Created/Modified

- `src/utils/errors.ts` — watch error codes, hints, recursive `redactEnvelopeData` for nested deployment snapshots
- `src/utils/errors.test.ts` — watch code/hint smoke tests
- `src/mcp/tools/deployment.ts` — watch catalog/schema/handler; exclusive `pollDeploymentWithBackoff` usage
- `src/mcp/tools/deployment.test.ts` — watch describe GREEN; fake-timer timeout test
- `src/mcp/tools/shared-read-params.ts` — optional `zodDefaultFields` param strips phantom Zod defaults on disallowed actions

## Decisions Made

- Timeout integration test uses `vi.useFakeTimers()` with `min_interval: 1, max_interval: 1` and `timeout: 10` — Wave 0 `timeout: 1` invalid under schema `min(10)`
- Nested `error.data.deployment` kept as structured object via recursive redact (not JSON-stringified)
- `createFlatActionSchema` extended with 6th `zodDefaultFields` arg so watch-only `.default()` fields do not fail list/get/cancel validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timeout watch test schema rejection and timer hang**
- **Found during:** Task 2 (deployment watch timeout test)
- **Issue:** Wave 0 used `timeout: 1` below Zod `min(10)` → `COOLIFY_VALIDATION_ERROR`; fake-timer single 15s advance hung
- **Fix:** Use `timeout: 10`, `min_interval/max_interval: 1`, incremental `advanceTimersByTimeAsync(1000)` loop
- **Files modified:** `src/mcp/tools/deployment.test.ts`
- **Verification:** `npx vitest run src/mcp/tools/deployment.test.ts -t watch` green
- **Committed in:** `7ea0d43`

**2. [Rule 1 - Bug] Preserved nested deployment summary in wrapMcpError error.data**
- **Found during:** Task 2 (timeout test assertion on `error.data.deployment.status`)
- **Issue:** `redactEnvelopeData` JSON-stringified nested objects, breaking structured snapshot
- **Fix:** Recursive `redactEnvelopeDataValue` for plain objects/arrays
- **Files modified:** `src/utils/errors.ts`
- **Verification:** watch timeout test + `src/utils/errors.test.ts` green
- **Committed in:** `7ea0d43`

**3. [Rule 3 - Blocking] Zod .default() on watch fields broke list/get/cancel schema parse**
- **Found during:** Task 2 (full deployment.test.ts after schema add)
- **Issue:** Phantom `timeout/min_interval/max_interval/include_logs` defaults injected on non-watch actions → disallowed-parameter validation errors
- **Fix:** `createFlatActionSchema` optional `zodDefaultFields` map strips matching phantom defaults before allowlist check
- **Files modified:** `src/mcp/tools/shared-read-params.ts`, `src/mcp/tools/deployment.ts`
- **Verification:** full `deployment.test.ts` 22/22 green
- **Committed in:** `7ea0d43`

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking)
**Impact on plan:** Infrastructure + test determinism only; watch runtime behavior matches D-01..D-12. No scope creep.

## Issues Encountered

None beyond deviations above (all resolved in Task 2 commit).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 21-03 can update deploy prompt + README Watch section (WATCH-02 docs)
- WATCH-01 runtime behavior complete on `deployment.watch`
- Full suite: 1045 passed | 1 expected fail (1046 total)

---
*Phase: 21-deploy-watch*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/mcp/tools/deployment.ts (watch handler)
- FOUND: .planning/phases/21-deploy-watch/21-02-SUMMARY.md
- FOUND: 550cf3e (Task 1)
- FOUND: 7ea0d43 (Task 2)
