---
phase: 19-dx-schemas-mcp-prompts
verified: 2026-07-24T02:09:00Z
status: passed
score: 19/20 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 17/20
  gaps_closed:

    - "Every actionsCatalog uses the `Actions:` prefix with `action(param, param?)` tokens separated by ` · ` (D-05)"
    - "Cursor tool panel shows action names plus CORRECT key parameters in every tool description (DX-01, DX-02)"
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "Open any Coolify MCP tool in Cursor and visually confirm the parameter panel renders top-level properties (no empty properties:{} UI) and that env-mutation tokens advertise env_uuid/entries (not key/envs)"
    expected: "Each tool shows its flat z.object fields (action, uuid, etc.) as visible, fillable parameters; application/service/database envs:delete advertises env_uuid; application envs:bulk-update advertises entries"
    why_human: "Cursor IDE rendering of MCP JSON Schema is a visual host behavior that cannot be verified programmatically"
---

# Phase 19: DX Schemas & MCP Prompts Verification Report

**Phase Goal:** Agent sees rich action catalogs and visible parameters in every tool, and can invoke parameterized MCP prompts for the four canonical workflows (deploy/diagnose/new-project/incident)
**Verified:** 2026-07-24T02:09:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (19-03)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Flat z.object top-level schema for every domain tool (no top-level z.discriminatedUnion/z.union) | ✓ VERIFIED | `rg z\.discriminatedUnion\|z\.union src/mcp/tools/*.ts` returns only test file + doc comment; all 16 registered tools use `createFlatActionSchema` |
| 2 | `{ action, ...fields }` call shape preserved (non-breaking) | ✓ VERIFIED | 262 application+service+database+prompts tests pass; handler signatures unchanged |
| 3 | Wrong/missing fields produce COOLIFY_VALIDATION_ERROR with action-aware recoveryHints | ✓ VERIFIED | `parseWithInstanceRouting` calls `buildActionAwareRecoveryHints`; ACTION_REQUIRED_FIELDS symbol attached by createFlatActionSchema |
| 4 | Every domain tool file exports actionsCatalog + safetyFooter constants | ✓ VERIFIED | All 16 tool files export `<domain>ActionsCatalog` and `<domain>SafetyFooter` |
| 5 | Every actionsCatalog uses `Actions:` prefix with `action(param, param?)` tokens (D-05) | ✓ VERIFIED (gap closed) | application.ts:301-306, service.ts:272, database.ts:224-230 all use concrete tokens; no `envs:*`/`backup:*` wildcards remain (`rg 'envs:\*\|backup:\*' src/mcp/tools/database.ts` returns no matches); catalog param names match schema field names (env_uuid, entries) |
| 6 | Every safetyFooter uses `Safety: ...` shape (D-08) | ✓ VERIFIED | All 16 safetyFooter constants start with `Safety:` |
| 7 | Cursor tool panel renders top-level parameters (no empty properties:{}) | ⚠️ UNCERTAIN | Visual MCP host rendering requires human inspection — see Human Verification |
| 8 | Every registerTool description composed from purpose + catalog + footer | ✓ VERIFIED | `composeToolDescription(purpose, catalog, footer)` (server.ts:165-171) used in all 16 registerTool calls |
| 9 | Cursor tool panel shows action names plus CORRECT key parameters (DX-01) | ✓ VERIFIED (gap closed) | application.ts:305 `envs:delete(uuid, env_uuid, confirm)` and `envs:bulk-update(uuid, entries, confirm)`; service.ts:272 `envs:delete(uuid, env_uuid, confirm)`; database.ts:227-228 mirrors schema field names; `rg 'envs:delete\(uuid, key'` and `rg 'envs:bulk-update\(uuid, envs'` return zero matches across all tool files; regression describe block in server.test.ts:265-314 locks the invariant |
| 10 | registerCoolifyPrompts registers exactly deploy, diagnose, new-project, incident | ✓ VERIFIED | prompts.ts:19,67,108,155 register 4 prompts; prompts.test.ts asserts names equal `['deploy','diagnose','incident','new-project']` |
| 11 | All prompt args optional | ✓ VERIFIED | All argsSchema fields use `z.string().optional()` (prompts.ts:25-32, 73-76, 114-118, 161-168) |
| 12 | deploy prompt forward-refs deployment.watch + fallback deployment.get | ✓ VERIFIED | prompts.ts:55-58; test asserts `application.deploy`, `deployment.watch`, `deployment.get` present |
| 13 | Prompt bodies English, parameterized numbered steps, 4-8 steps | ✓ VERIFIED | Each prompt has 5-6 numbered English steps with concrete tool/action calls |
| 14 | Prompt handlers do not hard-load/fail on missing manifest | ✓ VERIFIED | Soft Note via `manifestSoftNote()` only; no filesystem reads in prompts.ts |
| 15 | createAndConnectServer calls registerCoolifyPrompts after registerCoolifyTools | ✓ VERIFIED | server.ts:728-729 |
| 16 | tests/mcp/prompts.test.ts asserts registration + content | ✓ VERIFIED | 6 tests pass |
| 17 | tests/mcp/server.test.ts asserts Actions:/Safety: prefixes + catalog schema-field regression | ✓ VERIFIED | 26 tests pass (18 prefix + 8 regression A-H) |
| 18 | Agent can call every existing tool with parameters visible at top-level schema while action routing works | ✓ VERIFIED | Flat z.object schemas + superRefine; full MCP test suite green |
| 19 | User invokes deploy prompt and receives parameterized guidance covering deploy + watch flow | ✓ VERIFIED | prompts.test.ts deploy test passes; content covers deploy + watch + get fallback |
| 20 | User invokes diagnose/new-project/incident and each returns workflow guidance with the right arguments | ✓ VERIFIED | prompts.test.ts diagnose/new-project/incident tests pass |

