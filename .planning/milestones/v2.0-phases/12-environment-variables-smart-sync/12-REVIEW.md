---
phase: 12-environment-variables-smart-sync
reviewed: 2026-07-21T01:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/api/client.test.ts
  - src/api/client.ts
  - src/mcp/server.ts
  - src/mcp/tools/application.test.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/database.test.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/service.test.ts
  - src/mcp/tools/service.ts
  - src/utils/env-parser.test.ts
  - src/utils/env-parser.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-07-21T01:00:00Z  
**Depth:** standard  
**Files Reviewed:** 11  
**Status:** issues_found

## Summary

Re-reviewed Phase 12 env-var smart sync after prior fixes (CR-01, WR-01–WR-07). Core paths — API client env CRUD, masking/reveal, confirm gates, `envs:sync` diff/apply/rollback, path allowlisting, and database `is_preview` rejection — look sound. No new blockers found.

Remaining issues are mostly consistency and response-shape clarity: `envs:update` does not preserve existing Coolify flags the way `envs:sync` does; successful sync apply still returns the pre-resolution `conflicts` array; and several helper blocks are duplicated across application/service/database tools.

## Critical Issues

None.

## Warnings

### WR-08: `envs:update` omits existing flag metadata on bulk PATCH

**File:** `src/mcp/tools/application.ts:2227-2234` (same pattern in `src/mcp/tools/service.ts:1687-1694`, `src/mcp/tools/database.ts:1574-1580`)

**Issue:** `handle*EnvsUpdate` builds bulk entries from caller-supplied optional flags only. Omitted flags are left out of the PATCH body. By contrast, `envs:sync` apply explicitly preserves remote metadata from baseline:

```2647:2655:src/mcp/tools/application.ts
      const baselineEntry = baselineByKey.get(entry.key);
      bulkUpdates.push({
        key: entry.key,
        value: entry.localValue,
        is_preview: baselineEntry?.is_preview ?? false,
        is_literal: baselineEntry?.is_literal ?? false,
        is_multiline: baselineEntry?.is_multiline ?? false,
        is_shown_once: baselineEntry?.is_shown_once ?? false,
      });
```

If Coolify bulk PATCH treats omitted flags as reset/default, a value-only update can silently clear `is_preview` / `is_literal` / etc.

**Fix:** After resolving the target env row, merge stored flags before building the bulk entry:

```typescript
const found = /* resolved Env row */;
const entry = buildEnvBulkEntry({
  key: resolvedKey,
  value: parsed.value,
  is_preview: parsed.is_preview ?? found.is_preview,
  is_literal: parsed.is_literal ?? found.is_literal,
  is_multiline: parsed.is_multiline ?? found.is_multiline,
  is_shown_once: parsed.is_shown_once ?? found.is_shown_once,
});
```

Mirror merged flags in the masked response payload as well.

---

### WR-09: Successful `envs:sync` apply still reports resolved conflicts

**File:** `src/mcp/tools/application.ts:2849-2855`

**Issue:** After apply completes, the handler returns `buildSyncDisposition(diff, conflicts, …)` using the pre-apply conflict list. With `conflict_policy: 'overwrite'`, conflicted keys are updated but still appear under `conflicts`, implying unresolved drift.

**Fix:** Filter or annotate conflicts post-apply, e.g. omit keys present in `appliedUpdates` / not present in `aborted` or `kept_remote`, or add a `resolved: true` field when policy was `overwrite`.

---

### WR-10: `envs:update` response uses request flags, not stored/API state

**File:** `src/mcp/tools/application.ts:2245-2255` (same in service/database handlers)

**Issue:** Response projection passes `parsed.is_*` fields directly. When flags are omitted, response shows `undefined` instead of persisted values, and may disagree with Coolify after PATCH.

**Fix:** Re-fetch the env row (same pattern as `envs:create`) or merge from the resolved `found` record before `maskEnvRecord`.

## Info

### IN-01: Env helper duplication across three tool modules

**File:** `src/mcp/tools/application.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/database.ts`

**Issue:** `maskEnvRecord`, `maskEnvRecords`, `resolve*EnvIdentity`, `buildEnvBulkEntry`, `validateEnvMutationConfirm`, and `withRevealRecoveryHints` are near-identical copies (~150 lines × 3). Future fixes (WR-08/WR-10) must be applied thrice.

**Fix:** Extract shared env helpers to e.g. `src/mcp/tools/env-shared.ts` and import from application/service/database handlers.

---

### IN-02: `createEnv` assumes `{ uuid }` response without validation

**File:** `src/api/client.ts:601-604`

**Issue:** POST response is cast to `{ uuid: string }` with no shape check. Missing `uuid` surfaces later as a vague identity error during create/sync rollback bookkeeping.

**Fix:** Validate `uuid` is a non-empty string; throw `COOLIFY_500` with a clear message if absent.

---

### IN-03: Malformed `.env` lines silently skipped

**File:** `src/utils/env-parser.ts:63-66`

**Issue:** Lines without `=` are dropped with no `invalidKeys` entry. Typos like `MY_KEY` (missing `=`) vanish from sync diff instead of failing validation.

**Fix:** Optionally collect unparseable lines and surface via `invalidKeys` or a dedicated `malformed_lines` list; reject in `envs:sync` when non-empty.

---

### IN-04: Missing apply-path tests for sync rollback and prune

**File:** `src/mcp/tools/application.test.ts` (envs:sync describe block)

**Issue:** Tests cover dry-run, confirm gates, and conflict policies on happy paths, but not partial-apply failure rollback (`partialData`, `rollback_failed`) or successful `prune:true` apply. Rollback logic is non-trivial (~90 lines) and currently unverified.

**Fix:** Add tests mocking sequential `createEnv` / `updateEnvViaBulk` / `deleteEnv` failures and assert rollback call order and error envelope fields.

---

### IN-05: `readBoundedEnvFile` does not reject directories

**File:** `src/mcp/tools/application.ts:2377-2385`

**Issue:** Path allowlisting checks size via `fstatSync` but not `isFile()`. Passing a directory path yields a generic read error instead of an explicit validation message (compose reader has similar behavior).

**Fix:** After `fstatSync`, reject non-file nodes:

```typescript
import { fstatSync, statSync } from 'node:fs';
// ...
if (!statSync(realPath).isFile()) {
  throw new CoolifyApiError({ code: 'COOLIFY_VALIDATION_ERROR', message: 'env_file must be a regular file', ... });
}
```

---

_Reviewed: 2026-07-21T01:00:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
