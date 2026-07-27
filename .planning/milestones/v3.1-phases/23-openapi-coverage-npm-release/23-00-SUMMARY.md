---
phase: 23-openapi-coverage-npm-release
plan: 00
subsystem: testing
tags: [vitest, tdd, wave-0, red-scaffold, openapi-coverage, npm-pack, it.fails]

requires: []
provides:
  - 5 it.fails RED scaffolds for OpenAPI coverage parse/join/drift and npm pack allowlist
  - Dynamic import pattern for scripts/lib/*.mjs modules absent until Plans 23-01..23-03
affects: [23-01, 23-02, 23-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED via vitest it.fails + dynamic import('../scripts/lib/*.mjs')"
    - "openapi-coverage.test.ts: indexOpenApiOperations, classifyRows, assertCoverageFresh scaffolds"
    - "npm-pack-allowlist.test.ts: inline FORBIDDEN_PREFIXES + getPackPaths(); validation lib in 23-03"

key-files:
  created:
    - tests/openapi-coverage.test.ts
    - tests/npm-pack-allowlist.test.ts
  modified: []

key-decisions:
  - "it.fails statt bare it — husky pre-commit bleibt grün bis 23-01..23-03 flip GREEN"
  - "npm-pack it.fails importiert assertForbiddenAbsent/assertAllowedPresent aus zukünftiger lib — live pack bereits clean"
  - "Keine Produktions-Skripte (openapi-coverage.mjs, COVERAGE.md) in Wave 0 — nur Test-Scaffolds"

patterns-established:
  - "openapi-coverage.test.ts: 3 it.fails (op count >=136, four D-04 buckets, COVERAGE drift)"
  - "npm-pack-allowlist.test.ts: 2 it.fails (forbidden prefixes, allowed dist/LICENSE/README surface)"

requirements-completed: [OAPI-01, OAPI-02, PUB-02]

coverage:
  - id: D1
    description: "openapi-coverage RED scaffolds (indexOpenApiOperations, classifyRows, assertCoverageFresh)"
    requirement: OAPI-01
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts — 3 it.fails expected-fail"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four-bucket classification fixture intent (covered/deferred/out-of-scope/gap)"
    requirement: OAPI-02
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts — classifyRows it.fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "npm pack allowlist RED scaffolds (forbidden prefixes + allowed surface)"
    requirement: PUB-02
    verification:
      - kind: unit
        ref: "tests/npm-pack-allowlist.test.ts — 2 it.fails expected-fail"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-27
status: complete
---

# Phase 23 Plan 00: Wave 0 RED Scaffolds Summary

**5 it.fails RED tests lock OpenAPI coverage parse/join/drift and npm pack allowlist intent before Plans 23-01..23-03 implement generators**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-27T02:09:40Z
- **Completed:** 2026-07-27T02:11:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `tests/openapi-coverage.test.ts` — 3 `it.fails` scaffolds: `indexOpenApiOperations` (≥136 ops), `classifyRows` (four D-04 buckets), `assertCoverageFresh` (stale/missing COVERAGE.md)
- `tests/npm-pack-allowlist.test.ts` — 2 `it.fails` scaffolds: forbidden-prefix gate + allowed `dist/`/`LICENSE`/`package.json` surface; inline `FORBIDDEN_PREFIXES` + `getPackPaths()`
- Full suite green via `it.fails` negation (5 expected fail); no production generator scripts or `docs/COVERAGE.md` created

## Task Commits

Each task was committed atomically:

1. **Task 1: openapi-coverage.test.ts RED scaffolds** - `bb47f8b` (test)
2. **Task 2: npm-pack-allowlist.test.ts RED scaffolds** - `125e840` (test)

## Files Created/Modified

- `tests/openapi-coverage.test.ts` — RED scaffolds for OAPI-01/OAPI-02; dynamic import parse/join/CLI modules
- `tests/npm-pack-allowlist.test.ts` — RED scaffolds for PUB-02/D-13; `execFileSync` npm pack JSON parse

## Decisions Made

- `it.fails` + dynamic import keeps husky green while modules absent (mirrors Phase 22 Wave 0)
- npm-pack validation deferred to `scripts/lib/npm-pack-allowlist.mjs` in Plan 23-03; scaffold exports inline helpers for reuse

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 23-01 can implement `scripts/lib/openapi-coverage-parse.mjs`, `openapi-coverage-join.mjs`, and flip openapi-coverage `it.fails` → bare `it`
- Plan 23-03 implements npm-pack allowlist lib and flips pack `it.fails` → bare `it`

## Self-Check: PASSED

- FOUND: tests/openapi-coverage.test.ts
- FOUND: tests/npm-pack-allowlist.test.ts
- FOUND: bb47f8b
- FOUND: 125e840

---
*Phase: 23-openapi-coverage-npm-release*
*Completed: 2026-07-27*
