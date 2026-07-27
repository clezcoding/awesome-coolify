---
phase: 19-dx-schemas-mcp-prompts
plan: 01
subsystem: api
tags: [mcp, zod, json-schema, dx, flat-schema, cursor]

requires:
  - phase: 19-dx-schemas-mcp-prompts
    provides: Phase 19 CONTEXT/RESEARCH/PATTERNS/UI-SPEC design contracts
provides:
  - createFlatActionSchema helper with per-action allowed/required superRefine
  - sharedReadParamsFlatShape / sharedLogParamsFlatShape (no Zod defaults at MCP boundary)
  - 17 domain tools migrated to flat z.object inputSchema
  - Co-located actionsCatalog + safetyFooter constants on every domain tool
  - Action-aware COOLIFY_VALIDATION_ERROR recoveryHints via parseWithInstanceRouting
affects:
  - 19-02 (server.ts description wiring + MCP prompts registry)

tech-stack:
  added: []
  patterns:
    - "createFlatActionSchema(actions, shape, allowed, required?, extraRefine?) for flat MCP JSON Schema"
    - "sharedReadParamsFlatShape — optional fields without defaults; parseReadParams in handlers"
    - "withInstanceRoutingSchema ZodObject-only — union branch removed"

key-files:
  created: []
  modified:
    - src/mcp/tools/shared-read-params.ts
    - src/mcp/tools/system.ts
    - src/mcp/tools/resource.ts
    - src/mcp/tools/docs.ts
    - src/mcp/tools/meta.ts
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/deployment.ts
    - src/mcp/tools/instance.ts
    - src/mcp/tools/manifest.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/private_key.ts
    - src/mcp/tools/server.ts
    - src/mcp/tools/project.ts
    - src/mcp/tools/environment.ts
    - src/mcp/tools/emergency.ts

key-decisions:
  - "Flat shape fields omit Zod .default() — defaults applied in handlers via parseReadParams or explicit ?? to avoid superRefine false positives"
  - "instance key skipped in createFlatActionSchema disallowed-key check — routing param stripped before handler parse"
  - "Nested create discriminators flattened to top-level optional fields with extraRefine XOR (application source_type, database engine)"

patterns-established:
  - "Every domain tool exports <domain>ActionsCatalog + <domain>SafetyFooter co-located with schema"
  - "Per-action invariants composed via createFlatActionSchema 5th-arg extraRefine callback"

requirements-completed: [DX-02]

coverage:
  - id: D1
    description: createFlatActionSchema helper with strict per-action field validation
    requirement: DX-02
    verification:
      - kind: unit
        ref: src/mcp/tools/shared-read-params.test.ts#createFlatActionSchema
        status: pass
    human_judgment: false
  - id: D2
    description: 17 domain tools use flat z.object inputSchema (no top-level union/discriminatedUnion)
    requirement: DX-02
    verification:
      - kind: unit
        ref: "rg: no discriminatedUnion in src/mcp/tools/*.ts exports"
        status: pass
    human_judgment: false
  - id: D3
    description: actionsCatalog + safetyFooter exported on every domain tool file
    requirement: DX-02
    verification:
      - kind: unit
        ref: "grep ActionsCatalog|SafetyFooter — 17 files × 2 constants"
        status: pass
    human_judgment: false
  - id: D4
    description: Cursor tool panel renders top-level parameters (flat JSON Schema properties)
    requirement: DX-02
    verification: []
    human_judgment: true
    rationale: Visual MCP host rendering deferred to plan 19-02 manual verification per plan success criteria

duration: 18min
completed: 2026-07-24
status: complete
---

# Phase 19 Plan 01: Flat Schema DX Foundation Summary

**Flat z.object MCP inputSchemas via createFlatActionSchema across 17 domain tools — restores Cursor parameter panels while preserving { action, ...fields } call shape**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-24T01:07:35Z
- **Completed:** 2026-07-24T01:25:04Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Shipped `createFlatActionSchema` with per-action allowed/required superRefine and Symbol-attached metadata for action-aware recoveryHints
- Migrated all 17 domain tool files from top-level `z.discriminatedUnion`/`z.union` to flat schemas
- Exported hand-maintained `actionsCatalog` + `safetyFooter` constants on every domain tool (D-05/D-08)
- Simplified `withInstanceRoutingSchema` to ZodObject-only extend — server registration now requires flat schemas
- 960 tests green including MCP schema validation integration test

## Task Commits

1. **Task 1: Flat schema helper + action-aware recoveryHints** - `646c22b` (feat)
2. **Task 2: Migrate read/action-routed domain tools** - `ec48244` (feat)
3. **Task 3: Migrate CRUD domain tools** - `ee599c6` (feat)

## Files Created/Modified

- `src/mcp/tools/shared-read-params.ts` — createFlatActionSchema, flat shapes, flat-only withInstanceRoutingSchema
- `src/mcp/tools/*.ts` (17 domain tools) — flat schemas + catalog/footer constants
- `src/mcp/tools/diagnose.test.ts`, `resource.test.ts`, `emergency.test.ts` — pagination/default assertions updated

## Decisions Made

- Flat MCP shape fields use `.optional()` without `.default()` — handler-level `parseReadParams` or `??` restores prior default behavior
- `instance` routing param excluded from createFlatActionSchema disallowed-key check (stripped before inner parse)
- Nested create unions (application source_type, database engine) flattened to top-level optional enums with extraRefine XOR

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] diagnose scan pagination meta undefined after flat migration**
- **Found during:** Task 2 commit (pre-commit integration test)
- **Issue:** Flat schema dropped page/per_page defaults; handleDiagnoseScan passed undefined to buildReadResponse
- **Fix:** Apply parseReadParams(parsed) in handleDiagnoseScan before pagination
- **Files modified:** src/mcp/tools/diagnose.ts
- **Committed in:** ec48244

**2. [Rule 2 - Missing Critical] Handler defaults for fields removed from flat Zod defaults**
- **Found during:** Task 2/3 migration
- **Issue:** Zod `.default()` on flat shape fields caused superRefine to reject all actions (defaults populate Object.keys)
- **Fix:** sharedReadParamsFlatShape/sharedLogParamsFlatShape without defaults; handlers apply defaults explicitly
- **Files modified:** shared-read-params.ts + multiple handlers
- **Committed in:** 646c22b, ec48244, ee599c6

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Required for correctness; no scope creep.

## Issues Encountered

- Pre-commit full vitest initially timed out on MCP schema integration test because withInstanceRoutingSchema threw on unmigrated union schemas — resolved after completing tool migrations

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 19-02 can wire actionsCatalog + safetyFooter into server.ts tool descriptions and ship MCP prompts registry
- Cursor parameter panel visual verification deferred to 19-02 per plan

---
*Phase: 19-dx-schemas-mcp-prompts*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: .planning/phases/19-dx-schemas-mcp-prompts/19-01-SUMMARY.md
- FOUND: commit 646c22b
- FOUND: commit ec48244
- FOUND: commit ee599c6
