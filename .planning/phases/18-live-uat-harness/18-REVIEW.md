---
phase: 18-live-uat-harness
reviewed: 2026-07-23T18:30:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/live-uat.mjs
  - scripts/live-uat.matrix.json
  - package.json
  - CONTRIBUTING.md
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-07-23T18:30:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the live UAT harness (`scripts/live-uat.mjs`), declarative matrix, npm entry point, and CONTRIBUTING runbook. Token redaction and spawn-without-shell patterns are implemented correctly on stdout/file outputs. Exit codes 0/1/2 and the `UAT_PROJECT_UUID` setup gate behave as documented.

One **blocker** remains: the default smoke suite includes `emergency-stop-all-preview-smoke`, which always records `fail` (not `pass` or `planned`) because `COOLIFY_CONFIRM_REQUIRED` preview responses are scored as failures. That makes a clean default `npm run uat:live` exit **1** even when all other tools work.

Additional warnings cover asymmetric safety gates between stdio and in-process runners, unpiped stderr backpressure, and matrix fixture assumptions.

## Critical Issues

### CR-01: Default smoke run fails on emergency preview row

**File:** `scripts/live-uat.mjs:640-645`, `scripts/live-uat.matrix.json:83-88`
**Issue:** Matrix row `emergency-stop-all-preview-smoke` calls `emergency` / `stop_all` without `confirm`. The MCP handler correctly returns `structuredContent.ok === false` with `error.code === 'COOLIFY_CONFIRM_REQUIRED'` (preview semantics). `evaluateStdioRowResult` treats any `ok === false` as `status: 'fail'`, incrementing `summary.fail` and forcing `exit(1)`. The row is typed `"read"` and runs via stdio, so `rowAllowedByFlags` never marks it `planned`. Default smoke therefore cannot exit 0 unless this evaluator special-cases preview errors or the matrix row changes.
**Fix:**
```javascript
// In evaluateStdioRowResult (and mirror in evaluateInProcessRowResult if needed):
} else if (structuredContent?.ok === false) {
  const code = structuredContent?.error?.code;
  if (code === 'COOLIFY_CONFIRM_REQUIRED') {
    status = 'pass'; // preview assertion — confirm gate working
    errorCode = code;
  } else {
    status = 'fail';
    errorCode = code ?? 'UAT_UNKNOWN';
  }
}
```
Alternatively, change the matrix row to a truly read-only emergency action, or type it `destructive` and apply `rowAllowedByFlags` in `runStdioRows` so default runs record `planned`.

## Warnings

### WR-01: Stdio runner skips write/destructive flag gate

**File:** `scripts/live-uat.mjs:663-747`
**Issue:** `runInProcessRows` enforces `rowAllowedByFlags` (D-09/D-10/D-12) and records `planned` when flags are missing. `runStdioRows` has no equivalent check. Current matrix keeps write/destructive rows in-process only, but any future stdio row with `type: "write"` or `"destructive"` would execute without `--write` / `--confirm-destructive`, contradicting CONTRIBUTING and D-12.
**Fix:** At the top of the stdio row loop (before `tools/call`), reuse `rowAllowedByFlags(row, flags)` and push a `planned` row when not allowed — same shape as in-process.

### WR-02: Stdio runner skips UAT project scope guard

**File:** `scripts/live-uat.mjs:663-747`, `scripts/live-uat.mjs:298-334`
**Issue:** `guardUatScope` runs only for non-read in-process rows. Stdio rows never call it. Smoke reads like `application-get-smoke` (by name) can succeed against resources outside `UAT_PROJECT_UUID` on multi-project instances, weakening the identity gate to setup-time project validation only.
**Fix:** Optionally call `guardUatScope` for stdio rows whose tools are in the scoped set, or require matrix args to include `project_uuid` placeholders for resource lookups.

### WR-03: Child stderr piped but never consumed

**File:** `scripts/live-uat.mjs:616-623`, `scripts/live-uat.mjs:677-678`
**Issue:** `spawnChild` uses `stdio: ['pipe', 'pipe', 'pipe']` but only stdout is drained. If the MCP child writes enough to stderr (errors, logs despite `COOLIFY_MCP_LOG: 'error'`), the pipe buffer can fill and block the child. stderr output is also not passed through `redact()`, so adding stderr logging later would bypass token redaction.
**Fix:** Attach a draining listener that redacts before discarding or forwarding:
```javascript
child.stderr.on('data', (chunk) => {
  // optionally forward redacted chunks to process.stderr, or discard after drain
});
```

### WR-04: Matrix fixture names assume pre-seeded UAT resources

**File:** `scripts/live-uat.matrix.json:59-64`, `scripts/live-uat.matrix.json:91-94`
**Issue:** Rows `application-get-smoke`, `service-get-smoke`, `database-get-smoke`, `server-get-smoke`, and `deployment-list-smoke` reference hardcoded names/uuids (`uat-smoke-app`, `uat-smoke-app-uuid`, etc.) that are not substituted from `UAT_PROJECT_UUID`. On a fresh UAT project these rows fail with `COOLIFY_*` lookup errors → exit 1, even when MCP tooling is healthy.
**Fix:** Document required UAT fixtures in CONTRIBUTING, or add matrix placeholders/env vars for fixture UUIDs and skip rows when unset.

### WR-05: CONTRIBUTING “read-only” claim incomplete for stdio emergency row

**File:** `CONTRIBUTING.md:34`, `scripts/live-uat.matrix.json:83-88`
**Issue:** CONTRIBUTING states that without `--write`, write/destructive rows are recorded as `planned`. The emergency smoke row is typed `read` and executes via stdio, triggering a live `fetchResources` call before the confirm gate rejects. This matches neither “read-only lists/gets” nor “planned without flags” (D-11/D-12).
**Fix:** Align matrix typing with D-11 (`destructive`) plus stdio flag gating, or document that emergency preview is an intentional live API probe scored separately.

## Info

### IN-01: Redaction limited to `COOLIFY_TOKEN`

**File:** `scripts/live-uat.mjs:61-79`, `scripts/live-uat.mjs:900`
**Issue:** `createRedactor` only masks `routingEnv.COOLIFY_TOKEN`. API responses in `structuredContent` may contain other sensitive fields (SSH key metadata, env vars). Acceptable for v1 maintainer-local harness, but reports should not be shared verbatim.
**Fix:** Document in CONTRIBUTING that `--out` reports may still contain non-token secrets from live API payloads.

### IN-02: `blocked-outside-uat` status undocumented in runbook

**File:** `scripts/live-uat.mjs:435`, `CONTRIBUTING.md:54-58`
**Issue:** In-process mutations outside the UAT project receive status `blocked-outside-uat`, which is not listed in CONTRIBUTING exit-code or status tables. It does not increment `fail`, so exit 0 is still possible — behavior is correct but opaque.
**Fix:** Add `blocked-outside-uat` to the CONTRIBUTING status glossary.

---

_Reviewed: 2026-07-23T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
