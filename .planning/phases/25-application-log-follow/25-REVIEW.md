---
phase: 25-application-log-follow
reviewed: 2026-07-28T00:10:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/utils/log-follow-poll.ts
  - src/utils/deploy-watch-poll.ts
  - src/mcp/tools/application.ts
  - src/utils/errors.ts
  - src/mcp/capabilities.ts
  - docs/coverage-map.yaml
  - docs/coverage-overrides.yaml
  - README.md
  - README.de.md
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-28T00:10:00Z
**Depth:** standard
**Files Reviewed:** 9 (implementation + docs; test files exercised via SUMMARY coverage claims, not line-audited)
**Status:** issues_found

## Summary

Phase 25 adds `followApplicationLogs` polling (`log-follow-poll.ts`), `application.logs` + `follow:true` handler branch, `COOLIFY_LOG_FOLLOW_TIMEOUT` dual-signal error, schema XOR guards, and fifth capability `application_logs_follow`. Core dedup/idle/timeout/429 paths are well tested and mirror `deploy-watch-poll` patterns.

Security: no new injection surfaces; partial logs on API failure are capped; rate-limit backoff respects remaining budget. No hardcoded secrets or unsafe eval patterns in scoped files.

Remaining issues are contract/edge-case gaps: silent empty-log apps never hit idle stop, flat-schema `timeout` coupling blocks sub-10s follow budgets, and interval bounds validation is incomplete when only one bound is set.

## Warnings

### WR-01: Empty runtime logs never trigger idle — full timeout instead

**File:** `src/utils/log-follow-poll.ts:58-87`
**Issue:** `lastNewLineTime` stays `null` until a poll adds deduped lines (`hadNewLines`). When the app emits no logs (empty snapshots every poll), the idle branch never runs (`lastNewLineTime !== null` guard), so follow runs until the 120s budget and returns `COOLIFY_LOG_FOLLOW_TIMEOUT` instead of idle success per D-05/D-11. Agents tailing a quiet/not-yet-logging app wait 2× longer and get an error flag incorrectly.
**Fix:**
```typescript
// After first successful fetch with no new lines, start idle clock from first poll
if (pollCount === 1 && !hadNewLines && lastNewLineTime === null) {
  lastNewLineTime = Date.now();
} else if (hadNewLines) {
  lastNewLineTime = Date.now();
} else if (
  lastNewLineTime !== null &&
  Date.now() - lastNewLineTime >= options.idleTimeoutMs
) {
  return { aggregate, stoppedReason: 'idle', pollCount, elapsedMs: Date.now() - startTime };
}
```
Add unit test: `fetchSnapshot` always resolves `[]`, expect `stoppedReason: 'idle'` after `idleTimeoutMs`.

### WR-02: Flat `applicationActionSchema` `timeout` min(10) applies to follow budget

**File:** `src/mcp/tools/application.ts:393-399,1644`
**Issue:** `timeout` on the flat schema is shared with deploy `wait` and constrained to `.min(10).max(1800)`. Nested `applicationLogsSchema` allows follow timeout `.min(1)`. MCP entry path uses the flat schema, so agents cannot request a follow budget under 10 seconds even though nested schema and docs imply second-level control. Deploy wait semantics leak into follow.
**Fix:** Either split fields (`follow_timeout` vs deploy `timeout`) or add a logs-action refine: when `action === 'logs' && follow === true`, relax min to 1 (mirror `applicationLogsSchema`).

### WR-03: `min_interval` / `max_interval` ordering unchecked when only one bound is set

**File:** `src/mcp/tools/application.ts:255-269,787-801,1646-1647`
**Issue:** Schema rejects `min_interval > max_interval` only when **both** are provided. Handler defaults missing bounds to 3s / 30s. A call with `follow:true, max_interval:2` yields `minIntervalMs=3000`, `maxIntervalMs=2000`; `nextDelayMs` still returns delays ≥ min, silently violating the user's max and breaking backoff semantics.
**Fix:** In the follow refine (flat + nested), compare resolved defaults:
```typescript
const minI = data.min_interval ?? 3;
const maxI = data.max_interval ?? 30;
if (data.follow === true && minI > maxI) {
  ctx.addIssue({ /* COOLIFY_422 */ });
}
```

## Info

### IN-01: `timeout` on one-shot `logs` (no follow) is accepted but ignored

**File:** `src/mcp/tools/application.ts:538-547,1557-1621`
**Issue:** Phase 25 added `timeout` to the logs action allow-list for follow, but `handleApplicationLogs` one-shot path never reads `parsed.timeout`. Agents may pass `timeout` expecting behavior change on non-follow calls.
**Fix:** Reject `timeout` when `follow !== true` in the logs refine, or document in catalog that `timeout` applies only with `follow:true`.

### IN-02: No test for empty-snapshot idle path

**File:** `src/utils/log-follow-poll.test.ts`
**Issue:** Idle test seeds `'static line'` on first poll so `lastNewLineTime` is set. The WR-01 empty-log gap has no regression test.
**Fix:** Add `it('stops idle when snapshots stay empty')` with `mockResolvedValue([])`.

---

_Reviewed: 2026-07-28T00:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
