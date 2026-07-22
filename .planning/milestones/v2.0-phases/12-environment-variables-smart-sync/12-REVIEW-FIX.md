---
phase: 12-environment-variables-smart-sync
fixed_at: 2026-07-21T01:08:30Z
review_path: .planning/phases/12-environment-variables-smart-sync/12-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-07-21T01:08:30Z
**Source review:** `.planning/phases/12-environment-variables-smart-sync/12-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 8
- Skipped: 0

## Fixed Issues

### IN-01: Env helper duplication across three tool modules

**Files modified:** `src/mcp/tools/env-shared.ts`, `src/mcp/tools/application.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/database.ts`
**Commit:** 1053298
**Applied fix:** Extracted shared env helpers (`maskEnvRecord`, `maskEnvRecords`, `withRevealRecoveryHints`, `buildEnvBulkEntry`, `validateEnvMutationConfirm`, `resolveEnvIdentity`) into `env-shared.ts` and updated application/service/database handlers to import them.

### WR-08: `envs:update` omits existing flag metadata on bulk PATCH

**Files modified:** `src/mcp/tools/env-shared.ts`, `src/mcp/tools/application.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/database.ts`
**Commit:** 7e176e7
**Applied fix:** Added `mergeEnvMutationFlags` and merged stored remote flags into bulk PATCH entries when callers omit optional `is_*` fields.

### WR-10: `envs:update` response uses request flags, not stored/API state

**Files modified:** `src/mcp/tools/application.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/database.ts`
**Commit:** 59921d5
**Applied fix:** Response projection now uses merged stored flags from the resolved env row instead of raw request optional fields.

### IN-02: `createEnv` assumes `{ uuid }` response without validation

**Files modified:** `src/api/client.ts`
**Commit:** f45c12c
**Applied fix:** Validates POST response contains a non-empty `uuid` string; throws `COOLIFY_500` with a clear message when absent.

### IN-03: Malformed `.env` lines silently skipped

**Files modified:** `src/utils/env-parser.ts`, `src/mcp/tools/application.ts`
**Commit:** 99da8f7, 252567e
**Applied fix:** Parser collects lines without `=` in `malformedLines`; `envs:sync` rejects non-empty malformed line lists with `COOLIFY_VALIDATION_ERROR`.

### IN-05: `readBoundedEnvFile` does not reject directories

**Files modified:** `src/mcp/tools/application.ts`
**Commit:** ad81191
**Applied fix:** Added `statSync(realPath).isFile()` check before opening `env_file`; directories now return explicit validation error.

### WR-09: Successful `envs:sync` apply still reports resolved conflicts

**Files modified:** `src/mcp/tools/application.ts`
**Commit:** 2d1c984
**Applied fix:** Post-apply response filters conflicts to keys not handled via apply, keep-remote, or abort buckets.

### IN-04: Missing apply-path tests for sync rollback and prune

**Files modified:** `src/mcp/tools/application.test.ts`, `src/utils/env-parser.test.ts`
**Commit:** 11061a0
**Applied fix:** Added tests for successful `prune:true` apply, partial-apply rollback call order/`partialData`, and `rollback_failed` error envelope; added malformed-line parser coverage.

---

_Fixed: 2026-07-21T01:08:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
