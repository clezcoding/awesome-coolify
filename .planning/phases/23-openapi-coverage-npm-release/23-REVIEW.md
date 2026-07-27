---
phase: 23-openapi-coverage-npm-release
reviewed: 2026-07-27T02:43:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - .changeset/v31-milestone-1-0-0.md
  - docs/COVERAGE.md
  - docs/OPENAPI.md
  - docs/coolify_openapi.json
  - docs/coverage-map.yaml
  - docs/coverage-overrides.yaml
  - scripts/lib/openapi-coverage-join.mjs
  - scripts/lib/openapi-coverage-parse.mjs
  - scripts/lib/openapi-coverage-render.mjs
  - scripts/openapi-coverage.mjs
  - tests/npm-pack-allowlist.test.ts
  - tests/openapi-coverage.test.ts
  - package.json
  - CONTRIBUTING.md
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-07-27T02:43:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 23 ships OpenAPI coverage generator (Scalar dereference → YAML join → `docs/COVERAGE.md`), npm pack allowlist gate, milestone major changeset, and trusted-publisher docs. Spec provenance is externalized correctly in `docs/OPENAPI.md` (`v4.1.2`; JSON `info.version` stays upstream `0.1`). Local exercise: 136 ops indexed, 115 catalog actions ↔ map rows, bucket counts match committed report (85/2/31/57), `--check` exit 0, `package.json` `files` allowlist is tight (`dist`, `.env.example`, `LICENSE`).

No critical/blocker defects. Six warnings: silent empty-index on bad OpenAPI input, incomplete pack forbidden-prefix regression, unknown-bucket summary undercount, disk-mutating drift test, catalog regex fragility, and map-only rows dropped when catalogs load. Three info items on test/guard brittleness and RESEARCH vs D-06 policy drift.

## Warnings

### WR-01: Silent empty operation index on bad/empty OpenAPI input

**File:** `scripts/lib/openapi-coverage-parse.mjs:15-38`
**Issue:** `indexOpenApiOperations` only throws when `errors?.length` is truthy. Scalar `dereference` can return `{ schema: falsy, errors: [] }` for garbage/empty inputs (`{}`, `null`, `{not`, `{"openapi":"3.0.0"}`), so the function returns `[]` with no error. Generator then classifies every mapped key as missing and rewrites a false all-gap `COVERAGE.md`. Vitest `>=136` catches this only when tests run — CLI regenerate path itself does not fail closed.
**Fix:** Fail closed after dereference:

```javascript
const { schema, errors } = await dereference(rawJson);
if (errors?.length) {
  throw new Error(`OpenAPI dereference failed: ${errors.length} errors`);
}
if (!schema?.paths || typeof schema.paths !== 'object') {
  throw new Error('OpenAPI dereference produced no paths — check docs/coolify_openapi.json');
}
```

Optionally also reject `operations.length === 0` after enumeration.

### WR-02: Pack allowlist gate omits sibling maintainer docs

**File:** `tests/npm-pack-allowlist.test.ts:5-14`
**Issue:** `FORBIDDEN_PREFIXES` blocks `docs/coolify_openapi*` and `docs/COVERAGE*` but not `docs/coverage-map.yaml`, `docs/coverage-overrides.yaml`, or `docs/OPENAPI.md`. Current `package.json` `files` (`dist`, `.env.example`, `LICENSE`) keeps them out — widening `files` to include `docs` would ship maintainer artifacts without failing PUB-02 / D-13.
**Fix:**

```typescript
export const FORBIDDEN_PREFIXES = [
  // ...existing...
  /^docs\/coverage-map/,
  /^docs\/coverage-overrides/,
  /^docs\/OPENAPI/,
] as const;
```

### WR-03: Summary counts silently drop unknown bucket values

**File:** `scripts/lib/openapi-coverage-render.mjs:17-19`
**Issue:** `if (row.bucket in counts)` skips typos / unexpected override buckets. Actions table still lists the row; Summary undercounts. `--check` only byte-compares markdown, so a typo that appears in both generated+committed files stays green with a lying summary (reproduced: `typo-bucket` → all summary counts 0).
**Fix:** Validate in `classifyRows` (or render):

