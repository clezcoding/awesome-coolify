---
phase: 27-branding-docs-stale-fix
plan: 01
subsystem: api
tags: [mcp, branding, icons, data-uri, readPackageVersion, BRND-01, D-01, D-08]

requires:
  - phase: 27-00
    provides: "Wave 0 it.fails scaffolds for icon contract and version parity"
provides:
  - "Build-time mcp-icon-192.png base64 embed via generate-mcp-icon-data.mjs"
  - "buildMcpServerIcons() dual data URI + jsDelivr CDN entries"
  - "McpServer icons and version wired to buildMcpServerIcons + readPackageVersion"
affects:
  - 27-02
  - 27-03

tech-stack:
  added: []
  patterns:
    - "Pre-tsup icon generator writes mcp-icon-data.ts for npm-safe embed (no runtime docs/ read)"
    - "data URI first, CDN multi-size after per D-01/D-02"

key-files:
  created:
    - scripts/generate-mcp-icon-data.mjs
    - src/mcp/mcp-icon-data.ts
    - src/mcp/server-icons.ts
  modified:
    - package.json
    - src/mcp/server.ts
    - src/mcp/server-icons.test.ts
    - src/mcp/server.test.ts

key-decisions:
  - "D-01 proceed-d01: dual icons[] data URI + jsDelivr CDN multi-size (locked in CONTEXT)"
  - "D-08 proceed-d08: version via readPackageVersion() matching package.json 1.0.1"

patterns-established:
  - "buildMcpServerIcons() centralizes icon contract; server.ts constructor delegates icons + version"

requirements-completed: [BRND-01]

coverage:
  - id: D1
    description: "npm run build embeds data:image/png;base64 in dist/index.js"
    requirement: BRND-01
    verification:
      - kind: other
        ref: "npm run build && node -e dist base64 check"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildMcpServerIcons returns 3 entries: data URI 192x192 first, favicon-32 CDN, mcp-icon-192 CDN"
    requirement: BRND-01
    verification:
      - kind: unit
        ref: "src/mcp/server-icons.test.ts#buildMcpServerIcons"
        status: pass
    human_judgment: false
  - id: D3
    description: "McpServer constructor uses buildMcpServerIcons() and readPackageVersion()"
    requirement: BRND-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#McpServer branding metadata"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-29
status: complete
---

# Phase 27 Plan 01: Dual Icons Build Pipeline Summary

**Build-time mcp-icon-192 base64 embed, buildMcpServerIcons dual data URI + jsDelivr CDN, readPackageVersion in McpServer constructor — BRND-01 tracer slice GREEN**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-28T22:59:00Z
- **Completed:** 2026-07-28T23:01:03Z
- **Tasks:** 4 (2 decision checkpoints + tracer + auto)
- **Files modified:** 7

## Accomplishments

- `scripts/generate-mcp-icon-data.mjs` reads `docs/assets/mcp-icon-192.png`, writes `src/mcp/mcp-icon-data.ts` before tsup
- `buildMcpServerIcons()` returns 3 PNG entries: data URI 192×192 first, jsDelivr favicon-32 + mcp-icon-192
- `server.ts` uses `icons: buildMcpServerIcons()` and `version: readPackageVersion()` (1.0.1)
- All Wave 0 `server-icons.test.ts` and branding `server.test.ts` assertions GREEN
- `dist/index.js` contains embedded `data:image/png;base64,` substring after build

## Task Commits

Each task was committed atomically:

1. **Task 2: End-to-end dual icons build pipeline — V1 baseline** - `0f65f12` (feat)
2. **Task 4: D-08 version parity + flip server.test.ts GREEN** - `3d0efff` (feat)

**Decisions (no separate commits):** D-01 proceed-d01, D-08 proceed-d08 — locked in 27-CONTEXT.md

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `scripts/generate-mcp-icon-data.mjs` — PNG → base64 module generator
- `src/mcp/mcp-icon-data.ts` — auto-generated `MCP_ICON_192_BASE64` constant
- `src/mcp/server-icons.ts` — `buildMcpServerIcons()` export
- `package.json` — build script prepends icon generator
- `src/mcp/server.ts` — icons + version wire-up
- `src/mcp/server-icons.test.ts` — five GREEN unit tests
- `src/mcp/server.test.ts` — branding metadata assertions GREEN

## Decisions Made

- **D-01 proceed-d01:** Dual icons[] (data URI primary + jsDelivr CDN multi-size) per locked CONTEXT
- **D-08 proceed-d08:** `readPackageVersion()` replaces literal `0.1.0` in McpServer constructor

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Partial server.test.ts flips in tracer commit**
- **Found during:** Task 2 (tracer)
- **Issue:** Husky lint-staged `vitest related` failed — mimeType constructor assertion broken after refactor; three `it.fails` scaffolds passed but still marked fails
- **Fix:** Updated BRND-03 mimeType test to assert via `buildMcpServerIcons()`; flipped import/constructor/data-URI `it.fails` to `it` in same commit as tracer
- **Files modified:** `src/mcp/server.test.ts`
- **Verification:** `npm test -- src/mcp/server.test.ts` passes
- **Committed in:** `0f65f12`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Husky gate required co-committing partial D-08 test flips; version wire-up remained in Task 4 commit per plan intent.

## Issues Encountered

None beyond husky co-commit deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 27-02: maintainer Cursor icon verify (BRND-02) can proceed on working dual-icons dist
- Plan 27-03: docs stale fix (DOC-01) independent of icon pipeline

---
*Phase: 27-branding-docs-stale-fix*
*Completed: 2026-07-29*

## Self-Check: PASSED

- All key files FOUND
- Commits 0f65f12, 3d0efff FOUND
