---
phase: 28-instance-intelligence
plan: 01
subsystem: api
tags: [intelligence, resource-graph, GRAPH-01, MCP, UUID-edges, vitest]

requires:
  - phase: 28-00
    provides: "Wave 0 it.fails scaffolds for intelligence + resource-graph"
provides:
  - "intelligence MCP tool registered with scorecard/graph/impact/janitor/cleanup catalog"
  - "intelligence.graph end-to-end with UUID-only edges (D-07/D-08)"
  - "resource-graph.ts buildGraph / edgesFromFlatResources / findDependents / findOrphans"
  - "Service enrichment via fetchService with concurrency cap + soft-fail meta"
affects:
  - 28-02
  - 28-03
  - 28-04

tech-stack:
  added: []
  patterns:
    - "createFlatActionSchema + withInstanceRoutingSchema (instance not in shape — Zod 4 safeExtend)"
    - "COOLIFY_NOT_IMPLEMENTED stubs for deferred intelligence actions (D-18)"
    - "UUID-only graph edges; service nested children via bounded enrichServiceEdges"

key-files:
  created:
    - src/utils/resource-graph.ts
    - src/mcp/tools/intelligence.ts
  modified:
    - src/mcp/server.ts
    - src/mcp/server.test.ts
    - src/mcp/tools/intelligence.test.ts
    - src/utils/resource-graph.test.ts

key-decisions:
  - "Instance routing via withInstanceRoutingSchema only — do not put instance in createFlatActionSchema shape (Zod 4 extend + refinements)"
  - "Deferred actions throw COOLIFY_NOT_IMPLEMENTED naming pending plan (28-02/03/04)"
  - "Service child edges are child→service (relation service_child) for reverse-BFS dependents"

patterns-established:
  - "New composite domain tool mirrors diagnose registration + catalog/safety footer"
  - "Graph enrichment soft-fails into meta.service_fetch_errors without failing the read"

requirements-completed: [GRAPH-01]

coverage:
  - id: D1
    description: "intelligence.graph returns nodes+edges from database_uuid, application_uuid, and service nested children"
    requirement: GRAPH-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#graph"
        status: pass
    human_judgment: false
  - id: D2
    description: "resource-graph edgesFromFlatResources + findDependents"
    requirement: GRAPH-01
    verification:
      - kind: unit
        ref: "src/utils/resource-graph.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "intelligence tool registered in server.ts with actionsCatalog"
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#MCP server tool registration"
        status: pass
    human_judgment: false
  - id: D4
    description: "meta.services_enriched + empty nested + soft-fail fetchService"
    requirement: GRAPH-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#meta.services_enriched"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-30
status: complete
---

# Phase 28 Plan 01: Intelligence Graph Tracer Summary

**New `intelligence` MCP tool ships end-to-end `graph` with UUID-only edges from flat resources + bounded `fetchService` enrichment.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-30T01:40:05Z
- **Completed:** 2026-07-30T01:48:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `resource-graph.ts`: flat UUID edges, service nested edges, `buildGraph`, `findDependents`, `findOrphans`, concurrency-5 enrichment with soft-fail
- `intelligence.ts`: five-action catalog/schema; `handleIntelligenceGraph` live; scorecard/impact/janitor/cleanup → `COOLIFY_NOT_IMPLEMENTED`
- `server.ts` registers `intelligence` (19 tools); Wave 0 graph + resource-graph tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end intelligence.graph — UUID edges through util, tool, server** - `726789f` (feat)
2. **Task 2: Harden graph enrichment meta + empty-service pitfall coverage** - `732e08e` (test)

**Plan metadata:** `b5a83e1` (docs: complete plan)

## Files Created/Modified

- `src/utils/resource-graph.ts` — UUID graph helpers + service enrichment
- `src/mcp/tools/intelligence.ts` — intelligence tool schema/handlers
- `src/mcp/server.ts` — registerTool('intelligence')
- `src/mcp/server.test.ts` — expect 19 tools + intelligenceActionSchema routing
- `src/mcp/tools/intelligence.test.ts` — graph GREEN + enrichment/soft-fail coverage
- `src/utils/resource-graph.test.ts` — edgesFromFlatResources + findDependents GREEN

## Decisions Made

- Keep `instance` off the flat schema shape; rely on `withInstanceRoutingSchema` (Zod 4 cannot `.extend()` refined objects that already own `instance`)
- Stub deferred actions with `COOLIFY_NOT_IMPLEMENTED` + pending plan id (D-18: no fake Coolify data)
- Service edges: child → service (`service_child`) so `findDependents` reverse-BFS stays consistent with flat child→parent edges

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod 4 withInstanceRoutingSchema crash on intelligence schema**
- **Found during:** Task 1 (pre-commit server.test)
- **Issue:** Including `instance` in `createFlatActionSchema` shape then wrapping with `withInstanceRoutingSchema` threw `Cannot overwrite keys on object schemas containing refinements`
- **Fix:** Remove `instance` from shape/allowed fields (diagnose pattern); keep MCP wrap
- **Files modified:** `src/mcp/tools/intelligence.ts`
- **Committed in:** `726789f`

**2. [Rule 2 - Missing critical] server.test expected tool count/list**
- **Found during:** Task 1 (pre-commit)
- **Issue:** Registration added 19th tool; tests still expected 18 and omitted `intelligence`
- **Fix:** Update count, expectedTools, routed schema list, diagnose block end marker
- **Files modified:** `src/mcp/server.test.ts`
- **Committed in:** `726789f`

### TDD note (Task 2)

Tracer Task 1 already shipped enrichment + `meta.services_enriched`. Task 2 added GREEN coverage tests (meta / empty nested / soft-fail) rather than a separate RED→GREEN cycle against missing production code.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `src/mcp/tools/intelligence.ts` | `scorecard` / `impact` / `janitor` / `cleanup` throw `COOLIFY_NOT_IMPLEMENTED` | Plan prohibition — deferred to 28-02..28-04; Wave 0 cases stay `it.fails` |

## Threat Flags

None beyond plan threat model (UUID-only edges; projected node fields; cleanup mutate deferred).

## Self-Check: PASSED

- FOUND: `src/utils/resource-graph.ts`
- FOUND: `src/mcp/tools/intelligence.ts`
- FOUND: commit `726789f`
- FOUND: commit `732e08e`
