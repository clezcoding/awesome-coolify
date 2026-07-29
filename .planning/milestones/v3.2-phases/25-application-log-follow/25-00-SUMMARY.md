---
phase: 25-application-log-follow
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, log-follow, OBS-02, OBS-03]

requires: []
provides:
  - "Wave 0 RED scaffolds for log-follow-poll dedup/idle/timeout/429 (OBS-02)"
  - "Wave 0 RED scaffolds for application.logs follow schema + handler contract (OBS-02)"
  - "OBS-03 golden runtime/build one-shot tests unchanged as green it"
affects:
  - 25-01
  - 25-02
  - 25-03

tech-stack:
  added: []
  patterns:
    - "vitest it.fails RED scaffolds — husky green until Plan 25-01/25-02 flip GREEN"

key-files:
  created:
    - src/utils/log-follow-poll.test.ts
  modified:
    - src/mcp/tools/application.test.ts
    - src/mcp/tools/system.test.ts
    - src/utils/errors.test.ts
    - tests/integration/logs-service-db-flow.test.ts

key-decisions:
  - "follow+deployment_uuid scaffold uses schema-level follow-specific refine message — handler XOR already passes today"
  - "system.test.ts keeps four-key shape test green; five-key count is it.fails only"

patterns-established:
  - "Phase 25 Wave 0 mirrors Phase 21/24: it.fails locks acceptance intent; production handlers untouched"

requirements-completed: [OBS-02, OBS-03]

coverage:
  - id: D1
    description: "log-follow-poll RED scaffolds for dedup, idle, timeout, 429 backoff"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/utils/log-follow-poll.test.ts#followApplicationLogs"
        status: pass
    human_judgment: false
  - id: D2
    description: "application.logs follow schema accept + handler idle/timeout/422 RED scaffolds"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#application logs follow"
        status: pass
    human_judgment: false
  - id: D3
    description: "COOLIFY_LOG_FOLLOW_TIMEOUT recovery hints scaffold"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#COOLIFY_LOG_FOLLOW_TIMEOUT"
        status: pass
    human_judgment: false
  - id: D4
    description: "system.version five capability keys including application_logs_follow"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false
  - id: D5
    description: "integration schema accepts follow:true"
    requirement: OBS-02
    verification:
      - kind: integration
        ref: "tests/integration/logs-service-db-flow.test.ts#accepts follow:true"
        status: pass
    human_judgment: false
  - id: D6
    description: "OBS-03 golden runtime/build one-shot tests unchanged"
    requirement: OBS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#runtime logs|build logs"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-28
status: complete
---

# Phase 25 Plan 00: Wave 0 RED Scaffolds Summary

**11 it.fails RED targets lock OBS-02 follow contract and OBS-03 one-shot regression before log-follow-poll implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-27T23:53:15Z
- **Completed:** 2026-07-27T23:55:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `log-follow-poll.test.ts`: 4 `it.fails` for dedup, idle stop, timeout, 429 backoff continuation
- `application.test.ts`: schema accept + 3 follow handler `it.fails`; runtime/build golden tests untouched
- `errors.test.ts`: `COOLIFY_LOG_FOLLOW_TIMEOUT` recovery hint scaffold
- `system.test.ts`: five-key capabilities `it.fails` including `application_logs_follow`
- `logs-service-db-flow.test.ts`: follow schema acceptance flipped from rejection to `it.fails`
- No production files created or modified (prohibition verified)

## Task Commits

1. **Task 1: RED scaffolds for log-follow-poll unit tests** - `1a4d89d` (test)
2. **Task 2: RED scaffolds for application/errors/system/integration follow tests** - `3f0bfc9` (test)

## Files Created/Modified

- `src/utils/log-follow-poll.test.ts` - follow poll loop RED targets (dedup, idle, timeout, 429)
- `src/mcp/tools/application.test.ts` - follow schema/handler scaffolds; OBS-03 golden tests preserved
- `src/utils/errors.test.ts` - COOLIFY_LOG_FOLLOW_TIMEOUT hint scaffold
- `src/mcp/tools/system.test.ts` - five capability keys scaffold
- `tests/integration/logs-service-db-flow.test.ts` - follow:true schema acceptance scaffold

## Decisions Made

- follow+deployment_uuid test asserts follow-specific refine message at schema level — existing XOR handler path already returns COOLIFY_422 and would pass `it.fails` incorrectly
- Four-key capability shape test kept as green `it`; five-key count test is `it.fails` only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] follow+deployment_uuid it.fails passed on existing XOR superRefine**
- **Found during:** Task 2
- **Issue:** Handler test marked `it.fails` passed today via "both uuid and deployment_uuid" COOLIFY_422 — vitest reported "Expect test to fail"
- **Fix:** Switched to schema-level assertion requiring follow+deployment_uuid refine message
- **Files modified:** src/mcp/tools/application.test.ts
- **Committed in:** 3f0bfc9

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test intent preserved; scaffold fails until Plan 25-02 ships follow-specific superRefine.

## Issues Encountered

- Vitest 4.x removed `-x` CLI flag — verification used `vitest run` without `-x` (same green + expected-fail output)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 25-01 can implement `log-follow-poll.ts` and flip log-follow-poll.test.ts GREEN
- Plan 25-02 can extend application schema/handler and flip application/errors/system/integration scaffolds GREEN
- 11 `it.fails` cases pending flip across 5 test files

## Self-Check: PASSED

- FOUND: src/utils/log-follow-poll.test.ts
- FOUND: 1a4d89d
- FOUND: 3f0bfc9
- Verification: 134 tests (125 pass + 9 expected fail) across touched files

---
*Phase: 25-application-log-follow*
*Completed: 2026-07-28*
