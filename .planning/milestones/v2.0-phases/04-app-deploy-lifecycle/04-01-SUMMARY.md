---
phase: 04-app-deploy-lifecycle
plan: 01
subsystem: api
tags: [coolify, mcp, lifecycle, zod, vitest]

requires:
  - phase: 03-diagnose-issue-scan
    provides: rankFindMatches, diagnose resolution patterns, FollowUpHint forward-refs
provides:
  - COOLIFY_AMBIGUOUS_MATCH error code for mutation ambiguity guard
  - triggerAppStart/Stop/Restart client helpers
  - application start/stop/restart actions with strict uuid|name|fqdn resolution
  - resolveAppMutationUuid helper reused by later deploy/batch plans
affects: [04-02-deploy, 04-04-batch, deployment mutations]

tech-stack:
  added: []
  patterns:
    - Strict mutation identifier (uuid|name|fqdn only, no query per D-15)
    - Multi-match throws COOLIFY_AMBIGUOUS_MATCH, no mutation (D-16)
    - Mutation schemas use .strict() to reject deploy-only params like force (D-22)

key-files:
  created: []
  modified:
    - src/utils/errors.ts
    - src/api/client.ts
    - src/mcp/tools/application.ts
    - src/mcp/server.ts
    - src/mcp/tools/application.test.ts
    - src/api/client.test.ts
    - src/utils/errors.test.ts

key-decisions:
  - "Mutation actions use .strict() Zod schemas so force is rejected on restart (D-22)"
  - "resolveAppMutationUuid colocated in application.ts mirroring diagnose.ts (not extracted)"
  - "application tool drops readOnlyHint; openWorldHint only (D-05)"

patterns-established:
  - "Mutation resolver: explicit UUID bypasses fetchResources; multi-match throws COOLIFY_AMBIGUOUS_MATCH with ranked hints"
  - "Lifecycle POST helpers follow triggerServerValidate pattern in client.ts"

requirements-completed: [APP-03]

coverage:
  - id: D1
    description: Agent can start app by UUID, name, or FQDN
    requirement: APP-03
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#start by uuid calls triggerAppStart with correct uuid
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#start by name single-hit resolves and calls triggerAppStart
        status: pass
      - kind: unit
        ref: src/mcp/tools/application.test.ts#restart by fqdn single-hit calls triggerAppRestart
        status: pass
    human_judgment: false
  - id: D2
    description: Multi-match on mutation returns COOLIFY_AMBIGUOUS_MATCH without executing mutation
    requirement: APP-03
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH without mutation
        status: pass
    human_judgment: false
  - id: D3
    description: application tool no longer marked readOnlyHint (D-05)
    requirement: APP-03
    verification:
      - kind: unit
        ref: src/mcp/server.ts (annotations openWorldHint only)
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 01 Summary

**App lifecycle mutations (start/stop/restart) with strict identifier resolution, COOLIFY_AMBIGUOUS_MATCH guard, and readOnlyHint removed from application tool**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-12T23:37:00Z
- **Completed:** 2026-07-12T23:40:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- APP-03 shipped: agent can start, stop, restart apps by UUID, name, or FQDN
- `COOLIFY_AMBIGUOUS_MATCH` error code with ranked Top 10 recovery hints on multi-match (D-16)
- Three typed client helpers: `triggerAppStart`, `triggerAppStop`, `triggerAppRestart`
- `application` tool extended with start/stop/restart discriminatedUnion members; `readOnlyHint` dropped (D-05)
- `resolveAppMutationUuid` foundation for 04-02 deploy and 04-04 batch plans

## Task Commits

Each task was committed atomically:

1. **Task 1: COOLIFY_AMBIGUOUS_MATCH + client helpers + RED tests** - `19b74b5` (test)
2. **Task 2: Schema + resolver + handler + server annotation** - `ba20368` (feat)

**Plan metadata:** `910683e` (docs: complete plan)

## Files Created/Modified

- `src/utils/errors.ts` - Added `COOLIFY_AMBIGUOUS_MATCH` to union and RECOVERY_HINTS
- `src/api/client.ts` - Added `triggerAppStart`, `triggerAppStop`, `triggerAppRestart` POST helpers
- `src/mcp/tools/application.ts` - Extended schema, `resolveAppMutationUuid`, mutation handler routing
- `src/mcp/server.ts` - Dropped `readOnlyHint`, updated tool description for lifecycle actions
- `src/mcp/tools/application.test.ts` - 8 new mutation tests (uuid/name/fqdn, multi-match, zero-match, no-force)
- `src/api/client.test.ts` - POST helper unit tests
- `src/utils/errors.test.ts` - COOLIFY_AMBIGUOUS_MATCH coverage

## Decisions Made

- Mutation action schemas use `.strict()` so unknown fields like `force` fail Zod parse on restart (D-22)
- `resolveAppMutationUuid` colocated in `application.ts` per diagnose.ts precedent — not extracted to utils
- Ranked match list appended at call site in recoveryHints; static RECOVERY_HINTS map stays generic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 1 complete; 04-02 can extend `applicationActionSchema` with `deploy` reusing `resolveAppMutationUuid`
- `COOLIFY_AMBIGUOUS_MATCH` and strict identifier pattern ready for batch deploy (04-04)
- Build green (`npm run build`); all 27 application + errors tests pass

---
*Phase: 04-app-deploy-lifecycle*
*Completed: 2026-07-13*
