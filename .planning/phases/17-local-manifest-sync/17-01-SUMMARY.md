---
phase: 17-local-manifest-sync
plan: 01
subsystem: infra
tags: [manifest, zod, atomic-write, gitignore, project-root, vitest]

requires:
  - phase: 17-00
    provides: RED scaffolds for ManifestManager and resolveProjectRoot contracts
provides:
  - ManifestManager utility (load/save/upsert/remove/hasUuid/clear/autoUpsert/autoRemove)
  - resolveProjectRoot walk-up resolver with COOLIFY_MCP_TEST_WORKSPACE seam
  - Committed .coolify-manifest.example.json template (D-08)
affects: [17-02, 17-03]

tech-stack:
  added: []
  patterns:
    - "Atomic manifest write via temp file + renameSync (mirrors instance-registry.ts)"
    - "withWriteLock serializes full load-modify-save for concurrent upsert/remove"
    - "ensureGitignore idempotently appends .coolify/ on first manifest save (MAN-02)"
    - "Strict Zod schemas on all manifest nested objects — no token/secret fields"

key-files:
  created:
    - src/utils/manifest.ts
    - src/utils/project-root.ts
    - .coolify-manifest.example.json
  modified:
    - src/utils/manifest.test.ts
    - src/utils/project-root.test.ts

key-decisions:
  - "autoUpsert/autoRemove in same commit as core — husky pre-commit requires all it.fails resolved"
  - "chmodSync(0o555) on readonly-root in autoUpsert test — macOS tmp dirs writable without explicit deny"
  - "ensureGitignore called on every save — idempotent, satisfies MAN-02 without first-write flag"

patterns-established:
  - "Pattern: resolveProjectRoot walks .git → package.json → .coolify, COOLIFY_MCP_TEST_WORKSPACE overrides"
  - "Pattern: Manifest path confined to join(resolveProjectRoot(), '.coolify', 'manifest.json')"

requirements-completed: [MAN-01, MAN-02]

coverage:
  - id: D1
    description: "ManifestManager load/save/upsert/remove/hasUuid with atomic write and strict schemas"
    requirement: MAN-01
    verification:
      - kind: unit
        ref: "src/utils/manifest.test.ts — 7 core cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "ensureGitignore auto-appends .coolify/ on first write, idempotent on second"
    requirement: MAN-02
    verification:
      - kind: unit
        ref: "src/utils/manifest.test.ts — gitignore cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "resolveProjectRoot walk-up and COOLIFY_MCP_TEST_WORKSPACE test seam"
    verification:
      - kind: unit
        ref: "src/utils/project-root.test.ts — 5 cases"
        status: pass
    human_judgment: false
  - id: D4
    description: "autoUpsert/autoRemove propagate disk errors to caller (not swallowed)"
    verification:
      - kind: unit
        ref: "src/utils/manifest.test.ts — autoUpsert permission error case"
        status: pass
    human_judgment: false
  - id: D5
    description: "Committed example manifest template with placeholder UUIDs, no secrets"
    verification:
      - kind: other
        ref: "node -e JSON.parse(.coolify-manifest.example.json)"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-22
status: complete
---

# Phase 17 Plan 01: ManifestManager Utility Summary

**ManifestManager with atomic `.coolify/manifest.json` I/O, walk-up project-root resolver, gitignore safety, and autoUpsert hooks — 13 RED scaffolds flipped GREEN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-22T16:44:11Z
- **Completed:** 2026-07-22T16:46:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Shipped `resolveProjectRoot` with `.git` / `package.json` / `.coolify` walk-up and `COOLIFY_MCP_TEST_WORKSPACE` override
- Shipped `ManifestManager` with strict Zod schemas, atomic temp+rename saves, idempotent `ensureGitignore`, and write-lock serialization
- Added `autoUpsert` / `autoRemove` hooks that propagate disk/permission errors to callers (D-11 utility layer)
- Committed `.coolify-manifest.example.json` with placeholder UUIDs and no secrets (D-08)
- Full suite green: 930 passed | 11 expected fail (941 total)

## Task Commits

1. **Task 1: Implement resolveProjectRoot + ManifestManager core** - `3f78d44` (feat)
2. **Task 2: Add autoUpsert/autoRemove hooks + example template** - `1da295d` (feat)

**Plan metadata:** `e7308d8` (docs: complete plan)

## Files Created/Modified

- `src/utils/project-root.ts` — walk-up project root resolver with test workspace seam
- `src/utils/manifest.ts` — ManifestManager, Zod schemas, atomic I/O, gitignore, hooks API
- `.coolify-manifest.example.json` — committed example template (no secrets)
- `src/utils/manifest.test.ts` — flipped 8 RED scaffolds to GREEN
- `src/utils/project-root.test.ts` — flipped 5 RED scaffolds to GREEN

## Decisions Made

- Combined autoUpsert implementation with Task 1 commit — husky pre-commit failed when autoUpsert `it.fails` unexpectedly passed (missing method threw, satisfying catch block)
- Added `chmodSync(0o555)` in autoUpsert permission test — tmp workspace dirs writable on macOS without explicit deny

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged autoUpsert into Task 1 commit for husky green**
- **Found during:** Task 1 (pre-commit)
- **Issue:** `it.fails` autoUpsert test passed when method missing — TypeError caught by test body, husky blocked commit
- **Fix:** Implemented autoUpsert/autoRemove before first commit; flipped all scaffolds to `it`
- **Files modified:** `src/utils/manifest.ts`, `src/utils/manifest.test.ts`
- **Committed in:** `3f78d44`

**2. [Rule 1 - Bug] chmod readonly-root in autoUpsert permission test**
- **Found during:** Task 2 (autoUpsert test verification)
- **Issue:** Test named readOnlyRoot but directory remained writable — write succeeded, test would fail
- **Fix:** `chmodSync(readOnlyRoot, 0o555)` before call, restore `0o755` in finally
- **Files modified:** `src/utils/manifest.test.ts`
- **Committed in:** `3f78d44`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both required for husky green and correct permission-error assertion. No scope creep.

## Issues Encountered

None beyond husky gate requiring combined implementation commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 17-02 can implement `src/mcp/tools/manifest.ts` (get/upsert/set/remove/clear/sync/diff) using ManifestManager
- Plan 17-03 can wire autoUpsert/autoRemove into application/service/database mutation handlers
- `ManifestManager.hasUuid` ready for MAN-04 404 hint integration in errors.ts (17-02 scope)

## Self-Check: PASSED

- FOUND: src/utils/manifest.ts
- FOUND: src/utils/project-root.ts
- FOUND: .coolify-manifest.example.json
- FOUND: 3f78d44
- FOUND: 1da295d

---
*Phase: 17-local-manifest-sync*
*Completed: 2026-07-22*
