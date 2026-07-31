---
phase: 30-deploy-guard
plan: 00
subsystem: testing
tags: [vitest, nyquist, it.fails, GUARD-01, GUARD-02, GUARD-03, deploy-preflight]

requires: []
provides:
  - RED scaffolds for deployment.preflight, deployment.rollback, deploy-preflight helpers, and capability keys
affects: [30-01, 30-02, 30-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 it.fails Nyquist scaffolds before handler wiring (Phase 28/29 pattern)"

key-files:
  created:
    - src/utils/deploy-preflight.ts
    - src/utils/deploy-preflight.test.ts
  modified:
    - src/mcp/tools/deployment.test.ts
    - src/mcp/tools/system.test.ts
    - src/api/client.test.ts

key-decisions:
  - "Extend deployment tool (not new deploy_guard top-level tool)"
  - "deploy-preflight.ts shell exports for shared rollback/preflight helpers"

requirements-completed: [GUARD-01, GUARD-02, GUARD-03]

coverage:
  - id: D1
    description: "deploy-preflight helper RED scaffolds (selection, scoring, risk_level bands)"
    requirement: GUARD-02
    verification:
      - kind: unit
        ref: "src/utils/deploy-preflight.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "deployment.preflight RED scaffolds (four factors, read-only, masking, partial)"
    requirement: GUARD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#deployment.preflight"
        status: pass
    human_judgment: false
  - id: D3
    description: "deployment.rollback RED scaffolds (confirm gate, git pin order, unavailable)"
    requirement: GUARD-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#deployment.rollback"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-31
status: complete
---

# Phase 30 Plan 00: Wave 0 Nyquist RED Summary

**Vitest it.fails scaffolds lock GUARD-01/02/03 contracts before production handlers ship.**

## Accomplishments

- `deploy-preflight.ts` shell + `deploy-preflight.test.ts` RED for selection/scoring
- `deployment.test.ts` RED for preflight factors, read-only contract, rollback confirm/pin order
- `system.test.ts` + `client.test.ts` RED for capabilities and `docker_tag`/`force` query behavior

## Commits

- f602b14 — test(30-00): add deploy-preflight helper RED scaffolds
- 140ef72 — test(30-00): add deployment.preflight RED scaffolds
- 6c7a614 — test(30-00): add rollback and capability RED scaffolds

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/utils/deploy-preflight.ts
- FOUND: src/utils/deploy-preflight.test.ts
- FOUND: commits f602b14, 140ef72, 6c7a614
