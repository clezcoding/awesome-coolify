---
phase: 28-instance-intelligence
plan: 04
subsystem: api
tags: [intelligence, cleanup, JANI-02, D-13, D-14, D-19, confirm-gate, SAF-02, capabilities, vitest]

requires:
  - phase: 28-03
    provides: "impact + janitor read paths; cleanup still stubbed"
provides:
  - "handleIntelligenceCleanup confirm gate + SAF-02 defaults + domain delete reuse (JANI-02)"
  - "Five intelligence_* capability keys on system.version (D-19)"
  - "README EN+DE Instance intelligence shipped notes"
affects:
  - phase-28-ship
  - 29-drift-heal

tech-stack:
  added: []
  patterns:
    - "Cleanup: validateConfirmGate then sequential handle*Action delete with confirm:true"
    - "SAF-02 defaults via ?? false before domain delete passthrough"
    - "Per-item results[] for partial batch failure (discretion A4)"
    - "Capability keys coolify_min_version 4.1.2 with MCP composite notes"

key-files:
  created: []
  modified:
    - src/mcp/tools/intelligence.ts
    - src/mcp/tools/intelligence.test.ts
    - src/mcp/capabilities.ts
    - src/mcp/tools/system.test.ts
    - README.md
    - README.de.md
    - docs/COVERAGE.md

key-decisions:
  - "Checkpoint D-13 auto-approved (--auto): confirm-required (not soft-warn)"
  - "targets uuid uses z.string().min(1) + .min(1) array — domain delete parity, Wave 0 fixtures"
  - "Reuse handleApplicationAction/handleServiceAction/handleDatabaseAction — no raw delete* in intelligence.ts"
  - "CAPABILITY_KEYS expanded to eleven; six-key-only test removed"

patterns-established:
  - "intelligence.cleanup requires confirm:true else COOLIFY_CONFIRM_REQUIRED"
  - "delete_volumes/delete_configurations default false (SAF-02)"
  - "system.version exposes intelligence_scorecard/graph/impact/janitor/cleanup"

requirements-completed: [JANI-02]

coverage:
  - id: D1
    description: "cleanup without confirm true returns COOLIFY_CONFIRM_REQUIRED and does not call delete clients"
    requirement: JANI-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#cleanup without confirm"
        status: pass
    human_judgment: false
  - id: D2
    description: "cleanup with confirm true forwards delete_volumes/configurations false by default"
    requirement: JANI-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#cleanup SAF-02"
        status: pass
    human_judgment: false
  - id: D3
    description: "system.version has eleven capability keys including five intelligence_*"
    requirement: JANI-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#eleven keys including intelligence_*"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-30
status: complete
---

# Phase 28 Plan 04: Confirm-Gated Cleanup + Capabilities/Docs Summary

**Confirm-gated `intelligence.cleanup` (JANI-02) with SAF-02 defaults and domain delete reuse, plus five `intelligence_*` capability keys and README EN+DE discoverability (D-19).**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-30T02:06:00Z
- **Completed:** 2026-07-30T02:11:39Z
- **Tasks:** 3 (checkpoint auto-resolved + 2 auto)
- **Files modified:** 7

## Accomplishments

- Shipped `handleIntelligenceCleanup` behind `confirm:true` / `COOLIFY_CONFIRM_REQUIRED` (D-13, T-28-01)
- SAF-02 defaults + explicit `targets[]` batch with per-item `results[]`; reuses domain delete handlers (D-14, T-28-02/03)
- Five `intelligence_*` keys on `system.version`; README EN+DE Instance intelligence notes; COVERAGE.md regenerated (D-19)

## Task Commits

1. **Task 1: Confirm D-13 checkpoint** — auto-resolved `--auto` to `confirm-required` (no commit; CONTEXT D-13/D-14/D-15)
2. **Task 2: Implement cleanup confirm gate + SAF-02 + domain delete reuse** — `28a9fe0` (feat)
3. **Task 3: Capabilities, coverage-map, README EN+DE** — `80152ca` (feat)

**Plan metadata:** `59d498a` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/intelligence.ts` — `handleIntelligenceCleanup`; switch wired; targets schema `.min(1)`
- `src/mcp/tools/intelligence.test.ts` — cleanup `it.fails` → `it()` GREEN
- `src/mcp/capabilities.ts` — five `intelligence_*` keys
- `src/mcp/tools/system.test.ts` — eleven-key assertions GREEN
- `README.md` / `README.de.md` — Instance intelligence row + capability discovery notes
- `docs/COVERAGE.md` — regenerated from coverage-map (intelligence rows already present)

## Decisions Made

- **D-13 checkpoint:** auto-approved `confirm-required` per CONTEXT (not soft-warn)
- **D-14/D-15:** domain handler reuse; scorecard/graph/janitor stay non-mutating
- **D-19:** capability key names `intelligence_scorecard|graph|impact|janitor|cleanup`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleanup target UUID schema vs Wave 0 fixtures**
- **Found during:** Task 2
- **Issue:** Schema used `z.string().uuid()` but Wave 0 cleanup tests pass `app-uuid-1` (domain deletes use plain `z.string()`)
- **Fix:** Targets use `z.string().min(1)` and array `.min(1)` for non-empty explicit lists
- **Files modified:** `src/mcp/tools/intelligence.ts`
- **Verification:** `npx vitest run src/mcp/tools/intelligence.test.ts -t cleanup`
- **Committed in:** `28a9fe0`

## Checkpoint Approvals

| Checkpoint | Selection | Mode |
|------------|-----------|------|
| D-13 confirm gate | `confirm-required` | `--auto` pre-approved from CONTEXT D-13/D-14/D-15 |

## Auth Gates

None.

## Known Stubs

None — cleanup implemented; WINDOWS stubs #1 and #3 marked fixed.

## Threat Flags

None beyond plan threat model (T-28-01/02/03 mitigated by confirm gate, SAF-02 defaults, explicit targets).

## Self-Check: PASSED

- FOUND: `src/mcp/tools/intelligence.ts` (`handleIntelligenceCleanup`)
- FOUND: `src/mcp/capabilities.ts` (`intelligence_scorecard`)
- FOUND: `28a9fe0`, `80152ca` in git log
- FOUND: README.md / README.de.md mention `intelligence.scorecard`
- VERIFY: `npx vitest run src/mcp/tools/intelligence.test.ts src/mcp/tools/system.test.ts` — 22 passed
