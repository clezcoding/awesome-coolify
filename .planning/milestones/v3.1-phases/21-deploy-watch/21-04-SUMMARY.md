---
phase: 21-deploy-watch
plan: 04
subsystem: api
tags: [deploy-watch, backoff, timeout, retry-after, WATCH-01, CR-01, WR-01, WR-02]

requires:
  - phase: 21-deploy-watch
    plan: 03
    provides: WATCH-02 docs satisfied; watch runtime from 21-01..02
provides:
  - remainingMs helper clamping every poll sleep to remaining timeout budget
  - CR-01 fake-timer regression for Retry-After >> timeoutMs
  - WR-02 include_logs true success-path test (capped logs, no raw_deployment)
affects: [21-verify, WATCH-01]

tech-stack:
  added: []
  patterns:
    - "pollDeploymentWithBackoff: Math.min(computedDelay, remainingMs) before every sleep (429 + normal)"
    - "Hard timeout ceiling — hostile Retry-After cannot block MCP session beyond timeoutMs"

key-files:
  created: []
  modified:
    - src/utils/deploy-watch-poll.ts
    - src/utils/deploy-watch-poll.test.ts
    - src/mcp/tools/deployment.test.ts

key-decisions:
  - "remainingMs module-local helper — behavior tested via fake timers, not exported"
  - "include_logs test uses schema min max_chars 1000 and truncateLogs …[truncated] suffix"

patterns-established:
  - "429 path still honors Retry-After via Math.max(backoff, retryAfter) but sleep clamped to remainingMs (D-08 + D-05)"

requirements-completed: [WATCH-01, WATCH-02]

coverage:
  - id: D1
    description: "Sleep on 429 and normal paths clamped to remaining timeout budget (CR-01, WR-01, D-05)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-watch-poll.test.ts#returns timeout when Retry-After exceeds timeoutMs — remaining clamp (CR-01)"
        status: pass
      - kind: unit
        ref: "src/utils/deploy-watch-poll.test.ts — existing 5 poll helper tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "Watch include_logs true success returns capped logs without raw_deployment (WR-02)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#returns capped logs without raw_deployment when include_logs true on success (WR-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "wait:true deploy poll path untouched (D-02, D-03 regression guard)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-poll.test.ts — 7 tests green"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 21 Plan 04: Bounded Timeout Sleep Clamp Summary

**remainingMs clamp on 429 Retry-After and normal backoff — hard MCP block ceiling at timeoutMs plus CR-01/WR-02 regression tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T07:21:42Z
- **Completed:** 2026-07-25T07:26:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `remainingMs(startTime, timeoutMs)` and `Math.min(computedDelay, remaining)` before every sleep on 429 and in_progress paths
- CR-01 regression: constant 429 with `retryAfterMs: 3_600_000` resolves `kind: 'timeout'` within ~5s fake-timer budget; all `setTimeout` delays ≤ `timeoutMs`
- WR-02 regression: `include_logs: true` watch success asserts capped logs projection and no `raw_deployment` on OK payload
- WATCH-02 docs/prompts/README untouched — already satisfied in 21-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Clamp sleep to remaining timeout budget (CR-01, WR-01, D-05)** - `8ad5704` (feat)
2. **Task 2: Regression tests for Retry-After clamp and include_logs success (WR-02)** - `e21c622` (test)

## Files Created/Modified

- `src/utils/deploy-watch-poll.ts` — `remainingMs` helper; dual-path sleep clamp
- `src/utils/deploy-watch-poll.test.ts` — CR-01 fake-timer regression (6 tests total)
- `src/mcp/tools/deployment.test.ts` — WR-02 include_logs success watch test

## Decisions Made

- `remainingMs` kept module-local — regression proves clamp via setTimeout spy, not export
- include_logs test uses `max_chars: 1000` (schema minimum) and asserts `truncateLogs` `…[truncated]` suffix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] include_logs test max_chars and cap assertion**
- **Found during:** Task 2 (WR-02 deployment watch test)
- **Issue:** Plan suggested `max_chars: 50` but schema enforces min 1000; strict `length ≤ max_chars` fails because `truncateLogs` appends `…[truncated]`
- **Fix:** Use `max_chars: 1000`, logs 1500 chars, assert `'x'.repeat(1000) + '…[truncated]'` and `length < longLogs.length`
- **Files modified:** `src/mcp/tools/deployment.test.ts`
- **Verification:** `pnpm exec vitest run src/mcp/tools/deployment.test.ts -t watch` green
- **Committed in:** `e21c622`

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test-only adjustment; no production code change. Closes WR-02 intent.

## Issues Encountered

None beyond deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VERIFICATION truths #2 and #3 should flip on re-run `/gsd-verify-work`
- Phase 21 not marked complete until verifier passes
- WATCH-01 unblocked pending verifier sign-off

## Self-Check: PASSED

- FOUND: src/utils/deploy-watch-poll.ts
- FOUND: src/utils/deploy-watch-poll.test.ts
- FOUND: src/mcp/tools/deployment.test.ts
- FOUND: .planning/phases/21-deploy-watch/21-04-SUMMARY.md
- FOUND: commit 8ad5704
- FOUND: commit e21c622

---
*Phase: 21-deploy-watch*
*Completed: 2026-07-25*
