---
phase: 03-diagnose-issue-scan
plan: 02
subsystem: api
tags: [diagnose, mcp, promise-allSettled, env-count, hints, coolify-api]

requires:
  - phase: 03-diagnose-issue-scan
    provides: diagnoseToolSchema, projectAppDiagnose, generateHints, fetch helpers, find-helpers
provides:
  - handleDiagnoseAction app branch end-to-end (SYS-04 vertical slice)
  - isDiagnoseErrorResult type guard for server registration
  - diagnose tool registered in server.ts (D-01)
affects:
  - 03-03
  - 03-04
  - 03-05
  - 03-06

tech-stack:
  added: []
  patterns:
    - "Promise.allSettled hybrid: base fetch critical, envs/deployments non-critical"
    - "Env count via .length only — never serialize env array (D-06)"
    - "Multi-match Top 10 with re-run UUID hint (D-04)"

key-files:
  created: []
  modified:
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/diagnose.test.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts

key-decisions:
  - "Inline test mocks in diagnose.test.ts — avoids tsc rootDir fixture import error"
  - "hints reassigned post-projection per plan step 4 — projector already generates them"
  - "server/scan branches remain not-implemented stubs for 03-03/03-04"

patterns-established:
  - "resolveAppUuid: explicit uuid skips fetchResources; else filter type=application only"
  - "Diagnose match envelope: { matches, hint } for zero/multi; D-05 fields for single"

requirements-completed:
  - SYS-04

coverage:
  - id: D1
    description: "diagnose action app end-to-end with D-05 fields and structured hints"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#handleDiagnoseAction app"
        status: pass
    human_judgment: false
  - id: D2
    description: "Promise.allSettled partial failure — env_count null on 403, deployments intact"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#degrades env_count to null on 403"
        status: pass
    human_judgment: false
  - id: D3
    description: "Multi-match ranked Top 10 with re-run UUID hint"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#returns multi-match ranked Top 10"
        status: pass
    human_judgment: false
  - id: D4
    description: "diagnose tool registered in MCP server with D-10 side-effect description"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#diagnose tool has openWorldHint"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-12
status: complete
---

# Phase 3 Plan 2: App Diagnose Vertical Slice Summary

**Erster agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'app' })` liefert D-05-Felder, strukturierte Hints und parallele Composition mit Graceful Degradation.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-12T04:04:00Z
- **Completed:** 2026-07-12T04:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `handleDiagnoseAction` app-Branch: Input-Resolution via `matchesQuery`/`matchesExplicitFields`/`rankFindMatches`, Zero/Multi-Match mit Hint, Single-Match mit `Promise.allSettled`
- Env-Count nur als Integer (`.length`), nie Env-Werte serialisiert (D-06)
- `recent_deployments` default 10, max 50 per `limit` (D-07)
- `projection: full` mit `sanitizeFullProjection`; `table+full` → COOLIFY_422
- `diagnose`-Tool in `server.ts` registriert — `openWorldHint: true`, kein `readOnlyHint` (D-10 validate side-effect)
- Server/scan bleiben `not-implemented` Stubs für 03-03/03-04

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement diagnose app handler with parallel composition and input resolution** - `85212f8` (feat)
2. **Task 2: Register diagnose tool in MCP server** - `80267ef` (feat)

**Plan metadata:** `9a9ef3e` (docs: SUMMARY), `4697bdd` (docs: STATE/ROADMAP)

## Files Created/Modified

- `src/mcp/tools/diagnose.ts` — App-Handler mit Composition, Match-Resolution, Error-Guard
- `src/mcp/tools/diagnose.test.ts` — 24 Tests (zero/multi/single-match, 403-degradation, limits, COOLIFY_422)
- `src/mcp/server.ts` — `diagnose`-Tool-Registrierung nach `resource`
- `src/mcp/server.test.ts` — 8 Tools, diagnose openWorldHint-Assertion

## Decisions Made

- Test-Fixtures inline statt `tests/fixtures`-Import — vermeidet tsc rootDir-Fehler
- Hints nach Projection nochmal gesetzt (Plan Step 4) — idempotent mit `projectAppDiagnose`
- Server/scan bewusst nicht implementiert — Scope 03-02 = SYS-04 app slice only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-03 kann Server-Diagnose auf gleichem Handler-Pattern aufbauen (`fetchServer`, validate trigger)
- 03-04 kann global scan mit `classifyIssues` implementieren
- Integration-Scaffold in `tests/integration/diagnose-flow.test.ts` kann app happy-path erweitern

## Self-Check: PASSED

- `npm run test -- --run --reporter=dot` → 165 tests passed
- `npm run build` → success
- `npx tsc --noEmit` → pre-existing errors from 03-01 fixture imports (not introduced by 03-02); production build unaffected
- Task commits `85212f8`, `80267ef` present
- Key files exist on disk

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
