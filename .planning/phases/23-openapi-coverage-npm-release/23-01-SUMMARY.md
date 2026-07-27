---
phase: 23-openapi-coverage-npm-release
plan: 01
subsystem: testing
tags: [openapi, scalar, coverage-map, vitest, maintainer-scripts, drift-check]

requires:
  - phase: 23-00
    provides: Wave 0 RED scaffolds for parse/join/drift tests
provides:
  - OpenAPI coverage CLI (generate + --check) with Scalar dereference
  - parse/join/render lib modules and tracer coverage-map/overrides YAML
  - Committed docs/COVERAGE.md with four-bucket classification
  - GREEN tracer unit tests (136 ops, classifyRows, assertCoverageFresh)
affects: [23-02]

tech-stack:
  added: ["@scalar/openapi-parser@0.28.10", "@scalar/openapi-types@0.9.3"]
  patterns:
    - "ESM maintainer scripts: openapi-coverage.mjs + scripts/lib/*.mjs pure exports"
    - "Byte-compare drift gate via --check and assertCoverageFresh()"
    - "Tracer coverage-map.yaml (~6 actions) before full expansion in 23-02"

key-files:
  created:
    - scripts/openapi-coverage.mjs
    - scripts/lib/openapi-coverage-parse.mjs
    - scripts/lib/openapi-coverage-join.mjs
    - scripts/lib/openapi-coverage-render.mjs
    - docs/coverage-map.yaml
    - docs/coverage-overrides.yaml
    - docs/COVERAGE.md
  modified:
    - package.json
    - pnpm-lock.yaml
    - tests/openapi-coverage.test.ts

key-decisions:
  - "Static COVERAGE.md footer (no ISO timestamp) — byte-compare drift gate must be deterministic"
  - "Scalar dereference on committed docs/coolify_openapi.json — no hand-rolled $ref walker"
  - "Tracer map seeds 6 actions; full ~115-action map deferred to Plan 23-02"

patterns-established:
  - "indexOpenApiOperations → classifyRows → renderCoverageMarkdown pipeline"
  - "coverage-overrides.yaml merges openapi key + action_overrides into four buckets"

requirements-completed: [OAPI-01, OAPI-02]

coverage:
  - id: D1
    description: "OpenAPI operation index via Scalar dereference (>=136 ops)"
    requirement: OAPI-01
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#returns >=136 operations"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four-bucket classifyRows (covered/deferred/out-of-scope/gap)"
    requirement: OAPI-02
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#assigns covered, deferred"
        status: pass
    human_judgment: false
  - id: D3
    description: "Committed COVERAGE.md drift gate (--check + assertCoverageFresh)"
    requirement: OAPI-02
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#throws when docs/COVERAGE.md is stale"
        status: pass
      - kind: other
        ref: "pnpm run openapi:coverage -- --check"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-27
status: complete
---

# Phase 23 Plan 01: OpenAPI Coverage Tracer Generator Summary

**Scalar-backed coverage generator with tracer YAML join, committed docs/COVERAGE.md, and --check drift gate**

## Performance

- **Duration:** 4 min (tasks 2–3; task 1 human-verify pre-approved)
- **Started:** 2026-07-27T02:18:00Z
- **Completed:** 2026-07-27T02:22:00Z
- **Tasks:** 3 (1 checkpoint + 2 implementation)
- **Files modified:** 10

## Accomplishments

- Installed `@scalar/openapi-parser` / `@scalar/openapi-types` after human-approved legitimacy gate
- Implemented `pnpm run openapi:coverage` CLI with parse/join/render lib modules
- Seeded tracer `coverage-map.yaml` (6 actions) and `coverage-overrides.yaml` with deferred/out-of-scope rows
- Committed initial `docs/COVERAGE.md` (136 OpenAPI ops indexed, catalog actions classified)
- Flipped Wave 0 tracer tests GREEN (op count, four buckets, stale COVERAGE detection)

## Task Commits

1. **Task 1: Verify @scalar/openapi-parser legitimacy** — checkpoint (human approved; no commit)
2. **Task 2: End-to-end OpenAPI coverage tracer** — `562c922` (feat)
3. **Task 3: Flip Wave 0 tracer tests GREEN** — `6817f19` (test)

## Files Created/Modified

- `scripts/openapi-coverage.mjs` — CLI entry: generate or `--check` drift mode
- `scripts/lib/openapi-coverage-parse.mjs` — `indexOpenApiOperations` via Scalar `dereference()`
- `scripts/lib/openapi-coverage-join.mjs` — `classifyRows` + `loadActionsCatalogs`
- `scripts/lib/openapi-coverage-render.mjs` — markdown table renderer
- `docs/coverage-map.yaml` — tracer action→client→openapi join (6 rows)
- `docs/coverage-overrides.yaml` — deferred/out-of-scope seeds
- `docs/COVERAGE.md` — committed generated report
- `tests/openapi-coverage.test.ts` — 3 GREEN tracer tests

## Decisions Made

- Static footer in COVERAGE.md (no per-run ISO timestamp) so `--check` byte-compare stays deterministic
- Catalog-driven row inventory from `src/mcp/tools/*.ts` *ActionsCatalog literals; map YAML supplies join layer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed volatile timestamp from COVERAGE.md footer**
- **Found during:** Task 2 (first `--check` run)
- **Issue:** `_Generated at ISO8601_` changed every run — byte-compare always reported stale
- **Fix:** Static footer `_Generated by pnpm run openapi:coverage._`
- **Files modified:** `scripts/lib/openapi-coverage-render.mjs`, `docs/COVERAGE.md`
- **Committed in:** `562c922`

**2. [Rule 3 - Blocking] Flipped tests on disk before Task 2 commit**
- **Found during:** Task 2 commit (husky pre-commit)
- **Issue:** `it.fails` scaffolds error when implementation makes tests pass (`Expect test to fail`)
- **Fix:** Updated `tests/openapi-coverage.test.ts` to bare `it` before staging generator; committed tests separately as Task 3
- **Files modified:** `tests/openapi-coverage.test.ts`
- **Committed in:** `6817f19`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both required for correct drift gate and hook compliance. No scope creep.

## Issues Encountered

None beyond deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 23-02 can expand `coverage-map.yaml` to full ~115-action inventory
- Generator architecture proven on tracer slice; `--check` and vitest drift gate operational

## Self-Check: PASSED

- FOUND: scripts/openapi-coverage.mjs
- FOUND: docs/COVERAGE.md
- FOUND: tests/openapi-coverage.test.ts
- FOUND: commit 562c922
- FOUND: commit 6817f19

---
*Phase: 23-openapi-coverage-npm-release*
*Completed: 2026-07-27*
