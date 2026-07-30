---
phase: 29-drift-heal
plan: 01
subsystem: api
tags: [manifest, audit, drift, FollowUpHint, DRIFT-01, DRIFT-03]

requires:
  - phase: 29-00
    provides: Wave 0 manifest.audit RED scaffolds
provides:
  - manifest.audit action with severity-tagged findings and FollowUpHint remediation
  - ManifestManager.exists() missing-manifest guard
  - buildManifestAuditFindings covering all D-04 drift axes
  - fetchLiveManifestSnapshot soft partials for audit reads
affects:
  - 29-02
  - 29-03

tech-stack:
  added: []
  patterns:
    - "Advisory-only manifest.audit — hints only, no sync/upsert/write from audit handler"
    - "Strict fetchRemoteManifest for diff/sync; softPartial allSettled snapshot for audit"

key-files:
  created:
    - src/utils/manifest-audit.ts
  modified:
    - src/utils/manifest.ts
    - src/mcp/tools/manifest.ts
    - src/mcp/tools/manifest.test.ts

key-decisions:
  - "D-06 approve-advisory-only — audit never mutates manifest or live Coolify state"
  - "diff_support included as supporting detail; manifest.diff contract unchanged"

patterns-established:
  - "ManifestAuditFinding envelope mirrors ScorecardFinding severity + FollowUpHint"

requirements-completed: [DRIFT-01, DRIFT-03]

coverage:
  - id: D1
    description: "manifest.audit returns findings with severity and FollowUpHint remediation"
    requirement: DRIFT-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts#manifest.audit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing manifest and COOLIFY_NO_INSTANCE paths with recovery hints"
    requirement: DRIFT-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts#missing manifest"
        status: pass
    human_judgment: false
  - id: D3
    description: "All D-04 drift axes, soft partials, read-only guarantees"
    requirement: DRIFT-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts#manifest.audit"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-30
status: complete
---

# Phase 29 Plan 01: manifest.audit Tracer Summary

**Advisory manifest.audit with FollowUpHint findings on all drift axes, soft partial live reads, and manifest.diff preserved.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-30T03:17:00Z
- **Completed:** 2026-07-30T03:21:00Z
- **Tasks:** 3 (checkpoint + tracer + expansion)
- **Files modified:** 4

## Accomplishments

- `manifest.audit` on existing manifest tool — findings[], rollup severity, summary counts, optional `partial` and `diff_support`
- `ManifestManager.exists()` gates audit before load; missing file → structured error + sync/upsert hints
- `buildManifestAuditFindings` covers local_orphan, remote_only, nesting, type, name, domain drift with remediation hints
- `fetchLiveManifestSnapshot` soft partials via `allSettled`; diff/sync keep strict `Promise.all`
- Nine Wave 0 `manifest.audit` scaffolds flipped GREEN

## Task Commits

1. **Task 1: D-06 advisory-only gate** — checkpoint auto-selected `approve-advisory-only` (no commit)
2. **Task 2+3: manifest.audit implementation** — `fc5dc51` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/utils/manifest-audit.ts` — finding builder, severity rollup, domain set compare
- `src/utils/manifest.ts` — `ManifestManager.exists()`
- `src/mcp/tools/manifest.ts` — audit action, shared snapshot fetch, advisory handler
- `src/mcp/tools/manifest.test.ts` — GREEN audit coverage (9 tests)

## Decisions Made

- D-06 advisory-only contract enforced — audit handler never calls save/sync/upsert
- `diff_support` carries reconciliation report as supporting detail only (D-03)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Read-only test seeds manifest before save/upsert spies**
- **Found during:** Task 3
- **Issue:** Upsert spy blocked seeding when set before `seedAuditInstanceAndManifest`
- **Fix:** Seed audit fixture first, then attach spies, then run audit
- **Files modified:** `src/mcp/tools/manifest.test.ts`
- **Verification:** `npx vitest run src/mcp/tools/manifest.test.ts -t "read-only"`
- **Committed in:** `fc5dc51`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-order fix only; no production scope change

## Issues Encountered

- Pre-commit `vitest related` failed on unrelated `application.ts` WIP on branch — stashed for manifest commit, stash retained

## User Setup Required

None

## Next Phase Readiness

- Plan 29-02 can implement `envs:promote` (out of scope for 29-01)
- Plan 29-03 can add capability keys `manifest_audit` / `envs_promote`

## Self-Check: PASSED

- FOUND: src/utils/manifest-audit.ts
- FOUND: src/utils/manifest.ts
- FOUND: src/mcp/tools/manifest.ts
- FOUND: src/mcp/tools/manifest.test.ts
- FOUND: fc5dc51

---
*Phase: 29-drift-heal*
*Completed: 2026-07-30*
