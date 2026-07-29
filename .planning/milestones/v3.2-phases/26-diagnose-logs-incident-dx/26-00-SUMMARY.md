---
phase: 26-diagnose-logs-incident-dx
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, diagnose-logs, PROMPT-01, DIAG-01]

requires: []
provides:
  - "Wave 0 RED scaffolds for diagnose.logs schema + handler (DIAG-01, D-03–D-09)"
  - "buildRuntimeLogPayload it.fails scaffold (OBS-03 guard before extraction)"
  - "incident prompt PROMPT-01 it.fails assertions"
  - "six-key capabilities it.fails scaffold including diagnose_logs (D-14)"
  - "coverage-map.yaml diagnose.logs row (D-17)"
affects:
  - 26-01
  - 26-02
  - 26-03

tech-stack:
  added: []
  patterns:
    - "vitest it.fails RED scaffolds — husky green until Plans 26-01..26-03 flip GREEN"

key-files:
  created: []
  modified:
    - src/mcp/tools/diagnose.test.ts
    - src/utils/log-helpers.test.ts
    - tests/mcp/prompts.test.ts
    - src/mcp/tools/system.test.ts
    - docs/coverage-map.yaml

key-decisions:
  - "Schema reject scaffolds assert logs-specific refine messages — generic enum rejection passes too early under it.fails"
  - "system.test.ts keeps five-key green it; six-key count is it.fails only (Phase 25 pattern)"

patterns-established:
  - "Phase 26 Wave 0 mirrors Phase 24/25: it.fails locks acceptance intent; production handlers untouched"

requirements-completed: [DIAG-01]

coverage:
  - id: D1
    description: "diagnose.logs schema + handler it.fails scaffolds (mode full/logs-only, XOR, soft partial, empty hint)"
    requirement: DIAG-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#diagnose logs"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildRuntimeLogPayload slice/cap envelope it.fails scaffold"
    requirement: DIAG-01
    verification:
      - kind: unit
        ref: "src/utils/log-helpers.test.ts#buildRuntimeLogPayload"
        status: pass
    human_judgment: false
  - id: D3
    description: "incident prompt PROMPT-01 it.fails for diagnose.logs, deployment.logs, follow, app-only guardrail"
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts#incident prompt mentions diagnose.logs"
        status: pass
    human_judgment: false
  - id: D4
    description: "system.version six capability keys including diagnose_logs"
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false
  - id: D5
    description: "coverage-map.yaml diagnose.logs row with client and openapi paths"
    verification:
      - kind: other
        ref: "docs/coverage-map.yaml#diagnose.logs"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-28
status: complete
---

# Phase 26 Plan 00: Wave 0 Nyquist RED Summary

**Ten it.fails scaffolds lock diagnose.logs, buildRuntimeLogPayload, incident prompt, and diagnose_logs capability contracts before Plan 26-01 implementation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T03:03:00Z
- **Completed:** 2026-07-28T03:06:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `describe('diagnose logs')` with eight `it.fails` cases covering schema defaults, identifier/XOR rejection, mode full/logs-only, build-only path, soft partial `diagnose_failed`, and empty-runtime hint
- `buildRuntimeLogPayload` dynamic-import `it.fails` scaffold in `log-helpers.test.ts`
- Incident prompt `it.fails` for PROMPT-01 composite workflow (diagnose.logs, deployment.logs, follow, guardrail)
- Capabilities split: green five-key test + `it.fails` six-key scaffold with `diagnose_logs`
- `docs/coverage-map.yaml` `diagnose.logs` row added

## Task Commits

1. **Task 1: RED scaffolds for diagnose.logs schema + handler tests** - `8205c38` (test)
2. **Task 2: RED scaffolds for incident prompt + capabilities + coverage map** - `dea8fb8` (test)

## Files Created/Modified

- `src/mcp/tools/diagnose.test.ts` — eight `it.fails` in `describe('diagnose logs')`; client mock extended
- `src/utils/log-helpers.test.ts` — `buildRuntimeLogPayload` `it.fails` scaffold
- `tests/mcp/prompts.test.ts` — incident PROMPT-01 `it.fails` block
- `src/mcp/tools/system.test.ts` — six-key capabilities `it.fails` scaffold
- `docs/coverage-map.yaml` — `diagnose.logs` coverage row

## Decisions Made

- Schema reject scaffolds assert logs-specific refine messages so `it.fails` stays RED until Plan 26-01 registers the action
- Five-key capabilities test stays green; six-key expectation is `it.fails` only (mirrors Phase 25 Wave 0)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema reject it.fails passed prematurely**
- **Found during:** Task 1
- **Issue:** `{ action: 'logs' }` and XOR inputs fail at enum level before logs refines exist — bare `success === false` assertions passed under `it.fails`
- **Fix:** Assert logs-specific refine message substrings in issue messages
- **Files modified:** `src/mcp/tools/diagnose.test.ts`
- **Committed in:** `8205c38`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal — scaffolds now fail for the right reason until 26-01 ships logs schema refines.

## TDD Gate Compliance

- RED gate: `test(26-00)` commits present (`8205c38`, `dea8fb8`)
- GREEN gate: deferred to Plan 26-01 (Wave 0 scaffolds only per plan type `tdd` wave 0)

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Plan 26-01 can implement `handleDiagnoseLogs`, `buildRuntimeLogPayload`, and flip `it.fails` → `it`
- Plan 26-02 targets incident prompt body + `diagnose_logs` capability
- Production files untouched: `diagnose.ts`, `log-helpers.ts`, `prompts.ts`, `capabilities.ts`

## Self-Check: PASSED

- FOUND: `.planning/phases/26-diagnose-logs-incident-dx/26-00-SUMMARY.md`
- FOUND: commit `8205c38`
- FOUND: commit `dea8fb8`
- FOUND: 8 `it.fails` in `diagnose.test.ts`
- VERIFIED: no production diff on prohibited paths

---
*Phase: 26-diagnose-logs-incident-dx*
*Completed: 2026-07-28*
