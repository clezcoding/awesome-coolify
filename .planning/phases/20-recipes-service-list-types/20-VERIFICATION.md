---
phase: 20-recipes-service-list-types
verified: 2026-07-24T06:34:20Z
status: gaps_found
score: 13/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "create-one-click and create-git-app error results carry soft manifest hints in recoveryHints suggesting `instance` param or manifest context per D-20"
    status: failed
    reason: "create-one-click unknown-type path includes MANIFEST_HINT; create-git-app validation/API error paths use RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR only — no instance/manifest tip"
    artifacts:
      - path: "src/mcp/tools/recipe.ts"
        issue: "handleCreateGitApp / Zod create-git-app errors never append MANIFEST_HINT (only create-app-db env-wiring failure and create-one-click unknown type do)"
    missing:
      - "Append MANIFEST_HINT (or equivalent instance/manifest recoveryHints) to create-git-app error envelopes — at least Zod validation failures and CoolifyApiError throws from handleCreateGitApp"
      - "Add recipe.test.ts assertion mirroring create-one-click D-20 case for a create-git-app error path"
deferred: []
---

# Phase 20: Recipes & Service List-Types Verification Report

**Phase Goal:** Agent discovers Coolify one-click service types dynamically and runs recipes that wire real applications + databases without a forked YAML catalog
**Verified:** 2026-07-24T06:34:20Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent calls `service.list-types` and receives one-click types from live `service-templates.json` (no local YAML catalog) — RECIPE-01 / SC1 | ✓ VERIFIED | `handleServiceListTypes` → `fetchServiceTemplates` + `mapTemplatesToSlimList` (`service.ts:1669-1677`); hosts hardcoded jsDelivr/GitHub only (`service-templates.ts:46-47`); no `service-templates.json` in package `files`; 6 list-types + 8 fetchServiceTemplates tests pass |
| 2 | Agent runs recipe `create-git-app` end-to-end: detect `build_pack` from git repo path → create/wire application — RECIPE-02 / SC2 | ✓ VERIFIED | `detectBuildPack` (`recipe.ts:274-295`); `handleCreateGitApp` → `createPublicApplication` + optional `triggerDeploy` (`297-369`); 10 create-git-app vitest cases pass (Dockerfile / Dockerfile.* / nixpacks / override / dockercompose reject / required build_pack / deploy default) |
| 3 | Agent runs recipe `create-app-db` end-to-end: app + DB + `DATABASE_URL` (or `env_key`) wiring — RECIPE-03 / SC3 | ✓ VERIFIED | `handleCreateAppDb` dispatches `create*Database` → `fetchDatabase` / `constructFallbackUrl` → `bulkUpdateEnvs` (`522-674`); `COOLIFY_RECIPE_PARTIAL_FAILURE` with UUIDs, no auto-rollback; 12 create-app-db tests pass |
| 4 | Agent runs recipe `create-one-click`: type from list-types catalog → service create — RECIPE-04 / SC4 | ✓ VERIFIED | `handleCreateOneClick` validates `parsed.type in templates` via `fetchServiceTemplates` then `createService` (`676-737`); 6 create-one-click tests pass incl. SSRF/unknown-type reject |
| 5 | Template fetch pinned to instance Coolify version; falls back to `v4.x`; double failure / empty `{}` → `COOLIFY_FETCH_TEMPLATES_FAILED` | ✓ VERIFIED | `resolvePinnedVersion` + empty-object hard fail (`service-templates.ts:18-64`); unit tests cover pin, fallback, empty, double-fail |
| 6 | `list-types` response is slim `{ id, label }[]` stable-sorted by id | ✓ VERIFIED | `mapTemplatesToSlimList` sorts `localeCompare`; service list-types tests assert shape |
| 7 | `recipe.ts` exports flat schema + catalog/footer + `handleRecipeAction` with three actions (D-05/D-06/D-08) | ✓ VERIFIED | Exports present; `createFlatActionSchema(['create-git-app','create-app-db','create-one-click'], …)`; catalog/footer strings match Actions:/Safety: format |
| 8 | `create-one-click` validates type against dynamic `fetchServiceTemplates` (no custom URL) then delegates to `createService` | ✓ VERIFIED | Key link wired; SSRF test rejects arbitrary type strings |
| 9 | Partial failure on create-app-db returns `COOLIFY_RECIPE_PARTIAL_FAILURE` with created UUIDs — no auto-rollback (D-15) | ✓ VERIFIED | App-create and env-wiring failure tests assert code + `database_uuid` / both UUIDs; no delete/rollback calls |
| 10 | `connection_string` masked unless `reveal:true` (D-19) | ✓ VERIFIED | `sanitizeFullProjection` on connection_string field; masking test in recipe.test.ts |
| 11 | Recipe tool registered in `server.ts` with `openWorldHint` + instance routing (17th domain tool) | ✓ VERIFIED | `registerTool('recipe', …)` (`server.ts:717-748`); server.test expectedTools includes `recipe` |
| 12 | README (EN + DE) documents recipe actions + no-confirm / no-dry-run / no-auto-rollback posture | ✓ VERIFIED | README.md:399-417; README.de.md Recipes section present |
| 13 | No bundled/static YAML or JSON service-templates catalog in the package (D-01/D-03) | ✓ VERIFIED | `find` / package `files: [dist, .env.example, LICENSE]` — no catalog asset; runtime ofetch only |
| 14 | create-git-app **and** create-one-click error results carry soft manifest/`instance` hints (D-20) | ✗ FAILED | create-one-click unknown-type includes `MANIFEST_HINT` (`recipe.ts:689`); create-git-app validation error returns only `RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR` (runtime probe: no instance/manifest tip). No create-git-app D-20 test exists (only create-one-click + create-app-db env-wiring) |

