---
phase: 24-capabilities-deployment-logs
reviewed: 2026-07-27T22:08:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - docs/COVERAGE.md
  - docs/coverage-map.yaml
  - src/mcp/capabilities.ts
  - src/mcp/prompts.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/deployment.test.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/meta.test.ts
  - src/mcp/tools/meta.ts
  - src/mcp/tools/system.test.ts
  - src/mcp/tools/system.ts
  - src/utils/errors.test.ts
  - src/utils/errors.ts
  - src/utils/log-helpers.test.ts
  - src/utils/log-helpers.ts
  - src/utils/package-version.ts
  - tests/mcp/prompts.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 24: Code Review Report (re-review)

**Reviewed:** 2026-07-27T22:08:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Re-review after WR-01/02/03 fix commits (`13b6af1`, `90b58d9`, `55cb52f`). Prior warnings verified fixed:

| Prior | Status |
|-------|--------|
| WR-01 `deployment.logs` max_chars split | **Fixed** — shared `maxChars = parsed.max_chars ?? 20000` passed to processor + `buildReadResponse` (`deployment.ts:526-537`) |
| WR-02 `format: table` on logs | **Fixed** — refine rejects table (`deployment.ts:190-196`); smoke parse confirms |
| WR-03 `entries_shown` vs capped lines | **Fixed** — both paths set `entries_shown: cappedLines.length` (`log-helpers.ts:132,155`) |

Security: `system.version` / `verify` / `meta.version` still omit tokens; empty logs soft-OK; sensitive missing-logs → `COOLIFY_403_SENSITIVE_REQUIRED`; XOR uuid + `COOLIFY_NO_DEPLOYMENTS` intact.

Remaining: runtime `offset` ignored on `application.logs`; deploy-failure recovery hints still steer to `deployment.get` full instead of `deployment.logs`; prior info items unchanged.

## Warnings

### WR-01: `application.logs` runtime path ignores `offset`

**File:** `src/mcp/tools/application.ts:1437,1476`
**Issue:** Handler reads `offset = parsed.offset ?? 0` and passes it on the build-log branch, but the runtime branch hardcodes `sliceLogBlob(logsStr, lines, 0)`. Schema accepts `offset` for `action: "logs"` (flat allow-list + `applicationLogsSchema`), so agents paginating runtime logs get a silent no-op. `type` is documented as runtime-ignored; `offset` is not.
**Fix:**
```typescript
const allLines = sliceLogBlob(logsStr, lines, offset);
```
Optionally request `lines + offset` from `fetchApplicationLogs` so API-side tail still has enough rows after client skip — or reject `offset` on runtime-only calls in the logs refine (mirror `type` docs).

### WR-02: Deploy failure/cancel recovery hints skip `deployment.logs`

**File:** `src/utils/errors.ts:146-153`
**Issue:** Phase 24 D-18 steers build-log fetch to `deployment.logs` (deploy prompt updated). `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_DEPLOYMENT_CANCELLED` still tell agents to use `deployment.get` with `projection: full`. Watch/timeout errors that surface these codes push agents off the new OBS-01 path.
**Fix:**
```typescript
COOLIFY_DEPLOYMENT_FAILED: [
  'Surface the deployment failure to the user with the status and any available summary fields.',
  'Fetch build logs via deployment.logs with the same deployment_uuid (or application_uuid to resolve newest).',
],
COOLIFY_DEPLOYMENT_CANCELLED: [
  'Surface the cancellation to the user — the deployment was stopped before completion.',
  'Fetch build logs via deployment.logs with the same deployment_uuid if the user needs build output.',
],
```

## Info

### IN-01: `extractCoolifyVersion` yields `[object Object]` on unexpected API shape

**File:** `src/mcp/tools/system.ts:115-120`
**Issue:** Object payloads without a top-level `version` field become `String(versionData)` → `"[object Object]"`. Not a token leak; bad `coolifyVersion` for agents comparing `coolify_min_version`.
**Fix:** Prefer string/number `version` field; otherwise throw/`unknown` rather than `String(object)`.

### IN-02: Capabilities `supported: true` is static — no live version gate

**File:** `src/mcp/capabilities.ts:1-25`, `src/mcp/tools/system.ts:179-184`
**Issue:** All four D-03 keys always report `supported: true` regardless of live `coolifyVersion`. Intentional per D-02/D-04. Agents on older Coolify must compare `coolify_min_version` themselves.
**Fix:** None required unless product wants dynamic flags.

### IN-03: No regression test for `deployment.logs` `format: table` reject

**File:** `src/mcp/tools/deployment.test.ts` (deployment logs describe)
**Issue:** WR-02 is implemented and smoke-verified, but the permanent suite still lacks `safeParse({ action: 'logs', format: 'table', ... })` → false. Easy to regress on next schema reshape (`sharedReadParamsFlatShape` overwrite).
**Fix:** Add one schema unit test next to the existing XOR rejects.

## Verified prior fixes / still clean

| Area | Verdict |
|------|---------|
| WR-01 max_chars unification | Pass |
| WR-02 table reject on logs | Pass |
| WR-03 entries_shown = capped lines | Pass |
| Token leak on version/verify/meta | Pass |
| `COOLIFY_412_CAPABILITIES` four keys | Pass |
| `deployment.logs` XOR + empty list error | Pass |
| Empty logs soft OK (D-16) | Pass |
| Missing/non-string logs → 403 sensitive | Pass |
| Deploy prompt cites `deployment.logs` | Pass |
| Coverage map + COVERAGE.md `deployment.logs` | Pass |

---

_Reviewed: 2026-07-27T22:08:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Re-review: after WR-01/02/03 fixes_
