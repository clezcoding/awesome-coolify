---
phase: 31-agent-playbooks
plan: 03
subsystem: mcp-recipes
tags: [mcp, recipe, recommend, smart-recipes, fetchServiceTemplates, SREC-01, SREC-02, D-14, D-15]

requires:
  - phase: 31-00
    provides: Wave 0 it.fails recommend scaffolds
  - phase: 20-recipe-composites
    provides: recipe tool + create-one-click / fetchServiceTemplates path
provides:
  - recipe.recommend advisory plan from live catalog
  - plan_steps naming create-git-app / create-app-db / create-one-click
  - Object.hasOwn catalog_id guard (no invented one-click IDs)
affects: [31-04, verify-work]

tech-stack:
  added: []
  patterns:
    - "recipe.recommend is advisory-only; mutations stay on confirm-gated create-* actions"
    - "Live fetchServiceTemplates catalog_source live — never offline YAML SoT"

key-files:
  created: []
  modified:
    - src/mcp/tools/recipe.ts
    - src/mcp/tools/recipe.test.ts

key-decisions:
  - "D-14 approve-advisory-recommend: recommend never calls createService/createApplication/createDatabase"
  - "Required input field named stack (not description) for free-text stack phrase"
  - "Husky blocks RED-only commits — RED verified locally; GREEN shipped with flipped it()"

patterns-established:
  - "Git-app keyword map + DB engine map + scored one-click catalog match with confidence exact|high|suggested"
  - "Unknown stack → COOLIFY_VALIDATION_ERROR + service.list-types recovery hint"

requirements-completed: [SREC-01, SREC-02]

coverage:
  - id: D1
    description: Next.js + Postgres recommend returns advisory plan_steps with catalog_source live
    requirement: SREC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#Next.js + Postgres returns plan_steps with recipe_action values and catalog_source live"
        status: pass
    human_judgment: false
  - id: D2
    description: Recommend uses live fetchServiceTemplates; never invents catalog_id
    requirement: SREC-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#never invents catalog_id absent from mocked templates"
        status: pass
    human_judgment: false
  - id: D3
    description: Recommend is advisory; createService/createApplication/createDatabase not called
    requirement: SREC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recommend does not call createService / createApplication"
        status: pass
    human_judgment: false
  - id: D4
    description: Unknown stack returns COOLIFY_VALIDATION_ERROR with list-types hint
    requirement: SREC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#unknown unmappable stack → structured validation error with list-types recovery hint"
        status: pass
    human_judgment: false
  - id: D5
    description: Postgres routes to create-app-db with DATABASE_URL env_keys and UUID prefills
    requirement: SREC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#postgres-style stack yields create-app-db with DATABASE_URL env_keys and prefills"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-31
status: complete
---

# Phase 31 Plan 03: Smart Recipes Summary

**`recipe.recommend` returns advisory git-app/DB/one-click plan_steps from live `fetchServiceTemplates` — no mutations, no hardcoded YAML SoT.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-31T02:37:17Z
- **Completed:** 2026-07-31T02:42:00Z
- **Tasks:** 3/3
- **Files modified:** 2

## Accomplishments

- D-14 checkpoint auto-selected `approve-advisory-recommend` — recommend never mutates Coolify
- `handleRecipeRecommend` maps stack phrases via git-app keywords, DB engine map, and scored one-click catalog IDs
- Wave 0 recommend `it.fails` flipped to passing `it()` (6 tests green)
- DB tokens prefer `create-app-db` + `DATABASE_URL`; exact/high ranked before suggested

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Confirm D-14 advisory-only | (decision, no code) | — |
| 2 | Implement recipe.recommend | c3667e3 | recipe.ts, recipe.test.ts |
| 3 | Confidence ranking + env_keys | e9d82f7 | recipe.ts, recipe.test.ts |

## Decisions Made

- **approve-advisory-recommend (D-14):** plan payload only; caller runs create-* separately
- Field name **`stack`** required for free-text description
- Husky prevented standalone RED commit — RED verified with failing vitest, then GREEN + flip in feat commits

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as written (D-14 auto-selected under `--auto`).

### TDD Gate Compliance

- Standalone `test(31-03):` RED commit blocked by husky (related vitest fails on intentional RED).
- RED confirmed locally (`isRecipeErrorResult` true / schema reject).
- GREEN: `feat(31-03): implement recipe.recommend` + polish feat include flipped tests.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None beyond plan threat model (T-31-03 / T-31-09 mitigated by Object.hasOwn + advisory).

## Verification

```bash
npx vitest run src/mcp/tools/recipe.test.ts -t recommend
# 6 passed
```

Prohibitions: no `smart-recipe` tool; no in-repo `service-templates.json` SoT in recipe.ts.

## Self-Check: PASSED

- FOUND: `src/mcp/tools/recipe.ts` (`handleRecipeRecommend`)
- FOUND: `src/mcp/tools/recipe.test.ts` (6 recommend tests)
- FOUND: commits `c3667e3`, `e9d82f7`
- FOUND: `.planning/phases/31-agent-playbooks/31-03-SUMMARY.md`

