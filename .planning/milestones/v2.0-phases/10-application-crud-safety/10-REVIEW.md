---
phase: 10-application-crud-safety
reviewed: 2026-07-19T05:14:26Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/mcp/tools/application.ts
  - src/api/client.ts
  - src/mcp/tools/application.test.ts
  - src/utils/errors.ts
  - src/api/client.test.ts
  - src/utils/errors.test.ts
  - tests/integration/logs-service-db-flow.test.ts
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-19T05:14:26Z  
**Depth:** standard  
**Files Reviewed:** 7  
**Status:** issues_found

## Summary

Phase 10 adds application create/update/delete/delete_preview handlers, six new API client methods, validation/error plumbing (`COOLIFY_VALIDATION_ERROR`, 409 `conflicts` passthrough), and broad unit coverage. Confirm-gated delete, strict Zod schemas, ambiguous-match refusal, and secret masking on update responses are implemented well.

One **correctness bug** remains: update-by-name resolution leaks the lookup substring into the PATCH body as `name`, which can unintentionally rename the matched application. Several safety-preview and validation gaps should be tightened before ship.

## Critical Issues

### CR-01: Update-by-name leaks lookup substring into PATCH `name`

**File:** `src/mcp/tools/application.ts:1365-1398`  
**Issue:** `updateActionSchema` uses `name` for both identifier resolution and curated update fields. `resolveAppMutationUuid()` consumes `parsed.name` for lookup, then `buildUpdatePayload()` always copies `parsed.name` into the PATCH body when defined. A call like `{ action: 'update', name: 'myapp', domains: 'https://new.example.com' }` against an app named `myapp-staging` resolves correctly but PATCHes `{ name: 'myapp', domains: '...' }`, renaming the app to the lookup substring rather than only updating domains.

**Fix:**
```typescript
function buildUpdatePayload(
  parsed: UpdateAction,
  options?: { excludeNameLookup?: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of UPDATE_CURATED_FIELD_KEYS) {
    if (options?.excludeNameLookup && key === 'name' && !parsed.uuid) {
      continue; // name was only a lookup identifier
    }
    const value = parsed[key];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  if (parsed.force_domain_override === true) {
    payload.force_domain_override = true;
  }

  return payload;
}

// In handleApplicationUpdate:
const payload = buildUpdatePayload(parsed, {
  excludeNameLookup: !parsed.uuid && !!parsed.name,
});
```

Longer-term, split lookup (`lookup_name`) from mutable `name` in the schema to avoid dual semantics.

## Warnings

### WR-01: Empty update payload allowed (no-op PATCH)

**File:** `src/mcp/tools/application.ts:1382-1399`  
**Issue:** `{ action: 'update', uuid: 'app-uuid-1' }` (or update with only `reveal` / `format` / default-false `force_domain_override`) passes Zod and issues `PATCH /applications/{uuid}` with `{}`. No validation requires at least one curated field.

**Fix:** After `buildUpdatePayload()`, reject empty payloads before calling the API:

```typescript
if (Object.keys(payload).length === 0) {
  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'Update requires at least one mutable field besides identifiers.',
    recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
  });
}
```

### WR-02: `delete_preview` child discovery may silently return empty lists

**File:** `src/mcp/tools/application.ts:1470-1493`  
**Issue:** Preview scans global `/resources` and filters `resource.application_uuid === uuid`. Unlike server preview (dedicated `/servers/{uuid}/resources`) or environment preview (environment-id matching with tested fixtures), this field is not referenced elsewhere in the codebase and the unit test mocks a deployment **without** `application_uuid`, so it never asserts child discovery or the warning path. Operators may get `child_resources: []` and skip review even when dependents exist.

**Fix:** Confirm the Coolify `/resources` shape (or use a dedicated endpoint such as app envs/deployments). Align test fixtures with real payload fields and assert `child_resources` contents plus `warning` when non-empty.

### WR-03: 409 recovery hint text is create-specific but applied to update too

**File:** `src/utils/errors.ts:215-222`  
**Issue:** When `conflicts` is present on any HTTP 409, recovery hints append: *"Retry with force_domain_override: true on the same **create** call..."* Application update 409 tests rely on this hint, but the wording misleads agents retrying `application.update`.

**Fix:** Use neutral wording: *"...on the same create or update call..."*, or branch hint text by caller context if available.

### WR-04: `instant_deploy` proceeds when create response omits `uuid`

**File:** `src/mcp/tools/application.ts:1547-1572`  
**Issue:** `appUuid = String(created.uuid ?? '')` accepts an empty UUID. With `instant_deploy: true`, `triggerDeploy()` is called with `''`, returning a soft `failed_to_queue` success envelope while `data.uuid` is empty. Callers lose a stable resource identifier.

**Fix:** If `!appUuid` after create, throw `COOLIFY_422` (or structured error) before optional deploy; never queue deploy with empty UUID.

### WR-05: Update `build_pack: dockercompose` rejection untested

**File:** `src/mcp/tools/application.ts:403-415`, `src/mcp/tools/application.test.ts`  
**Issue:** Create path rejects `dockercompose` with `COOLIFY_VALIDATION_ERROR` (tested). Update schema has the same guard via `updateBuildPackSchema`, but no test covers it. Regression could allow unsupported updates to reach the API.

**Fix:** Add test mirroring create rejection for `{ action: 'update', uuid: '...', build_pack: 'dockercompose' }`.

### WR-06: Destructive delete flags never tested end-to-end

**File:** `src/mcp/tools/application.ts:1427-1437`, `src/mcp/tools/application.test.ts:1890-1970`  
**Issue:** Schema exposes `delete_volumes`, `delete_configurations`, `docker_cleanup`, `delete_connected_networks`. Tests only assert all-false defaults (SAF-02). Explicit `true` values are never verified to reach `deleteApplication()` query params.

**Fix:** Add test asserting `{ confirm: true, delete_volumes: true, docker_cleanup: true }` forwards flags to the client call (mirror `client.test.ts` delete query-param test).

## Info

### IN-01: `delete_preview` test does not validate child/warning behavior

**File:** `src/mcp/tools/application.test.ts:1980-2000`  
**Issue:** Test only checks `would_delete: true` and that `child_resources` is an array. Mock resource lacks `application_uuid`, so warning path and child listing are unverified.

**Fix:** Extend fixture with `application_uuid: 'app-uuid-1'` and assert populated `child_resources` plus `warning` string.

### IN-02: `recoveryHints` embedded in non-error create response

**File:** `src/mcp/tools/application.ts:1595-1607`  
**Issue:** `failed_to_queue` deploy path puts `recoveryHints` inside success `data` instead of the error envelope. Works but breaks the pattern used elsewhere (`hints` field is used for success guidance).

**Fix:** Prefer `hints` for success-path guidance; reserve `recoveryHints` for error envelopes.

### IN-03: 409 handler treats empty `conflicts: []` as domain-conflict

**File:** `src/utils/errors.ts:122-127, 215-222`  
**Issue:** `extractConflicts()` returns `[]` when the array is empty (not `undefined`), triggering the `force_domain_override` hint even when no conflict details exist.

**Fix:** Return `undefined` when `conflicts.length === 0`, or require non-empty array before augmenting hints.

---

_Reviewed: 2026-07-19T05:14:26Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