**Score:** 19/20 truths verified (0 present behavior-unverified, 1 human-verification item)

### Re-verification Summary

19-03 closed both gaps from the initial verification:

- **Gap 1 (truth #5, D-05 wildcards + wrong param names):** database.ts catalog now ships 12 concrete env/backup tokens (lines 224-230); application.ts and service.ts catalogs use `env_uuid`/`entries` instead of `key`/`envs` aliases. `rg 'envs:\*\|backup:\*' src/mcp/tools/database.ts` returns zero matches.
- **Gap 2 (truth #9, CR-01 wrong param names visible to agent):** Same string edits align catalog text with `actionRequiredFields`/`actionAllowedFields` maps. `rg 'envs:delete\(uuid, key'` and `rg 'envs:bulk-update\(uuid, envs'` return zero matches across `src/mcp/tools/*.ts`. A new `actionsCatalog schema-field-name regression` describe block (server.test.ts:265-314) ships 8 `it` cases (A-H) locking the invariant against future regressions.

No regressions: application/service/database/prompts/server test suites all green (262 + 26 = 288 tests).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| src/mcp/tools/shared-read-params.ts | createFlatActionSchema helper | ✓ VERIFIED | Helper exported; ACTION_REQUIRED_FIELDS/ACTION_ALLOWED_FIELDS symbols; buildActionAwareRecoveryHints |
| 16 domain tool files with flat schemas + catalog/footer | All migrated | ✓ VERIFIED | All 16 files export flat schema + catalog + footer constants |
| src/mcp/prompts.ts | Greenfield prompts registry | ✓ VERIFIED | registerCoolifyPrompts exports 4 prompts |
| src/mcp/server.ts | Description composition + prompt wiring | ✓ VERIFIED | composeToolDescription + registerCoolifyPrompts call |
| tests/mcp/prompts.test.ts | Greenfield prompt tests | ✓ VERIFIED | 6 tests pass |
| src/mcp/server.test.ts | Actions:/Safety: assertions + catalog regression | ✓ VERIFIED | 26 tests pass (18 prefix + 8 gap-closure regression A-H) |
| README.md | MCP Prompts section | ✓ VERIFIED | Section documents all 4 prompts with args |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| server.ts registerTool | tools/<domain>.ts ActionsCatalog+SafetyFooter | imports + composeToolDescription | ✓ WIRED | 16 registerTool calls import co-located constants |
| server.ts createAndConnectServer | prompts.ts registerCoolifyPrompts | direct call after registerCoolifyTools | ✓ WIRED | server.ts:728-729 |
| prompts.ts registerPrompt x4 | parameterized numbered step guidance | handler returns messages | ✓ WIRED | 4 prompts return user+assistant messages |
| shared-read-params.ts createFlatActionSchema | every domain tool *ActionSchema | import + invoke | ✓ WIRED | All 16 tools build schema via helper |
| shared-read-params.ts parseWithInstanceRouting | action-aware recoveryHints via CoolifyApiError | buildActionAwareRecoveryHints | ✓ WIRED | Called on parse failure |
| actionsCatalog string content | actionRequiredFields/actionAllowedFields maps | field-name alignment | ✓ WIRED | envs:delete → env_uuid; envs:bulk-update → entries; backup:* → scheduled_backup_uuid; locked by regression tests A-H |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Prompts registry registers 4 prompts | `pnpm exec vitest run tests/mcp/prompts.test.ts` | 6/6 pass | ✓ PASS |
| Tool descriptions contain Actions:/Safety: + catalog regression | `pnpm exec vitest run src/mcp/server.test.ts` | 26/26 pass | ✓ PASS |
| Application+service+database schemas still validate | `pnpm exec vitest run src/mcp/tools/application.test.ts src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts` | 262/262 pass | ✓ PASS |
| No top-level z.discriminatedUnion/z.union in tool schemas | `rg z\.discriminatedUnion\|z\.union src/mcp/tools/*.ts` | Only test file + doc comment | ✓ PASS |
| No envs:delete(uuid, key alias leak | `rg 'envs:delete\(uuid, key' src/mcp/tools/*.ts` | Zero matches | ✓ PASS |
| No envs:bulk-update(uuid, envs alias leak | `rg 'envs:bulk-update\(uuid, envs' src/mcp/tools/application.ts` | Zero matches | ✓ PASS |
| No envs:*/backup:* wildcards | `rg 'envs:\*\|backup:\*' src/mcp/tools/database.ts` | Zero matches | ✓ PASS |
| applicationActionsCatalog has CRUD tokens | `rg 'create\(source_type, server_uuid\)' src/mcp/tools/application.ts` | One match (line 303) | ✓ PASS |
| databaseActionsCatalog has backup:delete token | `rg 'backup:delete\(uuid\?, scheduled_backup_uuid, confirm\)' src/mcp/tools/database.ts` | One match (line 230) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DX-01 | 19-01, 19-02, 19-03 | Agent sees action catalogs and key parameters in every tool description | ✓ SATISFIED | All 16 tools ship `Actions:` catalog with concrete `action(param, param?)` tokens; catalog param names match schema field names (env_uuid, entries, scheduled_backup_uuid); application catalog includes CRUD lifecycle tokens; database catalog has no wildcards; regression tests A-H lock the invariant |
| DX-02 | 19-01, 19-02 | Tool input schemas remain agent-callable with visible parameters (flat/top-level) | ✓ SATISFIED | All 16 tools use flat z.object via createFlatActionSchema; visual rendering deferred to human verification |
| PROMPT-01 | 19-02 | User can invoke MCP prompt `deploy` with parameterized guidance for deploy + watch flow | ✓ SATISFIED | deploy prompt registered; references application.deploy + deployment.watch + deployment.get fallback; test passes |
| PROMPT-02 | 19-02 | User can invoke MCP prompt `diagnose` for app/server/scan troubleshooting | ✓ SATISFIED | diagnose prompt registered; mentions app/server/scan paths; test passes |
| PROMPT-03 | 19-02 | User can invoke MCP prompt `new-project` for setup/recipe onboarding | ✓ SATISFIED | new-project prompt registered; mentions project/environment/manifest; test passes |
| PROMPT-04 | 19-02 | User can invoke MCP prompt `incident` for emergency/redeploy triage | ✓ SATISFIED | incident prompt registered; mentions diagnose/logs/restart/emergency redeploy; test passes |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/mcp/tools/shared-read-params.ts | 322-349 | sharedLogParamsFlatShape.max_chars uses `.min(1)` vs legacy `.min(1000)`; mutationResponseParamsFlatShape format enum includes `table` allowing `format:"table"` for logs | ⚠️ Warning (WR-03) | Validation regression for logs action — out of scope for 19-03 gap_closure |
| src/mcp/server.ts | 165-171 | composeToolDescription joins with single `\n` instead of `\n\n` per UI-SPEC anatomy | ⚠️ Warning (WR-04) | Cursor descriptions denser than approved contract — out of scope for 19-03 |
| src/mcp/tools/manifest.ts | 88-97 | parseManifestAction uses safeParse + generic RECOVERY_HINTS; skips action-aware hints | ⚠️ Warning (WR-05) | Manifest failures give weaker recovery guidance — out of scope for 19-03 |
| src/mcp/tools/application.ts | 690-692 | rejectDockercomposeBuildPack invoked twice for build_pack==='dockercompose' | ℹ️ Info (IN-01) | Harmless duplicate issue emission — out of scope for 19-03 |

No `TBD`/`FIXME`/`XXX` debt markers in any file modified by this phase.

### Human Verification Required

### 1. Cursor Visual Parameter Panel Rendering

**Test:** Open Cursor → MCP settings → awesome-coolify-mcp server → inspect each of the 16 registered tools. Confirm the parameter panel shows top-level fields (action enum + optional fields like uuid, force, etc.) rather than an empty `properties: {}` UI. For application/service/database tools, additionally confirm the env-mutation rows in the description advertise `env_uuid` (not `key`) for envs:delete and `entries` (not `envs`) for envs:bulk-update.
**Expected:** Every tool renders visible, fillable top-level parameters. No tool shows "No parameters" or empty `properties: {}`. env-mutation catalog text in the description matches schema-accepted field names.
**Why human:** Cursor IDE rendering of MCP JSON Schema is a visual host behavior that cannot be verified programmatically. The flat z.object schemas and catalog strings are structurally correct (grep + 288 passing tests confirm), but only visual inspection confirms Cursor renders them as expected (Pitfall 10 mitigation).

### Gaps Summary

No gaps remain. Both gaps from the initial verification are closed by 19-03:

1. **CR-01 BLOCKER (closed):** application.ts, service.ts, and database.ts actionsCatalog constants now advertise schema-accepted parameter names (`env_uuid`, `entries`, `scheduled_backup_uuid`). Agents following the DX-01 catalog text now emit payloads the flat schemas accept.
2. **D-05 / WR-02 (closed):** database.ts actionsCatalog replaced `envs:*`/`backup:*` wildcards with 12 concrete `action(param, param?)` tokens; `delete_preview(uuid?, name?)` appended to leading CRUD tokens.
3. **WR-01 (closed):** application.ts actionsCatalog now includes `create(source_type, server_uuid)`, `update(uuid)`, `delete(uuid, confirm)`, `delete_preview(uuid)` lifecycle tokens.
4. **Regression guard:** `actionsCatalog schema-field-name regression (Phase 19 gap closure)` describe block in src/mcp/server.test.ts:265-314 ships 8 `it` cases (A-H) locking the invariant.

The only remaining item is the human verification for Cursor visual rendering (truth #7) — this is a host-IDE behavior that grep/tests cannot exercise. Per the Step 9 decision tree, any human verification item forces status `human_needed` even when all other truths are VERIFIED.

---

_Verified: 2026-07-24T02:09:00Z_
_Verifier: Claude (gsd-verifier)_
