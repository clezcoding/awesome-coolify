---
phase: 15-multi-instance-registry-routing
plan: 02
subsystem: api
tags: [instance-tool, soft-start, env, multi-instance, discriminatedUnion, token-redaction]

requires:
  - phase: 15-multi-instance-registry-routing
    plan: 01
    provides: InstanceManager CRUD + resolveCredentials from Plan 15-01
provides:
  - instance MCP tool with 7 actions (list/get/add/update/delete/set-default/import-env)
  - loadEnv soft-start with COOLIFY_PARTIAL_ENV guard
  - Server boots without COOLIFY_URL/TOKEN; 15 tools registered
affects:
  - 15-03
  - 15-04

tech-stack:
  added: []
  patterns:
    - "instance tool: discriminatedUnion on action, no instance routing param (D-03)"
    - "handleInstanceAction uses wrapMcpError + isInstanceErrorResult like private_key.ts"
    - "envOverride in list _meta when URL+TOKEN both set (D-17)"
    - "loadEnv optional URL/TOKEN with post-parse partial-env guard (D-18/D-13)"

key-files:
  created:
    - src/mcp/tools/instance.ts
  modified:
    - src/config/env.ts
    - src/mcp/server.ts
    - src/mcp/tools/instance.test.ts
    - src/config/env.test.ts
    - src/mcp/server.test.ts
    - src/mcp/integration.test.ts

key-decisions:
  - "Error path via wrapMcpError + isInstanceErrorResult — mirrors private_key, not RED scaffold .rejects"
  - "envOverride checks optional env param OR process.env — test seam for handleInstanceAction(env?)"
  - "import-env auto-derives name from URL hostname when name omitted"
  - "Partial-env loadEnv tests use try/catch toMatchObject — vitest toThrow nested matcher insufficient"

patterns-established:
  - "Pattern: instance tool never receives env at server registration — reads process.env for import-env"
  - "Pattern: token redaction at handler boundary via maskInstance unless reveal:true"

requirements-completed: [CTX-04, CTX-05, CTX-08]

coverage:
  - id: D1
    description: "instance tool 7 actions with discriminatedUnion schema and token redaction"
    requirement: CTX-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts — 12 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "loadEnv soft-start and COOLIFY_PARTIAL_ENV partial-env guard"
    requirement: CTX-05
    verification:
      - kind: unit
        ref: "src/config/env.test.ts — soft-start + partial-env cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "instance.list _meta.envOverride when env credentials both set"
    requirement: CTX-08
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts — envOverride test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Server registers 15 tools including instance with readOnlyHint"
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts — registerTool count 15"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run build GREEN after soft-start wiring"
    verification:
      - kind: other
        ref: "npm run build (tsup)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-21
status: complete
---

# Phase 15 Plan 02: Instance Tool + Env Soft-Start Summary

**instance-Tool mit 7 Registry-Aktionen, env soft-start (D-18) und 15. MCP-Tool — Server bootet ohne Credentials**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-21T05:05:32Z
- **Completed:** 2026-07-21T05:08:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `instance.ts`: list/get/add/update/delete/set-default/import-env über InstanceManager
- Token-Redaction (`***`) unless `reveal:true`; `_meta.envOverride` bei gesetztem URL+TOKEN (D-17)
- `loadEnv`: URL/TOKEN optional; partial-env → `COOLIFY_PARTIAL_ENV`; leerer Env → soft-start defaults
- `server.ts`: 15. Tool `instance` registriert; boot ohne Credentials möglich
- Wave-0 Tests geflippt: 12 instance + 2 env soft-start GREEN; Gesamtsuite 864 passed | 4 expected fail

## Task Commits

1. **Task 1: instance.ts tool + softened env.ts** - `1ea8ecb` (feat)
2. **Task 2: server.ts — soft-start boot + register instance tool** - `a5860b7` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/instance.ts` — instanceActionSchema, handleInstanceAction, isInstanceErrorResult
- `src/config/env.ts` — optional URL/TOKEN, partial-env guard, formatEnvLoadHint soft-start paths
- `src/mcp/server.ts` — instance tool registration, envOverride in toolOutputSchema _meta
- `src/mcp/tools/instance.test.ts` — it.fails → it (12 tests GREEN)
- `src/config/env.test.ts` — soft-start + partial-env GREEN; legacy partial tests → COOLIFY_PARTIAL_ENV
- `src/mcp/server.test.ts` — registerTool count 14 → 15
- `src/mcp/integration.test.ts` — readOnlyHint count 4 → 5

## Decisions Made

- Error-Pfad via wrapMcpError + isInstanceErrorResult (private_key-Muster), nicht RED-Scaffold `.rejects`
- envOverride prüft optional übergebenes env ODER process.env — Test-Seam für handleInstanceAction(env?)
- import-env leitet fehlenden Namen aus URL-Hostname ab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] integration.test readOnlyHint count stale after instance tool**
- **Found during:** Task 2 commit (husky pre-commit)
- **Issue:** Test erwartete 4 readOnlyHint-Tools, instance fügt 5. hinzu
- **Fix:** readOnlyCount 4 → 5 in integration.test.ts
- **Files modified:** src/mcp/integration.test.ts
- **Committed in:** a5860b7

**2. [Rule 1 - Bug] env.test partial-env assertions incompatible with softened loadEnv**
- **Found during:** Task 1
- **Issue:** Legacy Tests erwarteten ZodError bei nur URL/TOKEN; neues Verhalten ist COOLIFY_PARTIAL_ENV
- **Fix:** Tests auf try/catch + envelope.code umgestellt
- **Files modified:** src/config/env.test.ts
- **Committed in:** 1ea8ecb

**3. [Rule 2 - Missing Critical] instance.test error cases aligned to wrapMcpError contract**
- **Found during:** Task 1
- **Issue:** RED scaffolds nutzten `.rejects`; Handler folgt private_key wrapMcpError-Muster
- **Fix:** Error-Tests auf isInstanceErrorResult + structuredContent.error.code umgestellt
- **Files modified:** src/mcp/tools/instance.test.ts
- **Committed in:** 1ea8ecb

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** Korrektheits-/Test-Kontrakte; kein Scope-Creep

## TDD Gate Compliance

- RED gate: Wave 0 (Plan 15-00) — 14 it.fails scaffolds (12 instance + 2 env)
- GREEN gate: Task 1 commit 1ea8ecb — instance + env tests pass
- Task 2 commit a5860b7 — server registration + build GREEN

## Issues Encountered

None blocking — husky integration.test readOnlyCount caught at Task 2 commit

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-03 kann resolveCredentials in domain tools verdrahten (COOLIFY_NO_INSTANCE at call time)
- Plan 15-04 kann instance routing param auf domain tools bringen
- Soft-start boot bereit für Phase 18 UAT single-CLI story

---
*Phase: 15-multi-instance-registry-routing*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/mcp/tools/instance.ts
- FOUND: src/config/env.ts (softened)
- FOUND: src/mcp/server.ts (instance registered)
- FOUND: .planning/phases/15-multi-instance-registry-routing/15-02-SUMMARY.md
- FOUND: 1ea8ecb
- FOUND: a5860b7
