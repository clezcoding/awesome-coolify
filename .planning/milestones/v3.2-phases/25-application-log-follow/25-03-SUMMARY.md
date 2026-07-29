---
phase: 25-application-log-follow
plan: 03
subsystem: api
tags: [capabilities, OBS-02, application_logs_follow, coverage-map, README]

requires:
  - phase: 25-application-log-follow
    plan: 01
    provides: follow handler and log-follow-poll helper
  - phase: 25-application-log-follow
    plan: 02
    provides: applicationActionsCatalog follow params and schema guards
provides:
  - application_logs_follow fifth capability on system.version (4.1.2)
  - README EN/DE runtime log follow discovery sentence
  - coverage-map + COVERAGE.md OBS-02 note on application.logs row
affects:
  - 26-incident-prompt

tech-stack:
  added: []
  patterns:
    - "Soft capability guidance only — no Zod gate on application_logs_follow (D-19)"
    - "OBS-02 coverage reason via action_overrides + openapi:coverage regen"

key-files:
  created: []
  modified:
    - src/mcp/capabilities.ts
    - src/mcp/tools/system.test.ts
    - docs/coverage-map.yaml
    - docs/coverage-overrides.yaml
    - docs/COVERAGE.md
    - README.md
    - README.de.md

key-decisions:
  - "application.logs OBS-02 reason in coverage-overrides.yaml action_overrides — generator byte-compare gate requires regen not hand-edit"
  - "application.ts catalog unchanged — 25-02 already listed follow params + capability note"

patterns-established:
  - "Fifth capability key application_logs_follow at coolify_min_version 4.1.2 for MCP runtime follow"

requirements-completed: [OBS-02, OBS-03]

coverage:
  - id: D1
    description: "system.version exposes five capabilities including application_logs_follow"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#system.version capabilities has exactly five keys"
        status: pass
    human_judgment: false
  - id: D2
    description: "README EN/DE and coverage map document follow:true runtime polling"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#passes when committed docs/COVERAGE.md matches generator"
        status: pass
    human_judgment: false
  - id: D3
    description: "No incident prompt edits (D-21 deferred Phase 26)"
    requirement: OBS-02
    verification:
      - kind: other
        ref: "git diff --name-only | rg incident returns empty"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-28
status: complete
---

# Phase 25 Plan 03: Capability Discovery + Docs Summary

**Fifth `application_logs_follow` capability on system.version with README/coverage OBS-02 discovery docs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T00:04:02Z
- **Completed:** 2026-07-28T00:07:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `application_logs_follow` capability entry (supported true, min 4.1.2) on `COOLIFY_412_CAPABILITIES`
- `system.test.ts` five-key capabilities describe green; four-key test removed
- README EN/DE capability callout extended with runtime `follow:true` sentence
- `application.logs` coverage row documents MCP-side bounded polling (OBS-02)

## Task Commits

1. **Task 1: application_logs_follow capability + system tests** - `7098c22` (feat)
2. **Task 2: Catalog, coverage map, README EN/DE follow note** - `37fa582` (docs)

## Files Created/Modified

- `src/mcp/capabilities.ts` - fifth capability key
- `src/mcp/tools/system.test.ts` - five-key test flip from Wave 0 scaffold
- `docs/coverage-map.yaml` - inline OBS-02 comment on application.logs
- `docs/coverage-overrides.yaml` - action override reason for generator
- `docs/COVERAGE.md` - regenerated via openapi:coverage
- `README.md` / `README.de.md` - follow discovery sentence in capability callout

## Decisions Made

- Used `action_overrides` for application.logs reason — satisfies D-06 byte-compare freshness test
- No application.ts changes — catalog already updated in 25-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] coverage-overrides.yaml action_override for COVERAGE.md reason**
- **Found during:** Task 2
- **Issue:** Hand-edited COVERAGE.md failed `assertCoverageFresh` byte-compare
- **Fix:** Added `application.logs` action_override with OBS-02 reason; ran `node scripts/openapi-coverage.mjs`
- **Files modified:** docs/coverage-overrides.yaml, docs/COVERAGE.md
- **Committed in:** 37fa582

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 25 complete (4/4 plans)
- Phase 26 can update incident prompt per D-21
- Full suite 1149 tests green

## Self-Check: PASSED

- FOUND: src/mcp/capabilities.ts
- FOUND: .planning/phases/25-application-log-follow/25-03-SUMMARY.md
- FOUND: commit 7098c22
- FOUND: commit 37fa582

---
*Phase: 25-application-log-follow*
*Completed: 2026-07-28*
