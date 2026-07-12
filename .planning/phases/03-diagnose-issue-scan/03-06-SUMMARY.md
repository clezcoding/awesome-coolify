---
phase: 03-diagnose-issue-scan
plan: 06
subsystem: testing
tags: [vitest, integration-test, diagnose, coverage, validation]

requires:
  - phase: 03-diagnose-issue-scan
    provides: diagnose handlers, fixtures, hints retrofit from plans 03-01..03-05
provides:
  - Handler-level diagnose-flow integration test against mock Coolify fixtures
  - Phase 3 validation sign-off with nyquist_compliant and wave_0_complete
  - Manual-Only MCP stdio E2E verification documented
affects:
  - 04-app-deploy-lifecycle

tech-stack:
  added:
    - "@vitest/coverage-v8@1.4.0"
  patterns:
    - "Integration test mirrors P2 src/mcp/integration.test.ts — direct handler calls, vi.mock API client"
    - "Real MCP stdio transport deferred to Manual-Only table per P1 01-05 pattern"

key-files:
  created: []
  modified:
    - tests/integration/diagnose-flow.test.ts
    - vitest.config.ts
    - .planning/phases/03-diagnose-issue-scan/03-VALIDATION.md
    - package.json
    - package-lock.json

key-decisions:
  - "Handler-level integration only — stdio child-process handshake MANUAL-ONLY in VALIDATION table"
  - "tsc --noEmit has pre-existing errors predating Phase 3; npm run build (tsup) is green sign-off gate"

patterns-established:
  - "tests/integration/*.test.ts included via vitest.config.ts glob alongside src/**/*.test.ts"
  - "Malformed env fixture asserts env_count null via non-array fulfilled value in Promise.allSettled"

requirements-completed:
  - SYS-03
  - SYS-04
  - SYS-05
  - OUT-06

coverage:
  - id: D1
    description: "Handler-level diagnose app/server/scan integration against mock mixed-health fixtures"
    requirement: SYS-03
    verification:
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose app returns D-05 fields"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose server returns D-09 composed view"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose scan returns severity buckets"
        status: pass
    human_judgment: false
  - id: D2
    description: "P2 get-actions emit structured hints[] per OUT-06 in integration flow"
    requirement: OUT-06
    verification:
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#application get includes restart hint"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#service get includes hints"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#database get includes hints"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty fleet and malformed-env resilience plus table+full COOLIFY_422 rejection"
    verification:
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose scan with empty fleet"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose app with malformed envs"
        status: pass
      - kind: integration
        ref: "tests/integration/diagnose-flow.test.ts#diagnose app rejects table+full"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase 3 validation sign-off — full suite, coverage, build green"
    verification:
      - kind: other
        ref: "npm run test -- --run --reporter=dot"
        status: pass
      - kind: other
        ref: "npm run test -- --run --coverage"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real MCP stdio E2E over createAndConnectServer child-process handshake"
    requirement: SYS-03
    verification: []
    human_judgment: true
    rationale: "vitest cannot reliably exercise stdio child-process handshake; documented as Manual-Only per P1 01-05 pattern"

duration: 5min
completed: 2026-07-12
status: complete
---

# Phase 03 Plan 06: Integration Sign-Off Summary

**Handler-Level Diagnose-Flow-Integrationstest mit Mock-Fixtures, Coverage-Gate und Phase-3-Validierungs-Sign-Off — stdio E2E manuell**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-12T04:22:00Z
- **Completed:** 2026-07-12T04:27:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `tests/integration/diagnose-flow.test.ts` mit 9 Handler-Level-Tests für diagnose app/server/scan, OUT-06 hints-Retrofit, leere Flotte, malformed envs und table+full COOLIFY_422
- `vitest.config.ts` erweitert um `tests/**/*.test.ts` — Integrationstests werden von vitest erkannt
- `03-VALIDATION.md` sign-off: alle Per-Task-Rows grün, `wave_0_complete: true`, Manual-Only stdio E2E Zeile
- `@vitest/coverage-v8@1.4.0` installiert — Coverage 78.76% lines, diagnose.ts 96.02%

## Task Commits

Each task was committed atomically:

1. **Task 1: Handler-level diagnose-flow integration test** - `319ae89` (test)
2. **Task 2: Phase 3 coverage gate and VALIDATION.md reconciliation** - `8252825` (docs)

**Plan metadata:** `048bd09` (docs: complete plan)

## Files Created/Modified

- `tests/integration/diagnose-flow.test.ts` — 9 Integrationstests, 03-01 Scaffold ersetzt
- `vitest.config.ts` — include glob für tests/
- `.planning/phases/03-diagnose-issue-scan/03-VALIDATION.md` — Sign-off + Manual-Only stdio
- `package.json` / `package-lock.json` — coverage-v8 dev dependency

## Decisions Made

- Handler-Level-Integration spiegelt P2 `src/mcp/integration.test.ts` — kein stdio child-process in vitest
- `tsc --noEmit` hat vorbestehende Fehler (client.ts retryDelay, Test-Typen) — Build-Gate via tsup bleibt grün

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts include glob für tests/integration**
- **Found during:** Task 1 (Integration test verify)
- **Issue:** vitest.config.ts enthielt nur `src/**/*.test.ts` — diagnose-flow.test.ts wurde nicht ausgeführt
- **Fix:** `tests/**/*.test.ts` zum include-Array hinzugefügt
- **Files modified:** vitest.config.ts
- **Verification:** `npm run test -- --run tests/integration/diagnose-flow.test.ts` — 9 passed
- **Committed in:** `319ae89`

**2. [Rule 3 - Blocking] @vitest/coverage-v8 für Coverage-Runs**
- **Found during:** Task 2 (coverage verify)
- **Issue:** `npm run test -- --coverage` fehlte @vitest/coverage-v8 dependency
- **Fix:** `@vitest/coverage-v8@1.4.0` installiert (vitest 1.4.x kompatibel)
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run test -- --run --coverage` exit 0
- **Committed in:** `8252825`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Beide Fixes notwendig für Acceptance Criteria. Kein Scope Creep.

## Issues Encountered

- `npx tsc --noEmit` exit 2 — vorbestehende Fehler in `src/api/client.ts` (retryDelay) und Test-Dateien; `npm run build` (tsup) grün. In VALIDATION.md dokumentiert.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 alle 6 Pläne abgeschlossen — bereit für `/gsd-verify-work` auf Phase 3
- Phase 4 (App Deploy Lifecycle) kann nach Verifikation starten
- MCP stdio E2E über diagnose tool bleibt manuelle Verifikation (siehe 03-VALIDATION.md Manual-Only)

## Self-Check: PASSED

- `npm run test -- --run tests/integration/diagnose-flow.test.ts` — 9 passed
- `npm run test -- --run --reporter=dot` — 21 files, 198 tests passed
- `npm run test -- --run --coverage` — exit 0, diagnose.ts 96.02% lines
- `npm run build` — exit 0
- `03-VALIDATION.md` nyquist_compliant true, wave_0_complete true, all rows green
- git log --grep="03-06" — 2 task commits found

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
