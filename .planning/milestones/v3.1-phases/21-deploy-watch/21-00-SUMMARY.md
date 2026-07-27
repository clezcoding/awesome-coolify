---
phase: 21-deploy-watch
plan: 00
subsystem: testing
tags: [vitest, tdd, wave-0, red-scaffold, deploy-watch, it.fails]

requires:
  - phase: 19-dx-schemas-mcp-prompts
    provides: flat action schemas, actionsCatalog pattern, deploy prompt forward-ref
provides:
  - 14 it.fails RED scaffolds for deploy-watch-poll helper, deployment.watch action, deploy prompt
  - dynamic import pattern keeps tsup build green before Plan 21-01 ships helper
affects: [21-01, 21-02, 21-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED via vitest it.fails + dynamic import('./deploy-watch-poll.js')"
    - "deployment watch describe mirrors Phase 20 recipe Wave 0 layout"
    - "prompts.test.ts inverted from get-before-watch to watch-primary target"

key-files:
  created:
    - src/utils/deploy-watch-poll.test.ts
  modified:
    - src/mcp/tools/deployment.test.ts
    - tests/mcp/prompts.test.ts

key-decisions:
  - "it.fails statt bare it — husky pre-commit (full vitest) bleibt grün bis 21-01..21-03 flip GREEN"
  - "Schema-reject scaffolds assert refine-spezifische Messages, nicht nur unrecognized-key Fehler"
  - "setTimeout-Spy für Jitter-Bounds statt nicht-spezifizierter onDelay-Hook"

patterns-established:
  - "deploy-watch-poll.test.ts: 5 it.fails (terminal, timeout ohne status:timeout, jitter, 429, defaults)"
  - "deployment.test.ts describe('deployment watch'): 8 it.fails (schema + handler outcomes)"
  - "prompts.test.ts: 1 it.fails für WATCH-02 deploy prompt Zielshape"

requirements-completed: [WATCH-01, WATCH-02]

coverage:
  - id: D1
    description: "deploy-watch-poll RED scaffolds (terminal, timeout dual-path, Equal Jitter bounds, 429 continue, defaults)"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/utils/deploy-watch-poll.test.ts — 5 it.fails"
        status: pass
    human_judgment: false
  - id: D2
    description: "deployment.watch schema defaults/rejects and handler outcome RED scaffolds"
    requirement: WATCH-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/deployment.test.ts#deployment watch — 8 it.fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "deploy prompt watch-primary target (re-watch, fail messaging, wait:true legacy)"
    requirement: WATCH-02
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts — deploy it.fails"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-25
status: complete
---

# Phase 21 Plan 00: Wave 0 RED Test Scaffolds Summary

**14 vitest it.fails RED scaffolds lock WATCH-01/WATCH-02 contracts for deploy-watch-poll helper, deployment.watch action, and deploy prompt before implementation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-25T06:17:26Z
- **Completed:** 2026-07-25T06:18:54Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `src/utils/deploy-watch-poll.test.ts` with 5 `it.fails` cases: terminal exit, timeout `kind:'timeout'` without synthesizing `status:'timeout'`, Equal Jitter delay bounds via injectable `random`, 429 continue + Retry-After, default interval band 3s–30s
- Extended `src/mcp/tools/deployment.test.ts` with `describe('deployment watch')` — 8 `it.fails` for Zod defaults (300/3/30/false), interval refines, finished OK, `COOLIFY_WATCH_TIMEOUT` dual-signal, failed/cancelled error codes
- Rewrote deploy prompt test in `tests/mcp/prompts.test.ts` as `it.fails` targeting watch-primary 2–4 steps, timeout re-watch, clear fail messaging, and `wait:true` legacy note

## Task Commits

Each task was committed atomically:

1. **Task 1: Create deploy-watch-poll.test.ts RED scaffolds** - `6d1db40` (test)
2. **Task 2: Add deployment.test.ts watch describe** - `ee62f91` (test)
3. **Task 3: Rewrite prompts.test.ts deploy assertions** - `a899093` (test)

## Files Created/Modified

- `src/utils/deploy-watch-poll.test.ts` — NEW: poll helper RED contract with dynamic import + fake timers
- `src/mcp/tools/deployment.test.ts` — watch schema/handler `it.fails` block appended
- `tests/mcp/prompts.test.ts` — deploy prompt inverted to watch-primary target shape

## Decisions Made

- Schema-reject scaffolds assert refine-specific error messages (not generic unrecognized-key errors) so `it.fails` stays RED until Plan 21-02 adds watch Zod fields
- Jitter bounds tested via `setTimeout` spy rather than extending helper API with test-only hooks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 21-01 can implement `src/utils/deploy-watch-poll.ts` and flip `deploy-watch-poll.test.ts` `it.fails` → `it`
- Plan 21-02 can wire `deployment.watch` action and flip deployment watch scaffolds GREEN
- Plan 21-03 can update `prompts.ts` deploy content and flip prompts test GREEN
- Full suite: 1025 passed | 14 expected fail (1039 total)

---
*Phase: 21-deploy-watch*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/utils/deploy-watch-poll.test.ts
- FOUND: .planning/phases/21-deploy-watch/21-00-SUMMARY.md
- FOUND: 6d1db40 (Task 1)
- FOUND: ee62f91 (Task 2)
- FOUND: a899093 (Task 3)
