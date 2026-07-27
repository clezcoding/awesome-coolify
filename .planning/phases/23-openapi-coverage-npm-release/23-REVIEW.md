---
phase: 23-openapi-coverage-npm-release
reviewed: 2026-07-27T02:40:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - scripts/openapi-coverage.mjs
  - scripts/lib/openapi-coverage-parse.mjs
  - scripts/lib/openapi-coverage-join.mjs
  - scripts/lib/openapi-coverage-render.mjs
  - docs/coverage-map.yaml
  - docs/coverage-overrides.yaml
  - docs/COVERAGE.md
  - docs/OPENAPI.md
  - tests/openapi-coverage.test.ts
  - tests/npm-pack-allowlist.test.ts
  - .changeset/v31-milestone-1-0-0.md
  - CONTRIBUTING.md
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-07-27T02:40:00Z  
**Depth:** standard  
**Files Reviewed:** 12  
**Status:** issues_found

## Summary

Phase 23 adds an OpenAPI coverage generator (Scalar dereference → YAML join → committed `docs/COVERAGE.md`), npm pack allowlist tests, and a milestone 1.0.0 changeset. The pipeline was exercised locally: 136 operations indexed, 115 catalog actions mapped, generated markdown byte-matches committed `COVERAGE.md`, and all 9 phase tests pass.

No blockers found. Four warnings target regression guards and test robustness; two info items note brittle detection patterns. Core classification logic, drift gate, and tarball exclusions behave correctly for the current `package.json` `files` allowlist.

## Warnings

### WR-01: npm pack forbidden-prefix list omits sibling maintainer docs

**File:** `tests/npm-pack-allowlist.test.ts:5-14`  
**Issue:** `FORBIDDEN_PREFIXES` blocks `docs/coolify_openapi*` and `docs/COVERAGE*` but not `docs/coverage-map.yaml`, `docs/coverage-overrides.yaml`, or `docs/OPENAPI.md`. Today's `package.json` `files` array (`dist`, `.env.example`, `LICENSE`) excludes them, so the tarball is clean now — but adding `"docs"` or broadening `files` would ship maintainer artifacts without failing this gate (PUB-02 / D-13 regression).  
**Fix:** Extend forbidden prefixes:

```typescript
export const FORBIDDEN_PREFIXES = [
  // ...existing...
  /^docs\/coverage-map/,
  /^docs\/coverage-overrides/,
  /^docs\/OPENAPI/,
] as const;
```

### WR-02: Summary counts silently ignore unknown bucket values

**File:** `scripts/lib/openapi-coverage-render.mjs:17-19`  
**Issue:** `if (row.bucket in counts)` skips typos or new bucket names in YAML/overrides. Rows still appear in the Actions table, but the Summary table undercounts — a silent drift between summary and body that `--check` would not catch if totals stay accidentally stable.  
**Fix:** Validate bucket enum in `classifyRows` or accumulate unknown buckets explicitly:

```javascript
const ALLOWED = new Set(['covered', 'deferred', 'out-of-scope', 'gap']);
for (const row of rows) {
  if (!ALLOWED.has(row.bucket)) {
    throw new Error(`Invalid bucket "${row.bucket}" for action ${row.action}`);
  }
  counts[row.bucket] += 1;
}
```

### WR-03: Drift test mutates committed `docs/COVERAGE.md` on disk

**File:** `tests/openapi-coverage.test.ts:165-175`  
**Issue:** `assertCoverageFresh` test writes a stale suffix to the real `docs/COVERAGE.md`. The `finally` block restores content on normal failure, but SIGKILL, OOM, or a parallel worker reading the file mid-mutation could leave a corrupted committed artifact or flaky CI.  
**Fix:** Mock `readFileSync`/`writeFileSync` for `OUTPUT_PATH`, or copy COVERAGE.md to a temp path and point the module at it via dependency injection / env override.

### WR-04: Catalog parser truncates at first semicolon in export body

**File:** `scripts/lib/openapi-coverage-join.mjs:35-37`  
**Issue:** The regex `export const \w+ActionsCatalog\s*=\s*([\s\S]*?);` is non-greedy and stops at the first `;`. Concat-aware quoted-string extraction fixes `+`-joined catalogs today, but a future catalog containing `;` inside the export RHS (e.g. nested expression) would truncate parsing and drop actions — caught only if map-completeness tests fail.  
**Fix:** Parse with a TypeScript AST (same upgrade path noted in `docs/OPENAPI.md`) or anchor the match to the closing `';` / `";` of the catalog literal.

## Info

### IN-01: Client export guard only matches function declarations

**File:** `tests/openapi-coverage.test.ts:114-115`  
**Issue:** Export detection uses `^export (?:async )?function (\w+)`. Current `src/api/client.ts` uses function exports exclusively, but `const`/`export { re-export }` patterns would false-fail the guard.  
**Fix:** Document the constraint in `docs/OPENAPI.md`, or switch to `grep`/TS compiler API for exports.

### IN-02: Redundant `.env` assertions in pack allowlist test

**File:** `tests/npm-pack-allowlist.test.ts:29-30`  
**Issue:** Both `not.toBe(".env")` and `not.toMatch(/^\.env$/)` assert the same condition. Harmless duplication.  
**Fix:** Keep one assertion.

---

_Reviewed: 2026-07-27T02:40:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
