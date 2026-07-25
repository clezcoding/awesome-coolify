---
phase: 21-deploy-watch
reviewed: 2026-07-25T07:30:00Z
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
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-07-25T07:30:00Z  
**Depth:** standard  
**Files Reviewed:** 9  
**Status:** issues_found

## Summary

Re-review after Plan 04 gap closure. Scope from all `21-*-SUMMARY.md` key-files (source only).

`pollDeploymentWithBackoff` now clamps every sleep via `remainingMs` (429 + normal). Prior **CR-01** (hostile Retry-After unbounded sleep), **WR-01** (normal-path overshoot), and **WR-02** (missing `include_logs` test) are addressed. Architecture still sound: separate watch poller, shared `TERMINAL_DEPLOYMENT_STATES`, dual-signal timeout/fail/cancel via `CoolifyApiError` + `wrapMcpError`, watch-primary deploy prompt.

Remaining issues: ofetch already retries HTTP 429 before watch Retry-After logic (D-08 gap), 429 still maps to `COOLIFY_500`, and timeout test can leak fake timers on assertion failure.

## Warnings

### WR-01: Nested 429 retries ignore Retry-After before watch backoff

**File:** `src/mcp/tools/deployment.ts:310-325` (call site; client retry in `src/api/client.ts:30-35`)  
**Issue:** `handleDeploymentWatch` polls via `fetchDeployment` → shared ofetch client with `retry: 3` and `retryStatusCodes` including `429`. ofetch retries with `retryDelay: 1000 * 2 ** (…)`, **not** the `Retry-After` header. Only after those retries fail does `isRetryableRateLimit` + `pollDeploymentWithBackoff` honor `data.retry_after` (D-08). Inside one `fetcher()` call, watch’s `remainingMs` clamp does not apply to ofetch’s internal sleeps — wall-clock still advances, but Retry-After is skipped for up to three attempts.

**Fix:** Use a no-retry (or 429-excluded) fetch for the watch poller, e.g. dedicated client / `retry: 0` / `retryStatusCodes` without `429`, so the first 429 reaches `isRetryableRateLimit` and D-08 applies immediately:
```typescript
// Prefer: watch-only fetch without ofetch 429 retries
const dep = await fetchDeployment(/* … */, { retry: false });
// or strip 429 from retryStatusCodes for this path
```

### WR-02: HTTP 429 still classified as `COOLIFY_500`

**File:** `src/utils/errors.ts:157-170`  
**Issue:** Phase 21 adds `retry_after` on 429 in `toStructuredError`, but `statusToCode` has no `429` branch — default yields `COOLIFY_500`. Watch swallows 429 via `httpStatus === 429`, yet any surfaced 429 (other tools, exhausted retries, logs) looks like a server error. Recovery hints then point at “overloaded server”, not rate limiting.

**Fix:**
```typescript
function statusToCode(status: number): CoolifyErrorCode {
  switch (status) {
    // …
    case 429:
      return 'COOLIFY_429'; // add to CoolifyErrorCode + RECOVERY_HINTS
    default:
      return 'COOLIFY_500';
  }
}
```

### WR-03: Watch timeout test can leak fake timers

**File:** `src/mcp/tools/deployment.test.ts:516-561`  
**Issue:** `vi.useFakeTimers()` runs, then `vi.useRealTimers()` only after `await resultPromise`. If an assertion throws earlier (or the promise rejects unexpectedly), `afterEach` is absent in this `describe` — fake timers can leak into later tests (flaky suite).

**Fix:**
```typescript
it('returns dual-signal timeout with COOLIFY_WATCH_TIMEOUT', async () => {
  vi.useFakeTimers();
  try {
    // … arrange, advance, await, asserts …
  } finally {
    vi.useRealTimers();
  }
}, 15000);
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

---

### Prior findings (Plan 04) — verified fixed

| ID | Status |
|----|--------|
| CR-01 Sleep not clamped to remaining timeout | **Fixed** — `remainingMs` + `Math.min(…, remaining)` on 429 and normal paths (`deploy-watch-poll.ts:67-79`, `99-112`); regression test present |
| WR-01 Normal poll overshoot by full interval | **Fixed** — same clamp |
| WR-02 No `include_logs: true` success test | **Fixed** — `deployment.test.ts` WR-02 case |

---

_Reviewed: 2026-07-25T07:30:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
