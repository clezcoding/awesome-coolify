---
phase: 26-diagnose-logs-incident-dx
plan: 02
subsystem: api
tags: [incident-prompt, diagnose-logs, capabilities, PROMPT-01, D-14, D-17]

requires:
  - phase: 26-01
    provides: diagnose.logs handler + diagnoseActionsCatalog from Plan 26-01
provides:
  - "Incident MCP prompt rewrite — diagnose.logs mode full primary triage (PROMPT-01, D-10–D-13)"
  - "diagnose_logs sixth capability key on system.version (D-14)"
  - "README EN/DE + COVERAGE.md + brief diagnose prompt pointer (D-17)"
affects:
  - 26-03

tech-stack:
  added: []
  patterns:
    - "Incident prompt composite triage via diagnose.logs; deployment.logs conditional; follow gated by application_logs_follow"
    - "Soft capability discovery — no Zod hard-block on diagnose_logs (Phase 24 D-04 parity)"

key-files:
  created: []
  modified:
    - src/mcp/prompts.ts
    - tests/mcp/prompts.test.ts
    - src/mcp/capabilities.ts
    - src/mcp/tools/system.test.ts
    - README.md
    - README.de.md
    - docs/COVERAGE.md

key-decisions:
  - "Diagnose prompt one-line pointer to diagnose.logs mode full (discretion default yes)"
  - "Removed obsolete five-key capabilities test — six keys including diagnose_logs is canonical"

patterns-established:
  - "Incident workflow: diagnose.logs → optional follow → conditional deployment.logs → restart → emergency"

requirements-completed: [PROMPT-01, DIAG-01]

coverage:
  - id: D1
    description: "Incident prompt uses diagnose.logs mode full; cites deployment.logs, follow, guardrail"
    requirement: PROMPT-01
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts#incident prompt mentions diagnose.logs"
        status: pass
    human_judgment: false
  - id: D2
    description: "system.version exposes diagnose_logs sixth capability key"
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#system.version capabilities has exactly six keys"
        status: pass
    human_judgment: false
  - id: D3
    description: "README EN/DE + COVERAGE.md document diagnose.logs and diagnose_logs"
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#assertCoverageFresh"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-28
status: complete
---

# Phase 26 Plan 02: Incident Prompt & Capability Discovery Summary

**Incident prompt + diagnose_logs capability + README/coverage aligned with shipped diagnose.logs composite**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-28T03:11:00Z
- **Completed:** 2026-07-28T03:16:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Incident MCP prompt rewrites steps 2–4: `diagnose.logs` mode full, conditional `deployment.logs`, follow with `application_logs_follow` check, app-only guardrail (D-10–D-13)
- `COOLIFY_412_CAPABILITIES.diagnose_logs` published; system.test six-key assertion green (D-14)
- README EN/DE capability blockquote extended; diagnose prompt brief pointer; `docs/COVERAGE.md` regenerated with `diagnose.logs` row (D-17)
- Wave 0 `it.fails` scaffolds flipped green for incident prompt and capabilities tests

## Task Commits

1. **Task 1: Rewrite incident MCP prompt** - `53c6d2f` (feat)
2. **Task 2: Add diagnose_logs capability** - `358bfe0` (feat)
3. **Task 3: README/coverage parity** - `c9b4ece` (docs)

## Files Created/Modified

- `src/mcp/prompts.ts` — incident rewrite + diagnose.logs pointer
- `tests/mcp/prompts.test.ts` — green PROMPT-01 assertions
- `src/mcp/capabilities.ts` — `diagnose_logs` entry
- `src/mcp/tools/system.test.ts` — six-key capabilities test
- `README.md` / `README.de.md` — capability discovery callout
- `docs/COVERAGE.md` — regen via `openapi:coverage`

## Decisions Made

- Diagnose prompt gets one-line `diagnose.logs` pointer after app path (discretion default yes)
- Dropped legacy five-key test — replaced by six-key test including `diagnose_logs` shape

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- commitlint rejected sentence-case subject on first Task 3 attempt — retried with lowercase `readme/coverage`

## User Setup Required

None

## Next Phase Readiness

- Plan 26-03: `coolify-setup` skill App log troubleshooting section (SKILL-01, D-15/D-16)

## Self-Check: PASSED

- FOUND: `.planning/phases/26-diagnose-logs-incident-dx/26-02-SUMMARY.md`
- FOUND: commit `53c6d2f`
- FOUND: commit `358bfe0`
- FOUND: commit `c9b4ece`
- FOUND: `diagnose.logs` row in `docs/COVERAGE.md`
- VERIFIED: incident + capabilities + openapi-coverage tests green

---
*Phase: 26-diagnose-logs-incident-dx*
*Completed: 2026-07-28*
