---
phase: 23-openapi-coverage-npm-release
plan: 03
subsystem: testing
tags: [vitest, npm-pack, publint, tarball, PUB-02, allowlist, D-13, D-14]

requires:
  - phase: 23-openapi-coverage-npm-release
    plan: 00
    provides: RED it.fails scaffolds with inline FORBIDDEN_PREFIXES + getPackPaths()
provides:
  - GREEN npm pack tarball allowlist gate via tests/npm-pack-allowlist.test.ts
  - Forbidden-prefix assertions for scripts/, tests/, .planning/, .github/, skills/, .cursor/, docs/coolify_openapi, docs/COVERAGE
  - Required-surface assertions for dist/, package.json, LICENSE, .env.example, README
affects: [23-04, ci, release]

tech-stack:
  added: []
  patterns:
    - "npm pack --dry-run --json as authoritative tarball gate (D-14; publint supplementary)"
    - "beforeAll build + execFileSync pack parse in Vitest"
    - "Inline assertForbiddenAbsent/assertAllowedPresent in test file"

key-files:
  created: []
  modified:
    - tests/npm-pack-allowlist.test.ts

key-decisions:
  - "Assertions inline in test file per Plan 23-03 — no scripts/lib/npm-pack-allowlist.mjs"
  - "package.json files array unchanged (dist, .env.example, LICENSE only)"

patterns-established:
  - "FORBIDDEN_PREFIXES regex array + getPackPaths() exported for reuse"
  - "Pack test ~1.8s; full suite 1096 passed with 2 new tests"

requirements-completed: [PUB-02]

coverage:
  - id: D1
    description: "npm pack tarball excludes forbidden maintainer/UAT/planning/OpenAPI paths (D-13)"
    requirement: PUB-02
    verification:
      - kind: unit
        ref: "tests/npm-pack-allowlist.test.ts#forbidden prefixes absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tarball includes dist/, package.json, LICENSE, .env.example, README; no .env secrets"
    requirement: PUB-02
    verification:
      - kind: unit
        ref: "tests/npm-pack-allowlist.test.ts#allowed dist/, package.json, LICENSE, README paths present"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pack allowlist gate wired into required CI via pnpm test (vitest default include)"
    requirement: PUB-02
    verification:
      - kind: unit
        ref: "pnpm test — 1096 passed, 54 files"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-27
status: complete
---

# Phase 23 Plan 03: npm Pack Allowlist Verification Summary

**npm pack --dry-run --json gate proves consumer tarball excludes UAT/planning/OpenAPI paths and includes dist/LICENSE/README (PUB-02, D-13/D-14)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-27T02:13:00Z
- **Completed:** 2026-07-27T02:16:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `tests/npm-pack-allowlist.test.ts` GREEN: 2 tests flip from Wave 0 `it.fails` to real assertions
- `FORBIDDEN_PREFIXES` covers scripts/, tests/, .planning/, .github/, skills/, .cursor/, docs/coolify_openapi*, docs/COVERAGE*
- Allowed surface: package.json, LICENSE, .env.example, dist/**, README.md|README.de.md; `.env` absent
- Full suite: 1096 passed (+2 vs pre-phase); pack test ~1.8s; no ci.yml change needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement npm pack allowlist test** - `1963e5a` (test)
2. **Task 2: Verify full test suite includes pack gate** - `12fde01` (test, allow-empty)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `tests/npm-pack-allowlist.test.ts` — GREEN PUB-02 gate; inline assert helpers; exported `getPackPaths` + `FORBIDDEN_PREFIXES`

## Decisions Made

- Inline assertions in test file (Plan 23-03) instead of separate `scripts/lib/npm-pack-allowlist.mjs` hinted in 23-00 SUMMARY
- `publint` retained in CI as supplementary check per D-14

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest 4.x rejects `-x` flag from plan verify command — ran `pnpm test tests/npm-pack-allowlist.test.ts` without `-x` (exit 0)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PUB-02 satisfied; Plan 23-04 (milestone release / changeset) can proceed
- Plan 23-01/23-02 remain independent (OpenAPI coverage generator)

## Self-Check: PASSED

- FOUND: tests/npm-pack-allowlist.test.ts
- FOUND: 1963e5a
- FOUND: 12fde01

---
*Phase: 23-openapi-coverage-npm-release*
*Completed: 2026-07-27*
