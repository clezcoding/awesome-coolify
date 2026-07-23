---
phase: 17-local-manifest-sync
plan: 02
subsystem: api
tags: [manifest, mcp-tool, sync, diff, 404-hints, vitest]

requires:
  - phase: 17-01
    provides: ManifestManager utility, resolveProjectRoot, hasUuid
provides:
  - manifest MCP tool with 7 actions (get/upsert/set/remove/clear/sync/diff)
  - server.ts registerTool('manifest') registration
  - stale-manifest 404 recovery hint injection in toStructuredError
affects: [17-03, 18-uat]

tech-stack:
  added: []
  patterns:
    - "manifest sync/diff resolve credentials via InstanceManager; COOLIFY_NO_INSTANCE envelope on soft-start (D-04)"
    - "Remote-wins UUID merge with orphan retention; prune only on confirm+prune (D-12/D-13)"
    - "404 hint injection via ManifestManager.hasUuid — hints only, no auto-retry (D-15)"

key-files:
  created:
    - src/mcp/tools/manifest.ts
  modified:
    - src/mcp/server.ts
    - src/utils/errors.ts
    - src/mcp/tools/manifest.test.ts
    - src/mcp/server.test.ts

key-decisions:
  - "sync case awaits reconcileWithRemote — un-awaited promise bypassed try/catch"
  - "server.test.ts 16-tool count updated alongside manifest registration"
  - "MAN-04 scaffold flipped in task 2 commit with errors.ts hint injection"

patterns-established:
  - "Pattern: local manifest actions strict without instance; sync/diff carry optional instance param"
  - "Pattern: injectStaleManifestHints in toStructuredError for COOLIFY_404 + manifest UUID match"

requirements-completed: [MAN-03, MAN-04]

coverage:
  - id: D1
    description: "manifest MCP tool with 7 actions registered in server.ts"
    requirement: MAN-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts — 11 cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "manifest.sync reconciles against live API with dry_run and prune confirm gates"
    requirement: MAN-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts — sync/diff/prune cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "404 on manifest-cached UUID surfaces manifest.sync/diff recovery hints"
    requirement: MAN-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts — MAN-04 case"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-22
status: complete
---

# Phase 17 Plan 02: Manifest MCP Tool Summary

**manifest MCP tool with 7 cache/sync actions, live API reconciliation, and stale-UUID 404 hint injection — 11 RED scaffolds flipped GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-22T16:48:00Z
- **Completed:** 2026-07-22T16:51:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Shipped `handleManifestAction` with get/upsert/set/remove/clear/sync/diff dispatching to ManifestManager and Coolify API
- Registered `manifest` tool in server.ts with D-02/D-03/D-04/D-12/D-13/D-14/D-15 documentation
- Implemented remote-wins sync merge, dry_run planned diff, orphan retention, and confirm+prune gate
- Extended `toStructuredError` with stale-manifest 404 recovery hints via `ManifestManager.hasUuid` (MAN-04, D-15)
- Full suite green: 941 passed | 0 expected fail (941 total)

## Task Commits

1. **Task 1: Implement handleManifestAction with 7 actions + register in server.ts** - `647e275` (feat)
2. **Task 2: Inject stale-manifest 404 recovery hints into errors.ts** - `1e59238` (feat)

## Files Created/Modified

- `src/mcp/tools/manifest.ts` — manifestActionSchema, handleManifestAction, sync/diff reconciliation
- `src/mcp/server.ts` — registerTool('manifest') block
- `src/utils/errors.ts` — injectStaleManifestHints on COOLIFY_404
- `src/mcp/tools/manifest.test.ts` — flipped 11 Wave 0 scaffolds GREEN
- `src/mcp/server.test.ts` — 16-tool registration assertion

## Decisions Made

- `await reconcileWithRemote` in sync case — returned promise rejection escaped try/catch without await
- Updated server.test.ts tool count 15→16 with manifest registration checks
- Split MAN-04 scaffold flip into task 2 commit alongside errors.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Await sync reconciliation promise**
- **Found during:** Task 1 (MAN-04 test execution)
- **Issue:** `return reconcileWithRemote(...)` without await let rejection bypass wrapMcpError try/catch
- **Fix:** Changed to `return await reconcileWithRemote(...)`
- **Files modified:** `src/mcp/tools/manifest.ts`
- **Committed in:** `647e275`

**2. [Rule 3 - Blocking] Update server.test.ts for manifest registration**
- **Found during:** Task 1 (full suite)
- **Issue:** registerTool count 15→16 broke server registration test
- **Fix:** Expect 16 tools; assert manifest registerTool + handleManifestAction wiring
- **Files modified:** `src/mcp/server.test.ts`
- **Committed in:** `647e275`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Required for error envelope correctness and registration test green. No scope creep.

## Issues Encountered

None beyond un-awaited promise and registration count drift.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 17-03 can wire autoUpsert/autoRemove into application/service/database mutation handlers
- manifest.sync/diff ready for live UAT in Phase 18 harness
- 404 hint loop closed for stale manifest UUIDs across all API tools

## Self-Check: PASSED

- FOUND: src/mcp/tools/manifest.ts
- FOUND: src/mcp/server.ts (manifest registerTool)
- FOUND: src/utils/errors.ts (injectStaleManifestHints)
- FOUND: 647e275
- FOUND: 1e59238

---
*Phase: 17-local-manifest-sync*
*Completed: 2026-07-22*
