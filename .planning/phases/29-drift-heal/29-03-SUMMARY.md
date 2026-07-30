---
phase: 29-drift-heal
plan: 03
subsystem: docs
tags: [capabilities, coverage-map, README, manifest_audit, envs_promote, DRIFT-01, DRIFT-02, DRIFT-03]

requires:
  - phase: 29-01
    provides: manifest.audit handler and tests
  - phase: 29-02
    provides: application.envs:promote handler and tests
provides:
  - manifest_audit and envs_promote capability keys on system.version
  - coverage-map rows for manifest.audit and application.envs:promote
  - bilingual README EN/DE drift-heal discoverability and safety docs
  - regenerated docs/COVERAGE.md
affects:
  - 30-deploy-guard

tech-stack:
  added: []
  patterns:
    - "Capability keys describe MCP composites over existing reads/env CRUD — not Coolify-native REST endpoints"
    - "README documents env.promote product name with application.envs:promote implementation action"

key-files:
  created: []
  modified:
    - src/mcp/capabilities.ts
    - src/mcp/tools/system.test.ts
    - docs/coverage-map.yaml
    - docs/COVERAGE.md
    - README.md
    - README.de.md
    - tests/integration/docs-parity.test.ts

key-decisions:
  - "D-15 manifest_audit and envs_promote registered with 4.1.2 min version and MCP composite notes"
  - "docs-parity TOOL_ACTIONS extended for audit and envs:promote inventory parity"

patterns-established:
  - "Drift-heal safety language: audit advisory-only; promote preview default, confirm apply, keep_remote default, masked values, single-instance scope"

requirements-completed: [DRIFT-01, DRIFT-02, DRIFT-03]

coverage:
  - id: D1
    description: "system.version exposes manifest_audit and envs_promote capability keys"
    requirement: DRIFT-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false
  - id: D2
    description: "coverage-map and COVERAGE.md map audit and promote to existing client calls"
    requirement: DRIFT-02
    verification:
      - kind: other
        ref: "npm run openapi:coverage"
        status: pass
    human_judgment: false
  - id: D3
    description: "README EN/DE document manifest.audit and envs:promote safety defaults"
    requirement: DRIFT-03
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-30
status: complete
---

# Phase 29 Plan 03: Discoverability Summary

**manifest_audit + envs_promote capability keys, coverage-map rows, and bilingual README safety docs for drift-heal actions.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-30T03:23:00Z
- **Completed:** 2026-07-30T03:27:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `system.version` advertises `manifest_audit` and `envs_promote` (13 capability keys total); Wave 0 `it.fails` flipped GREEN
- `docs/coverage-map.yaml` + regenerated `docs/COVERAGE.md` map audit/promote to existing read/env CRUD — no fake Coolify endpoints
- README EN/DE document `manifest.audit` (advisory/read-only) and `application.envs:promote` / **env.promote** (preview default, `confirm:true` apply, `keep_remote`, masked values, single-instance)
- Phase 29 targeted suite green: 188 tests across manifest, application, system, docs-parity

## Task Commits

1. **Task 1: Publish capability keys and coverage rows** — `89675e6` (feat)
2. **Task 2: Document Drift & Heal actions in README EN/DE** — `25e45fe` (docs)
3. **Task 3: Run final Phase 29 targeted verification** — `e0ef3af` (chore)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/capabilities.ts` — `manifest_audit`, `envs_promote` entries
- `src/mcp/tools/system.test.ts` — thirteen-key capability assertions GREEN
- `docs/coverage-map.yaml` — `manifest.audit`, `application.envs:promote` rows
- `docs/COVERAGE.md` — regenerated coverage report
- `README.md` / `README.de.md` — drift-heal action tables, safety notes, capability blurb
- `tests/integration/docs-parity.test.ts` — action inventory includes `audit`, `envs:promote`

## Decisions Made

- Extended docs-parity `TOOL_ACTIONS` alongside README updates so D-09 inventory stays accurate
- Kept D-19 intelligence capability test updated to thirteen keys (merged with D-15 drift keys)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Phase 29 complete — ready for `/gsd-verify-work`
- Phase 30 Deploy Guard may consume audit/promote health signals

## Self-Check: PASSED

- FOUND: src/mcp/capabilities.ts
- FOUND: docs/COVERAGE.md (manifest.audit, application.envs:promote)
- FOUND: README.md (manifest.audit)
- FOUND: README.de.md (manifest.audit)
- FOUND: 89675e6
- FOUND: 25e45fe
- FOUND: e0ef3af

---
*Phase: 29-drift-heal*
*Completed: 2026-07-30*