```javascript
const ALLOWED = new Set(['covered', 'deferred', 'out-of-scope', 'gap']);
if (!ALLOWED.has(row.bucket)) {
  throw new Error(`Invalid bucket "${row.bucket}" for ${row.action}`);
}
```

### WR-04: Drift test mutates committed `docs/COVERAGE.md` on disk

**File:** `tests/openapi-coverage.test.ts:165-175`
**Issue:** Stale-check test writes `<!-- stale -->` into the real committed file and restores in `finally`. Vitest 4 default pool/file parallelism means another worker (or SIGKILL/OOM mid-test) can observe or leave a corrupted artifact. D-06 gate itself is sound; the test harness is fragile.
**Fix:** Inject paths / fs for `assertCoverageFresh`, or write stale content only under `os.tmpdir()` and compare against a fixture string — never mutate `docs/COVERAGE.md` in CI.

### WR-05: Catalog string parser truncates / mangles on edge catalog shapes

**File:** `scripts/lib/openapi-coverage-join.mjs:11-19,35-44`
**Issue:** (1) Export capture `([\s\S]*?);` stops at first `;`. (2) Param strip `\([^)]*\)` is non-nested — `parseCatalogActions('Actions: foo(a, b(c)?) · bar()')` yields `['foo?)', 'bar']`. Concat-quoted extraction covers current `application`/`database` catalogs, and map-completeness tests catch total drops, but a future nested/`;`-bearing catalog would silently mis-inventory actions.
**Fix:** Prefer TS AST (upgrade path already noted in `docs/OPENAPI.md`) or match only string-literal concatenations ending at the statement’s final `';` / `"` before `;`.

### WR-06: Map rows absent from catalogs are dropped; OpenAPI keys become orphan gaps

**File:** `scripts/lib/openapi-coverage-join.mjs:88-97,104-148`
**Issue:** When `catalogs` is non-empty (production CLI path), action inventory is catalog-only. A `coverage-map.yaml` row whose `action` is mistyped / not in any `*ActionsCatalog` is ignored; its `openapi` keys are never added to `linkedOpenApiKeys`, so they reappear as `OpenAPI operation has no MCP action mapping` gaps. Completeness test only asserts catalog ⊆ map, not map ⊆ catalog, so this mis-join is silent.
**Fix:** After building `actionNames` from catalogs, warn/throw on map actions not in `actionNames`, or union map actions into the inventory and flag catalog misses separately.

## Info

### IN-01: Client export guard only matches `function` declarations

**File:** `tests/openapi-coverage.test.ts:114-118`
**Issue:** Regex `^export (?:async )?function (\w+)` plus hard-coded `bulkUpdateEnvs` alias. Current `client.ts` matches; `export const` / `export { … }` would false-fail.
**Fix:** Document constraint in `docs/OPENAPI.md`, or enumerate exports via TS compiler API.

### IN-02: Soft-skip on `execute_command` override row

**File:** `tests/openapi-coverage.test.ts:157-160`
**Issue:** `if (executeRow) { expect… }` — deleting the `execute_command` override still leaves the test green. SVC-04 log deferral is asserted harder; execute_command is optional.
**Fix:** `expect(executeRow, 'execute_command override required').toBeTruthy()` then assert bucket.

### IN-03: RESEARCH “gap fails `--check`” not implemented (policy drift)

**File:** `scripts/openapi-coverage.mjs:70-84` (vs `.planning/.../23-RESEARCH.md` resolved decision)
**Issue:** RESEARCH said un-overridden `gap` fails `--check`. Shipped `--check` / `assertCoverageFresh` only byte-compare `COVERAGE.md` (D-06). Report currently has 57 intentional backlog `gap` rows; failing on any gap would keep CI red unless all gaps become overrides — conflicting with gap-as-backlog. Plans/CONTEXT enforce drift only.
**Fix:** Update RESEARCH to match D-06 drift-only policy, or add an explicit separate `--strict-gaps` opt-in — do not conflate with `--check`.

---

_Reviewed: 2026-07-27T02:43:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
