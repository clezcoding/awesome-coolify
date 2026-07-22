---
phase: 12-environment-variables-smart-sync
plan: 05
subsystem: api
tags: [env-vars, smart-sync, dotenv, conflict-policy, confirm-gate]

requires:
  - phase: 12-01
    provides: parseEnvFile, diffEnvs, detectConflicts, Env CRUD client methods
  - phase: 12-02
    provides: application envs:* schema/handler patterns, maskEnvRecord, confirm gates
provides:
  - application envs:sync action (app-only per D-09)
  - Local .env diff-sync with dry_run, prune, conflict_policy, confirm gates
affects: [12-06]

tech-stack:
  added: []
  patterns:
    - envsSyncActionSchema XOR env_file|env_content via superRefine (D-05)
    - Schema-level confirm gate when dry_run:false or prune:true (D-06/D-07/D-12)
    - Sync disposition always masked regardless of reveal (D-14/D-15 control-plane)
    - ask_human_conflict_policy recovery hint on apply-with-conflicts-no-policy (D-08)

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "Value conflicts for ask-human gate built from diff.updated entries — not only out-of-band detectConflicts"
  - "readFileSync for env_file — matches Wave 0 test mocks and private_key compose pattern"
  - "Sync disposition uses dedicated maskSyncEnvEntry — reveal never unmasks sync responses"

patterns-established:
  - "envs:sync is control-plane only — sanitizeFullProjection + forced *** on all disposition values"
  - "conflict_policy optional with no default — apply with updated keys and no policy → COOLIFY_CONFIRM_REQUIRED"

requirements-completed: [ENV-05]

coverage:
  - id: D1
    description: envs:sync schema with XOR input, dry_run default false, confirm and conflict_policy gates
    requirement: ENV-05
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:sync XOR and confirm tests
        status: pass
    human_judgment: false
  - id: D2
    description: envs:sync handler parse → diff → dry_run return → apply → prune with masked disposition
    requirement: ENV-05
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#application envs:sync handler tests
        status: pass
    human_judgment: false
  - id: D3
    description: conflict_policy overwrite|keep_remote|abort honored; no COOLIFY_SYNC_CONFLICT code
    requirement: ENV-05
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#conflict_policy tests
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-21
status: complete
---

# Phase 12 Plan 05: Application envs:sync Summary

**Application-only `.env` smart-sync with dry_run preview, confirm/prune gates, conflict_policy overwrite|keep_remote|abort, and always-masked disposition**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-20T23:45:00Z
- **Completed:** 2026-07-20T23:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `envsSyncActionSchema` to application tool with XOR `env_file`|`env_content`, `dry_run` default false, and schema-level confirm gates
- Implemented `handleApplicationEnvsSync` — parse, diff, conflict detection, dry_run disposition, apply via createEnv/updateEnvViaBulk, optional prune via deleteEnv
- Apply with value conflicts and no `conflict_policy` throws `COOLIFY_CONFIRM_REQUIRED` with `ask_human_conflict_policy` recovery hint (D-08)
- All 10 Wave 0 `envs:sync` RED tests flipped GREEN; full suite 784 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schema for application envs:sync** - `048d2b4` (feat)
2. **Task 2: Implement application envs:sync handler** - `ff77ec6` (test)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.ts` — envsSyncActionSchema, sync disposition helpers, handleApplicationEnvsSync handler branch
- `src/mcp/tools/application.test.ts` — flipped 10 it.fails scaffolds to it for envs:sync suite

## Decisions Made

- Value conflicts for the ask-human gate derive from `diff.updated` (local ≠ remote), supplemented by `detectConflicts` out-of-band detection when policy is set
- Sync disposition always masks values via dedicated helpers — `reveal` does not apply to sync responses (control-plane per D-14/D-15)
- `readFileSync` used for `env_file` to align with existing test mocks and codebase file-read patterns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Combined schema and handler in Task 1 commit**
- **Found during:** Task 1 execution
- **Issue:** TypeScript exhaustiveness on `handleApplicationAction` switch requires a handler case once `envs:sync` joins the action union; stub-only would break build
- **Fix:** Shipped schema and handler together in first commit; second commit covers test flips only
- **Files modified:** `src/mcp/tools/application.ts`
- **Committed in:** `048d2b4`

---

**Total deviations:** 1 auto-fixed (1 missing critical for build correctness)
**Impact on plan:** No behavioral scope change; commit split adjusted for TS/build constraints.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `envs:sync` complete on application tool (ENV-05)
- Plan 12-06 can wire tool registration, README action lists, and final phase verification

---
*Phase: 12-environment-variables-smart-sync*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: `.planning/phases/12-environment-variables-smart-sync/12-05-SUMMARY.md`
- FOUND: `src/mcp/tools/application.ts`
- FOUND: commit `048d2b4`
- FOUND: commit `ff77ec6`
