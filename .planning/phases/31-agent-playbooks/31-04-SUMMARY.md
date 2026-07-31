---
phase: 31-agent-playbooks
plan: 04
subsystem: docs
tags: [capabilities, coverage, readme, diagnose_analyze, recipe_recommend, D-19]

requires:
  - phase: 31-01
    provides: diagnose.analyze action
  - phase: 31-02
    provides: playbook prompts (incident/rollback/maintenance-window)
  - phase: 31-03
    provides: recipe.recommend action
provides:
  - diagnose_analyze + recipe_recommend in COOLIFY_412_CAPABILITIES (17 keys)
  - coverage-map / COVERAGE Phase 31 no-new-API declaration
  - README EN/DE discoverability for analyze, recommend, playbooks
affects: [verify-work, ship]

tech-stack:
  added: []
  patterns:
    - "Capability keys mirror MCP composite actions (diagnose_analyze, recipe_recommend)"
    - "Phase declaration survives openapi:coverage via coverage-overrides reason"

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
  - "Husky blocks RED-only commits — GREEN shipped with flipped seventeen-key it() + capabilities together"
  - "Phase 31 no-external-API sentence lives in recipe.recommend action_override so regen/--check stay green"

patterns-established:
  - "Discoverability wave: capabilities → coverage-map+overrides → README EN/DE parity"

requirements-completed: [BRAIN-01, BRAIN-02, PLAY-01, PLAY-02, SREC-01, SREC-02]

coverage:
  - id: D1
    description: system.version exposes diagnose_analyze and recipe_recommend (17 keys)
    requirement: BRAIN-01
    verification:
      - kind: unit
        ref: src/mcp/tools/system.test.ts#system.version capabilities has exactly seventeen keys including diagnose_analyze and recipe_recommend (D-19)
        status: pass
    human_judgment: false
  - id: D2
    description: coverage-map + COVERAGE declare Phase 31 composites / no new third-party API
    requirement: SREC-01
    verification:
      - kind: other
        ref: "rg diagnose.analyze|recipe.recommend docs/coverage-map.yaml; rg 'No external API integration: Phase 31' docs/COVERAGE.md"
        status: pass
    human_judgment: false
  - id: D3
    description: README EN/DE document diagnose.analyze, recipe.recommend, maintenance-window playbooks
    requirement: PLAY-01
    verification:
      - kind: integration
        ref: tests/integration/docs-parity.test.ts
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-31
status: complete
---

# Phase 31 Plan 04: Capabilities + README Summary

**Seventeen capability keys (`diagnose_analyze`, `recipe_recommend`) plus coverage and bilingual README discoverability for Phase 31 Log Brain, smart recipes, and playbooks (D-19).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-31T02:43:59Z
- **Completed:** 2026-07-31T02:51:46Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- `diagnose_analyze` + `recipe_recommend` in `COOLIFY_412_CAPABILITIES`; Wave 0 `it.fails` → green seventeen-key assertions
- `docs/coverage-map.yaml` rows for `diagnose.analyze` / `recipe.recommend`; Phase 31 no-new-third-party-API declaration in overrides → `COVERAGE.md`
- README.md / README.de.md: analyze, recommend, six-prompt playbooks (`incident` / `rollback` / `maintenance-window`)

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `65e67d6` | feat(31-04): implement diagnose_analyze and recipe_recommend capabilities |
| 2 | `2596df2` | docs(31-04): declare Phase 31 composite coverage |
| 3 | `29e9f11` | docs(31-04): document Phase 31 capabilities in README EN/DE |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Husky blocks RED-only TDD commit**
- **Found during:** Task 1
- **Issue:** Pre-commit `vitest related` fails when seventeen-key expectations land before `capabilities.ts`
- **Fix:** Combined RED+GREEN in one `feat` commit (same pattern as 31-02)
- **Files modified:** `src/mcp/capabilities.ts`, `src/mcp/tools/system.test.ts`
- **Commit:** `65e67d6`

**2. [Rule 2 - Critical] Phase 31 declaration must survive `openapi:coverage --check`**
- **Found during:** Task 2
- **Issue:** Manual append to generated `COVERAGE.md` would stale CI byte-check
- **Fix:** Put exact declaration sentence in `docs/coverage-overrides.yaml` `recipe.recommend` reason; regenerate COVERAGE.md
- **Files modified:** `docs/coverage-overrides.yaml`, `docs/COVERAGE.md`
- **Commit:** `2596df2`

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None — discoverability docs / capability advertisement only (T-31-11 accept).

## Self-Check: PASSED

- Files: capabilities.ts, system.test.ts, coverage-map.yaml, COVERAGE.md, README.md, README.de.md, 31-04-SUMMARY.md
- Commits: `65e67d6`, `2596df2`, `29e9f11`
- Keys: 17 including `diagnose_analyze` + `recipe_recommend`
