---
phase: 27-branding-docs-stale-fix
plan: 02
subsystem: docs
tags: [mcp, branding, cursor, icon-verify, BRND-02, D-04, D-05, D-06]

requires:
  - phase: 27-01
    provides: "V1 dual icons build pipeline and readPackageVersion 1.0.1"
provides:
  - "cursor-icon-verify.md v3.2 maintainer evidence for dist/ and npx paths"
  - "D-05 client limitation documented with initialize dump + conclusion table"
affects:
  - 27-03

tech-stack:
  added: []
  patterns:
    - "Path B npx verify uses sh -c cwd /tmp to avoid awesome-coolify repo name collision"

key-files:
  created: []
  modified:
    - docs/assets/cursor-icon-verify.md

key-decisions:
  - "D-04 proceed-d04: dual-path verify (dist/ + npx) completed"
  - "D-05: client limitation accepted — server emits icons correctly, Cursor UI shows letter A only"

patterns-established:
  - "BRND-02 verify doc in-place refresh per D-06 (no parallel v3.2 file)"

requirements-completed: [BRND-02]

coverage:
  - id: D1
    description: "cursor-icon-verify.md documents Path A dist/ and Path B npx with UI observations and initialize excerpts"
    requirement: BRND-02
    verification:
      - kind: manual_procedural
        ref: "docs/assets/cursor-icon-verify.md#Path A, #Path B"
        status: pass
    human_judgment: true
    rationale: "Cursor MCP list UI observation requires maintainer visual check"
  - id: D2
    description: "Conclusion table covers data URI, CDN, version 1.0.1, jsDelivr 200, tools visible, custom icon per path"
    requirement: BRND-02
    verification:
      - kind: manual_procedural
        ref: "docs/assets/cursor-icon-verify.md#Conclusion"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-05 pass: client limitation documented with initialize dump for both paths"
    requirement: BRND-02
    verification:
      - kind: other
        ref: "node dist/index.js stdio initialize dump — version 1.0.1, icons[] length 3"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-29
status: complete
---

# Phase 27 Plan 02: BRND-02 Maintainer Icon Verify Summary

**Dual-path Cursor MCP verify documented — server emits data URI + CDN icons at 1.0.1; client shows letter A fallback only (D-05)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-28T23:30:00Z
- **Completed:** 2026-07-28T23:46:00Z
- **Tasks:** 3 (1 decision + 1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments

- Refreshed `cursor-icon-verify.md` v3.2 template (task 2, commit 7eb05de)
- Maintainer verified Path A (`dist/`) and Path B (`npx @1.0.1`) — both connect green, tools visible
- Outcome: **Client limitation (server correct)** per D-05 — generic letter **"A"** icon only on both paths
- Path B `sh -c "cd /tmp && exec npx -y awesome-coolify-mcp@1.0.1"` workaround documented for repo name collision
- Conclusion table filled: data URI ✓, CDN ✓, version 1.0.1 ✓, jsDelivr 200 ✓, tools ✓, custom icon ✗ both paths
- V1 baseline only — V2–V4 not needed (server correct)
- Initialize dump confirms `icons[]` length 3, version 1.0.1

## Task Commits

1. **Task 2: Refresh cursor-icon-verify.md structure** - `7eb05de` (docs)
2. **Task 3: BRND-02 maintainer verify evidence** - `edd84a3` (docs)

**Decisions (no separate commits):** D-04 proceed-d04 — locked in CONTEXT

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `docs/assets/cursor-icon-verify.md` — v3.2 maintainer verify record with both paths, conclusion table, Path B collision workaround

## Decisions Made

- **D-04 proceed-d04:** Dual-path verify (dist/ + npx) — completed with maintainer approval
- **D-05:** Accept client limitation — server handshake correct; Cursor UI does not render custom MCP icons

## Deviations from Plan

None - plan executed exactly as written. Screenshot marked pending per UI-SPEC empty-screenshot backstop (no PNG attached).

## Issues Encountered

- Path B plain `npx` from repo root fails due to package name collision with local `awesome-coolify` — resolved via `sh -c` + `/tmp` cwd documented in verify doc

## User Setup Required

None beyond maintainer Cursor verify (completed at checkpoint).

## Next Phase Readiness

- Plan 27-03: DOC-01 stale docs fix can proceed independently
- Screenshot `cursor-icon-verify.png` optional follow-up (metadata notes pending)

---
*Phase: 27-branding-docs-stale-fix*
*Completed: 2026-07-29*

## Self-Check: PASSED

- `docs/assets/cursor-icon-verify.md` FOUND
- Commits 7eb05de, edd84a3 FOUND
