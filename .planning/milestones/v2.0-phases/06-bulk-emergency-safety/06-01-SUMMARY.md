---
phase: 06-bulk-emergency-safety
plan: 01
subsystem: api
tags: [mcp, emergency, confirm-gate, coolify, zod, vitest]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: batch deploy best-effort loop, pollDeploymentUntilTerminal, force/wait deploy semantics
  - phase: 05-logs-service-db-ops
    provides: per-domain lifecycle patterns, logsAvailableHint
provides:
  - emergency MCP tool (stop_all, redeploy_project, restart_project)
  - COOLIFY_CONFIRM_REQUIRED error with preview block in envelope.data
  - validateConfirmGate and resolveProjectUuid helpers
affects:
  - 06-02-reveal-masking
  - 06-03-integration-signoff

tech-stack:
  added: []
  patterns:
    - "Dedicated emergency tool with destructiveHint for bulk ops (D-01)"
    - "Confirm gate preview before mutation via validateConfirmGate (D-07/D-08)"
    - "Best-effort sequential per-app loops via fetchResources enumeration (D-14)"

key-files:
  created:
    - src/mcp/tools/emergency.ts
    - src/mcp/tools/emergency.test.ts
  modified:
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts
    - src/mcp/tools/application.ts

key-decisions:
  - "extractDeploymentUuid exported from application.ts — single source of truth for deploy response parsing"
  - "Preview block lives in CoolifyErrorEnvelope.data per D-08"
  - "Project name resolution uses case-insensitive substring contains-match per RESEARCH §3"

patterns-established:
  - "EMG ops isolated in emergency tool — not on system or application (D-01)"
  - "confirm: true required only on EMG actions; P4/P5 single-resource mutations stay ungated (D-05)"

requirements-completed: [EMG-01, EMG-02, EMG-03, OUT-07]

coverage:
  - id: D1
    description: COOLIFY_CONFIRM_REQUIRED error code with preview data field and recovery hints
    requirement: OUT-07
    verification:
      - kind: unit
        ref: src/utils/errors.test.ts#COOLIFY_CONFIRM_REQUIRED
        status: pass
    human_judgment: false
  - id: D2
    description: emergency tool schema (stop_all/redeploy_project/restart_project) with validateConfirmGate and resolveProjectUuid
    requirement: OUT-07
    verification:
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#emergencyToolSchema
        status: pass
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#validateConfirmGate
        status: pass
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#resolveProjectUuid
        status: pass
    human_judgment: false
  - id: D3
    description: handleEmergencyAction stop_all instance-wide apps-only with confirm gate and best-effort sequential
    requirement: EMG-01
    verification:
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#handleEmergencyAction stop_all
        status: pass
    human_judgment: false
  - id: D4
    description: handleEmergencyAction redeploy_project with force/wait and project name resolution
    requirement: EMG-02
    verification:
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#handleEmergencyAction redeploy_project
        status: pass
    human_judgment: false
  - id: D5
    description: handleEmergencyAction restart_project pure restart with confirm gate
    requirement: EMG-03
    verification:
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#handleEmergencyAction restart_project
        status: pass
    human_judgment: false
  - id: D6
    description: emergency tool registered in server.ts with destructiveHint and confirm guidance
    requirement: OUT-07
    verification:
      - kind: unit
        ref: src/mcp/tools/emergency.test.ts#emergency tool server registration
        status: pass
      - kind: unit
        ref: src/mcp/server.test.ts
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase 6 Plan 1: Emergency Tool Summary

**Emergency-Tool mit stop_all/redeploy_project/restart_project, COOLIFY_CONFIRM_REQUIRED-Confirm-Gate und Preview-Block { would_affect, sample_uuids, action }**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T04:20:00Z
- **Completed:** 2026-07-16T04:24:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Neuer Fehlercode `COOLIFY_CONFIRM_REQUIRED` mit optionalem `envelope.data`-Preview-Block
- `emergency`-Tool-Modul mit Zod-Schemas, `validateConfirmGate`, `resolveProjectUuid` und `handleEmergencyAction`
- Server-Registrierung mit `destructiveHint: true` und Agent-Hinweisen für confirm/wait
- 26 Unit-Tests für Schema, Confirm-Gate, Projektauflösung und alle drei EMG-Aktionen

## Task Commits

Each task was committed atomically:

1. **Task 1: COOLIFY_CONFIRM_REQUIRED + emergency schema + helpers + RED scaffold** - `3c00d28` (feat)
2. **Task 2: handleEmergencyAction + server registration** - `34a26c0` (feat)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/utils/errors.ts` — COOLIFY_CONFIRM_REQUIRED, envelope.data, wrapMcpError data redaction
- `src/utils/errors.test.ts` — Tests für neuen Fehlercode und data-Feld
- `src/mcp/tools/emergency.ts` — Schemas, Handler, Helpers
- `src/mcp/tools/emergency.test.ts` — 26 Unit-Tests
- `src/mcp/server.ts` — emergency-Tool-Registrierung
- `src/mcp/server.test.ts` — 10 Tools inkl. emergency
- `src/mcp/tools/application.ts` — export extractDeploymentUuid

## Decisions Made

- `extractDeploymentUuid` aus `application.ts` exportiert statt dupliziert
- Preview-Block in `envelope.data` gemäß D-08
- Projektname-Auflösung via case-insensitive Substring-Match

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EMG-01/02/03 und OUT-07 für Plan 06-01 erfüllt
- Bereit für 06-02 (OUT-02 reveal auf full projections)
- Live UAT für Emergency-Ops bleibt MANUAL-ONLY bis 06-03

## Self-Check: PASSED

- [x] `src/mcp/tools/emergency.ts` exists
- [x] `src/mcp/tools/emergency.test.ts` exists
- [x] `git log --oneline --grep="06-01"` returns ≥1 commit (3c00d28, 34a26c0)
- [x] `npx vitest run src/utils/errors.test.ts src/mcp/tools/emergency.test.ts` — 44 tests green
- [x] `npx vitest run` — 408 tests green (378 baseline + 30 P6 additions)
- [x] `npm run build` — exit 0

---
*Phase: 06-bulk-emergency-safety*
*Completed: 2026-07-16*
