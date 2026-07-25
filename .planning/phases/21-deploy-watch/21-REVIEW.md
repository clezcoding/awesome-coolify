---
phase: 21-deploy-watch
reviewed: 2026-07-25T07:35:00Z
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
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-07-25T07:35:00Z  
**Depth:** standard  
**Files Reviewed:** 9  
**Status:** issues_found

## Summary

Fresh standard-depth review of phase 21 deploy-watch sources (post Plan 04 gap closure).

Core design holds: `pollDeploymentWithBackoff` (Equal Jitter + remaining clamp), `deployment.watch` dual-signal timeout/fail/cancel via `CoolifyApiError` + `wrapMcpError`, watch-primary deploy prompt. Plan 04 clamps (`remainingMs`) and `include_logs` success test remain correct.

Still open: ofetch nested 429 retries bypass D-08 Retry-After and can overshoot short timeouts; 429 still maps to `COOLIFY_500`; timeout test can leak fake timers; FAILED/CANCELLED recovery hints wrongly tell agents to re-call `watch` with `include_logs` (handler never attaches logs on those terminals).

## Warnings

### WR-01: Nested ofetch 429 retries ignore Retry-After before watch backoff

**File:** `src/mcp/tools/deployment.ts:310-325` (call site; client retry in `src/api/client.ts:30-35`)  
**Issue:** `handleDeploymentWatch` polls via `fetchDeployment` → shared ofetch client with `retry: 3` and `retryStatusCodes` including `429`. ofetch retries with `retryDelay: 1000 * 2 ** (…)`, **not** the `Retry-After` header. Only after those retries fail does `isRetryableRateLimit` + `pollDeploymentWithBackoff` honor `data.retry_after` (D-08). Inside one `fetcher()` call, watch’s `remainingMs` clamp does not apply to ofetch’s internal sleeps — wall-clock still advances. At `timeout: 10` (schema min), ofetch alone can burn ~14s before watch sees the 429, violating the agent-requested bound.

**Fix:** Use a no-retry (or 429-excluded) fetch for the watch poller so the first 429 reaches `isRetryableRateLimit` and D-08 applies immediately:
```typescript
// Prefer: watch-only fetch without ofetch 429 retries
const dep = await fetchDeployment(/* … */, { retry: false });
// or strip 429 from retryStatusCodes for this path
```

### WR-02: HTTP 429 still classified as `COOLIFY_500`

**File:** `src/utils/errors.ts:157-170`  
**Issue:** Phase 21 adds `retry_after` on 429 in `toStructuredError`, but `statusToCode` has no `429` branch — default yields `COOLIFY_500`. Watch swallows 429 via `httpStatus === 429`, yet any surfaced 429 (other tools, exhausted retries) looks like a server error. Recovery hints then point at “overloaded server”, not rate limiting.

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
**Issue:** `vi.useFakeTimers()` runs, then `vi.useRealTimers()` only after `await resultPromise`. No `afterEach` / `try/finally` in this `describe` — if an assertion throws earlier (or the promise rejects unexpectedly), fake timers leak into later tests (flaky suite).

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

### WR-04: FAILED/CANCELLED recovery hints mislead agents to `include_logs` on watch

**File:** `src/utils/errors.ts:134-141` (hints); `src/mcp/tools/deployment.ts:345-370` (handler)  
**Issue:** `RECOVERY_HINTS` for `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_DEPLOYMENT_CANCELLED` tell agents to “re-call `deployment.watch` with `include_logs: true`”. Handler throws on those terminals **before** the `include_logs` branch, so a re-watch of an already-failed/cancelled deployment returns the same isError envelope with summary only — never capped logs. Agents waste a round-trip; only `deployment.get` with `projection: full` actually fetches logs (matches D-12: logs on success payload only).

**Fix:** Drop the watch/`include_logs` alternative from fail/cancel hints; point only at `deployment.get`:
```typescript
COOLIFY_DEPLOYMENT_FAILED: [
  'Surface the deployment failure to the user with the status and any available summary fields.',
  'Fetch build logs via deployment.get with projection: full (include_logs on watch only applies to finished success).',
],
COOLIFY_DEPLOYMENT_CANCELLED: [
  'Surface the cancellation to the user — the deployment was stopped before completion.',
  'Fetch logs via deployment.get with projection: full if the user needs build output.',
],
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

---

### Prior findings (Plan 04) — verified still fixed

| ID | Status |
|----|--------|
| CR-01 Sleep not clamped to remaining timeout | **Fixed** — `remainingMs` + `Math.min(…, remaining)` on 429 and normal paths (`deploy-watch-poll.ts:67-79`, `99-112`); regression test present |
| WR-01 (prior) Normal poll overshoot by full interval | **Fixed** — same clamp |
| WR-02 (prior) No `include_logs: true` success test | **Fixed** — `deployment.test.ts` WR-02 case |

---

_Reviewed: 2026-07-25T07:35:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
