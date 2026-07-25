---
phase: 21-deploy-watch
fixed_at: 2026-07-25T07:39:30Z
review_path: .planning/phases/21-deploy-watch/21-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-07-25T07:39:30Z
**Source review:** `.planning/phases/21-deploy-watch/21-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Nested ofetch 429 retries ignore Retry-After before watch backoff

**Files modified:** `src/api/client.ts`, `src/mcp/tools/deployment.ts`
**Commit:** d00068c
**Applied fix:** Extended `fetchDeployment` with optional `{ retry?: false | number }` and passed `{ retry: false }` from the watch poller so the first 429 reaches `isRetryableRateLimit` / D-08 Retry-After instead of nested ofetch backoff.

### WR-02: HTTP 429 still classified as `COOLIFY_500`

**Files modified:** `src/utils/errors.ts`, `src/utils/errors.test.ts`
**Commit:** 321fba9
**Applied fix:** Added `COOLIFY_429` to `CoolifyErrorCode`, `RECOVERY_HINTS`, and `statusToCode`; updated 429 tests to expect the new code and rate-limit hints.

### WR-03: Watch timeout test can leak fake timers

**Files modified:** `src/mcp/tools/deployment.test.ts`
**Commit:** 4e71395
**Applied fix:** Wrapped the `COOLIFY_WATCH_TIMEOUT` fake-timer test body in `try/finally` with `vi.useRealTimers()` in `finally`.

### WR-04: FAILED/CANCELLED recovery hints mislead agents to `include_logs` on watch

**Files modified:** `src/utils/errors.ts`, `src/utils/errors.test.ts`
**Commit:** f498991
**Applied fix:** Updated `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_DEPLOYMENT_CANCELLED` hints to point only at `deployment.get` with `projection: full`; tightened tests to reject watch/`include_logs` alternatives.

---

_Fixed: 2026-07-25T07:39:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
