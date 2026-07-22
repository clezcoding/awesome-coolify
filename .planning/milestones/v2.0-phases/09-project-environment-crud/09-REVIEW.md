---
phase: 09-project-environment-crud
reviewed: 2026-07-17T04:18:00Z
depth: quick
files_reviewed: 2
files_reviewed_list:
  - src/mcp/tools/project.ts
  - src/mcp/tools/project.test.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-07-17T04:18:00Z  
**Depth:** quick  
**Files Reviewed:** 2 (commit `c7a3a65` — 09-05 gap closure)  
**Status:** issues_found

## Summary

Reviewed dual-layer validation change for `project` create: `initial_environment` optional at Zod/MCP schema layer, handler rejects missing/empty before `createProject`. Pattern matches existing `private_key` D-11 dual-layer rejection. No secrets, dangerous calls, or debug artifacts. Handler ordering correct — `createProject` not invoked on validation failure (covered by existing tests). One test-coverage gap on whitespace-only input.

## Warnings

### WR-01: Whitespace-only `initial_environment` untested

**File:** `src/mcp/tools/project.test.ts:232-244`  
**Issue:** Handler trims then rejects falsy values (`parsed.initial_environment?.trim()` at `project.ts:377-385`). Tests cover omitted field and `''` but not whitespace-only values like `'   '`. A regression removing `.trim()` or changing the guard would not fail CI.  
**Fix:** Add handler test mirroring empty-string case:

```typescript
it('rejects create with whitespace-only initial_environment with COOLIFY_422 per D-09/D-10', async () => {
  const result = await handleProjectAction(
    { action: 'create', name: 'ws-env-project', initial_environment: '   ' },
    testEnv,
  );

  expect(isProjectErrorResult(result)).toBe(true);
  if (!isProjectErrorResult(result)) return;

  expect(result.structuredContent.error.code).toBe('COOLIFY_422');
  expect(createProject).not.toHaveBeenCalled();
});
```

## Info

### IN-01: `throwValidationError` `missingInitialEnv` branch mostly legacy

**File:** `src/mcp/tools/project.ts:173-186`  
**Issue:** With `initial_environment` now optional at schema layer, the `missingInitialEnv` recovery-hint branch no longer fires for omitted fields (handler owns that path). Branch still useful for wrong-type inputs (e.g. number), but the name/path check is misleading post-09-05.  
**Fix:** Narrow condition to type-mismatch only, or add comment: `// type errors only; missing/empty handled in create case`.

---

_Reviewed: 2026-07-17T04:18:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: quick_
