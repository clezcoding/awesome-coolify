---
phase: 04-app-deploy-lifecycle
plan: 04
subsystem: api
tags: [coolify, mcp, batch-deploy, tags, vitest]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: triggerDeploy, pollDeploymentUntilTerminal, logsAvailableHint, resolveAppMutationUuid from 04-01/04-02
provides:
  - resolveTagUuids helper for /resources tag filtering with unmatched-tag fallback
  - handleApplicationDeploy batch branch (uuids/tags/tag, dedup, best-effort sequential)
  - Batch result array with per-app logs_available FollowUpHint (DEP-03)
affects: [04-05-integration-signoff]

tech-stack:
  added: []
  patterns:
    - Tag resolution via raw /resources records — no GET /applications?tag= fallback
    - Batch deploy best-effort per-app try/catch — one failure does not abort others (D-13)
    - Sequential batch wait-mode reuses pollDeploymentUntilTerminal per app (D-14)
    - Unmatched tags prepended as failed entries in results array (D-12)

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "resolveTagUuids file-scope only — no export unless 04-05 needs it"
  - "Missing tags field on /resources items surfaces per-tag error — no crash, no alternate endpoint"
  - "Batch empty with only unmatched tags returns results array — not COOLIFY_422 throw"
  - "Per-app timeout resets in sequential batch wait — pollDeploymentUntilTerminal starts fresh each call"

patterns-established:
  - "Batch deploy envelope: { results: Array<per-app entry | per-tag error> } — aggregated, not streaming"
  - "Tag match: case-insensitive exact string on tags[] array entries from raw /resources application records"

requirements-completed: [DEP-02, DEP-03]

coverage:
  - id: D1
    description: Batch deploy by uuids array with per-app queued results and logs_available hint
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy uuids array calls triggerDeploy per uuid with queued results
        status: pass
    human_judgment: false
  - id: D2
    description: Batch deploy by tags array resolves apps from /resources tag field
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy tags array resolves and deploys matching apps
        status: pass
    human_judgment: false
  - id: D3
    description: Mixed uuids+tags dedup via Set — no double-deploy when uuid also matches tag
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy uuids and tags dedup when uuid also matches tag
        status: pass
    human_judgment: false
  - id: D4
    description: Single tag field expands to tags array (D-17)
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy single tag field expands to tags array
        status: pass
    human_judgment: false
  - id: D5
    description: Unmatched tags surface per-tag failed entries without aborting matched deploys (D-12)
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#unmatched tag surfaces failed entry without aborting matched tags
        status: pass
    human_judgment: false
  - id: D6
    description: Sequential batch wait-mode polls apps one at a time in input order (D-14)
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#wait:true batch deploys and polls sequentially in input order
        status: pass
    human_judgment: false
  - id: D7
    description: Best-effort partial failure — one app 404 does not abort others (D-13)
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#partial failure on one uuid does not abort others
        status: pass
    human_judgment: false
  - id: D8
    description: Every successful batch entry carries logs_available FollowUpHint available_in_phase 5 (DEP-03)
    requirement: DEP-03
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#deploy uuids array calls triggerDeploy per uuid with queued results
        status: pass
    human_judgment: false
  - id: D9
    description: Missing tags field on /resources items surfaces per-tag error without crash
    requirement: DEP-02
    verification:
      - kind: unit
        ref: src/mcp/tools/application.test.ts#missing tags field on resources surfaces per-tag error without crash
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 04 Summary

**Batch deploy by uuids/tags with dedup, best-effort sequential iteration, and per-app logs_available hints — no inline logs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-12T23:52:00Z
- **Completed:** 2026-07-12T23:55:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- DEP-02 shipped: batch deploy via `uuids: string[]` and/or `tags: string[]` with `tag` single-field shortcut (D-11/D-17)
- D-12 shipped: unmatched tags return per-tag `{ tag, status: 'failed', error }` entries — batch continues for matched apps
- D-13 shipped: best-effort per-app try/catch — one failure does not abort others
- D-14 shipped: sequential batch wait-mode reuses `pollDeploymentUntilTerminal` with per-app timeout reset
- DEP-03 reinforced: every successful batch entry includes `logs_available` FollowUpHint — no inline logs
- `resolveTagUuids` helper filters raw `/resources` application records by case-insensitive tag match
- 04-02 TEMPORARY not-implemented guard removed

## Task Commits

Each task was committed atomically:

1. **Task 1: resolveTagUuids + batch branch + tests** - `1d30c38` (test), `33c2f8a` (feat)

**Plan metadata:** `2349152` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/application.ts` - Added `resolveTagUuids`, `handleBatchApplicationDeploy`, replaced batch guard
- `src/mcp/tools/application.test.ts` - 8 batch deploy test cases (uuids, tags, dedup, tag shortcut, unmatched, sequential wait, partial failure, missing tags field)

## Decisions Made

- `resolveTagUuids` stays file-scope — not exported unless 04-05 integration test needs it
- No fallback to `GET /applications?tag=` — spike did not validate; per-tag error surfaced instead
- Per-app timeout resets in sequential batch wait (CONTEXT discretion)
- Unmatched-tags-only batch returns results array instead of throwing COOLIFY_422

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 3 complete; 04-05 integration sign-off ready (deploy-flow.test.ts + VALIDATION.md)
- Full suite green (263 tests); `npm run build` exit 0

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/application.test.ts` — PASS (33 tests)
- `npx vitest run` — PASS (263 tests, no regression)
- `npm run build` — PASS (tsup exit 0)

---
*Phase: 04-app-deploy-lifecycle*
*Completed: 2026-07-13*
