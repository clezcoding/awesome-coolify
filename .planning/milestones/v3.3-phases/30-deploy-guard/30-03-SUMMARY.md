---
phase: 30-deploy-guard
plan: 03
subsystem: docs
tags: [capabilities, coverage, deploy-guard]
requires:
  - phase: 30-01
    provides: deployment.preflight
  - phase: 30-02
    provides: deployment.rollback
provides:
  - deployment_preflight and deployment_rollback capability keys
  - coverage-map and README EN/DE deploy guard docs
affects: []
tech-stack:
  added: []
  patterns: [MCP composite capability notes]
key-files:
  created: []
  modified: [src/mcp/capabilities.ts, src/mcp/tools/system.test.ts, docs/coverage-map.yaml, docs/COVERAGE.md, README.md, README.de.md]
key-decisions: []
requirements-completed: [GUARD-01, GUARD-02, GUARD-03]
coverage:
  - id: D1
    description: system.version exposes deployment_preflight and deployment_rollback
    requirement: GUARD-01
    verification:
      - kind: unit
        ref: src/mcp/tools/system.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: docs parity for deploy guard actions
    verification:
      - kind: integration
        ref: tests/integration/docs-parity.test.ts
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-07-31
status: complete
---

# Phase 30 Plan 03: Discoverability Summary

**Capabilities, coverage map, and bilingual README document deploy guard preflight/rollback as MCP composites over existing Coolify REST.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- `deployment_preflight` and `deployment_rollback` in `COOLIFY_412_CAPABILITIES`
- `docs/coverage-map.yaml` rows for preflight and rollback
- README EN/DE deploy guard sections; `npm run openapi:coverage` regenerated COVERAGE.md

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
