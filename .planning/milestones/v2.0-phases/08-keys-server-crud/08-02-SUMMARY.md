---
phase: 08-keys-server-crud
plan: 02
subsystem: mcp
tags: [private-key, pem-masking, crud, confirm-gate, coolify-409]

requires:
  - phase: 08-keys-server-crud
    provides: Wave 0 RED scaffolds and 08-01 API client/error/projection extensions
provides:
  - privateKeyActionSchema with list/get/create/update/delete/delete_preview actions
  - handlePrivateKeyAction handler with PEM hard-mask and dependency checks
  - GREEN private_key.test.ts (14 tests)
affects:
  - 08-04-tool-registration

tech-stack:
  added: []
  patterns:
    - "listReadParamsSchema omits reveal — reveal:true on list → COOLIFY_422 (D-11)"
    - "stripPemFields removes PEM keys from all response paths including create/update"
    - "delete_preview would_delete=false when dependent servers exist (D-13)"

key-files:
  created:
    - src/mcp/tools/private_key.ts
  modified:
    - src/mcp/tools/private_key.test.ts

key-decisions:
  - "Zod validation errors mapped to COOLIFY_422 via parsePrivateKeyAction helper"
  - "delete_preview would_delete reflects safe-to-delete (no dependents) per plan not 08-00 scaffold"

patterns-established:
  - "Domain security tool: PEM never leaves MCP even on reveal:true full projection"

requirements-completed:
  - KEY-01
  - KEY-02
  - KEY-03
  - KEY-04
  - KEY-05

coverage:
  - id: D1
    description: "private_key handler with list/get/create/update/delete/delete_preview actions"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/private_key.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "PEM never returned; reveal on list rejected; XOR create validation"
    requirement: KEY-02
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/private_key.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Confirm gate and COOLIFY_409 dependency check on delete"
    requirement: KEY-05
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/private_key.test.ts"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-16
status: complete
---

# Phase 8 Plan 02: private_key Tool Handler Summary

**private_key MCP handler with PEM-safe CRUD, XOR create, confirm gate, and COOLIFY_409 dependency blocking**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-16T22:00:00Z
- **Completed:** 2026-07-16T22:06:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented `handlePrivateKeyAction` with six actions: list, get, create, update, delete, delete_preview
- Enforced strictest secret handling: PEM stripped from all response paths; `reveal:true` on list → `COOLIFY_422` (D-11)
- Delete path: `COOLIFY_CONFIRM_REQUIRED` without confirm; `COOLIFY_409` with `dependent_server_uuids` when servers reference key (D-14/D-15)
- Flipped 08-00 RED scaffold to GREEN — 14/14 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement private_key schema + handler** - `a66898a` (feat)
2. **Task 2: Tune private_key.test.ts mocks to match handler** - `b30d0c1` (test)

## Files Created/Modified

- `src/mcp/tools/private_key.ts` - Zod action schema, PEM-safe handler, dependency checks
- `src/mcp/tools/private_key.test.ts` - Fixed delete_preview `would_delete` assertion per D-13

## Decisions Made

- Zod parse errors wrapped as `COOLIFY_422` via `parsePrivateKeyAction` so handler returns structured errors (not throws)
- `delete_preview.would_delete` = `dependents.length === 0` per plan (08-00 scaffold had inverted expectation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Test assertion] delete_preview would_delete semantics**
- **Found during:** Task 2 (test tuning)
- **Issue:** 08-00 scaffold expected `would_delete: true` when dependents present; plan specifies `would_delete: dependents.length === 0`
- **Fix:** Updated test assertion to `would_delete: false` with D-13 comment
- **Files modified:** `src/mcp/tools/private_key.test.ts`
- **Verification:** `npx vitest run src/mcp/tools/private_key.test.ts` — 14 green
- **Committed in:** `b30d0c1`

---

**Total deviations:** 1 auto-fixed (test assertion aligned to locked D-13)
**Impact on plan:** No scope change; behavior matches plan threat model.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Handler ready for registration in 08-04 (`registerCoolifyTools`)
- 08-03 (server handler) can proceed in parallel — no file conflicts

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/private_key.test.ts` — 14 tests green
- `npm run build` — success
- `grep -c 'force' src/mcp/tools/private_key.ts` — 0
- `grep -cE 'stripPemFields|sanitizeFullProjection' src/mcp/tools/private_key.ts` — 6

---
*Phase: 08-keys-server-crud*
*Completed: 2026-07-16*
