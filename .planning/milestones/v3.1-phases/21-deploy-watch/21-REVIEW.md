---
phase: 21-deploy-watch
reviewed: 2026-07-25T07:43:21Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/mcp/prompts.ts
  - src/mcp/tools/deployment.test.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/shared-read-params.ts
  - src/utils/deploy-watch-poll.test.ts
  - src/utils/deploy-watch-poll.ts
  - src/utils/errors.test.ts
  - src/utils/errors.ts
  - tests/mcp/prompts.test.ts
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-07-25T07:43:21Z  
**Depth:** standard  
**Files Reviewed:** 9  
**Status:** issues_found

## Summary

Re-review of phase 21 deploy-watch sources after the WR-01..WR-04 fix pass.

Prior warnings stay fixed: watch uses `fetchDeployment(..., { retry: false })`, `COOLIFY_429` maps correctly with rate-limit hints, timeout fake-timer test uses `try/finally`, fail/cancel recovery hints point at `deployment.get` (not watch/`include_logs`).

Remaining: one flaky-timer risk in `errors.test.ts` (same class as fixed WR-03), plus prior Info items still open and a missing regression assertion for the no-retry watch fetch.

## Warnings

### WR-01: HTTP-date 429 test can leak fake timers

**File:** `src/utils/errors.test.ts:241-261`  
**Issue:** `vi.useFakeTimers()` / `vi.setSystemTime(...)` run, then `vi.useRealTimers()` only after the expects. No `try/finally`. If an assertion throws, fake timers leak into later tests (same flaky pattern previously fixed in `deployment.test.ts` WR-03).

**Fix:**
```typescript
it('toStructuredError attaches retry_after ms from HTTP-date Retry-After on HTTP 429', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
    // … arrange + asserts …
  } finally {
    vi.useRealTimers();
  }
});
```

## Info

### IN-01: All-429 timeout yields empty deployment snapshot

**File:** `src/utils/deploy-watch-poll.ts:50-64`  
**Issue:** If every `fetcher()` call fails with retryable 429 until timeout, `deployment` stays `{}`. `COOLIFY_WATCH_TIMEOUT` then shows `status: 'unknown'`. Edge case; confusing for agents.  
**Fix:** Track last error metadata or message note `no successful fetch`; keep empty snapshot only when never fetched.

### IN-02: Poll helper tests leave long-running promises unresolved

**File:** `src/utils/deploy-watch-poll.test.ts:94` and `:173`  
**Issue:** Jitter/defaults cases use `void resultPromise` without awaiting terminal/timeout. Harmless for production; can interact with fake-timer teardown.  
**Fix:** Lower `timeoutMs`, await timeout outcome, or abort after delay assertions.

### IN-03: Deploy prompt says “cancelled” vs API status `cancelled-by-user`

**File:** `src/mcp/prompts.ts:56`  
**Issue:** Prompt text says “On `failed` or `cancelled`” while runtime/error codes use `cancelled-by-user` / `COOLIFY_DEPLOYMENT_CANCELLED`. Agents usually map correctly; slight naming drift vs Coolify status string.  
**Fix:** Prefer `cancelled-by-user` (or “cancelled terminal”) in the prompt line for parity with `TERMINAL_DEPLOYMENT_STATES`.

### IN-04: No regression assertion for watch `{ retry: false }`

**File:** `src/mcp/tools/deployment.test.ts:458-482` (watch success path; also timeout/fail cases)  
**Issue:** WR-01 fix passes `{ retry: false }` at `deployment.ts:318`, but no test asserts `fetchDeployment` was called with that option. Nested ofetch 429 retries can regress without a failing suite.  
**Fix:** On any watch poll assertion, expect the 5th arg `{ retry: false }`:
```typescript
expect(fetchDeployment).toHaveBeenCalledWith(
  testEnv.COOLIFY_URL,
  testEnv.COOLIFY_TOKEN,
  'dep-finished',
  testEnv.COOLIFY_VERIFY_SSL,
  { retry: false },
);
```

---

### Prior findings (07:35 + fix pass) — verified still fixed

| ID | Status |
|----|--------|
| WR-01 Nested ofetch 429 retries ignore Retry-After | **Fixed** — `fetchDeployment(..., { retry: false })` at `deployment.ts:313-319` |
| WR-02 HTTP 429 classified as `COOLIFY_500` | **Fixed** — `COOLIFY_429` in union, `statusToCode`, `RECOVERY_HINTS` (`errors.ts:9`, `:65-68`, `:173-174`) |
| WR-03 Watch timeout test fake-timer leak | **Fixed** — `try/finally` + `vi.useRealTimers()` (`deployment.test.ts:516-561`) |
| WR-04 FAILED/CANCELLED hints point at watch/`include_logs` | **Fixed** — hints use `deployment.get` + `projection: full` only (`errors.ts:139-146`); tests reject watch/`include_logs` alternatives |
| CR-01 Sleep not clamped to remaining timeout | **Fixed** — `remainingMs` + `Math.min(…, remaining)` (`deploy-watch-poll.ts:67-79`, `:99-112`) |
| WR-02 (Plan 04) No `include_logs: true` success test | **Fixed** — `deployment.test.ts` WR-02 case |

---

_Reviewed: 2026-07-25T07:43:21Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
