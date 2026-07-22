---
phase: 15-multi-instance-registry-routing
plan: 03
subsystem: api
tags: [multi-instance, instance-routing, resolveCredentials, CTX-06, strict-schema]

requires:
  - phase: 15-multi-instance-registry-routing
    plan: 01
    provides: InstanceManager.resolveCredentials + error codes
provides:
  - optional instance param on 5 mutation-heavy domain tools
  - per-request credential resolution via resolveRoutingEnv
  - parseWithInstanceRouting pattern preserving strict Zod schemas
affects:
  - 15-04

tech-stack:
  added: []
  patterns:
    - "parseWithInstanceRouting strips instance before strict inner parse"
    - "resolveRoutingEnv merges InstanceManager creds into EnvConfig per request"
    - "Handler entry resolves creds once; sub-handlers receive routingEnv"

key-files:
  created: []
  modified:
    - src/mcp/tools/shared-read-params.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/deployment.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/emergency.ts
    - src/mcp/integration.test.ts

key-decisions:
  - "parseWithInstanceRouting instead of z.intersection — preserves SAF-03 strict() on action schemas"
  - "resolveRoutingEnv uses handler env param (not raw process.env) — unit-test seam preserved"
  - "3 CTX-06 error-path integration scaffolds flipped in 15-03 — husky pre-commit blocked otherwise"

patterns-established:
  - "Pattern: strip instance → parse strict action schema → merge instance back"
  - "Pattern: resolveRoutingEnv at handler entry; pass routingEnv to all sub-handlers"

requirements-completed: [CTX-06]

coverage:
  - id: D1
    description: "application + deployment accept optional instance param and route via resolveCredentials"
    requirement: CTX-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts + deployment.test.ts (124 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "service + database + emergency accept optional instance param and route via resolveCredentials"
    requirement: CTX-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts + database.test.ts + emergency.test.ts (169 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unknown/partial/missing creds return COOLIFY_INSTANCE_NOT_FOUND / COOLIFY_PARTIAL_ENV / COOLIFY_NO_INSTANCE"
    requirement: CTX-06
    verification:
      - kind: integration
        ref: "src/mcp/integration.test.ts — CTX-06 error-path (3 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run build GREEN after routing wiring"
    verification:
      - kind: other
        ref: "npm run build (tsup)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-21
status: complete
---

# Phase 15 Plan 03: Mutation Tool Instance Routing Summary

**5 Lifecycle-Tools (application, service, database, deployment, emergency) mit optionalem `instance`-Param und per-Request resolveCredentials — strict Schemas intakt**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-21T05:09:13Z
- **Completed:** 2026-07-21T05:15:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `optionalInstanceParam` (D-08 Regex) + `parseWithInstanceRouting` / `resolveRoutingEnv` in shared-read-params
- application, deployment, service, database, emergency: Handler entry → `resolveRoutingEnv(env, parsed.instance)` → frische URL/Token pro Request
- Fehlerpfade: COOLIFY_INSTANCE_NOT_FOUND / COOLIFY_PARTIAL_ENV / COOLIFY_NO_INSTANCE via wrapMcpError
- 293 Tool-Unit-Tests GREEN; Gesamtsuite 867 passed | 1 expected fail (prod-routing scaffold für 15-04)

## Task Commits

1. **Task 1: Add instance param to schemas + route application & deployment handlers** - `3da5bdb` (feat)
2. **Task 2: Route service, database, emergency handlers via instance param** - `6aba8c5` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/shared-read-params.ts` — optionalInstanceParam, parseWithInstanceRouting, resolveRoutingEnv
- `src/mcp/tools/application.ts` — safeParseWithInstanceRouting + routingEnv in handleApplicationAction
- `src/mcp/tools/deployment.ts` — parseWithInstanceRouting + routingEnv
- `src/mcp/tools/service.ts` — safeParseWithInstanceRouting + routingEnv
- `src/mcp/tools/database.ts` — safeParseWithInstanceRouting + routingEnv
- `src/mcp/tools/emergency.ts` — parseWithInstanceRouting + routingEnv
- `src/mcp/integration.test.ts` — 3 CTX-06 error-path it.fails → it

## Decisions Made

- `z.intersection` verworfen — bricht `.strict()` auf service/database/emergency; strip-before-parse stattdessen
- `resolveRoutingEnv` nutzt Handler-`env`-Param (Tests), semantisch gleichwertig zu process.env in Produktion
- Minimaler integration.test-Flip für Husky — prod-routing scaffold bleibt it.fails für Plan 15-04

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Shared routing helpers in shared-read-params.ts**
- **Found during:** Task 1
- **Issue:** Plan listete nur 5 Tool-Files; DRY für instance param + resolveRoutingEnv nötig
- **Fix:** optionalInstanceParam, parseWithInstanceRouting, resolveRoutingEnv exportiert
- **Files modified:** src/mcp/tools/shared-read-params.ts
- **Committed in:** 3da5bdb

**2. [Rule 1 - Bug] z.intersection weakened strict action schemas**
- **Found during:** Task 2 (SAF-03 / D-16 strict tests failed)
- **Issue:** Intersection mit instanceExtension ließ unbekannte Felder (pull_latest, force) durch
- **Fix:** parseWithInstanceRouting strippt instance vor innerem strict parse
- **Files modified:** shared-read-params.ts, service.ts, database.ts, emergency.ts, application.ts, deployment.ts
- **Committed in:** 3da5bdb, 6aba8c5

**3. [Rule 3 - Blocking] Husky blocked on passing it.fails integration scaffolds**
- **Found during:** Task 1 commit
- **Issue:** 3 CTX-06 error-path tests grün nach Implementierung — pre-commit exit 1
- **Fix:** it.fails → it für unknown/no-instance/partial-env Cases
- **Files modified:** src/mcp/integration.test.ts
- **Committed in:** 3da5bdb

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** Korrektheits-/Test-Kontrakte; kein Scope-Creep auf read tools (15-04)

## TDD Gate Compliance

- RED gate: Wave 0 (Plan 15-00) — integration it.fails scaffolds für CTX-06
- GREEN gate: Task 1 commit 3da5bdb — application/deployment + 3 error integration tests
- Task 2 commit 6aba8c5 — service/database/emergency strict tests preserved GREEN

## Issues Encountered

None blocking beyond deviations above

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-04 kann verbleibende 7 read/CRUD tools + prod-routing integration scaffold verdrahten
- Mutation-heavy tools sicher geroutet — kein global mutable client (Pitfall 1)

---
*Phase: 15-multi-instance-registry-routing*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/mcp/tools/shared-read-params.ts (extended)
- FOUND: src/mcp/tools/application.ts
- FOUND: src/mcp/tools/deployment.ts
- FOUND: src/mcp/tools/service.ts
- FOUND: src/mcp/tools/database.ts
- FOUND: src/mcp/tools/emergency.ts
- FOUND: .planning/phases/15-multi-instance-registry-routing/15-03-SUMMARY.md
- FOUND: 3da5bdb
- FOUND: 6aba8c5
