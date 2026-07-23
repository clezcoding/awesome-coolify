---
phase: 17-local-manifest-sync
reviewed: 2026-07-22T17:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - .coolify-manifest.example.json
  - src/mcp/server.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/application.test.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/database.test.ts
  - src/mcp/tools/manifest.ts
  - src/mcp/tools/manifest.test.ts
  - src/mcp/tools/service.ts
  - src/mcp/tools/service.test.ts
  - src/mcp/server.test.ts
  - src/utils/errors.ts
  - src/utils/manifest.ts
  - src/utils/manifest.test.ts
  - src/utils/project-root.ts
  - src/utils/project-root.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-22T17:00:00Z  
**Depth:** standard  
**Files Reviewed:** 17  
**Status:** issues_found

## Summary

Phase 17 delivers a coherent manifest cache stack: atomic `ManifestManager` I/O, walk-up project-root resolution, a 7-action `manifest` MCP tool with sync/diff reconciliation, stale-404 hint injection, and auto-hooks on application/service/database mutations. Test coverage is strong (944 passing tests per summaries).

No security blockers found (strict Zod schemas, no token fields in manifest, path confined to resolved project root). The main gaps are **update-time auto-hook context resolution** (environment UUID often missing on real Coolify payloads) and **sync merge leaving duplicate resource UUIDs** when remote placement changes. Both degrade D-09 cache freshness without failing primary mutations.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Update auto-hooks miss environment UUID on typical Coolify payloads

**File:** `src/mcp/tools/application.ts:1725-1852`, `src/mcp/tools/service.ts:1045-1163`, `src/mcp/tools/database.ts:1322-1440`  
**Issue:** `extractManifestContextFromRaw` only reads nested `raw.environment.uuid`. Coolify 4.1.x payloads often expose `environment_id` (numeric) instead — projections already handle this in `resolveProjectFields`. Application `mockApplication` in tests has `project` but no `environment`, mirroring production shape. Update handlers then call `autoUpsert` with `environmentUuid: undefined`, which throws inside `ManifestManager.upsert` and surfaces only `_meta.manifestWarning`. Domain/name updates therefore skip manifest refresh in the common case. Service/database have `parsed.environment_uuid` fallback, but typical domain-only updates omit it; application update schema has no env fallback at all.

**Fix:** Resolve environment context before upsert: (1) nested `environment`, (2) `environment_id` via `fetchEnvironments` / existing lookup table (mirror projections), (3) existing manifest entry for the same resource UUID, (4) parsed `environment_uuid` where available.

```typescript
// After extractManifestContextFromRaw(raw):
let environmentUuid = ctx.environmentUuid;
if (!environmentUuid && typeof raw.environment_id === 'number') {
  environmentUuid = await resolveEnvironmentUuidFromId(raw.environment_id, projectUuid, env);
}
if (!environmentUuid) {
  environmentUuid = findEnvironmentUuidInManifest(uuid); // lookup by resource uuid
}
```

### WR-02: `mergeManifests` can leave duplicate resource UUIDs after sync

**File:** `src/mcp/tools/manifest.ts:316-398`  
**Issue:** Remote-wins merge upserts each remote resource into remote project/environment but never removes stale copies of the same UUID from other local environments. If a resource moves between environments (or local nesting was wrong), sync updates the remote location while the old local copy remains. `hasUuid` still returns true; cache counts and agent reads can show duplicates until manual prune/clear.

**Fix:** Before applying remote resources, remove each remote resource UUID from all local environments (or rebuild resource lists from remote structure), then upsert remote entries:

```typescript
for (const uuid of remoteResourceUuids) {
  removeResourceFromManifest(merged, uuid);
}
// then upsert remote resources as today
```

### WR-03: `resolveProjectRoot` falls back to raw `cwd` when no markers found

**File:** `src/utils/project-root.ts:26`  
**Issue:** Plan 17-01 requires manifest path confinement to workspace root. When no `.git`, `package.json`, or `.coolify` exists above `startDir`, the function returns `resolve(startDir ?? process.cwd())`. Running MCP from an arbitrary subdirectory without repo markers writes `.coolify/manifest.json` relative to cwd, not the intended monorepo root.

**Fix:** Document requirement that agents run from project root, or walk until filesystem root and throw `COOLIFY_VALIDATION_ERROR` when no marker found (fail closed instead of silent cwd fallback).

### WR-04: Sync maps service domains from `fqdn` only

**File:** `src/mcp/tools/manifest.ts:149-157`  
**Issue:** `resourceToManifestEntry` sets `domains: resource.fqdn ? [resource.fqdn] : []`. Service create hooks use `urls[].url`. Multi-URL services synced from API lose extra domains in the manifest cache, causing drift until manual upsert.

**Fix:** Parse service `urls` array from API payload when present; fall back to `fqdn`.

## Info

### IN-01: Stale-manifest hint injection matches any UUID in error text

**File:** `src/utils/errors.ts:260-284`  
**Issue:** `injectStaleManifestHints` regex-scans the full error message/data for UUIDs and adds sync/diff hints when any match exists in the manifest. Unrelated UUIDs mentioned in a generic 404 body can trigger misleading recovery hints.

**Fix:** Prefer structured fields (`envelope.data.uuid`, request path segment) over global regex; dedupe hints if already present.

### IN-02: Circular module dependency `errors.ts` ↔ `manifest.ts`

**File:** `src/utils/errors.ts:2`, `src/utils/manifest.ts:12`  
**Issue:** `errors.ts` imports `ManifestManager`; `manifest.ts` imports `CoolifyApiError` from `errors.ts`. Works today because hint injection is runtime-only, but fragile during refactors or bundling.

**Fix:** Move `hasUuid` lookup behind a lazy dynamic import in `injectStaleManifestHints`, or extract manifest hint helper to a small `manifest-hints.ts` module.

### IN-03: Example template `_comment` field incompatible with strict manifest schema

**File:** `.coolify-manifest.example.json:2`, `src/utils/manifest.ts:47-55`  
**Issue:** Example includes `_comment`; `manifestSchema.strict()` rejects unknown keys. Copying the example verbatim into `.coolify/manifest.json` causes `ManifestManager.load()` validation failure.

**Fix:** Move comment to adjacent README snippet or strip `_comment` from the committed example.

---

_Reviewed: 2026-07-22T17:00:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
