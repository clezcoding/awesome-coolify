---
phase: 28-instance-intelligence
plan: 02
subsystem: api
tags: [intelligence, scorecard, INTEL-01, INTEL-02, soft-partial, vitest]

requires:
  - phase: 28-01
    provides: "intelligence MCP tool shell + graph path; Wave 0 it.fails for scorecard"
provides:
  - "handleIntelligenceScorecard with four D-04 factors"
  - "findings[] with FollowUpHint recovery envelopes (INTEL-02)"
  - "deterministic score + score_breakdown (D-06)"
  - "Promise.allSettled soft partials per factor (D-17)"
affects:
  - 28-03
  - 28-04

tech-stack:
  added: []
  patterns:
    - "Scorecard composite via Promise.allSettled + toFactorError (diagnose.logs soft-partial spirit)"
    - "classifyIssues + generateHints reused; no handleDiagnoseAction"
    - "Sample cap 50 + concurrency 5 for deployments/backups N+1"

key-files:
  created: []
  modified:
    - src/mcp/tools/intelligence.ts
    - src/mcp/tools/intelligence.test.ts

key-decisions:
  - "Deductive score: start 100, −30 critical, −15 high, −5 info, floor 0"
  - "Deployments/backups collectors throw on per-item API failure so allSettled marks whole factor failed"
  - "Bracket access for finding['severity'] reads in scorecard path (agent write quirk on .severity)"

patterns-established:
  - "intelligence.scorecard returns severity, score, score_breakdown, factors, findings"
  - "Failed factor shape: factors.<name>.failed = { code, message } with redactSecrets"

requirements-completed: [INTEL-01, INTEL-02]

coverage:
  - id: D1
    description: "scorecard returns four factors + overall severity rollup"
    requirement: INTEL-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#scorecard"
        status: pass
    human_judgment: false
  - id: D2
    description: "findings[] carry severity + FollowUpHint-shaped recovery hints"
    requirement: INTEL-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#findings"
        status: pass
    human_judgment: false
  - id: D3
    description: "one factor reject leaves sibling factors populated with failed flag"
    requirement: INTEL-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#partial"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-30
status: complete
---

# Phase 28 Plan 02: Scorecard Factors + Findings Summary

**Rule-based `intelligence.scorecard` composite with four factors, severity-tagged findings/hints, and soft partials — no ML, no diagnose.action indirection.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-30T01:49:12Z
- **Completed:** 2026-07-30T01:58:24Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- `handleIntelligenceScorecard` ships deployments / backups / exited_resources / diagnose_scan factors (D-04)
- Findings aggregate with `critical|high|info` + structured FollowUpHint objects (INTEL-02, D-05)
- Soft partial: rejected deployments factor sets `failed` while siblings succeed (D-17)
- Transparent `score` + `score_breakdown` (D-06); sample caps 50 / concurrency 5 (T-28-06)

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Scorecard factors + findings/soft partials** - `51df530` (feat)
   - Single commit: husky `vitest related` requires findings/partial flips with implementation (it.fails that now pass otherwise fail the hook)

**Plan metadata:** _(pending docs commit)_

_Note: Separate RED commit blocked by lint-staged (related tests must pass)._

## Files Created/Modified

- `src/mcp/tools/intelligence.ts` - `handleIntelligenceScorecard` + factor collectors + `toFactorError`
- `src/mcp/tools/intelligence.test.ts` - Wave 0 scorecard/findings/partial `it.fails` → green `it()`

## Decisions Made

- Deductive scoring weights per plan discretion (100/−30/−15/−5)
- Factor-level failure (not per-app soft-fail) so partial test sees `factors.deployments.failed`
- Bracket property reads for `severity` fields in scorecard aggregation path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Combined Task 1+2 into one commit**
- **Found during:** Task 1 commit
- **Issue:** lint-staged runs all related intelligence tests; leaving findings/partial as `it.fails` fails with "Expect test to fail" once scorecard is implemented
- **Fix:** Flip all three Wave 0 describes in the same feat commit
- **Files modified:** `src/mcp/tools/intelligence.test.ts`
- **Verification:** vitest scorecard|findings|partial green
- **Committed in:** `51df530`

**2. [Rule 1 - Bug] Avoid `.severityity` member expressions in scorecard path**
- **Found during:** Task 1 GREEN
- **Issue:** Agent write path corrupted `.severityity` → `.severityityity`, making severity rollup undefined
- **Fix:** Use bracket access `obj['severity']` for reads in scorecard helpers
- **Files modified:** `src/mcp/tools/intelligence.ts`, test assertions
- **Verification:** scorecard returns severity in `{critical,high,info,ok}`
- **Committed in:** `51df530`

---

**Total deviations:** 2 auto-fixed (1× Rule 3, 1× Rule 1)
**Impact on plan:** Correctness only; no scope creep. Cleanup still deferred to 28-04.

## Issues Encountered

- TDD RED commit not landable under husky related-test gate — verified RED locally then shipped GREEN with flips

## User Setup Required

None

## Next Phase Readiness

- INTEL-01/02 green; impact/janitor (28-03) and cleanup (28-04) still `COOLIFY_NOT_IMPLEMENTED`
- Graph path unchanged and still green

## Self-Check: PASSED

- FOUND: `src/mcp/tools/intelligence.ts` (`handleIntelligenceScorecard`)
- FOUND: commit `51df530`
- FOUND: scorecard/findings/partial vitest green
