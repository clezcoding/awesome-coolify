---
phase: 28-instance-intelligence
plan: 03
subsystem: api
tags: [intelligence, impact, janitor, GRAPH-02, JANI-01, advisory, vitest]

requires:
  - phase: 28-01
    provides: "buildGraph / findDependents / findOrphans + intelligence tool shell"
  - phase: 28-02
    provides: "scorecard path + shared intelligence.ts handler switch"
provides:
  - "handleIntelligenceImpact advisory blast-radius preflight (GRAPH-02)"
  - "handleIntelligenceJanitor read-only candidates (JANI-01)"
  - "findJanitorCandidates + inbound-degree findOrphans + scoped findDependents"
affects:
  - 28-04

tech-stack:
  added: []
  patterns:
    - "Impact reverse-BFS via findDependents; advisory true; no domain delete/restart calls"
    - "Restart tags database_uuid edges as degraded vs outage (D-09)"
    - "Janitor union stopped/long_exited/orphan; preview_only; UUID inbound orphans only (D-08/D-12)"

key-files:
  created: []
  modified:
    - src/utils/resource-graph.ts
    - src/mcp/tools/intelligence.ts
    - src/mcp/tools/intelligence.test.ts

key-decisions:
  - "findOrphans = zero inbound (to_uuid) degree, not fully isolated nodes"
  - "Janitor primary reason priority: long_exited > stopped > orphan (dedupe by uuid)"
  - "Impact fixtures use RFC UUID strings so Zod uuid() validation passes"
  - "Shared loadResourceGraph helper for graph/impact/janitor enrichment"

patterns-established:
  - "intelligence.impact returns target, intent, direct/transitive dependents, depth_cap, advisory, suggested_preflight"
  - "intelligence.janitor returns candidates[] + coverage_note + preview/no-mutation posture"
  - "cleanup remains COOLIFY_NOT_IMPLEMENTED until Plan 28-04"

requirements-completed: [GRAPH-02, JANI-01]

coverage:
  - id: D1
    description: "impact returns direct then transitive dependents within max_depth 3 with advisory true"
    requirement: GRAPH-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#impact"
        status: pass
    human_judgment: false
  - id: D2
    description: "janitor lists stopped/long_exited/orphan with FollowUpHint suggestions and preview_only"
    requirement: JANI-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/intelligence.test.ts#janitor"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-30
status: complete
---

# Phase 28 Plan 03: Advisory Impact + Read-Only Janitor Summary

**Advisory `intelligence.impact` blast-radius preflight and read-only `intelligence.janitor` candidate listing on the shared UUID resource graph — no mutations.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-30T02:01:00Z
- **Completed:** 2026-07-30T02:05:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- GRAPH-02: `handleIntelligenceImpact` — direct then transitive dependents, default `max_depth` 3, `advisory: true`, suggested domain `delete_preview` / `restart` preflight hints
- Restart intent tags `database_uuid` dependents as `degraded` vs `outage` (D-09)
- JANI-01: `handleIntelligenceJanitor` — stopped / long_exited (`updated_at` vs `stopped_days` default 7) / orphan union with `preview_only: true` and `coverage_note`
- Wave 0 impact + janitor `it.fails` flipped GREEN; cleanup stays pending 28-04

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Advisory impact analysis with depth cap | d41b8b1 | resource-graph.ts, intelligence.ts, intelligence.test.ts |
| 2 | Read-only janitor candidates + suggestions | eb69024 | intelligence.ts, intelligence.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Impact Wave 0 fixtures used non-UUID strings**
- **Found during:** Task 1 verify
- **Issue:** Scaffold used `db-uuid-1` etc.; schema requires `z.string().uuid()` so impact would always fail validation
- **Fix:** Replaced impact fixtures/args with RFC UUID v4-shaped strings
- **Files modified:** `src/mcp/tools/intelligence.test.ts`
- **Commit:** d41b8b1

**2. [Rule 2 - Missing critical] findOrphans aligned to inbound degree (D-08/D-12)**
- **Found during:** Task 1/2 graph helpers
- **Issue:** Prior helper treated orphans as fully unlinked; plan/research require zero inbound dependents
- **Fix:** `findOrphans` now uses `to_uuid` inbound set only
- **Files modified:** `src/utils/resource-graph.ts`
- **Commit:** d41b8b1

## Threat Flags

None — advisory/read-only surfaces only; mutations remain gated in Plan 28-04 (`cleanup` + confirm).

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `src/mcp/tools/intelligence.ts` | `cleanup` → `COOLIFY_NOT_IMPLEMENTED` (28-04) | Intentional — Plan 28-04 |

## Verification

- `npx vitest run src/mcp/tools/intelligence.test.ts -t "impact|janitor"` — pass
- Scorecard/graph/impact/janitor suite — pass; cleanup still skipped `it.fails`
- Prohibition checks (no delete clients in intelligence handlers; no env/fuzzy orphan edges) — pass

## Self-Check: PASSED
