---
phase: 15-multi-instance-registry-routing
plan: 04
subsystem: api
tags: [multi-instance, instance-routing, resolveCredentials, CTX-06, read-tools]

requires:
  - phase: 15-multi-instance-registry-routing
    plan: 01
    provides: InstanceManager.resolveCredentials + error codes
  - phase: 15-multi-instance-registry-routing
    plan: 03
    provides: parseWithInstanceRouting + resolveRoutingEnv pattern
provides:
  - optional instance param on 7 read/CRUD domain tools
  - per-request credential resolution for resource/system/diagnose/server/private_key/project/environment
  - consolidated CTX-06 integration routing tests for all 12 API-calling tools
affects: []

tech-stack:
  added: []
  patterns:
    - "parseWithInstanceRouting / safeParseWithInstanceRouting at handler entry (strict schemas preserved)"
    - "resolveRoutingEnv merges registry creds before every API call"
    - "Integration prod-routing tests use isolated registry dir; error paths use empty registry"

key-files:
  created: []
  modified:
    - src/mcp/tools/resource.ts
    - src/mcp/tools/system.ts
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/server.ts
    - src/mcp/tools/private_key.ts
    - src/mcp/tools/project.ts
    - src/mcp/tools/environment.ts
    - src/mcp/integration.test.ts

key-decisions:
  - "Reused Plan 15-03 strip-before-parse pattern — no z.intersection on strict CRUD schemas"
  - "CTX-06 error-path tests stay outside prod registry setup — default instance would mask COOLIFY_NO_INSTANCE"
  - "database.list in plan → database.get in tests (no list action on database tool)"

patterns-established:
  - "Pattern: read/CRUD handlers resolve routingEnv once; helper functions receive routed EnvConfig via param"

requirements-completed: [CTX-06]

coverage:
  - id: D1
    description: "resource, system, diagnose accept optional instance and route via resolveCredentials"
    requirement: CTX-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts + system.test.ts + diagnose.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "server, private_key, project, environment accept optional instance and route via resolveCredentials"
    requirement: CTX-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/server.test.ts + private_key.test.ts + project.test.ts + environment.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Integration routing for all 12 API tools — named instance, unknown, no-instance, partial-env"
    requirement: CTX-06
    verification:
      - kind: integration
        ref: "src/mcp/integration.test.ts — CTX-06 describe (12 prod + 3 error tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run build GREEN after read-tool routing wiring"
    verification:
      - kind: other
        ref: "npm run build (tsup)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-21
status: complete
---

# Phase 15 Plan 04: Read/CRUD Instance Routing Summary

**7 Read/CRUD-Tools mit optionalem `instance`-Param und per-Request resolveCredentials — CTX-06 für alle 12 API-Tools abgeschlossen**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-21T05:16:09Z
- **Completed:** 2026-07-21T05:22:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- resource, system, diagnose: parseWithInstanceRouting + resolveRoutingEnv an Handler-Entry
- server, private_key, project, environment: gleiches Muster (safeParse für strict CRUD-Schemas)
- integration.test.ts: Wave-0 application prod-Stub → GREEN; 11 weitere prod-Routing-Cases für alle API-Tools
- Gesamtsuite 876 passed; kein global mutable Client (frische URL/Token pro Request)

## Task Commits

1. **Task 1: Route resource, system, diagnose handlers via instance param** - `30fae33` (feat)
2. **Task 2: Route server, private_key, project, environment handlers via instance param** - `fe2d3b4` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/resource.ts` — parseWithInstanceRouting + routingEnv in list/find
- `src/mcp/tools/system.ts` — health/version/verify/infrastructure_overview geroutet
- `src/mcp/tools/diagnose.ts` — app/server/scan sub-handlers erhalten routingEnv
- `src/mcp/tools/server.ts` — CRUD/validate mit routingEnv
- `src/mcp/tools/private_key.ts` — safeParseWithInstanceRouting + routingEnv
- `src/mcp/tools/project.ts` — safeParseWithInstanceRouting + routingEnv
- `src/mcp/tools/environment.ts` — safeParseWithInstanceRouting + routingEnv
- `src/mcp/integration.test.ts` — 12 prod-routing + 3 error-path Tests

## Decisions Made

- Plan 15-03 strip-before-parse wiederverwendet — strict() auf server/private_key/project/environment intakt
- Prod-Routing-Tests in nested describe mit Registry-Setup; Error-Pfade ohne Default-Instance
- Plan nannte database.list — Test nutzt database.get (kein list-Action im Tool)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] COOLIFY_NO_INSTANCE test failed after prod registry beforeEach**
- **Found during:** Task 1 (integration test run)
- **Issue:** Global beforeEach set prod as default — no-instance test resolved prod creds instead of error
- **Fix:** Nested describe `named instance routes to registry creds` with isolated registry setup
- **Files modified:** src/mcp/integration.test.ts
- **Committed in:** 30fae33

**2. [Rule 1 - Bug] private_key findDependentServers referenced routingEnv out of scope**
- **Found during:** Task 2 (replace_all on env.COOLIFY)
- **Issue:** Helper used routingEnv but only receives env param
- **Fix:** Restored env.COOLIFY in findDependentServers; handler passes routingEnv as env arg
- **Files modified:** src/mcp/tools/private_key.ts
- **Committed in:** fe2d3b4

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Korrektheit/Test-Kontrakte; kein Scope-Creep

## TDD Gate Compliance

- RED gate: Wave 0 (Plan 15-00) — application prod-routing it.fails scaffold
- GREEN gate Task 1: 30fae33 — resource/system/diagnose + prod routing integration cases
- GREEN gate Task 2: fe2d3b4 — server/private_key/project/environment + remaining lifecycle routing cases

## Issues Encountered

None blocking beyond deviations above

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CTX-06 vollständig — alle 12 API-calling Tools geroutet
- meta/docs bewusst ohne instance (kein Coolify API Call)
- Phase 15 bereit für verify-work / Phase-Abschluss

---
*Phase: 15-multi-instance-registry-routing*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/mcp/tools/resource.ts
- FOUND: src/mcp/tools/system.ts
- FOUND: src/mcp/tools/diagnose.ts
- FOUND: src/mcp/tools/server.ts
- FOUND: src/mcp/tools/private_key.ts
- FOUND: src/mcp/tools/project.ts
- FOUND: src/mcp/tools/environment.ts
- FOUND: src/mcp/integration.test.ts
- FOUND: .planning/phases/15-multi-instance-registry-routing/15-04-SUMMARY.md
- FOUND: 30fae33
- FOUND: fe2d3b4
