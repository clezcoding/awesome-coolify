---
phase: 20-recipes-service-list-types
plan: 01
subsystem: api
tags: [ofetch, service-templates, list-types, jsDelivr, RECIPE-01]

requires:
  - phase: 20-recipes-service-list-types
    provides: Wave 0 RED scaffolds in recipe.test.ts (20-00)
provides:
  - fetchServiceTemplates helper with CDN + GitHub Raw fallback and version pinning
  - mapTemplatesToSlimList returning stable-sorted { id, label }[]
  - service.list-types action wired into service tool
affects: [20-02, 20-03]

tech-stack:
  added: []
  patterns:
    - "Dynamic service-templates.json fetch via hardcoded jsDelivr/GitHub hosts only (T-20-02 SSRF mitigation)"
    - "COOLIFY_FETCH_TEMPLATES_FAILED hard error on double failure or empty {} — no static catalog fallback"

key-files:
  created:
    - src/utils/service-templates.ts
    - src/utils/service-templates.test.ts
  modified:
    - src/utils/errors.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts

key-decisions:
  - "Added COOLIFY_FETCH_TEMPLATES_FAILED to CoolifyErrorCode union + RECOVERY_HINTS for typed hard-error envelope"
  - "Version pin via fetchVersion with v4.x fallback when version fetch fails or returns unknown"

patterns-established:
  - "fetchServiceTemplates exported from utils for Plan 20-02 create-one-click type validation reuse"
  - "list-types returns slim { id, label }[] only — compose/template/category stripped before agent"

requirements-completed: [RECIPE-01]

coverage:
  - id: D1
    description: "fetchServiceTemplates fetches service-templates.json from jsDelivr with GitHub Raw fallback and version pinning"
    requirement: RECIPE-01
    verification:
      - kind: unit
        ref: "src/utils/service-templates.test.ts#fetchServiceTemplates"
        status: pass
    human_judgment: false
  - id: D2
    description: "service.list-types action returns slim stable-sorted type IDs and labels to agents"
    requirement: RECIPE-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service list-types"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-24
status: complete
---

# Phase 20 Plan 01: Service List-Types Summary

**Dynamic service.list-types via jsDelivr/GitHub fetch with version pinning, slim { id, label } mapping, and COOLIFY_FETCH_TEMPLATES_FAILED hard errors**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-24T06:16:00Z
- **Completed:** 2026-07-24T06:18:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `fetchServiceTemplates(env)` — CDN primary, GitHub Raw fallback, instance version pin with `v4.x` fallback
- Created `mapTemplatesToSlimList(raw)` — stable-sorted `{ id, label }[]`, name fallback to id
- Wired `service.list-types` action into schema, catalog, and `handleServiceListTypes` handler
- Added `COOLIFY_FETCH_TEMPLATES_FAILED` error code with outbound-internet + GitHub access recovery hints

## Task Commits

Each task was committed atomically:

1. **Task 1: fetchServiceTemplates helper + slim mapping** - `fca0bef` (feat)
2. **Task 2: Wire list-types action into service tool** - `e61a2c4` (feat)

**Plan metadata:** `0ee142d` (docs: complete plan)

## Files Created/Modified

- `src/utils/service-templates.ts` — `fetchServiceTemplates` + `mapTemplatesToSlimList` exports
- `src/utils/service-templates.test.ts` — 8 unit tests (CDN, fallback, errors, version pin, mapping)
- `src/utils/errors.ts` — `COOLIFY_FETCH_TEMPLATES_FAILED` code + RECOVERY_HINTS
- `src/mcp/tools/service.ts` — `list-types` action registration + handler
- `src/mcp/tools/service.test.ts` — 6 list-types integration tests (992 total service tests green)

## Decisions Made

- Added `COOLIFY_FETCH_TEMPLATES_FAILED` to typed error union — plan referenced code not yet in errors.ts
- Empty `{}` CDN response treated as hard error per D-03 (no silent empty list)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added COOLIFY_FETCH_TEMPLATES_FAILED to errors.ts**
- **Found during:** Task 1 implementation
- **Issue:** Plan throws `CoolifyApiError({ code: 'COOLIFY_FETCH_TEMPLATES_FAILED' })` but code not in `CoolifyErrorCode` union
- **Fix:** Added error code + RECOVERY_HINTS entries for outbound internet and GitHub repo access
- **Files modified:** src/utils/errors.ts
- **Verification:** TypeScript build green; tests assert error code
- **Committed in:** fca0bef (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for typed error envelope; no scope creep

## TDD Gate Compliance

- Task 1+2 combined RED+GREEN per commit — husky pre-commit requires passing suite (Phase 10-01 precedent)
- `test(...)` RED-only commits not used — full vitest runs on pre-commit hook

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Plan 20-02 can import `fetchServiceTemplates` for create-one-click type validation
- Plan 20-03 can ship recipe.ts and flip Wave 0 RED scaffolds GREEN

## Self-Check: PASSED

- FOUND: src/utils/service-templates.ts
- FOUND: src/utils/service-templates.test.ts
- FOUND: src/mcp/tools/service.ts (list-types)
- FOUND: fca0bef
- FOUND: e61a2c4

---
*Phase: 20-recipes-service-list-types*
*Completed: 2026-07-24*
