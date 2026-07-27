---
phase: 23-openapi-coverage-npm-release
plan: 02
subsystem: testing
tags: [openapi, coverage-map, v4.1.2, provenance, vitest, drift-check]

requires:
  - phase: 23-01
    provides: OpenAPI coverage generator CLI, parse/join/render lib modules, tracer tests
provides:
  - Coolify OpenAPI v4.1.2 pinned specs with docs/OPENAPI.md provenance
  - Full 115-action coverage-map.yaml with client + OpenAPI joins
  - Seeded coverage-overrides.yaml for SVC-04, execute_command, orchestration tools
  - Regenerated docs/COVERAGE.md with four-bucket summary (85 covered / 57 gap)
  - Vitest map completeness guards (catalog, openapi keys, client exports)
affects: [23-04]

tech-stack:
  added: []
  patterns:
    - "Concat-aware *ActionsCatalog parser for multi-segment string literals"
    - "115-row manual coverage-map.yaml join layer over 136 OpenAPI ops"
    - "action_overrides for orchestration/non-REST MCP tools per D-05"

key-files:
  created:
    - docs/OPENAPI.md
  modified:
    - docs/coolify_openapi.json
    - docs/coverage-map.yaml
    - docs/coverage-overrides.yaml
    - docs/COVERAGE.md
    - scripts/lib/openapi-coverage-join.mjs
    - tests/openapi-coverage.test.ts

key-decisions:
  - "manifest.sync/diff stay out-of-scope despite ancillary REST reads — primary surface is local manifest file"
  - "57 OpenAPI gap rows retained as honest backlog — no new MCP tools in this phase"

patterns-established:
  - "loadActionsCatalogs regex captures full concatenated catalog strings before · split"
  - "Map validation trio: catalog parity, openapi key existence, client export existence"

requirements-completed: [OAPI-01, OAPI-02]

coverage:
  - id: D1
    description: "OpenAPI spec pinned to Coolify v4.1.2 with provenance doc"
    requirement: OAPI-01
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#returns >=136 operations"
        status: pass
      - kind: other
        ref: "rg v4.1.2 docs/OPENAPI.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full 115-action coverage-map with overrides and four-bucket report"
    requirement: OAPI-02
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#lists every *ActionsCatalog action"
        status: pass
      - kind: other
        ref: "pnpm run openapi:coverage -- --check"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-27
status: complete
---

# Phase 23 Plan 02: Full Coverage Map + v4.1.2 Pin Summary

**115-action coverage map over pinned Coolify v4.1.2 spec with OPENAPI.md provenance and vitest completeness guards**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-27T02:21:00Z
- **Completed:** 2026-07-27T02:27:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Refreshed `docs/coolify_openapi.json` from Coolify tag v4.1.2 (136 dereferenced operations)
- Created `docs/OPENAPI.md` with upstream URL, fetch date, refresh procedure, maintenance notes
- Expanded `docs/coverage-map.yaml` from 6 tracer rows to 115 full MCP catalog actions
- Seeded `docs/coverage-overrides.yaml` with 29 action_overrides + SVC-04 deferred keys
- Fixed `loadActionsCatalogs` concat-aware parser for application/database multi-segment catalogs
- Regenerated `docs/COVERAGE.md` — 85 covered, 2 deferred, 31 out-of-scope, 57 gap
- Added 4 vitest map completeness tests (catalog parity, openapi keys, client exports, override merge)

## Task Commits

1. **Task 1: Pin OpenAPI v4.1.2 + write OPENAPI.md provenance** — `a6cfcc6` (feat)
2. **Task 2: Complete coverage-map.yaml + seed overrides** — `7e2eccb` (feat)
3. **Task 3: Regenerate full COVERAGE.md + flip remaining tests GREEN** — `ed6396b` (feat)

## Files Created/Modified

- `docs/OPENAPI.md` — provenance doc: upstream URL, pin tag, fetch date, refresh steps
- `docs/coolify_openapi.json` — refreshed from v4.1.2 (yaml unchanged — already matched)
- `docs/coverage-map.yaml` — 115 action→client→openapi join rows
- `docs/coverage-overrides.yaml` — deferred SVC-04 logs, execute_command, 29 orchestration out-of-scope rows
- `docs/COVERAGE.md` — full regenerated four-bucket gap report
- `scripts/lib/openapi-coverage-join.mjs` — concat-aware catalog parser fix
- `tests/openapi-coverage.test.ts` — 7 tests (3 tracer + 4 map completeness)

## Decisions Made

- manifest.sync/diff classified out-of-scope per D-05 even though handlers call REST reads (primary surface is local file)
- 57 OpenAPI-only gap rows left as honest backlog — closing them requires future MCP tool work, out of phase scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] loadActionsCatalogs truncated concatenated catalogs**
- **Found during:** Task 2 (catalog count 89 vs 115)
- **Issue:** Regex captured only first string segment of `'...' + '...'` catalogs in application.ts/database.ts
- **Fix:** Match full export const body, extract all quoted segments, join before parse
- **Files modified:** `scripts/lib/openapi-coverage-join.mjs`
- **Committed in:** `7e2eccb`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for 115-action map completeness. No scope creep.

## Issues Encountered

None beyond the catalog parser fix above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 23-04 can add milestone Changeset for npm 1.0.0 release
- 57 gap rows document honest OpenAPI backlog for future phases

## Self-Check: PASSED

- FOUND: docs/OPENAPI.md
- FOUND: docs/coverage-map.yaml
- FOUND: docs/COVERAGE.md
- FOUND: commit a6cfcc6
- FOUND: commit 7e2eccb
- FOUND: commit ed6396b

---
*Phase: 23-openapi-coverage-npm-release*
*Completed: 2026-07-27*
