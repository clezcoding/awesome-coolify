---
phase: 16-coolify-cloud-server-branding
plan: 01
subsystem: api
tags: [coolify-cloud, error-mapping, hostname-detection, recovery-hints, vitest]

requires:
  - phase: 16-00
    provides: RED scaffolds in errors.test.ts for cloud hostname 403/404 mapping
provides:
  - COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED error codes with recovery hints
  - isCloudUrl(url) hostname helper exported from errors.ts
  - Cloud-aware toStructuredError via per-request URL inspection (no global state)
affects: [16-02, 16-03, 16-04]

tech-stack:
  added: []
  patterns:
    - "Cloud detection from request URL hostname only — coolify.io / *.coolify.io (D-03)"
    - "mapApiError isCloud branch intercepts cloud 403/404 before statusToCode"

key-files:
  created: []
  modified:
    - src/utils/errors.ts
    - src/utils/errors.test.ts

key-decisions:
  - "Cloud 403/404 mapped via isCloud flag on mapApiError — self-hosted 403 still falls through to COOLIFY_500"
  - "COOLIFY_CLOUD_UNSUPPORTED hint[0] uses 'Endpoint not supported or not available on Coolify Cloud' for test regex match"

patterns-established:
  - "Per-error isCloud from fetchError.request — no module-level mutable cloud state (Pitfall 1)"

requirements-completed: [CLD-02]

coverage:
  - id: D1
    description: "CoolifyErrorCode union includes COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#CoolifyErrorCode union includes COOLIFY_CLOUD_FORBIDDEN"
        status: pass
    human_judgment: false
  - id: D2
    description: "RECOVERY_HINTS entries for cloud codes with actionable EN hints"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#RECOVERY_HINTS defines COOLIFY_CLOUD_FORBIDDEN"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cloud hostname HTTP 403 → COOLIFY_CLOUD_FORBIDDEN with team-scoped token hints"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#maps app.coolify.io HTTP 403 to COOLIFY_CLOUD_FORBIDDEN"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cloud hostname HTTP 404 → COOLIFY_CLOUD_UNSUPPORTED with endpoint hints"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#maps app.coolify.io HTTP 404 to COOLIFY_CLOUD_UNSUPPORTED"
        status: pass
    human_judgment: false
  - id: D5
    description: "Self-hosted hostname 403 does not map to COOLIFY_CLOUD_* codes (D-03)"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#self-hosted hostname 403 does not map"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-22
status: complete
---

# Phase 16 Plan 01: Cloud Error Codes Summary

**Hostname-based isCloudUrl + COOLIFY_CLOUD_FORBIDDEN/UNSUPPORTED codes route cloud 403/404 via request URL inspection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-22T01:35:00Z
- **Completed:** 2026-07-22T01:38:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Extended `CoolifyErrorCode` union with `COOLIFY_CLOUD_FORBIDDEN` and `COOLIFY_CLOUD_UNSUPPORTED`
- Added `RECOVERY_HINTS` entries with team-scoped token and endpoint-not-supported guidance
- Exported `isCloudUrl(url)` helper matching `inferInstanceType` hostname logic
- Wired `toStructuredError` to inspect `fetchError.request` URL and forward `isCloud` to `mapApiError`
- Flipped all 6 Wave 0 `it.fails` scaffolds in `errors.test.ts` to GREEN (38/38 pass)

## Task Commits

1. **Task 1: errors.ts — add cloud codes + isCloudUrl + cloud-aware toStructuredError/mapApiError** - `d2c6e2b` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/utils/errors.ts` — two cloud codes, RECOVERY_HINTS, `isCloudUrl`, cloud branches in `mapApiError`, request URL inspection in `toStructuredError`
- `src/utils/errors.test.ts` — Wave 0 scaffolds flipped from `it.fails` to `it`

## Decisions Made

- Cloud 403 on self-hosted still maps to `COOLIFY_500` (403 not in `statusToCode`) — cloud 403 intercepted only when `isCloud=true`
- First `COOLIFY_CLOUD_UNSUPPORTED` hint phrased to satisfy test regex while preserving plan intent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted COOLIFY_CLOUD_UNSUPPORTED hint wording for regex match**
- **Found during:** Task 1 (verification)
- **Issue:** Plan-specified hint "This endpoint is not available or behaves differently..." failed test regex `/Endpoint not supported|not available on Coolify Cloud/i` on `recoveryHints[0]`
- **Fix:** Changed hint[0] to "Endpoint not supported or not available on Coolify Cloud — ..."
- **Files modified:** `src/utils/errors.ts`
- **Verification:** `npx vitest run src/utils/errors.test.ts` — 38/38 GREEN
- **Committed in:** `d2c6e2b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor wording tweak; semantics unchanged. No scope creep.

## TDD Gate Compliance

- RED gate: Wave 0 scaffolds from Plan 16-00 (`82b088b`)
- GREEN gate: `feat(16-01)` commit `d2c6e2b` — all cloud-mapping scaffolds pass
- REFACTOR gate: N/A

## Issues Encountered

None beyond hint wording regex alignment (auto-fixed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-02 can wire `instance.cloud-info` action using `isCloudUrl` from errors.ts
- Plan 16-03 can wire McpServer branding metadata
- Cloud error path ready for live Coolify Cloud API failures

---
*Phase: 16-coolify-cloud-server-branding*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: `.planning/phases/16-coolify-cloud-server-branding/16-01-SUMMARY.md`
- FOUND: `src/utils/errors.ts`
- FOUND: `src/utils/errors.test.ts`
- FOUND: commit `d2c6e2b`
