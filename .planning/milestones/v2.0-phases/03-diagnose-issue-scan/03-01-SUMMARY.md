---
phase: 03-diagnose-issue-scan
plan: 01
subsystem: api
tags: [diagnose, zod, projections, issue-classifier, hints, coolify-api]

requires:
  - phase: 02-discovery-read-projections
    provides: CoolifyClient, projections.ts, resource.find helpers, sharedReadParamsSchema
provides:
  - diagnoseToolSchema stub with app/server/scan actions
  - handleDiagnoseAction not-implemented stub
  - generateHints FollowUpHint generator
  - classifyIssues severity classifier
  - projectAppDiagnose projectServerDiagnose projectScanIssue
  - 6 client fetch helpers incl. fetchServer base
  - Wave 0 fixtures and integration test scaffold
affects:
  - 03-02
  - 03-03
  - 03-04
  - 03-05
  - 03-06

tech-stack:
  added: []
  patterns:
    - "Wave 1 foundation: pure-logic primitives before vertical slice handlers"
    - "Env count only — never serialize env values in projections (D-06)"
    - "Structured FollowUpHint with available_in_phase forward-refs (D-15 D-17)"

key-files:
  created:
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/diagnose.test.ts
    - src/utils/diagnose-hints.ts
    - src/utils/diagnose-hints.test.ts
    - src/utils/issue-classifier.ts
    - src/utils/issue-classifier.test.ts
    - tests/fixtures/coolify-mixed-health.ts
    - tests/fixtures/coolify-empty.ts
    - tests/fixtures/coolify-malformed.ts
    - tests/integration/diagnose-flow.test.ts
  modified:
    - src/utils/projections.ts
    - src/utils/projections.test.ts
    - src/api/client.ts
    - src/mcp/tools/resource.ts

key-decisions:
  - "Projectors in projections.ts per CONTEXT.md — RESEARCH.md diagnose-projections.ts ignored"
  - "fetchServer base delivered in 03-01 so 03-03 does not add conditionally"
  - "handleDiagnoseAction throws not-implemented — first vertical slice in 03-02"

patterns-established:
  - "classifyIssues: critical=unreachable servers, high=unhealthy, info=stopped/exited (D-14)"
  - "generateHints: structured {tool, action, args, label, available_in_phase} per D-15"
  - "projectAppDiagnose: ALL D-05 fields incl. updated_at; env_count integer only"

requirements-completed:
  - SYS-03
  - SYS-04
  - SYS-05
  - OUT-06

coverage:
  - id: D1
    description: "diagnoseToolSchema discriminatedUnion app/server/scan with limit and superRefine"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#diagnoseToolSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "find-helpers exported from resource.ts for diagnose input resolution"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Wave 0 fixtures and integration test scaffold"
    verification:
      - kind: unit
        ref: "tests/integration/diagnose-flow.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "generateHints structured FollowUpHint generator"
    requirement: OUT-06
    verification:
      - kind: unit
        ref: "src/utils/diagnose-hints.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "classifyIssues severity buckets with property-based invariants"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/utils/issue-classifier.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Diagnose projectors and 6 client fetch helpers"
    requirement: SYS-04
    verification:
      - kind: unit
        ref: "src/utils/projections.test.ts#projectAppDiagnose"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-12
status: complete
---

# Phase 3 Plan 1: Wave 1 Foundation Summary

**Wave-1-Infrastruktur für Diagnose: Schema-Stub, Klassifikator, Hint-Generator, Projektoren und 6 Client-Helper — ohne agent-aufrufbare Handler (erst ab 03-02).**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-12T03:57:00Z
- **Completed:** 2026-07-12T04:01:49Z
- **Tasks:** 4
- **Files modified:** 13

## Accomplishments

- `diagnoseToolSchema` mit `app`/`server`/`scan`, `limit` (default 10, max 50) und `superRefine` für Identifier-Pflicht (D-03)
- `handleDiagnoseAction` wirft `not-implemented` — bewusst kein Vertical Slice in 03-01
- `generateHints` liefert strukturierte `FollowUpHint[]` mit `available_in_phase` (D-15, D-17)
- `classifyIssues` partitioniert critical/high/info per D-13/D-14 (stopped → info, nicht high)
- `projectAppDiagnose`/`projectServerDiagnose`/`projectScanIssue` in `projections.ts` — alle D-05-Felder inkl. `updated_at`, `env_count` ohne Env-Werte (D-06)
- 6 Client-Helper: `fetchApplicationEnvs`, `fetchAppDeployments`, `fetchServer`, `fetchServerResources`, `fetchServerDomains`, `triggerServerValidate`
- Find-Helper aus `resource.ts` exportiert; Wave-0-Fixtures und Integration-Scaffold angelegt

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 stubs, fixtures, and find-helper extraction** - `5bee750` (test)
2. **Task 2: Hint generator with structured FollowUpHint schema** - `faea397` (feat)
3. **Task 3: Issue classifier with property-based severity invariants** - `bcec327` (feat)
4. **Task 4: Diagnose projectors and client fetch helpers** - `f984589` (feat)

**Plan metadata:** `e9157cc` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/diagnose.ts` — Zod schema + not-implemented handler stub
- `src/utils/diagnose-hints.ts` — FollowUpHint generator
- `src/utils/issue-classifier.ts` — Severity classifier für global scan
- `src/utils/projections.ts` — Diagnose-Projektoren erweitert
- `src/api/client.ts` — 6 neue Fetch-Helper
- `src/mcp/tools/resource.ts` — Find-Helper exportiert
- `tests/fixtures/*.ts` — Static mock fixtures für Vitest

## Decisions Made

- Projektoren in bestehendem `projections.ts` (CONTEXT.md > RESEARCH.md Dateiplatzierung)
- `fetchServer` in 03-01 geliefert, damit 03-03 nicht bedingt nachrüstet
- Wave 1 = Foundation only; erster agent-aufrufbarer Vertical Slice in 03-02 (SYS-04 app diagnose)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-02 kann `handleDiagnoseAction` app-Branch mit `projectAppDiagnose` + parallelen Fetches implementieren
- 03-03/03-04 können Server-Diagnose und global scan auf `classifyIssues` + exportierten Find-Helpern aufbauen
- `diagnose`-Tool-Registrierung in `server.ts` kommt in späteren Plänen (03-02+)

## Self-Check: PASSED

- `npm run test -- --run --reporter=dot` → 153 tests passed
- `npm run build` → success
- All 4 task commits present
- Key files exist on disk

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
