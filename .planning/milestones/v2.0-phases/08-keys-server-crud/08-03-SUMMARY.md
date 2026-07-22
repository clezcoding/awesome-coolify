---
phase: 08-keys-server-crud
plan: 03
subsystem: mcp
tags: [server, ssh-validation, confirm-gate, crud, poll-reachability]

requires:
  - phase: 08-keys-server-crud
    provides: Wave 0 RED scaffolds and 08-01 API client extensions (createServer, pollServerUntilReachable, etc.)
provides:
  - serverActionSchema with get/create/update/delete/delete_preview/validate actions
  - handleServerAction handler with auto-validation chaining and soft-unreachable handling
  - GREEN server.test.ts (16 tests)
affects:
  - 08-04-tool-registration

tech-stack:
  added: []
  patterns:
    - "runValidationCycle shared helper for create + validate — validateServer + pollServerUntilReachable (D-05/D-08)"
    - "Soft-success on SSH unreachable — ok:true + validation.reachable:false + COOLIFY_SSH_UNREACHABLE hints, no rollback (D-07)"
    - "resolvePrivateKeyUuidFromId maps private_key_id → private_key_uuid on get (Pitfall 1)"

key-files:
  created:
    - src/mcp/tools/server.ts
  modified:
    - src/mcp/tools/server.test.ts

key-decisions:
  - "deleteServer called with verifySsl + delete_volumes positional args matching api/client.ts signature"
  - "Pending validation attaches retry recoveryHints in validation object when is_reachable stays undefined after poll timeout"

patterns-established:
  - "Server domain tool: no list action — discovery via resource.list type=server (D-10)"

requirements-completed:
  - SRV-01
  - SRV-02
  - SRV-03
  - SRV-04
  - SRV-05

coverage:
  - id: D1
    description: "server create with auto-validate, skip flag, soft-unreachable, and pending timeout"
    requirement: SRV-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts#server create"
        status: pass
    human_judgment: false
  - id: D2
    description: "server update with is_build_server flag reflection"
    requirement: SRV-02
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts#server update"
        status: pass
    human_judgment: false
  - id: D3
    description: "server delete confirm gate and delete_volumes default false"
    requirement: SRV-03
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts#server delete"
        status: pass
    human_judgment: false
  - id: D4
    description: "server validate with same poll model as create"
    requirement: SRV-04
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts#server validate"
        status: pass
    human_judgment: false
  - id: D5
    description: "server get resolves private_key_uuid without validate side-effect"
    requirement: SRV-05
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts#server get"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 03: server Tool Handler Summary

**server MCP handler with auto-validation polling, SSH unreachable soft-success, confirm-gated delete, and private_key_uuid resolution on get**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T22:03:00Z
- **Completed:** 2026-07-17T22:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented `handleServerAction` with six actions: get, create, update, delete, delete_preview, validate
- Auto-validation after create (default `validate:true`) via shared `runValidationCycle` — 30s poll, pending/reachable/unreachable branching per D-05/D-06/D-07/D-08
- `server.get` resolves `private_key_uuid` from `private_key_id` via `fetchPrivateKeys` lookup — no validate side-effect (D-12)
- Delete confirm gate + `delete_volumes` default false; delete_preview lists child resources as warning (D-14/D-16)
- Flipped 08-00 RED scaffold to GREEN — 16/16 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement server schema + handler** - `15f2cfd` (feat)
2. **Task 2: Tune server.test.ts mocks to match handler** - `6ff20a9` (test)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/mcp/tools/server.ts` — serverActionSchema, handleServerAction, runValidationCycle, resolvePrivateKeyUuidFromId
- `src/mcp/tools/server.test.ts` — deleteServer mock assertions aligned to client positional signature

## Decisions Made

- deleteServer invoked with `(url, token, uuid, verifySsl, delete_volumes)` matching 08-01 client API — tests adjusted in Task 2 (08-00 scaffold expected object form)
- Recovery hints for unreachable/pending embedded in `validation.recoveryHints` within success envelope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] deleteServer test mock signature mismatch**
- **Found during:** Task 2 (Tune server.test.ts mocks)
- **Issue:** 08-00 RED scaffold asserted `deleteServer` called with `{ delete_volumes: false }` object as 4th arg; api/client.ts uses positional `verifySsl, delete_volumes`
- **Fix:** Updated two delete test assertions to match client signature
- **Files modified:** src/mcp/tools/server.test.ts
- **Verification:** 16/16 server tests GREEN
- **Committed in:** 6ff20a9

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-only alignment; handler behavior matches D-16 and 08-01 client contract. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- server handler complete and ready for 08-04 MCP tool registration
- private_key + server handlers both GREEN — Wave 2 complete

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/server.test.ts` — 16/16 GREEN
- `npm run build` — success
- `grep -c 'delete_volumes' src/mcp/tools/server.ts` — 3 (>= 2)
- `grep -c 'COOLIFY_SSH_UNREACHABLE' src/mcp/tools/server.ts` — 1 (>= 1)
- `grep -c 'pollServerUntilReachable' src/mcp/tools/server.ts` — 2 (>= 1)

---
*Phase: 08-keys-server-crud*
*Completed: 2026-07-17*
