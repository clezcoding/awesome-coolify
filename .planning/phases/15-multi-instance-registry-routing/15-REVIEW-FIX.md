---
phase: 15-multi-instance-registry-routing
fixed_at: 2026-07-21T23:00:00Z
review_path: .planning/phases/15-multi-instance-registry-routing/15-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-07-21T23:00:00Z
**Source review:** .planning/phases/15-multi-instance-registry-routing/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: `instance.add` / `import-env` akzeptieren maskiertes Token `***`

**Files modified:** `src/mcp/tools/instance.ts`, `src/mcp/tools/instance.test.ts`
**Commit:** 498f6c9
**Applied fix:** Extracted shared `rejectMaskedToken()` and call it from `add`, `update`, and `import-env` before persist. Added regression tests for add/import-env rejecting `***`.

### WR-02: Instanzen ohne `default` → irreführendes `COOLIFY_NO_INSTANCE`

**Files modified:** `src/utils/instance-registry.ts`, `src/utils/instance-registry.test.ts`
**Commit:** 2d245ef
**Applied fix:** When `instances.length > 0` but `registry.default` is missing, throw `COOLIFY_VALIDATION_ERROR` with `instance.set-default` / explicit `instance:` hints instead of `COOLIFY_NO_INSTANCE`. Stale-default path unchanged. Added WR-02 unit test.

### WR-03: Ungültiger `instance`-Param wird bei throw-Parse-Tools als `COOLIFY_NETWORK` gemeldet

**Files modified:** `src/mcp/tools/shared-read-params.ts`, `src/mcp/tools/shared-read-params.test.ts`
**Commit:** 43c34c7
**Applied fix:** `parseWithInstanceRouting` now uses `safeParseWithInstanceRouting` and throws `CoolifyApiError` with `COOLIFY_VALIDATION_ERROR` on Zod failure. Added unit tests for invalid slug `PROD`.

### IN-01: `server.test.ts` readOnlyHint-Regex matcht über Tool-Grenzen

**Files modified:** `src/mcp/server.test.ts`
**Commit:** 3da04ef
**Applied fix:** Slice each tool block to the next `registerTool(`; assert `readOnlyHint: true` on `system`/`meta`/`resource`/`docs` and assert absence on `application`/`service`/`database`.

### IN-02: Stale TODO in Registry-Tests

**Files modified:** `src/utils/instance-registry.test.ts`
**Commit:** c15e363
**Applied fix:** Replaced stale Plan 15-01 TODO with note that `COOLIFY_MCP_TEST_REGISTRY_DIR` is the official test hook.

### IN-03: `import-env` hart auf `type: 'self-hosted'`

**Files modified:** `src/mcp/tools/instance.ts`, `src/mcp/tools/instance.test.ts`
**Commit:** f367029
**Applied fix:** Optional `type` on `import-env` schema; default via hostname heuristic (`*.coolify.io` → `cloud`, else `self-hosted`). Tests for cloud inference and explicit type override.

---

_Fixed: 2026-07-21T23:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
