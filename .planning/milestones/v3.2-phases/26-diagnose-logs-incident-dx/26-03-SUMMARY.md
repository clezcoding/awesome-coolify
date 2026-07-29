---
phase: 26-diagnose-logs-incident-dx
plan: 03
subsystem: testing
tags: [coolify-setup, diagnose-logs, SKILL-01, D-15, D-16, OBS-03]

requires:
  - phase: 26-01
    provides: diagnose.logs handler + buildRuntimeLogPayload (OBS-03)
  - phase: 26-02
    provides: diagnose_logs capability + incident prompt patterns
provides:
  - "coolify-setup App log troubleshooting section post-wizard (SKILL-01, D-15/D-16)"
  - "skills-manifest.test.ts troubleshooting assertion"
  - "OBS-03 runtime logs regression gate confirmed green"
affects:
  - phase-27

tech-stack:
  added: []
  patterns:
    - "Post-wizard troubleshooting section outside Workflow numbered steps (D-16)"
    - "Short capability-discovery steps linking to sibling skills (D-15)"

key-files:
  created: []
  modified:
    - skills/coolify-setup/SKILL.md
    - src/skills/skills-manifest.test.ts

key-decisions:
  - "diagnose.logs catalog notation in step 2 alongside action: logs call pattern"
  - "App-only guardrail explicit in section intro — no service/DB log claims"

patterns-established:
  - "Setup skill surfaces log triage after Example calls; incident runbook stays in coolify-incident"

requirements-completed: [SKILL-01]

coverage:
  - id: D1
    description: "coolify-setup has standalone App log troubleshooting after setup flow with capability check and diagnose.logs"
    requirement: SKILL-01
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts#coolify-setup documents app log troubleshooting and diagnose.logs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Section links to coolify-incident, coolify-deploy, coolify-diagnose sibling skills"
    requirement: SKILL-01
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts#coolify-setup documents app log troubleshooting and diagnose.logs"
        status: pass
    human_judgment: false
  - id: D3
    description: "application.logs runtime golden paths unchanged after Phase 26 handler work (OBS-03)"
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#runtime logs"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-28
status: complete
---

# Phase 26 Plan 03: coolify-setup App Log Troubleshooting Summary

**Post-wizard App log troubleshooting in coolify-setup with capability discovery, diagnose.logs steps, sibling skill links, and OBS-03 regression lock**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-28T03:13:00Z
- **Completed:** 2026-07-28T03:17:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `## App log troubleshooting` section added after `## Example calls` — outside Workflow wizard steps (D-16)
- Four numbered steps: system.version capability check, diagnose.logs triage, application follow, deployment.logs (D-15)
- Relative links to coolify-incident, coolify-deploy, coolify-diagnose; app-only guardrail for Coolify 4.1.2
- Manifest test asserts troubleshooting content; OBS-03 runtime logs suite green (5 tests)

## Task Commits

1. **Task 1: Add App log troubleshooting section to coolify-setup skill** - `249e9ea` (docs)
2. **Task 2: Manifest test + OBS-03 regression lock** - `15370a6` (test)

## Files Created/Modified

- `skills/coolify-setup/SKILL.md` — App log troubleshooting section (11 lines)
- `src/skills/skills-manifest.test.ts` — troubleshooting + diagnose.logs assertion

## Decisions Made

- Step 2 uses `diagnose.logs` catalog notation plus `action: "logs"` call — satisfies manifest and IDE discoverability
- App-only note in section intro rather than per-step repetition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest 4.x rejects `-x` bail flag from plan verify commands — ran without `-x`; all tests passed

## User Setup Required

None

## Next Phase Readiness

- Phase 26 complete — all four plans shipped (26-00 through 26-03)
- Ready for Phase 27 or phase verify-work / ship

## Self-Check: PASSED

- FOUND: `.planning/phases/26-diagnose-logs-incident-dx/26-03-SUMMARY.md`
- FOUND: commit `249e9ea`
- FOUND: commit `15370a6`
- FOUND: `## App log troubleshooting` in `skills/coolify-setup/SKILL.md` at line 131
- VERIFIED: skills-manifest 20/20 green; runtime logs 5/5 green

---
*Phase: 26-diagnose-logs-incident-dx*
*Completed: 2026-07-28*
