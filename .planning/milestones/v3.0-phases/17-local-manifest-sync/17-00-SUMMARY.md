---
phase: 17-local-manifest-sync
plan: 00
subsystem: testing
tags: [vitest, tdd, red-scaffold, manifest, project-root, it.fails]

requires: []
provides:
  - RED scaffolds for ManifestManager utility (load/upsert/remove/gitignore/atomic-write/autoUpsert)
  - RED scaffolds for manifest MCP tool (get/upsert/set/remove/clear/sync/diff + MAN-03/MAN-04)
  - RED scaffolds for resolveProjectRoot walk-up resolver
affects: [17-01, 17-02, 17-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 it.fails + dynamic import RED scaffolds — husky pre-commit green until 17-01/17-02 flip GREEN"
    - "COOLIFY_MCP_TEST_WORKSPACE tmp sandbox seam for manifest + project-root tests"

key-files:
  created:
    - src/utils/manifest.test.ts
    - src/mcp/tools/manifest.test.ts
    - src/utils/project-root.test.ts
  modified: []

key-decisions:
  - "it.fails + dynamic import statt static import — npm test bleibt grün unter husky"
  - "COOLIFY_MCP_TEST_WORKSPACE als Test-Hook für tmp workspace — Plan 17-01 verdrahtet Pfad"
  - "Manifest MCP sync/diff tests mocken api/client — keine Live-API-Calls in Wave 0"

patterns-established:
  - "Pattern: 8 it.fails in manifest.test.ts für ManifestManager utility contract"
  - "Pattern: 11 it.fails in manifest tool test für alle 7 actions + MAN-03 reconciliation + MAN-04 404 hints"
  - "Pattern: 5 it.fails in project-root.test.ts für .git / package.json / .coolify walk-up"

requirements-completed: []

coverage:
  - id: D1
    description: "ManifestManager utility RED contract (load/upsert/remove/gitignore/hasUuid/atomic/autoUpsert)"
    verification:
      - kind: unit
        ref: "src/utils/manifest.test.ts — 8 it.fails"
        status: pass
    human_judgment: false
  - id: D2
    description: "manifest MCP tool action RED scaffolds (get/upsert/set/remove/clear/sync/diff)"
    verification:
      - kind: unit
        ref: "src/mcp/tools/manifest.test.ts — 11 it.fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "resolveProjectRoot walk-up RED scaffolds (.git, package.json, .coolify, fallback, env seam)"
    verification:
      - kind: unit
        ref: "src/utils/project-root.test.ts — 5 it.fails"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-22
status: complete
---

# Phase 17 Plan 00: Wave 0 RED Test Scaffolds Summary

**24 it.fails RED scaffolds pin ManifestManager, manifest MCP tool, and resolveProjectRoot contracts for Plans 17-01/17-02**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-22T16:39:43Z
- **Completed:** 2026-07-22T16:42:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `src/utils/manifest.test.ts` with 8 `it.fails` cases covering ManifestManager load/upsert/remove/gitignore/hasUuid/atomic-write/autoUpsert contract
- Created `src/mcp/tools/manifest.test.ts` with 11 `it.fails` cases covering all 7 manifest actions plus MAN-03 reconciliation and MAN-04 stale-404 recovery hints
- Created `src/utils/project-root.test.ts` with 5 `it.fails` cases covering project-root walk-up and `COOLIFY_MCP_TEST_WORKSPACE` test seam
- Full suite green: 917 passed | 24 expected fail (941 total)

## Task Commits

1. **Task 1: Scaffold manifest.test.ts (utility)** - `a42723e` (test)
2. **Task 2: Scaffold manifest.test.ts (MCP tool)** - `a0f440e` (test)
3. **Task 3: Scaffold project-root.test.ts** - `7742db8` (test)

## Files Created/Modified

- `src/utils/manifest.test.ts` — ManifestManager utility RED scaffold (8 cases)
- `src/mcp/tools/manifest.test.ts` — manifest MCP tool RED scaffold (11 cases, mocked client)
- `src/utils/project-root.test.ts` — resolveProjectRoot RED scaffold (5 cases)

## Decisions Made

- `it.fails` + dynamic `import()` keeps husky pre-commit green while modules don't exist yet
- `COOLIFY_MCP_TEST_WORKSPACE` env seam mirrors Phase 15 `COOLIFY_MCP_TEST_REGISTRY_DIR` pattern
- Sync/diff tests mock `api/client` — no live Coolify API in Wave 0

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 17-01 can implement `src/utils/manifest.ts` + `src/utils/project-root.ts` and flip utility + project-root scaffolds GREEN
- Plan 17-02 can implement `src/mcp/tools/manifest.ts` and flip tool scaffolds GREEN
- All 24 RED cases encode the public contract — no test rewrites needed in downstream plans

## Self-Check: PASSED

- FOUND: src/utils/manifest.test.ts
- FOUND: src/mcp/tools/manifest.test.ts
- FOUND: src/utils/project-root.test.ts
- FOUND: a42723e
- FOUND: a0f440e
- FOUND: 7742db8

---
*Phase: 17-local-manifest-sync*
*Completed: 2026-07-22*
