---
phase: 29-drift-heal
plan: 02
subsystem: api
tags: [envs-promote, application, DRIFT-02, DRIFT-03, confirm-gate, conflict-policy]

requires:
  - phase: 29-00
    provides: Wave 0 RED scaffolds for envs:promote
provides:
  - application.envs:promote preview with masked buckets and FollowUpHint suggestions
  - Confirm-gated apply to target app with keep_remote default conflict policy
affects:
  - 29-03

tech-stack:
  added: []
  patterns:
    - "envs:promote mirrors envs:sync — diffEnvs, validateEnvMutationConfirm, bulkUpdateEnvs/createEnv on target only"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "D-09 approve-confirm-required — preview dry_run default true; apply requires confirm:true"
  - "Apply default conflict_policy keep_remote; abort with mismatches returns COOLIFY_CONFIRM_REQUIRED"

patterns-established:
  - "Promote preview masks suggested_entries values when reveal is false (T-29-01)"

requirements-completed: [DRIFT-02, DRIFT-03]

coverage:
  - id: D1
    description: "envs:promote preview buckets, masking, dual fetchEnvs, dry_run default"
    requirement: DRIFT-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application envs:promote"
        status: pass
    human_judgment: false
  - id: D2
    description: "envs:promote confirm gate, conflict policies, no target deletes"
    requirement: DRIFT-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application envs:promote"
        status: pass
    human_judgment: false
  - id: D3
    description: "promotion_suggestions include FollowUpHint remediation objects"
    requirement: DRIFT-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application envs:promote"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-30
status: complete
---

# Phase 29 Plan 02: envs:promote Summary

**Cross-environment env promotion on `application` — masked preview, FollowUpHint suggestions, confirm-gated apply with keep_remote default.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-30T05:17:00Z
- **Completed:** 2026-07-30T05:25:00Z
- **Tasks:** 2 (checkpoint + implementation)
- **Files modified:** 2

## Accomplishments

- `application.envs:promote` action: schema, catalog, handler, switch routing
- Preview: `only_in_source`, `only_in_target`, `value_mismatches`, `promotion_suggestions` with masked values and `suggested_entries`
- Apply: `validateEnvMutationConfirm`, default `keep_remote`, `overwrite` bulk updates, `abort` → `COOLIFY_CONFIRM_REQUIRED` with `conflict_policy_options`
- Nine Wave 0 `it.fails` scaffolds flipped GREEN

## Task Commits

1. **Task 2: Implement envs:promote preview and confirm-gated apply** — `f60cd0d` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/mcp/tools/application.ts` — `envs:promote` schema, `handleApplicationEnvsPromote`, preview/apply helpers
- `src/mcp/tools/application.test.ts` — promote mocks + `it.fails` → `it`

## Decisions Made

- Auto-selected checkpoint `approve-confirm-required` for D-09 (preview default; apply needs `confirm:true`)
- Mask `suggested_entries` values in preview when `reveal` is false (aligns with T-29-01 masking test)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Parallel branch edits briefly dropped `application.ts` changes; re-applied handler before commit
- Apply tests needed `createEnv` / `bulkUpdateEnvs` mocks in promote `beforeEach`

## User Setup Required

None

## Next Phase Readiness

- Plan 29-03 can register `envs_promote` capability key and coverage-map row
- `manifest.audit` (29-01) can proceed in parallel on same branch

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts
- FOUND: src/mcp/tools/application.test.ts
- FOUND: f60cd0d
- FOUND: handleApplicationEnvsPromote

---
*Phase: 29-drift-heal*
*Completed: 2026-07-30*
