---
phase: 27-branding-docs-stale-fix
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, branding, doc-parity, BRND-01, DOC-01]

requires: []
provides:
  - "server.test.ts BRND-01/D-08 it.fails branding block extensions"
  - "server-icons.test.ts buildMcpServerIcons unit RED scaffolds"
  - "doc-version-parity.test.ts DOC-01 PROJECT opener gate"
affects:
  - 27-01
  - 27-03

tech-stack:
  added: []
  patterns:
    - "vitest it.fails RED scaffolds — husky green until Plans 27-01/27-03 flip GREEN"

key-files:
  created:
    - src/mcp/server-icons.test.ts
    - tests/integration/doc-version-parity.test.ts
  modified:
    - src/mcp/server.test.ts

key-decisions:
  - "BRND-03 jsDelivr test accepts inline URL or icons: buildMcpServerIcons() — survives 27-01 refactor"
  - "Phase 27 Wave 0 mirrors Phase 24/26: it.fails locks acceptance intent; production handlers untouched"

patterns-established:
  - "Wave 0 Nyquist RED: ten it.fails scaffolds lock icon contract + DOC opener before implementation"

requirements-completed: [BRND-01, DOC-01]

coverage:
  - id: D1
    description: "server.test.ts it.fails for buildMcpServerIcons import, readPackageVersion, data URI + jsDelivr shape"
    requirement: BRND-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#McpServer branding metadata"
        status: pass
    human_judgment: false
  - id: D2
    description: "server-icons.test.ts five it.fails for buildMcpServerIcons length, ordering, CDN URLs, mimeType"
    requirement: BRND-01
    verification:
      - kind: unit
        ref: "src/mcp/server-icons.test.ts#buildMcpServerIcons"
        status: pass
    human_judgment: false
  - id: D3
    description: "doc-version-parity.test.ts it.fails for PROJECT.md opener 1.0.1 / no pending Version Packages"
    requirement: DOC-01
    verification:
      - kind: integration
        ref: "tests/integration/doc-version-parity.test.ts#doc version parity"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-29
status: complete
---

# Phase 27 Plan 00: Wave 0 RED Scaffolds Summary

**Ten it.fails scaffolds lock BRND-01 icon contract (buildMcpServerIcons, data URI first, readPackageVersion) and DOC-01 PROJECT opener gate before Plan 27-01 implementation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T22:56:00Z
- **Completed:** 2026-07-28T22:59:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended `McpServer branding metadata` with four `it.fails` cases for `buildMcpServerIcons` import, `readPackageVersion` version wire-up, and data URI + jsDelivr icon shape
- Created `server-icons.test.ts` with five `it.fails` cases covering array length, D-02 ordering, dual CDN URLs, and mimeType
- Created `doc-version-parity.test.ts` with `it.fails` gate rejecting stale pending Version Packages opener in PROJECT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: RED server.test.ts BRND-01 + D-08 branding scaffolds** - `91f5599` (test)
2. **Task 2: RED server-icons.test.ts buildMcpServerIcons shape scaffolds** - `70ab28d` (test)
3. **Task 3: RED DOC-01 PROJECT opener stale-string gate** - `bc30cd9` (test)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `src/mcp/server.test.ts` — four new `it.fails` in branding block; jsDelivr test tolerates future `server-icons.ts` refactor
- `src/mcp/server-icons.test.ts` — five `it.fails` for `buildMcpServerIcons()` shape contract
- `tests/integration/doc-version-parity.test.ts` — DOC-01 opener version parity `it.fails` gate

## Decisions Made

- BRND-03 jsDelivr assertion accepts inline CDN URL **or** `icons: buildMcpServerIcons()` — survives Plan 27-01 without test rewrite
- Production `server.ts` / `server-icons.ts` untouched per Wave 0 prohibition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 27-01 can implement `buildMcpServerIcons`, wire `readPackageVersion` in constructor, and flip `it.fails` → `it`
- Plan 27-03 can fix PROJECT.md opener and flip doc-version-parity scaffold GREEN

## Self-Check: PASSED

- FOUND: src/mcp/server.test.ts
- FOUND: src/mcp/server-icons.test.ts
- FOUND: tests/integration/doc-version-parity.test.ts
- FOUND: 91f5599
- FOUND: 70ab28d
- FOUND: bc30cd9

---
*Phase: 27-branding-docs-stale-fix*
*Completed: 2026-07-29*
