---
phase: 08-keys-server-crud
plan: 05
subsystem: api
tags: [mcp, private_key, zod, coolify, d-11, gap-closure]

requires:
  - phase: 08-02
    provides: private_key handler and listActionSchema baseline
  - phase: 08-04
    provides: private_key registerTool in MCP server
provides:
  - Dual-layer D-11 rejection for private_key.list + reveal:true
  - Live MCP path returns structured COOLIFY_422 (not host "Unrecognized key")
  - Updated tool description documenting schema vs handler rejection layers
affects: [08-UAT, verify-work]

tech-stack:
  added: []
  patterns:
    - "Dual-layer rejection: JSON Schema accepts param, handler enforces security policy"

key-files:
  created: []
  modified:
    - src/mcp/tools/private_key.ts
    - src/mcp/tools/private_key.test.ts
    - src/mcp/server.ts

key-decisions:
  - "listActionSchema includes reveal from sharedReadParamsSchema; handler guard rejects reveal:true before API call"
  - "Tool description documents dual-layer contract instead of rewriting CONTEXT.md D-11 (deferred docs follow-up)"

patterns-established:
  - "MCP host pre-validation vs handler validation: align schema with host JSON Schema, enforce security at handler"

requirements-completed: [KEY-01]

coverage:
  - id: D1
    description: "private_key.list schema accepts reveal (optional boolean); MCP host no longer pre-rejects"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/private_key.test.ts#accepts reveal:true on list schema (dual-layer rejection per D-11)"
        status: pass
    human_judgment: false
  - id: D2
    description: "private_key.list with reveal:true returns structured COOLIFY_422 at handler level"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/private_key.test.ts#rejects reveal:true on list with COOLIFY_422 per D-11"
        status: pass
    human_judgment: false
  - id: D3
    description: "private_key.list normal flow (reveal:false or omitted) unchanged — summary projection, no PEM"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/private_key.test.ts#allows reveal:false on list and calls fetchPrivateKeys"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/private_key.test.ts#defaults reveal to false when omitted on list"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/private_key.test.ts#returns summary projection with uuid, name, fingerprint, description per D-04"
        status: pass
    human_judgment: false
  - id: D4
    description: "private_key tool description documents dual-layer rejection in server.ts"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "grep rejects reveal:true at the handler src/mcp/server.ts"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-17
status: complete
---

# Phase 08 Plan 05 Summary

**Dual-layer D-11 rejection: private_key.list schema accepts reveal; handler returns COOLIFY_422 for reveal:true — live MCP path matches unit tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T00:00:00Z
- **Completed:** 2026-07-17T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `listActionSchema` now includes `reveal` from `sharedReadParamsSchema`; `.strict()` retained for other unknown keys
- Handler `list` branch throws explicit `CoolifyApiError COOLIFY_422` when `reveal:true` before `fetchPrivateKeys`
- Three new unit tests (reveal:false, reveal omitted, schema safeParse) — 17 total in private_key suite
- `private_key` tool description updated for dual-layer rejection contract

## Task Commits

1. **Task 1: Accept reveal on list schema and reject reveal:true at handler** - `160cd41` (fix)
2. **Task 2: Document dual-layer rejection in server.ts** - `dc5128c` (docs)

## Files Created/Modified

- `src/mcp/tools/private_key.ts` — list schema includes reveal; handler guard for reveal:true
- `src/mcp/tools/private_key.test.ts` — Tests B, C, D for dual-layer contract
- `src/mcp/server.ts` — tool description documents schema vs handler rejection

## Decisions Made

None — followed plan as specified. CONTEXT.md D-11 wording update deferred per plan (docs follow-up).

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/private_key.test.ts` — 17/17 pass
- `npm run test` — 547/547 pass
- `npm run build` — success
- `grep -c "rejects reveal:true at the handler" src/mcp/server.ts` — 1

## Next Phase Readiness

UAT gap from 08-UAT.md ready for re-verification via `/gsd-verify-work 8`.

---
*Phase: 08-keys-server-crud*
*Completed: 2026-07-17*
