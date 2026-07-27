---
phase: 23-openapi-coverage-npm-release
fixed_at: 2026-07-27T02:46:00Z
review_path: .planning/phases/23-openapi-coverage-npm-release/23-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-07-27T02:46:00Z
**Source review:** `.planning/phases/23-openapi-coverage-npm-release/23-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: Silent empty operation index on bad/empty OpenAPI input

**Files modified:** `scripts/lib/openapi-coverage-parse.mjs`
**Commit:** `01b28c9`
**Applied fix:** Fail closed when dereference yields no `paths` or zero HTTP operations after enumeration.

### WR-02: Pack allowlist gate omits sibling maintainer docs

**Files modified:** `tests/npm-pack-allowlist.test.ts`
**Commit:** `5b22eae`
**Applied fix:** Extended `FORBIDDEN_PREFIXES` with `coverage-map`, `coverage-overrides`, and `OPENAPI` doc patterns.

### WR-03: Summary counts silently drop unknown bucket values

**Files modified:** `scripts/lib/openapi-coverage-render.mjs`
**Commit:** `4ba37dc`
**Applied fix:** Throw on unknown bucket values during summary aggregation instead of silently skipping.

### WR-04: Drift test mutates committed `docs/COVERAGE.md` on disk

**Files modified:** `scripts/openapi-coverage.mjs`, `tests/openapi-coverage.test.ts`
**Commit:** `685b669`
**Applied fix:** Added optional `coveragePath` to `assertCoverageFresh`; stale-check test writes to temp dir only.

### WR-05: Catalog string parser truncates / mangles on edge catalog shapes

**Files modified:** `scripts/lib/openapi-coverage-join.mjs`
**Commit:** `7586238`
**Applied fix:** Nested-paren `stripCallParams` and concat-literal catalog regex ending at statement semicolon.

### WR-06: Map rows absent from catalogs are dropped; OpenAPI keys become orphan gaps

**Files modified:** `scripts/lib/openapi-coverage-join.mjs`
**Commit:** `7a314da`
**Applied fix:** Throw when `coverage-map.yaml` actions are missing from loaded `*ActionsCatalog` inventories.

---

_Fixed: 2026-07-27T02:46:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
