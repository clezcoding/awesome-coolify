---
phase: 21-deploy-watch
plan: 03
subsystem: docs
tags: [deploy-watch, mcp-prompts, readme, watch-docs, WATCH-02]

requires:
  - phase: 21-deploy-watch
    plan: 02
    provides: deployment.watch runtime with timeout/backoff and dual-signal errors
provides:
  - Deploy MCP prompt watch-primary 4-step workflow with legacy wait:true note
  - Bilingual README Watch sections and deployment.watch table rows
  - D-16 Phase 22 SKILL-02 obligation noted without IDE skill pack files
affects: [22]

tech-stack:
  added: []
  patterns:
    - "Deploy prompt: deploy wait:false → deployment.watch → re-watch on timeout → clear fail/cancelled error"
    - "README EN/DE Watch sections mirror prompt recovery guidance (300s default, 3–30s backoff band)"

key-files:
  created: []
  modified:
    - src/mcp/prompts.ts
    - tests/mcp/prompts.test.ts
    - README.md
    - README.de.md

key-decisions:
  - "D-16 obligation in deploy prompt footnote and README Watch section — no .cursor/skills packs in Phase 21"
  - "Examples steer deploy+watch; wait:true retained only as legacy callout"

patterns-established:
  - "MCP deploy prompt documents bounded watch — no Future Phase 21 forward-ref"
  - "README Watch table: timeout 300s, interval 3–30s, re-watch recovery, fail not success"

requirements-completed: [WATCH-02]

coverage:
  - id: D1
    description: "Deploy MCP prompt watch-primary flow with re-watch, fail messaging, and wait:true legacy"
    requirement: WATCH-02
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts — deploy prompt recommends watch-primary flow"
        status: pass
    human_judgment: false
  - id: D2
    description: "README EN/DE Watch sections, deployment.watch table rows, Phase 22 SKILL note"
    requirement: WATCH-02
    verification:
      - kind: other
        ref: "rg deployment.watch + Watch/Beobachten + 300 + Phase 22 in README.md/README.de.md"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-25
status: complete
---

# Phase 21 Plan 03: Deploy Prompt + README Watch Docs Summary

**Watch-primary deploy MCP prompt and bilingual README sections — bounded timeout, re-watch recovery, wait:true legacy, D-16 Phase 22 note**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-25T06:29:00Z
- **Completed:** 2026-07-25T06:31:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Rewrote `deploy` MCP prompt to 4-step watch workflow; removed Phase 21 forward-ref; added legacy `wait:true` and Phase 22 SKILL-02 footnote
- Flipped `tests/mcp/prompts.test.ts` deploy case from `it.fails` to green `it` — full suite 1046/1046
- Added `watch` rows and Watch/Beobachten sections to README.md + README.de.md; updated happy-path examples to `deploy` + `watch`

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite deploy MCP prompt for watch-primary flow + flip prompts tests GREEN** - `0ce772c` (feat)
2. **Task 2: Add README.md and README.de.md Watch sections + deployment.watch table rows** - `d38bac8` (docs)

## Files Created/Modified

- `src/mcp/prompts.ts` — watch-primary deploy assistant content (4 steps + legacy note + D-16 footnote)
- `tests/mcp/prompts.test.ts` — deploy prompt assertions GREEN
- `README.md` — deployment table `watch` row, Watch section, example updates
- `README.de.md` — parallel Beobachten section and German examples

## Decisions Made

- D-16 obligation placed in both deploy prompt and README Watch callout — no IDE skill pack directories added
- Examples use `wait: false` + `deployment.watch` instead of `wait: true` as primary path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WATCH-02 satisfied via prompt + bilingual README
- Phase 21 complete (plans 00–03); ready for `/gsd-verify-work` on Phase 21
- Phase 22 should implement IDE skill packs documenting watch per SKILL-02 / D-16

---
*Phase: 21-deploy-watch*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/mcp/prompts.ts
- FOUND: tests/mcp/prompts.test.ts
- FOUND: README.md
- FOUND: README.de.md
- FOUND: .planning/phases/21-deploy-watch/21-03-SUMMARY.md
- FOUND: 0ce772c (Task 1)
- FOUND: d38bac8 (Task 2)
