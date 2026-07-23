---
phase: 17-local-manifest-sync
fixed_at: 2026-07-22T17:13:00Z
review_path: .planning/phases/17-local-manifest-sync/17-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-07-22T17:13:00Z  
**Source review:** `.planning/phases/17-local-manifest-sync/17-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Update auto-hooks miss environment UUID on typical Coolify payloads

**Files modified:** `src/utils/project-lookup.ts`, `src/utils/project-lookup.test.ts`, `src/utils/manifest.ts`, `src/utils/manifest.test.ts`, `src/utils/manifest-auto-hook.ts`, `src/utils/manifest-auto-hook.test.ts`, `src/mcp/tools/application.ts`, `src/mcp/tools/application.test.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/service.test.ts`, `src/mcp/tools/database.ts`, `src/mcp/tools/database.test.ts`  
**Commit:** d59912f  
**Applied fix:** Added shared `resolveUpdateManifestContext` with priority nested `environment` → `environment_id` lookup (`resolveEnvironmentUuidFromId`) → existing manifest placement (`ManifestManager.findResourceContext`) → parsed env UUID. Wired into application/service/database update auto-hooks.  
**Commit status:** fixed: requires human verification

### WR-02: `mergeManifests` can leave duplicate resource UUIDs after sync

**Files modified:** `src/mcp/tools/manifest.ts`, `src/mcp/tools/manifest.test.ts`  
**Commit:** 99c5963  
**Applied fix:** Before remote-wins upsert, remove each remote resource UUID from all local environments so moved resources do not leave stale duplicates.

### WR-03: `resolveProjectRoot` falls back to raw `cwd` when no markers found

**Files modified:** `src/utils/project-root.ts`, `src/utils/project-root.test.ts`  
**Commit:** 153d2e1  
**Applied fix:** Fail closed with `COOLIFY_VALIDATION_ERROR` when walk-up finds no `.git` / `package.json` / `.coolify` marker (test seam `COOLIFY_MCP_TEST_WORKSPACE` unchanged).

### WR-04: Sync maps service domains from `fqdn` only

**Files modified:** `src/mcp/tools/manifest.ts`, `src/mcp/tools/manifest.test.ts`  
**Commit:** b32a684  
**Applied fix:** `resourceToManifestEntry` now prefers `urls[]` (string or `{url}`) and falls back to `fqdn`.

## Verification

- `vitest run` on touched suites: 8 files, 301 tests passed

---

_Fixed: 2026-07-22T17:13:00Z_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
