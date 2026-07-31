---
phase: 31-agent-playbooks
plan: 01
subsystem: mcp-diagnose
tags: [diagnose, analyze, log-patterns, BRAIN-01, BRAIN-02, advisory, vitest]

requires:
  - phase: 31-agent-playbooks
    provides: Wave 0 it.fails RED scaffolds for analyze + matchLogPatterns shell
  - phase: 26-diagnose-logs-incident-dx
    provides: diagnose.logs fetch + FollowUpHint + EMPTY_RUNTIME_LOGS_HINT

provides:
  - Production diagnose.analyze advisory composite
  - matchLogPatterns + enrichPatternHints for four BRAIN-01 rules
  - GREEN Wave 0 analyze / log-patterns tests

affects:
  - 31-02 playbook prompts (incident/rollback link targets)
  - 31-04 diagnose_analyze capability + docs

tech-stack:
  added: []
  patterns:
    - "diagnose.analyze reuses logs fetch; returns matched_patterns not full logs_lines"
    - "D-06 advisory-only — soft partial analyze_failed; no mutation clients"
    - "enrichPatternHints maps pattern IDs → FollowUpHint with playbook label links"

key-files:
  created: []
  modified:
    - src/utils/log-patterns.ts
    - src/utils/log-patterns.test.ts
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/diagnose.test.ts

key-decisions:
  - "Auto-selected approve-advisory-only for D-06 checkpoint (no analyze mutations)"
  - "5xx spike / crash_loop require min counts (≥5 / ≥3) — single noisy line never matches"
  - "Wave 0 schema test uses safeParseWithInstanceRouting for instance (D-16) — not schema.extend"

patterns-established:
  - "Log Brain lives on diagnose.analyze — never top-level brain tool"
  - "Optional deployment_uuid adds build-source matches alongside runtime"

requirements-completed: [BRAIN-01, BRAIN-02]

coverage:
  - id: D1
    description: "matchLogPatterns detects oom/http_5xx_spike/crash_loop/connection_refused with capped evidence"
    requirement: BRAIN-01
    verification:
      - kind: unit
        ref: "src/utils/log-patterns.test.ts#matchLogPatterns"
        status: pass
    human_judgment: false
  - id: D2
    description: "diagnose.analyze returns matched_patterns + FollowUpHint playbook links + advisory true"
    requirement: BRAIN-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#diagnose analyze"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty logs and soft partial analyze_failed honor D-06/D-17"
    requirement: BRAIN-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#empty logs|fetch failure"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-31
status: complete
---

# Phase 31 Plan 01: diagnose.analyze Tracer Summary

**Advisory `diagnose.analyze` end-to-end: four rule matchers → FollowUpHint playbook links, soft partials, no mutations.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-31T02:22:27Z
- **Completed:** 2026-07-31T02:30:00Z
- **Tasks:** 3/3 (checkpoint auto-approved + tracer + edge expansion)
- **Files modified:** 4

## Accomplishments

- Implemented `matchLogPatterns` + `enrichPatternHints` / `dedupeHints` for OOM, 5xx spike, crash loop, connection refused.
- Shipped `handleDiagnoseAnalyze` reusing runtime log fetch; optional build-log scan with `source` labels; `advisory: true`.
- Flipped Wave 0 analyze + log-patterns `it.fails` → green `it()`; added threshold / build / dedupe edges.

## Task Commits

1. **Task 1: Confirm D-06 advisory-only** - _(checkpoint)_ auto-selected `approve-advisory-only` — no commit
2. **Task 2: End-to-end diagnose.analyze tracer** - `f6d3600` (feat)
3. **Task 3: Expand remaining pattern fixtures + soft partial edges** - `6fb2ee6` (test)

**Plan metadata:** `dd04b27` (docs: complete plan)

## Files Created/Modified

- `src/utils/log-patterns.ts` — matchers + hint enrichment
- `src/utils/log-patterns.test.ts` — GREEN fixtures + false-positive guards
- `src/mcp/tools/diagnose.ts` — analyze catalog/schema/switch/`handleDiagnoseAnalyze`
- `src/mcp/tools/diagnose.test.ts` — GREEN Wave 0 + build/dedupe/four-pattern cases

## Decisions Made

- **D-06 locked:** analyze never calls restart/redeploy/rollback; mutations stay on other tools.
- Spike/crash thresholds: ≥5 / ≥3 lines (research bounds).
- Instance routing via `safeParseWithInstanceRouting` / `parseWithInstanceRouting` — do not `.extend` refined diagnose schema.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave 0 schema test passed `instance` to strict `safeParse`**
- **Found during:** Task 2
- **Issue:** `diagnoseToolSchema.safeParse({ instance })` fails; putting `instance` on refined schema broke `withInstanceRoutingSchema.extend`.
- **Fix:** Keep instance off base shape; test uses `safeParseWithInstanceRouting`.
- **Files modified:** `src/mcp/tools/diagnose.test.ts`
- **Committed in:** `f6d3600`

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None beyond plan threat model (T-31-04 advisory held).

## Self-Check: PASSED

- FOUND: `src/utils/log-patterns.ts`
- FOUND: `src/mcp/tools/diagnose.ts` (`handleDiagnoseAnalyze`)
- FOUND: commits `f6d3600`, `6fb2ee6`
- FOUND: vitest log-patterns 8/8 + diagnose analyze 8/8 pass
- Prohibitions: no top-level brain tool; analyze action present; no service/DB log fetches