**Score:** 13/14 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/service-templates.ts` | `fetchServiceTemplates` + slim map | ✓ VERIFIED | 79 lines; CDN + GitHub Raw; version pin; hard error |
| `src/utils/service-templates.test.ts` | Unit coverage for fetch/pin/fallback/error | ✓ VERIFIED | 8/8 pass |
| `src/mcp/tools/service.ts` | `list-types` action + handler | ✓ VERIFIED | Schema + switch case + `handleServiceListTypes` |
| `src/mcp/tools/service.test.ts` | list-types describe block | ✓ VERIFIED | 6 tests in filtered run |
| `src/mcp/tools/recipe.ts` | Full recipe tool (3 actions) | ✓ VERIFIED | 769 lines; all three handlers real (no `COOLIFY_NOT_IMPLEMENTED` stub) |
| `src/mcp/tools/recipe.test.ts` | GREEN for all three actions | ✓ VERIFIED | 28 tests; filtered run 40 related tests pass |
| `src/mcp/server.ts` | `registerTool('recipe')` | ✓ VERIFIED | Wired to `handleRecipeAction` |
| `src/mcp/server.test.ts` | recipe in expectedTools | ✓ VERIFIED | Registration assertion passes |
| `README.md` / `README.de.md` | Recipe docs | ✓ VERIFIED | Both document three actions + safety |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `service.ts` `handleServiceListTypes` | `fetchServiceTemplates` / `mapTemplatesToSlimList` | direct await + map | ✓ WIRED | `service.ts:1672-1673` |
| `service.ts` `handleServiceAction` | `handleServiceListTypes` | `case 'list-types'` | ✓ WIRED | `service.ts:1715-1716` |
| `recipe.ts` `handleCreateOneClick` | `fetchServiceTemplates` → `createService` | type membership check then API | ✓ WIRED | `recipe.ts:680-722` |
| `recipe.ts` `handleCreateGitApp` | `detectBuildPack` → `createPublicApplication` | local FS + client | ✓ WIRED | `recipe.ts:315-344` |
| `recipe.ts` `handleCreateAppDb` | `create*Database` → `fetchDatabase` → `bulkUpdateEnvs` | sequential orchestration | ✓ WIRED | `recipe.ts:549-628` |
| `server.ts` | `handleRecipeAction` / `recipeActionSchema` | `registerTool('recipe')` | ✓ WIRED | `server.ts:717-729` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleServiceListTypes` | slim `{id,label}[]` | ofetch CDN/GitHub `service-templates.json` | Yes (runtime remote JSON; tests mock ofetch) | ✓ FLOWING |
| `handleCreateGitApp` | `application_uuid`, `build_pack` | Coolify `createPublicApplication` response + local detect | Yes (API client; mocked in unit tests) | ✓ FLOWING |
| `handleCreateAppDb` | `application_uuid`, `database_uuid`, `connection_string` | DB create + `internal_db_url` / fallback + `bulkUpdateEnvs` | Yes (client chain; mocked) | ✓ FLOWING |
| `handleCreateOneClick` | `service_uuid`, `type` | validated template key + `createService` | Yes (client; mocked) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| list-types + recipe + templates tests | `npx vitest run src/utils/service-templates.test.ts src/mcp/tools/recipe.test.ts src/mcp/tools/service.test.ts -t "list-types\|create-git-app\|create-app-db\|create-one-click\|fetchServiceTemplates"` | 40 passed, 62 skipped | ✓ PASS |
| server recipe registration | `npx vitest run src/mcp/server.test.ts -t "recipe\|every registered tool\|registerTool"` | 1 passed | ✓ PASS |
| create-git-app D-20 hint probe | runtime `handleRecipeAction` missing `build_pack` | recoveryHints lack instance/manifest tip | ✗ FAIL (supports truth #14) |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No phase-declared or conventional `scripts/*/tests/probe-*.sh` for Phase 20 | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| RECIPE-01 | 20-01 | `service.list-types` dynamic discovery, no local YAML catalog | ✓ SATISFIED | service-templates + list-types handler + tests |
| RECIPE-02 | 20-00, 20-02 | recipe `git-app` / `create-git-app` build_pack → app create | ✓ SATISFIED | handleCreateGitApp + 10 tests |
| RECIPE-03 | 20-00, 20-03 | recipe `app+db` / `create-app-db` + DATABASE_URL wiring | ✓ SATISFIED | handleCreateAppDb + 12 tests |
| RECIPE-04 | 20-00, 20-02 | recipe `one-click` / `create-one-click` from list-types | ✓ SATISFIED | handleCreateOneClick + 6 tests |

No orphaned REQUIREMENTS.md IDs for Phase 20 — all four RECIPE-* IDs appear in plan frontmatter and are accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/mcp/tools/recipe.ts` | create-git-app error paths | Missing D-20 `MANIFEST_HINT` on create-git-app errors (present on create-one-click / create-app-db env failure) | 🛑 Blocker | Plan must-have D-20 incomplete for create-git-app |
| `README.md` | ~397 service actions table | `list-types` omitted from service action list (mentioned only under recipe section) | ⚠️ Warning | Discoverability docs drift; does not block RECIPE-01 implementation |
| `src/mcp/tools/recipe.ts` | — | No TBD/FIXME/XXX debt markers | ✓ Clean | — |

### Prohibitions (judgment)

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No bundled/static service-templates catalog | ✓ resolved | No catalog file; package `files` excludes templates |
| No user-supplied template URLs (SSRF) | ✓ resolved | Hardcoded hosts; type must be catalog key |
| No confirm gate / no dry-run on recipe creates | ✓ resolved | Schema has no confirm/dry-run; tests assert no `COOLIFY_CONFIRM_REQUIRED` |
| No auto-rollback on partial failure | ✓ resolved | Partial-failure returns UUIDs + recoveryHints only |
| No unmasked connection_string without reveal | ✓ resolved | sanitizeFullProjection + test |

### Human Verification Required

None required for status routing (gap is code-level D-20). Optional smoke after gap closure: call `service.list-types` and one recipe against a live Coolify instance — unit tests already cover handler contracts with mocked clients.

### Gaps Summary

Phase goal is **substantially delivered**: dynamic list-types, all three recipe actions implemented and registered, no forked YAML catalog, RECIPE-01–04 satisfied with green unit tests (40 focused + server registration).

**One plan must-have fails:** D-20 soft manifest/`instance` hints on **create-git-app** errors. create-one-click and create-app-db (env-wiring failure) already carry `MANIFEST_HINT`; create-git-app validation errors do not. Fix by appending the hint on create-git-app error paths and adding a matching test — then re-verify.

**Suggested override** (only if team accepts D-20 as create-one-click/create-app-db-only):

```yaml
overrides:
  - must_have: "create-one-click and create-git-app error results carry soft manifest hints"
    reason: "D-20 soft hints shipped on create-one-click + create-app-db; create-git-app validation errors reuse generic COOLIFY_VALIDATION_ERROR hints — acceptable if Phase 22 wizard owns instance UX"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-07-24T06:34:20Z_
_Verifier: Claude (gsd-verifier)_
