---
phase: 23-openapi-coverage-npm-release
fixed_at: 2026-07-27T03:03:00Z
review_path: .planning/phases/23-openapi-coverage-npm-release/23-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-07-27T03:03:00Z
**Source review:** `.planning/phases/23-openapi-coverage-npm-release/23-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Committed `COVERAGE.md` freshness never asserted in test suite (D-06 no-op)

**Files modified:** `tests/openapi-coverage.test.ts`
**Commit:** 211de20
**Applied fix:** Added positive `assertCoverageFresh()` vitest case that byte-compares generator output to committed `docs/COVERAGE.md` (D-06). Existing stale temp-path negative case retained.

### WR-01: First OpenAPI-key override rebuckets whole multi-key action and swallows siblings

**Files modified:** `scripts/lib/openapi-coverage-join.mjs`
**Commit:** 5938831
**Applied fix:** Apply key overrides only when every mapped key shares the same override bucket; throw on conflicting/partial key overrides and require `action_overrides`. Status: `fixed: requires human verification` (logic change).

### WR-02: Non-object OpenAPI input throws opaque Scalar error

**Files modified:** `scripts/lib/openapi-coverage-parse.mjs`
**Commit:** 3d1247a
**Applied fix:** Parse + validate JSON is a non-array object before `dereference`; clear errors for `[]`, `null`, and invalid JSON.

### WR-03: Duplicate `coverage-map.yaml` action keys silently last-win

**Files modified:** `scripts/lib/openapi-coverage-join.mjs`
**Commit:** c5a5f26
**Applied fix:** Build `mapByAction` with explicit duplicate detection; throw `Duplicate coverage-map action: …`.

### IN-01: Unused `COVERAGE_PATH` after temp-dir drift fix

**Files modified:** `tests/openapi-coverage.test.ts`
**Commit:** 8523875
**Applied fix:** Removed unused `COVERAGE_PATH` constant.

### IN-02: Soft-skip on `execute_command` override row

**Files modified:** `tests/openapi-coverage.test.ts`
**Commit:** 8e387db
**Applied fix:** Hard `expect(executeRow, …).toBeTruthy()` then assert `out-of-scope`.

### IN-03: Client export guard only matches `function` declarations

**Files modified:** `docs/OPENAPI.md`
**Commit:** 1366d01
**Applied fix:** Documented coverage-test constraint: prefer `export function` / `export async function` in `client.ts`; `export const` / re-exports not detected.

---

_Fixed: 2026-07-27T03:03:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
