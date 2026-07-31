---
phase: 30-deploy-guard
plan: 02
subsystem: api
tags: [deploy-guard, rollback, confirm-gate, mcp]
requires:
  - phase: 30-01
    provides: deployment.preflight and deploy-preflight helpers
provides:
  - deployment.rollback confirm-gated composite recovery
affects: [30-03]
tech-stack:
  added: []
  patterns: [COOLIFY_CONFIRM_REQUIRED preview, git pin before triggerDeploy]
key-files:
  created: []
  modified: [src/utils/deploy-preflight.ts, src/mcp/tools/deployment.ts, src/utils/errors.ts, src/api/client.ts, src/mcp/tools/deployment.test.ts, src/api/client.test.ts]
key-decisions:
  - "triggerDeploy omits force query when false; optional docker_tag for dockerimage rollback"
requirements-completed: [GUARD-03]
coverage:
  - id: D1
    description: deployment.rollback confirm gate and git pin order
    requirement: GUARD-03
    verification:
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#deployment.rollback
        status: pass
    human_judgment: false
duration: 15min
completed: 2026-07-31
status: complete
---

# Phase 30 Plan 02: deployment.rollback Summary

**Confirm-gated rollback selects last finished deployment, pins git commit via PATCH, then POSTs /deploy — no fake Coolify rollback API.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- `executeDeploymentRollback` with preview + `COOLIFY_CONFIRM_REQUIRED`
- `COOLIFY_ROLLBACK_UNAVAILABLE` when no finished deployment
- `triggerDeploy` extended with optional `dockerTag`; SHA validation before PATCH

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
