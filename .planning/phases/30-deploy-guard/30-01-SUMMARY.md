---
phase: 30-deploy-guard
plan: 01
subsystem: api
tags: [deploy-guard, preflight, risk-score, mcp]
requires:
  - phase: 30-00
    provides: RED scaffolds and deploy-preflight shell
provides:
  - deployment.preflight composite read with four factors and risk_score
affects: [30-02, 30-03]
tech-stack:
  added: []
  patterns: [Promise.allSettled soft partials, advisory preflight envelope]
key-files:
  created: []
  modified: [src/utils/deploy-preflight.ts, src/mcp/tools/deployment.ts, src/mcp/tools/intelligence.ts, src/mcp/tools/application.ts, src/mcp/tools/deployment.test.ts]
key-decisions:
  - "Preflight on deployment tool; shared sortDeploymentsNewestFirst in deploy-preflight util"
requirements-completed: [GUARD-01, GUARD-02]
coverage:
  - id: D1
    description: deployment.preflight four factors with risk score
    requirement: GUARD-01
    verification:
      - kind: unit
        ref: src/mcp/tools/deployment.test.ts#deployment.preflight
        status: pass
    human_judgment: false
  - id: D2
    description: Read-only preflight with masked env values
    requirement: GUARD-02
    verification:
      - kind: unit
        ref: src/utils/deploy-preflight.test.ts
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-07-31
status: complete
---

# Phase 30 Plan 01: deployment.preflight Summary

**Composite deploy preflight with four named factors, deterministic risk_score 0–100, and read-only advisory response on the deployment MCP tool.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- `deployment.preflight` with `instance_health`, `env_completeness`, `recent_deployment_failures`, `dns_readiness`
- `buildDeployPreflightReport` with soft partials and `blocking` when critical or deploy in progress
- FollowUpHint `recommended_actions` for deploy vs diagnose paths

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
