---
phase: 28-instance-intelligence
plan: 00
subsystem: testing
tags: [vitest, it.fails, nyquist, intelligence, resource-graph, INTEL-01, GRAPH-01, JANI-01]

requires: []
provides:
  - "Wave 0 RED scaffolds for intelligence scorecard/graph/impact/janitor/cleanup (INTEL/GRAPH/JANI)"
  - "resource-graph edgesFromFlatResources + findDependents it.fails scaffolds"
  - "eleven-key capabilities it.fails scaffold including five intelligence_* (D-19)"
  - "coverage-map.yaml intelligence.* rows (D-19)"
affects:
  - 28-01
  - 28-02
  - 28-03
  - 28-04

tech-stack:
  added: []
  patterns:
    - "vitest it.fails + dynamic import inside it callbacks — husky green while production modules absent"
    - "Wave 0 RED locks INTEL/GRAPH/JANI contracts before Plans 28-01..28-04 flip GREEN"

key-files:
  created:
    - src/mcp/tools/intelligence.test.ts
    - src/utils/resource-graph.test.ts
  modified:
    - src/mcp/tools/system.test.ts
    - docs/coverage-map.yaml

key-decisions:
  - "Dynamic import inside it.fails only — no top-level static import of nonexistent intelligence.js / resource-graph.js"
  - "system.test.ts keeps six-key green it; eleven-key count is it.fails only (Phase 26 pattern)"
  - "Production intelligence.ts / resource-graph.ts / capabilities.ts / server.ts untouched in Wave 0"

patterns-established:
  - "Phase 28 Wave 0 mirrors Phase 17/26: it.fails + dynamic import for modules that do not exist yet"

requirements-completed: [INTEL-01, INTEL-02, GRAPH-01, GRAPH-02, JANI-01, JANI-02]

coverage:
  - id: D1
    description: "intelligence.test.ts it.fails scaffolds for scorecard/findings/partial/graph/impact/janitor/cleanup"
    requirement: INTEL-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "resource-graph.test.ts it.fails for edgesFromFlatResources + findDependents"
    requirement: GRAPH-01
    verification:
      - kind: unit
        ref: "src/utils/resource-graph.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "system.version eleven capability keys including five intelligence_* (D-19)"
    requirement: INTEL-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities"
        status: pass
    human_judgment: false
  - id: D4
    description: "coverage-map.yaml five intelligence.* MCP-composite rows"
    verification:
      - kind: other
        ref: "docs/coverage-map.yaml#intelligence.scorecard"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-30
status: complete
---

# Phase 28 Plan 00: Wave 0 Nyquist RED Scaffolds Summary

**`it.fails` + dynamic-import RED scaffolds lock INTEL/GRAPH/JANI acceptance before production modules exist — husky stays green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-30T01:33:24Z
- **Completed:** 2026-07-30T01:36:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Co-located `intelligence.test.ts` with 8 `it.fails` cases (scorecard, findings, soft partial, graph, impact, janitor, cleanup×2)
- Co-located `resource-graph.test.ts` with 2 `it.fails` cases (`edgesFromFlatResources`, `findDependents`)
- `system.test.ts` parallel `it.fails` for eleven capability keys including five `intelligence_*` (D-19)
- `docs/coverage-map.yaml` five `intelligence.*` MCP-composite rows

## Task Commits

Each task was committed atomically:

1. **Task 1: RED scaffolds for intelligence actions + resource-graph** - `c5e602a` (test)
2. **Task 2: RED scaffolds for capabilities + coverage-map rows** - `40f3c49` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/mcp/tools/intelligence.test.ts` — Wave 0 RED contracts for all five intelligence actions
- `src/utils/resource-graph.test.ts` — Wave 0 RED contracts for graph helpers
- `src/mcp/tools/system.test.ts` — eleven-key capabilities `it.fails` (keeps six-key green)
- `docs/coverage-map.yaml` — intelligence.scorecard/graph/impact/janitor/cleanup rows

## Decisions Made

- Dynamic import inside `it.fails` callbacks only — top-level static import of missing modules would break Vitest collect/compile and husky
- Keep existing six-key green capabilities test; add parallel eleven-key `it.fails` (Phase 26 precedent)
- No production `intelligence.ts` / `resource-graph.ts` / capabilities / server / README edits in this plan

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `test(28-00)` commits present (`c5e602a`, `40f3c49`)
- GREEN gate: intentionally deferred — Wave 0 scaffolds only; Plans 28-01..28-04 implement production and flip `it.fails` → `it`

## Threat Flags

None — Wave 0 tests only; no new network/auth/schema surface. T-28-01/T-28-02 locked as RED expectations for Plan 28-04.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `src/mcp/tools/intelligence.test.ts`
- FOUND: `src/utils/resource-graph.test.ts`
- FOUND: `docs/coverage-map.yaml` intelligence.* rows (5)
- FOUND: commits `c5e602a`, `40f3c49`
- FOUND: no production `intelligence.ts` / `resource-graph.ts`
- FOUND: vitest exits 0 (`10 expected fail` + `1 expected fail` capabilities)
