---
phase: 23-openapi-coverage-npm-release
reviewed: 2026-07-27T02:59:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - .changeset/v31-milestone-1-0-0.md
  - CONTRIBUTING.md
  - docs/COVERAGE.md
  - docs/OPENAPI.md
  - docs/coolify_openapi.json
  - docs/coverage-map.yaml
  - docs/coverage-overrides.yaml
  - package.json
  - scripts/lib/openapi-coverage-join.mjs
  - scripts/lib/openapi-coverage-parse.mjs
  - scripts/lib/openapi-coverage-render.mjs
  - scripts/openapi-coverage.mjs
  - tests/npm-pack-allowlist.test.ts
  - tests/openapi-coverage.test.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-07-27T02:59:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Re-review after iteration-1 fixes (WR-01…WR-06 in prior `23-REVIEW-FIX.md`). Parse fail-closed, bucket validation, pack forbidden prefixes, nested catalog strip, map⊆catalog throw, and temp-dir drift test harness are in place. Local exercise: 136 ops, 115↔115 catalog/map parity, committed `COVERAGE.md` byte-fresh, buckets 85/2/31/57, `files` allowlist ships only `dist` + `.env.example` + `LICENSE` (+ npm auto README/package.json).

One critical gap remains: **D-06 drift is not enforced by `pnpm test`**. Appending noise to `docs/COVERAGE.md` still leaves all seven `openapi-coverage` tests green. Three warnings on join/parse edge behavior; three info items.

## Critical Issues

### CR-01: Committed `COVERAGE.md` freshness never asserted in test suite (D-06 no-op)

**File:** `tests/openapi-coverage.test.ts:165-178` (also `package.json:16,25`)
**Issue:** `assertCoverageFresh` is only exercised against a deliberately stale temp file. No test calls `assertCoverageFresh()` (default path) or otherwise byte-compares generator output to committed `docs/COVERAGE.md`. `package.json` `"test": "vitest run"` does not invoke `openapi:coverage -- --check`. Empirically: mutate `docs/COVERAGE.md` → `vitest run tests/openapi-coverage.test.ts` → 7/7 pass. Map/catalog/OpenAPI guards still pass while the committed gap report rots — D-06 / Plan 23-02 (“`--check` drift via vitest”) unmet. CI (`pnpm test` only) inherits the hole.
**Fix:**

```typescript
describe('assertCoverageFresh', () => {
  it('passes when committed docs/COVERAGE.md matches generator (D-06)', async () => {
    const { assertCoverageFresh } = await import('../scripts/openapi-coverage.mjs');
    await expect(assertCoverageFresh()).resolves.toBeUndefined();
  });

  it('throws when docs/COVERAGE.md is stale (D-06)', async () => {
    // existing temp-path negative case…
  });
});
```

Optional belt-and-suspenders: add `"test:coverage-check": "node scripts/openapi-coverage.mjs --check"` and invoke from CI — positive vitest assertion alone satisfies D-06 through the required Lint, Test & Build job.

## Warnings

### WR-01: First OpenAPI-key override rebuckets whole multi-key action and swallows siblings

**File:** `scripts/lib/openapi-coverage-join.mjs:158-175`
**Issue:** For an action with `openapi: [A, B]`, `.map(…).find(Boolean)` applies the first key override to the entire action. All keys are then added to `linkedOpenApiKeys`, so sibling `B` never appears as its own covered/gap/deferred row. Reproduced: override `GET /a` → `deferred` makes `tool.multi` deferred and drops any standalone row for `GET /b`.
**Fix:** Prefer per-key rows when keys disagree, or only apply key overrides when every mapped key shares the same override bucket; otherwise classify by majority / require an `action_overrides` entry for the action.

```javascript
const overridesForKeys = openapiKeys.map((key) => byOpenApiKey.get(key)).filter(Boolean);
const uniqueBuckets = new Set(overridesForKeys.map((o) => o.bucket));
if (overridesForKeys.length && uniqueBuckets.size === 1 && overridesForKeys.length === openapiKeys.length) {
  bucket = overridesForKeys[0].bucket;
  reason = overridesForKeys[0].reason;
} else if (overridesForKeys.length) {
  throw new Error(
    `Conflicting/partial OpenAPI overrides for ${action}: use action_overrides`,
  );
}
```

### WR-02: Non-object OpenAPI input throws opaque Scalar error

**File:** `scripts/lib/openapi-coverage-parse.mjs:15-23`
**Issue:** Fail-closed paths/`paths` checks cover `{}`, `null`, truncated JSON, and `{openapi}` without paths. Input `[]` still throws `Cannot read properties of undefined (reading 'specification')` from `@scalar/openapi-parser` before those guards — CLI `--check` / regenerate surfaces a cryptic stack instead of the project’s clear message.
**Fix:** Validate JSON shape before dereference:

```javascript
let parsed;
try {
  parsed = JSON.parse(rawJson);
} catch {
  throw new Error('OpenAPI JSON parse failed — check docs/coolify_openapi.json');
}
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  throw new Error('OpenAPI document must be a non-array object');
}
const { schema, errors } = await dereference(rawJson);
```

### WR-03: Duplicate `coverage-map.yaml` action keys silently last-win

**File:** `scripts/lib/openapi-coverage-join.mjs:102-103`
**Issue:** `new Map(map.map((entry) => [entry.action, entry]))` overwrites duplicates. A mistyped second row for the same `action` drops the first client/openapi mapping with no error; catalog completeness still passes (same action name once in the set).
**Fix:**

```javascript
const mapByAction = new Map();
for (const entry of map) {
  if (mapByAction.has(entry.action)) {
    throw new Error(`Duplicate coverage-map action: ${entry.action}`);
  }
  mapByAction.set(entry.action, entry);
}
```

## Info

### IN-01: Unused `COVERAGE_PATH` after temp-dir drift fix

**File:** `tests/openapi-coverage.test.ts:10`
**Issue:** Constant remains after WR-04 stopped mutating the committed file; dead binding.
**Fix:** Remove it, or reuse in the positive `assertCoverageFresh()` test from CR-01.

### IN-02: Soft-skip on `execute_command` override row

**File:** `tests/openapi-coverage.test.ts:158-161`
**Issue:** `if (executeRow) { expect… }` — deleting the override still leaves the test green. SVC-04 log deferral is asserted harder.
**Fix:** `expect(executeRow, 'execute_command override required').toBeTruthy()` then assert `out-of-scope`.

### IN-03: Client export guard only matches `function` declarations

**File:** `tests/openapi-coverage.test.ts:114-119`
**Issue:** Regex `^export (?:async )?function (\w+)` plus hard-coded `bulkUpdateEnvs` alias. Current `client.ts` matches; `export const` / `export { … }` would false-fail.
**Fix:** Document constraint in `docs/OPENAPI.md`, or enumerate exports via TS compiler API.

---

_Reviewed: 2026-07-27T02:59:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
