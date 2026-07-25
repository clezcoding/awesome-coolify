---
phase: 20-recipes-service-list-types
plan: 04
subsystem: api
tags: [recipe, create-git-app, MANIFEST_HINT, D-20, recoveryHints, gap-closure]

requires:
  - phase: 20-recipes-service-list-types
    provides: create-git-app handler and Wave 2 tests (20-02); create-one-click MANIFEST_HINT pattern (20-02)
provides:
  - create-git-app error envelopes append canonical MANIFEST_HINT on Zod, missing build_pack, and API failure paths
  - recipe.test.ts D-20 regression guard for create-git-app mirroring create-one-click
affects: []

tech-stack:
  added: []
  patterns:
    - "appendManifestHint helper dedupes MANIFEST_HINT on recoveryHints arrays"
    - "rethrowGitAppApiErrorWithManifestHint wraps createPublicApplication/triggerDeploy CoolifyApiError"

key-files:
  created: []
  modified:
    - src/mcp/tools/recipe.ts
    - src/mcp/tools/recipe.test.ts

key-decisions:
  - "Shared appendManifestHint helper for throwValidationError and handleCreateGitApp paths"
  - "Omit-repo_path probe for D-20 test — same Zod path as D-11, cheapest green assertion"

patterns-established:
  - "create-git-app error parity with create-one-click: all validation and API errors carry soft manifest/instance hint"

requirements-completed: [RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04]

coverage:
  - id: D1
    description: "create-git-app Zod and runtime errors append MANIFEST_HINT to recoveryHints (D-20 / truth #14)"
    requirement: RECIPE-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#error result carries soft manifest hint suggesting instance param or manifest context per D-20 (create-git-app)"
        status: pass
    human_judgment: false
  - id: D2
    description: "create-git-app API CoolifyApiError from createPublicApplication/triggerDeploy includes MANIFEST_HINT"
    requirement: RECIPE-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.ts#rethrowGitAppApiErrorWithManifestHint"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-25
status: complete
---

# Phase 20 Plan 04: D-20 create-git-app Gap Closure Summary

**create-git-app error recoveryHints now carry canonical MANIFEST_HINT on Zod validation, missing build_pack, and Coolify API failure paths — closing verification truth #14**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-25T03:13:00Z
- **Completed:** 2026-07-25T03:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `throwValidationError` appends `MANIFEST_HINT` when `args.action === 'create-git-app'`
- `handleCreateGitApp` missing-`build_pack` throw and API error rethrows include manifest hint via `appendManifestHint`
- New create-git-app D-20 test mirrors create-one-click soft manifest hint assertion
- create-one-click and create-app-db MANIFEST_HINT paths unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Append MANIFEST_HINT on create-git-app Zod and CoolifyApiError paths (D-20)** - `d835ced` (feat)
2. **Task 2: Add create-git-app D-20 recoveryHints regression test** - `4619c0f` (test)

**Plan metadata:** `22b6087` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/recipe.ts` - appendManifestHint helper; MANIFEST_HINT on create-git-app error paths
- `src/mcp/tools/recipe.test.ts` - D-20 create-git-app recoveryHints assertion

## Decisions Made

- Used shared `appendManifestHint` helper for dedupe across Zod and runtime paths
- D-20 test probes omit-`repo_path` Zod path (same as D-11) for cheapest regression guard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Truth #14 / D-20 gap closed for create-git-app; phase ready for re-verification via `/gsd-verify-work`
- Phase 20 not marked complete until verifier passes 14/14 truths

## Self-Check: PASSED

- FOUND: src/mcp/tools/recipe.ts
- FOUND: src/mcp/tools/recipe.test.ts
- FOUND: d835ced
- FOUND: 4619c0f

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-25*
