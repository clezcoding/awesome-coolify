---
phase: 21-deploy-watch
plan: 01
subsystem: utils
tags: [deploy-watch, backoff, equal-jitter, retry-after, vitest, tdd]

requires:
  - phase: 21-deploy-watch
    plan: 00
    provides: deploy-watch-poll RED scaffolds with it.fails
provides:
  - pollDeploymentWithBackoff with Equal Jitter and WatchPollOutcome discriminated union
  - HTTP 429 Retry-After preserved as data.retry_after milliseconds in toStructuredError
affects: [21-02, 21-03]

tech-stack:
  added: []
  patterns:
    - "Watch-only poller imports TERMINAL_DEPLOYMENT_STATES from deploy-poll.ts — no status:timeout synthesis"
    - "429 continue via max(backoff, retryAfterMs); shared toStructuredError header parse"

key-files:
  created:
    - src/utils/deploy-watch-poll.ts
  modified:
    - src/utils/deploy-watch-poll.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts

key-decisions:
  - "Timeout/429 tests use random: () => 0 for deterministic min Equal Jitter delays under fake timers"
  - "429 first sleep uses max(backoff, Retry-After) — min_interval floor wins when Retry-After is shorter"

patterns-established:
  - "WatchPollOutcome { kind: 'terminal' | 'timeout' } — timeout carries elapsedMs, never mutates deployment.status"
  - "parseRetryAfterMs handles delta-seconds and HTTP-date with clamp to >= 0"

requirements-completed: [WATCH-01]

coverage:
  - id: D1
    description: "pollDeploymentWithBackoff terminal exit, timeout without status:timeout, Equal Jitter bounds, 429 continue, default intervals"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-watch-poll.test.ts — 5 cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "toStructuredError attaches data.retry_after (ms) from Retry-After on HTTP 429"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts — 429 Retry-After passthrough"
        status: pass
    human_judgment: false
  - id: D3
    description: "deploy-poll.ts fixed 3s wait:true path unchanged (regression gate)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-poll.test.ts"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-25
status: complete
---

# Phase 21 Plan 01: Watch Poll Helper + 429 Retry-After Summary

**Watch-only Equal Jitter poller with terminal/timeout discriminated outcome and shared HTTP 429 Retry-After ms attach for deployment.watch (Plan 21-02)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-25T06:20:00Z
- **Completed:** 2026-07-25T06:23:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Shipped `src/utils/deploy-watch-poll.ts` exporting `pollDeploymentWithBackoff` and `WatchPollOutcome` — Equal Jitter clamped to `[minIntervalMs, maxIntervalMs]`, injectable `random`, optional `isRetryableRateLimit`, hard `timeoutMs` exit without synthesizing `status: 'timeout'`
- Flipped all 5 Wave 0 `deploy-watch-poll.test.ts` scaffolds GREEN; `deploy-poll.test.ts` regression still green
- Extended `toStructuredError` to parse `Retry-After` (delta-seconds + HTTP-date) into `data.retry_after` milliseconds on HTTP 429; added 3-case test suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement pollDeploymentWithBackoff + flip deploy-watch-poll tests GREEN** - `dc3746a` (feat)
2. **Task 2: Attach Retry-After on HTTP 429 in toStructuredError** - `df0ac46` (feat)

## Files Created/Modified

- `src/utils/deploy-watch-poll.ts` — NEW: watch-only backoff/jitter poll helper
- `src/utils/deploy-watch-poll.test.ts` — flipped `it.fails` → `it`; deterministic `random` on timeout/429 cases
- `src/utils/errors.ts` — `parseRetryAfterMs` + 429 `data.retry_after` attach mirroring 409 conflicts pattern
- `src/utils/errors.test.ts` — `429 Retry-After passthrough` describe block

## Decisions Made

- Timeout and 429 tests inject `random: () => 0` so fake-timer advances match minimum Equal Jitter delays (attempt 1 backoff can exceed 3000ms with default `Math.random`)
- 429 sleep uses `max(backoff, retryAfterMs)` per D-08 — with default min 3s, Retry-After 2s still waits 3000ms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed flaky timeout and 429 tests under Equal Jitter backoff**
- **Found during:** Task 1 (deploy-watch-poll tests)
- **Issue:** Wave 0 scaffolds assumed fixed 3000ms sleeps; attempt≥1 backoff can exceed 3000ms; 429 test advanced 2000ms but min backoff is 3000ms
- **Fix:** Added `random: () => 0` to timeout/429 tests; changed 429 first timer advance from 2000ms to 3000ms
- **Files modified:** `src/utils/deploy-watch-poll.test.ts`
- **Verification:** `npx vitest run src/utils/deploy-watch-poll.test.ts` green
- **Committed in:** `dc3746a` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test determinism only; helper behavior matches RESEARCH Equal Jitter + D-08 max(backoff, Retry-After). No scope creep.

## Issues Encountered

None beyond test timer alignment (resolved via deviation above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 21-02 can wire `deployment.watch` action using `pollDeploymentWithBackoff` and `toStructuredError` 429 `retry_after`
- Plan 21-03 can update deploy prompt/README
- Full suite: 1033 passed | 9 expected fail (1042 total)

---
*Phase: 21-deploy-watch*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/utils/deploy-watch-poll.ts
- FOUND: .planning/phases/21-deploy-watch/21-01-SUMMARY.md
- FOUND: dc3746a (Task 1)
- FOUND: df0ac46 (Task 2)
