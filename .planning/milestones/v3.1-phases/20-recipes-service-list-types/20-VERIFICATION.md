---
phase: 20-recipes-service-list-types
verified: 2026-07-25T03:18:45Z
status: passed
score: 14/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 13/14
  gaps_closed:
    - "create-git-app and create-one-click error results carry soft manifest/instance hints (D-20 / truth #14)"
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 20: Recipes & Service List-Types Verification Report

**Phase Goal:** Agent discovers Coolify one-click service types dynamically and runs recipes that wire real applications + databases without a forked YAML catalog
**Verified:** 2026-07-25T03:18:45Z
**Status:** passed
**Re-verification:** Yes — after gap closure plan 20-04 (D-20 / truth #14)

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent calls `service.list-types` and receives one-click types from live `service-templates.json` (no local YAML catalog) — RECIPE-01 / SC1 | ✓ VERIFIED | Regression: `handleServiceListTypes` → `fetchServiceTemplates` + `mapTemplatesToSlimList` (`service.ts:1668-1673`); package `files: [dist,.env.example,LICENSE]`; no `service-templates.json` in tree; list-types + fetchServiceTemplates tests green in focused suite |
| 2 | Agent runs recipe `create-git-app` end-to-end: detect `build_pack` from git repo path → create/wire application — RECIPE-02 / SC2 | ✓ VERIFIED | Regression: `detectBuildPack` + `handleCreateGitApp` → `createPublicApplication` / `triggerDeploy`; create-git-app vitest cases pass in focused suite (41 related tests) |
| 3 | Agent runs recipe `create-app-db` end-to-end: app + DB + `DATABASE_URL` (or `env_key`) wiring — RECIPE-03 / SC3 | ✓ VERIFIED | Regression: `handleCreateAppDb` orchestration + `COOLIFY_RECIPE_PARTIAL_FAILURE` without auto-rollback; create-app-db tests green |
| 4 | Agent runs recipe `create-one-click`: type from list-types catalog → service create — RECIPE-04 / SC4 | ✓ VERIFIED | Regression: `handleCreateOneClick` validates via `fetchServiceTemplates` then `createService`; create-one-click tests green incl. unknown-type |
| 5 | Template fetch pinned to instance Coolify version; falls back to `v4.x`; double failure / empty `{}` → `COOLIFY_FETCH_TEMPLATES_FAILED` | ✓ VERIFIED | Regression: `service-templates.ts` + unit tests in focused suite |
| 6 | `list-types` response is slim `{ id, label }[]` stable-sorted by id | ✓ VERIFIED | Regression: `mapTemplatesToSlimList` + service list-types tests |
| 7 | `recipe.ts` exports flat schema + catalog/footer + `handleRecipeAction` with three actions (D-05/D-06/D-08) | ✓ VERIFIED | Regression: exports + `createFlatActionSchema(['create-git-app','create-app-db','create-one-click'], …)` present |
| 8 | `create-one-click` validates type against dynamic `fetchServiceTemplates` (no custom URL) then delegates to `createService` | ✓ VERIFIED | Regression: key link intact (`recipe.ts:708-724`+) |
| 9 | Partial failure on create-app-db returns `COOLIFY_RECIPE_PARTIAL_FAILURE` with created UUIDs — no auto-rollback (D-15) | ✓ VERIFIED | Regression: env-wiring failure path still returns UUIDs + hints; no delete/rollback |
| 10 | `connection_string` masked unless `reveal:true` (D-19) | ✓ VERIFIED | Regression: `sanitizeFullProjection` path unchanged; masking tests in recipe suite |
| 11 | Recipe tool registered in `server.ts` with `openWorldHint` + instance routing (17th domain tool) | ✓ VERIFIED | Regression: `registerTool('recipe', …)` (`server.ts:717-748`); server.test registration assertion passes |
| 12 | README (EN + DE) documents recipe actions + no-confirm / no-dry-run / no-auto-rollback posture | ✓ VERIFIED | Regression: README.md:405-417; README.de.md Recipes section present |
| 13 | No bundled/static YAML or JSON service-templates catalog in the package (D-01/D-03) | ✓ VERIFIED | Regression: no `service-templates.json` outside node_modules; package `files` excludes catalog |
| 14 | create-git-app **and** create-one-click error results carry soft manifest/`instance` hints (D-20) | ✓ VERIFIED | **Gap closed (20-04):** `appendManifestHint` on Zod (`throwValidationError` when `action==='create-git-app'`), missing-`build_pack` CoolifyApiError, and `rethrowGitAppApiErrorWithManifestHint` for createPublicApplication/triggerDeploy (`recipe.ts:46-60,276-277,346,371,386`). create-one-click unknown-type + create-app-db env-wiring still append `MANIFEST_HINT` (`:669,:721`). New create-git-app D-20 test + create-one-click D-20 test both pass (`npx vitest … -t "soft manifest hint…"` → 2 passed). `MANIFEST_HINT` length 130 ≤ 160. |

**Score:** 14/14 truths verified (0 present, behavior-unverified)

### Deferred Items

None — prior sole gap closed in-phase via 20-04; later phases (21–23) do not absorb D-20 work.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/service-templates.ts` | `fetchServiceTemplates` + slim map | ✓ VERIFIED | CDN + GitHub Raw; version pin; hard error |
| `src/utils/service-templates.test.ts` | Unit coverage for fetch/pin/fallback/error | ✓ VERIFIED | Included in focused suite (41 pass) |
| `src/mcp/tools/service.ts` | `list-types` action + handler | ✓ VERIFIED | Schema + switch + `handleServiceListTypes` |
| `src/mcp/tools/service.test.ts` | list-types describe block | ✓ VERIFIED | Green in focused suite |
| `src/mcp/tools/recipe.ts` | Full recipe tool (3 actions) + D-20 parity | ✓ VERIFIED | `appendManifestHint` / `rethrowGitAppApiErrorWithManifestHint` wired on create-git-app errors |
| `src/mcp/tools/recipe.test.ts` | GREEN for all three actions + create-git-app D-20 | ✓ VERIFIED | 29/29 file tests; D-20 create-git-app + create-one-click both green |
| `src/mcp/server.ts` | `registerTool('recipe')` | ✓ VERIFIED | Wired to `handleRecipeAction` |
| `src/mcp/server.test.ts` | recipe in expectedTools | ✓ VERIFIED | Registration assertion passes |
| `README.md` / `README.de.md` | Recipe docs | ✓ VERIFIED | Both document three actions + safety |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `service.ts` `handleServiceListTypes` | `fetchServiceTemplates` / `mapTemplatesToSlimList` | direct await + map | ✓ WIRED | `service.ts:1672-1673` |
| `service.ts` `handleServiceAction` | `handleServiceListTypes` | `case 'list-types'` | ✓ WIRED | `service.ts:1715-1716` |
| `recipe.ts` `handleCreateOneClick` | `fetchServiceTemplates` → `createService` | type membership check then API | ✓ WIRED | Unknown-type still ends with `MANIFEST_HINT` |
| `recipe.ts` `handleCreateGitApp` | `detectBuildPack` → `createPublicApplication` | local FS + client | ✓ WIRED | Error paths append `MANIFEST_HINT` |
| `recipe.ts` `throwValidationError` | `MANIFEST_HINT` | `args.action === 'create-git-app'` | ✓ WIRED | Gap closure Zod path |
| `recipe.ts` `handleCreateAppDb` | `create*Database` → `bulkUpdateEnvs` | sequential orchestration | ✓ WIRED | Env-wiring failure retains `MANIFEST_HINT` |
| `server.ts` | `handleRecipeAction` / `recipeActionSchema` | `registerTool('recipe')` | ✓ WIRED | `server.ts:717-729` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleServiceListTypes` | slim `{id,label}[]` | ofetch CDN/GitHub `service-templates.json` | Yes (runtime remote JSON; tests mock ofetch) | ✓ FLOWING |
| `handleCreateGitApp` | `application_uuid`, `build_pack` | Coolify `createPublicApplication` + local detect | Yes (API client; mocked in unit tests) | ✓ FLOWING |
| `handleCreateAppDb` | `application_uuid`, `database_uuid`, `connection_string` | DB create + URL + `bulkUpdateEnvs` | Yes (client chain; mocked) | ✓ FLOWING |
| `handleCreateOneClick` | `service_uuid`, `type` | validated template key + `createService` | Yes (client; mocked) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| create-git-app + create-one-click D-20 tests | `npx vitest run src/mcp/tools/recipe.test.ts -t "error result carries soft manifest hint suggesting instance param or manifest context per D-20"` | 2 passed | ✓ PASS |
| list-types + recipe + templates focused suite | `npx vitest run src/utils/service-templates.test.ts src/mcp/tools/recipe.test.ts src/mcp/tools/service.test.ts -t "list-types\|create-git-app\|create-app-db\|create-one-click\|fetchServiceTemplates"` | 41 passed, 62 skipped | ✓ PASS |
| server recipe registration | `npx vitest run src/mcp/server.test.ts -t "recipe\|every registered tool"` | 1 passed | ✓ PASS |
| MANIFEST_HINT length ≤160 | node length check | 130 chars | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No phase-declared or conventional `scripts/*/tests/probe-*.sh` for Phase 20 | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| RECIPE-01 | 20-01, 20-04 | `service.list-types` dynamic discovery, no local YAML catalog | ✓ SATISFIED | service-templates + list-types handler + tests |
| RECIPE-02 | 20-00, 20-02, 20-04 | recipe `git-app` / `create-git-app` build_pack → app create (+ D-20 hints) | ✓ SATISFIED | handleCreateGitApp + D-20 MANIFEST_HINT paths + tests |
| RECIPE-03 | 20-00, 20-03, 20-04 | recipe `app+db` / `create-app-db` + DATABASE_URL wiring | ✓ SATISFIED | handleCreateAppDb + tests; MANIFEST_HINT on env-wiring failure preserved |
| RECIPE-04 | 20-00, 20-02, 20-04 | recipe `one-click` / `create-one-click` from list-types | ✓ SATISFIED | handleCreateOneClick + D-20 test green (no regression) |

No orphaned REQUIREMENTS.md IDs for Phase 20 — all four RECIPE-* IDs appear in plan frontmatter and are accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/mcp/tools/recipe.ts` | `rethrowGitAppApiErrorWithManifestHint` | API CoolifyApiError path wired but no dedicated unit test mocking `createPublicApplication` rejection | ℹ️ Info | Truth #14 still proven via missing-`build_pack` D-20 test + code wiring; optional follow-up test only |
| `README.md` | ~service actions table | `list-types` omitted from service action list (mentioned under recipe section) | ⚠️ Warning | Docs discoverability drift; 20-04 prohibition: non-blocking advisory |
| `src/mcp/tools/recipe.ts` | — | No TBD/FIXME/XXX debt markers | ✓ Clean | — |

### Prohibitions (judgment)

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No bundled/static service-templates catalog | ✓ resolved | No catalog file; package `files` excludes templates |
| No user-supplied template URLs (SSRF) | ✓ resolved | Hardcoded hosts; type must be catalog key |
| No confirm gate / no dry-run on recipe creates | ✓ resolved | Schema has no confirm/dry-run; README safety docs |
| No auto-rollback on partial failure | ✓ resolved | Partial-failure returns UUIDs + recoveryHints only |
| No unmasked connection_string without reveal | ✓ resolved | sanitizeFullProjection + test |
| Do not weaken create-one-click / create-app-db MANIFEST_HINT (20-04) | ✓ resolved | Both paths still include `MANIFEST_HINT`; D-20 create-one-click test green |
| Do not change MANIFEST_HINT canonical Tip wording | ✓ resolved | String matches UI-SPEC Tip (130 chars) |

### Human Verification Required

None — all 14 truths verified by code inspection + unit tests. Optional live-instance smoke (`service.list-types` + one recipe) remains nice-to-have, not status-routing.

### Gaps Summary

**None.** Prior sole gap (truth #14 / D-20 create-git-app `MANIFEST_HINT` on error `recoveryHints`) closed by plan 20-04. Phase goal achieved: dynamic list-types, three recipe actions, no forked YAML catalog, RECIPE-01–04 satisfied, D-20 parity across create-git-app and create-one-click.

---

_Verified: 2026-07-25T03:18:45Z_
_Verifier: Claude (gsd-verifier)_
