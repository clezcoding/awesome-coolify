---
phase: 25-application-log-follow
plan: 01
subsystem: api
tags: [log-follow, polling, OBS-02, application.logs, vitest]

requires:
  - phase: 25-application-log-follow
    provides: Wave 0 RED scaffolds for follow contract tests
provides:
  - followApplicationLogs poll loop with dedup, idle, timeout, 429 backoff
  - handleApplicationLogsFollow branch on application.logs follow:true
  - COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal timeout error with partial logs_lines
  - Exported deploy-watch-poll nextDelayMs/sleep for shared backoff math
affects:
  - 25-02
  - 25-03

tech-stack:
  added: []
  patterns:
    - "Log follow poll sibling of deploy-watch-poll — idle/dedup instead of terminal status"
    - "Phase 21 dual-signal timeout on follow budget exhaustion"

key-files:
  created:
    - src/utils/log-follow-poll.ts
  modified:
    - src/utils/deploy-watch-poll.ts
    - src/utils/log-follow-poll.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - tests/integration/logs-service-db-flow.test.ts

key-decisions:
  - "Handler defaults follow timeout 120s and idle_timeout 60s when omitted (D-13/D-06)"
  - "Suffix-overlap appendDedupedLines for tail snapshot dedup per RESEARCH Pattern 3"
  - "Non-429 API errors attach capped partial logs_lines in CoolifyApiError data (D-07)"

patterns-established:
  - "follow:true early-return in handleApplicationLogs — one-shot path untouched (OBS-03 partial; full golden in 25-02)"

requirements-completed: [OBS-02]

coverage:
  - id: D1
    description: "followApplicationLogs dedup, idle, timeout, 429 backoff"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/utils/log-follow-poll.test.ts#followApplicationLogs"
        status: pass
    human_judgment: false
  - id: D2
    description: "application.logs follow:true idle success with stopped_reason idle"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns stopped_reason idle"
        status: pass
    human_judgment: false
  - id: D3
    description: "COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal with partial logs_lines"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#dual-signal timeout"
        status: pass
    human_judgment: false
  - id: D4
    description: "follow aggregate max_chars cap sets logs_truncated"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns logs_truncated when follow aggregate exceeds max_chars"
        status: pass
    human_judgment: false
  - id: D5
    description: "API error during follow returns partial logs_lines in error data"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns partial logs_lines on non-429 API error"
        status: pass
    human_judgment: false
  - id: D6
    description: "applicationActionSchema accepts follow:true on logs"
    requirement: OBS-02
    verification:
      - kind: integration
        ref: "tests/integration/logs-service-db-flow.test.ts#accepts follow:true"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-28
status: complete
---

# Phase 25 Plan 01: Application Log Follow Tracer Summary

**application.logs follow:true ships deduped aggregate polling with idle stop, COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal, and partial logs on API failure**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-27T23:56:00Z
- **Completed:** 2026-07-28T00:01:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `followApplicationLogs` poll loop with suffix-overlap dedup, idle/timeout stops, 429 Retry-After retry
- `handleApplicationLogsFollow` wires fetchApplicationLogs closure, capLogOutput, buildReadResponse
- `COOLIFY_LOG_FOLLOW_TIMEOUT` + RECOVERY_HINTS mirror deployment.watch dual-signal pattern
- Wave 0 follow scaffolds flipped green; deploy-watch-poll tests unchanged

## Task Commits

1. **Task 1: End-to-end application.logs follow:true idle stop** - `9a2ec34` (feat)
2. **Task 2: Timeout dual-signal + API error partial aggregate** - `c481769` (test)

## Files Created/Modified

- `src/utils/log-follow-poll.ts` - followApplicationLogs + appendDedupedLines
- `src/utils/deploy-watch-poll.ts` - exported nextDelayMs/sleep
- `src/mcp/tools/application.ts` - follow schema branch + handleApplicationLogsFollow
- `src/utils/errors.ts` - COOLIFY_LOG_FOLLOW_TIMEOUT code + hints
- `src/utils/log-follow-poll.test.ts` - dedup/idle/timeout/429 unit tests
- `src/mcp/tools/application.test.ts` - follow handler + timeout/truncation/API error tests
- `src/utils/errors.test.ts` - COOLIFY_LOG_FOLLOW_TIMEOUT recovery hints test
- `tests/integration/logs-service-db-flow.test.ts` - follow:true schema acceptance

## Decisions Made

- Handler applies 120s/60s/3s/30s defaults only when follow:true and params omitted
- Dedup via longest suffix-prefix overlap; idle clock resets only on new deduped lines
- Partial aggregate on non-429 errors rethrown with capped logs_lines in error.data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave 0 dedup/429 test timer expectations**
- **Found during:** Task 1 (log-follow-poll.test.ts flip GREEN)
- **Issue:** Dedup test left dangling 3rd fetch (undefined snapshot); 429 test idleTimeout 5s with 7s advance caused 7 polls vs expected 3
- **Fix:** Stable mock tail + shorter idle window; 429 test idleTimeoutMs 1000 with three 1000ms advances
- **Files modified:** src/utils/log-follow-poll.test.ts
- **Committed in:** c481769

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test timing aligned with idle semantics; no production contract change.

## Issues Encountered

None beyond Wave 0 scaffold timer fixes above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 25-02 can harden schema (zodDefault timeout), OBS-03 golden one-shot regression, capability flag
- deploy-watch-poll watch behavior verified unchanged (7 tests green)

## Self-Check: PASSED

- FOUND: src/utils/log-follow-poll.ts
- FOUND: .planning/phases/25-application-log-follow/25-01-SUMMARY.md
- FOUND: commit 9a2ec34
- FOUND: commit c481769

---
*Phase: 25-application-log-follow*
*Completed: 2026-07-28*
