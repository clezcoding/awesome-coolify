---
phase: 25-application-log-follow
reviewed: 2026-07-28T01:16:00Z
depth: quick
files_reviewed: 3
files_reviewed_list:
  - src/mcp/tools/application.ts
  - src/mcp/server.ts
  - src/mcp/tools/application.test.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-28T01:16:00Z
**Depth:** quick
**Files Reviewed:** 3 (25-05 gap closure)
**Status:** issues_found

## Summary

Quick pattern scan plus targeted read of 25-05 gap-closure changes: MCP boundary vs handler schema split (`applicationActionMcpSchema` / `applicationActionSchema`), `server.ts` wiring, and handler regression test for `follow:true + deployment_uuid`.

**Pattern scan (all three files):** no hardcoded secrets, dangerous functions, debug artifacts, or empty catch blocks.

**25-05 assessment:** Split matches plan G-25-1 — MCP registers structural schema; `parseApplicationAction` still uses full `applicationActionSchema` with `applicationExtraRefine` and `throwValidationError` COOLIFY_422 mapping. Handler test locks follow+deployment_uuid envelope. No security bypass: validation runs before any API call.

One maintainability warning (missing MCP-boundary contract test). Two info items (duplicate refine call, parallel validation blocks).

## Warnings

### WR-01: No test locks MCP boundary accepting follow+deployment_uuid

**File:** `src/mcp/tools/application.test.ts`
**Issue:** 25-05 adds `applicationActionMcpSchema` without `applicationExtraRefine` so MCP SDK passes structurally valid `follow:true + deployment_uuid` to the handler. Handler test covers rejection, but nothing asserts `applicationActionMcpSchema.safeParse(...)` succeeds for that combo. Re-merging `extraRefine` into the MCP schema would silently regress G-25-1 (generic SDK validation error instead of COOLIFY_422).
**Fix:** Add a test beside the handler case:

```typescript
import { applicationActionMcpSchema } from './application.js';

it('applicationActionMcpSchema accepts follow true with deployment_uuid at MCP boundary', () => {
  expect(
    applicationActionMcpSchema.safeParse({
      action: 'logs',
      follow: true,
      deployment_uuid: 'dep-x',
    }).success,
  ).toBe(true);
});
```

## Info

### IN-01: Duplicate `rejectDockercomposeBuildPack` on create

**File:** `src/mcp/tools/application.ts:491-493`
**Issue:** `applicationExtraRefine` calls `rejectDockercomposeBuildPack` unconditionally, then again inside `if (data.build_pack === 'dockercompose')`. Duplicate Zod issues when `build_pack === 'dockercompose'`.
**Fix:** Remove the redundant inner `if` block; keep the single unconditional call at line 491.

### IN-02: Parallel logs validation in `applicationLogsSchema` and `applicationExtraRefine`

**File:** `src/mcp/tools/application.ts:157-275,420-479`
**Issue:** Follow/XOR/timeout/interval guards are duplicated between standalone `applicationLogsSchema` and flat-schema `applicationExtraRefine`. Runtime parsing uses only `applicationActionSchema`; `applicationLogsSchema` feeds `LogsAction` type and tests. Future edits to one block can drift from the other.
**Fix:** Long-term, derive nested schema refine from shared helper used by both paths; short-term, document the mirror requirement in a comment above `applicationExtraRefine` logs block.

---

_Reviewed: 2026-07-28T01:16:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
