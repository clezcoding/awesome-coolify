---
phase: 24
fixed_at: 2026-07-27T22:10:30Z
review_path: .planning/phases/24-capabilities-deployment-logs/24-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-07-27T22:10:30Z
**Source review:** `.planning/phases/24-capabilities-deployment-logs/24-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 4
- Skipped: 1

## Fixed Issues

### WR-01: `application.logs` runtime path ignores `offset`

**Files modified:** `src/mcp/tools/application.ts`
**Commit:** dac5833
**Applied fix:** Runtime branch now passes `offset` to `sliceLogBlob` and requests `lines + offset` from `fetchApplicationLogs` so API-side tail has enough rows after client skip.

### WR-02: Deploy failure/cancel recovery hints skip `deployment.logs`

**Files modified:** `src/utils/errors.ts`, `src/utils/errors.test.ts`
**Commit:** f42e5d4
**Applied fix:** Updated `COOLIFY_DEPLOYMENT_FAILED` and `COOLIFY_DEPLOYMENT_CANCELLED` recovery hints to steer agents to `deployment.logs`; updated unit tests to assert `deployment.logs` instead of `deployment.get` / `projection: full`.

### IN-01: `extractCoolifyVersion` yields `[object Object]` on unexpected API shape

**Files modified:** `src/mcp/tools/system.ts`
**Commit:** 32259c1
**Applied fix:** `extractCoolifyVersion` now returns string/number payloads directly, extracts string/number `version` field from objects, and returns `'unknown'` instead of `String(object)` for unexpected shapes.

### IN-03: No regression test for `deployment.logs` `format: table` reject

**Files modified:** `src/mcp/tools/deployment.test.ts`
**Commit:** 25fda8a
**Applied fix:** Added schema unit test asserting `safeParse({ action: 'logs', format: 'table', deployment_uuid })` returns `success: false`.

## Skipped Issues

### IN-02: Capabilities `supported: true` is static — no live version gate

**File:** `src/mcp/capabilities.ts:1-25`, `src/mcp/tools/system.ts:179-184`
**Reason:** Review fix says "None required unless product wants dynamic flags" — intentional per D-02/D-04; no code change needed.
**Original issue:** All four D-03 keys always report `supported: true` regardless of live `coolifyVersion`.

## Verification

Vitest on touched files: **209 passed** (`deployment.test.ts`, `errors.test.ts`, `system.test.ts`, `application.test.ts`).

---

_Fixed: 2026-07-27T22:10:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
