---
phase: 19-dx-schemas-mcp-prompts
verified: 2026-07-24T01:40:00Z
status: gaps_found
score: 17/20 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Every actionsCatalog uses the `Actions:` prefix with `action(param, param?)` tokens separated by ` · ` (D-05)"
    status: failed
    reason: "Catalogs contain wrong param names and wildcard stubs. application.ts advertises `envs:delete(uuid, key, confirm)` but schema requires `env_uuid` and rejects `key`; `envs:bulk-update(uuid, envs, confirm)` but schema requires `entries` and rejects `envs`. service.ts has the same `envs:delete(uuid, key, confirm)` mismatch. database.ts uses `envs:*` and `backup:*` wildcard stubs instead of concrete `action(param, param?)` tokens. application.ts omits create/update/delete/delete_preview from the catalog entirely."
    artifacts:
      - path: "src/mcp/tools/application.ts"
        issue: "Line 302: catalog says `envs:delete(uuid, key, confirm)` but schema allowed fields (line 589-598) exclude `key`; required (line 629) is `env_uuid`. `envs:bulk-update(uuid, envs, confirm)` but allowed fields (line 599-608) exclude `envs`; required (line 630) is `entries`. Also omits create/update/delete/delete_preview actions."
      - path: "src/mcp/tools/service.ts"
        issue: "Line 272: catalog says `envs:delete(uuid, key, confirm)` but schema allowed fields (line 443) exclude `key`; required (line 451) is `env_uuid`."
      - path: "src/mcp/tools/database.ts"
        issue: "Line 225: catalog uses `envs:* · backup:*` wildcard stubs instead of concrete `action(param, param?)` tokens per D-05."
    missing:
      - "Fix application.ts catalog: `envs:delete(uuid, env_uuid, confirm)` and `envs:bulk-update(uuid, entries, confirm)`; append `create(source_type, server_uuid) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid)`"
      - "Fix service.ts catalog: `envs:delete(uuid, env_uuid, confirm)`"
      - "Expand database.ts catalog: replace `envs:*` and `backup:*` with explicit tokens for each env/backup action (1-3 key params each)"
  - truth: "Cursor tool panel shows action names plus CORRECT key parameters in every tool description (DX-01, DX-02)"
    status: failed
    reason: "CR-01 from 19-REVIEW.md is a real BLOCKER. Agents following the DX-01 catalog text will emit invalid payloads (`key` for envs:delete, `envs` for envs:bulk-update) and get COOLIFY_VALIDATION_ERROR with `Unrecognized key` or `requires field` messages. The visible parameters in the description do not match the schema-accepted parameters, so the DX-01 outcome (agent sees and uses correct key parameters) is not achieved."
    artifacts:
      - path: "src/mcp/tools/application.ts"
        issue: "Catalog param names for envs:delete and envs:bulk-update do not match schema field names"
      - path: "src/mcp/tools/service.ts"
        issue: "Catalog param names for envs:delete do not match schema field names"
    missing:
      - "Align catalog tokens with schema field names per CR-01 fix in 19-REVIEW.md"
human_verification:
  - test: "Open any Coolify MCP tool in Cursor and visually confirm the parameter panel renders top-level properties (no empty properties:{} UI)"
    expected: "Each tool shows its flat z.object fields (action, uuid, etc.) as visible, fillable parameters in the Cursor tool panel"
    why_human: "Cursor IDE rendering of MCP JSON Schema cannot be verified programmatically; visual inspection required"
---

# Phase 19: DX Schemas & MCP Prompts Verification Report

**Phase Goal:** Agent sees rich action catalogs and visible parameters in every tool, and can invoke parameterized MCP prompts for the four canonical workflows
**Verified:** 2026-07-24T01:40:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Flat z.object top-level schema for every domain tool (no top-level z.discriminatedUnion/z.union) | VERIFIED | `rg z\.discriminatedUnion\|z\.union src/mcp/tools/*.ts` returns only test file and a doc comment; all 16 registered tools use `createFlatActionSchema` |
| 2 | `{ action, ...fields }` call shape preserved (non-breaking) | VERIFIED | 172 application+service tests pass; handler signatures unchanged |
| 3 | Wrong/missing fields produce COOLIFY_VALIDATION_ERROR with action-aware recoveryHints | VERIFIED | `parseWithInstanceRouting` calls `buildActionAwareRecoveryHints` (shared-read-params.ts:159); ACTION_REQUIRED_FIELDS symbol attached by createFlatActionSchema |
| 4 | Every domain tool file exports actionsCatalog + safetyFooter constants | VERIFIED | All 16 tool files export `<domain>ActionsCatalog` and `<domain>SafetyFooter` (grep confirmed) |
| 5 | Every actionsCatalog uses `Actions:` prefix with `action(param, param?)` tokens (D-05) | FAILED | database.ts uses `envs:*`/`backup:*` wildcards; application.ts+service.ts advertise wrong param names (`key`/`envs`) — see Gaps |
| 6 | Every safetyFooter uses `Safety: ...` shape (D-08) | VERIFIED | All 16 safetyFooter constants start with `Safety:` |
| 7 | Cursor tool panel renders top-level parameters (no empty properties:{}) | UNCERTAIN | Visual MCP host rendering requires human inspection — see Human Verification |
| 8 | Every registerTool description composed from purpose + catalog + footer | VERIFIED | `composeToolDescription(purpose, catalog, footer)` (server.ts:165-171) used in all 16 registerTool calls |
| 9 | Cursor tool panel shows action names plus CORRECT key parameters (DX-01) | FAILED | CR-01: catalog param names mismatch schema for envs:delete (application+service) and envs:bulk-update (application); agents following catalog get COOLIFY_VALIDATION_ERROR |
| 10 | registerCoolifyPrompts registers exactly deploy, diagnose, new-project, incident | VERIFIED | prompts.ts registers exactly 4 prompts; prompts.test.ts asserts names equal `['deploy','diagnose','incident','new-project']` |
| 11 | All prompt args optional | VERIFIED | All argsSchema fields use `z.string().optional()` (prompts.ts:25-32, 73-76, 114-118, 161-168) |
| 12 | deploy prompt forward-refs deployment.watch + fallback deployment.get | VERIFIED | prompts.ts:55-58; test asserts `application.deploy`, `deployment.watch`, `deployment.get` present |
| 13 | Prompt bodies English, parameterized numbered steps, 4-8 steps | VERIFIED | Each prompt has 5-6 numbered English steps with concrete tool/action calls |
| 14 | Prompt handlers do not hard-load/fail on missing manifest | VERIFIED | Soft Note via `manifestSoftNote()` only; no filesystem reads in prompts.ts |
| 15 | createAndConnectServer calls registerCoolifyPrompts after registerCoolifyTools | VERIFIED | server.ts:728-729 |
| 16 | tests/mcp/prompts.test.ts asserts registration + content | VERIFIED | 6 tests pass |
| 17 | tests/mcp/server.test.ts asserts Actions:/Safety: prefixes | VERIFIED | 18 tests pass; asserts both prefixes on all 16 registered tools |
| 18 | Agent can call every existing tool with parameters visible at top-level schema while action routing works | VERIFIED | Flat z.object schemas + superRefine; full MCP test suite green |
| 19 | User invokes deploy prompt and receives parameterized guidance covering deploy + watch flow | VERIFIED | prompts.test.ts deploy test passes; content covers deploy + watch + get fallback |
| 20 | User invokes diagnose/new-project/incident and each returns workflow guidance with right arguments | VERIFIED | prompts.test.ts diagnose/new-project/incident tests pass |

**Score:** 17/20 truths verified (0 present behavior-unverified, 1 human-verification item, 2 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| src/mcp/tools/shared-read-params.ts | createFlatActionSchema helper | VERIFIED | Helper exported (line 22); ACTION_REQUIRED_FIELDS/ACTION_ALLOWED_FIELDS symbols; buildActionAwareRecoveryHints |
| 16 domain tool files with flat schemas + catalog/footer | All migrated | VERIFIED | All 16 files export flat schema + catalog + footer constants |
| src/mcp/prompts.ts | Greenfield prompts registry | VERIFIED | registerCoolifyPrompts exports 4 prompts |
| src/mcp/server.ts | Description composition + prompt wiring | VERIFIED | composeToolDescription + registerCoolifyPrompts call |
| tests/mcp/prompts.test.ts | Greenfield prompt tests | VERIFIED | 6 tests pass |
| src/mcp/server.test.ts | Actions:/Safety: assertions | VERIFIED | 18 tests pass |
| README.md | MCP Prompts section | VERIFIED | Section at line 309 documents all 4 prompts with args |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| server.ts registerTool | tools/<domain>.ts ActionsCatalog+SafetyFooter | imports + composeToolDescription | WIRED | 16 registerTool calls import co-located constants |
| server.ts createAndConnectServer | prompts.ts registerCoolifyPrompts | direct call after registerCoolifyTools | WIRED | server.ts:728-729 |
| prompts.ts registerPrompt x4 | parameterized numbered step guidance | handler returns messages | WIRED | 4 prompts return user+assistant messages |
| shared-read-params.ts createFlatActionSchema | every domain tool *ActionSchema | import + invoke | WIRED | All 16 tools build schema via helper |
| shared-read-params.ts parseWithInstanceRouting | action-aware recoveryHints via CoolifyApiError | buildActionAwareRecoveryHints | WIRED | Called on parse failure (line 159) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Prompts registry registers 4 prompts | `pnpm exec vitest run tests/mcp/prompts.test.ts` | 6/6 pass | PASS |
| Tool descriptions contain Actions:/Safety: | `pnpm exec vitest run src/mcp/server.test.ts` | 18/18 pass | PASS |
| Application+service schemas still validate | `pnpm exec vitest run src/mcp/tools/application.test.ts src/mcp/tools/service.test.ts` | 172/172 pass | PASS |
| No top-level z.discriminatedUnion/z.union in tool schemas | `rg z\.discriminatedUnion\|z\.union src/mcp/tools/*.ts` | Only test file + doc comment | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DX-01 | 19-02 | Agent sees action catalogs and key parameters in every tool description | BLOCKED | Catalogs wired but CR-01 advertises wrong param names (envs:delete `key` vs `env_uuid`; envs:bulk-update `envs` vs `entries`); application catalog omits CRUD actions; database catalog uses wildcard stubs |
| DX-02 | 19-01, 19-02 | Tool input schemas remain agent-callable with visible parameters (flat/top-level) | SATISFIED | All 16 tools use flat z.object via createFlatActionSchema; visual rendering deferred to human verification |
| PROMPT-01 | 19-02 | User can invoke MCP prompt `deploy` with parameterized guidance for deploy + watch flow | SATISFIED | deploy prompt registered; references application.deploy + deployment.watch + deployment.get fallback; test passes |
| PROMPT-02 | 19-02 | User can invoke MCP prompt `diagnose` for app/server/scan troubleshooting | SATISFIED | diagnose prompt registered; mentions app/server/scan paths; test passes |
| PROMPT-03 | 19-02 | User can invoke MCP prompt `new-project` for setup/recipe onboarding | SATISFIED | new-project prompt registered; mentions project/environment/manifest; test passes |
| PROMPT-04 | 19-02 | User can invoke MCP prompt `incident` for emergency/redeploy triage | SATISFIED | incident prompt registered; mentions diagnose/logs/restart/emergency redeploy; test passes |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/mcp/tools/application.ts | 302 | Catalog param name mismatch (`key` vs `env_uuid`, `envs` vs `entries`) | Blocker (CR-01) | Agents following description emit invalid payloads → COOLIFY_VALIDATION_ERROR |
| src/mcp/tools/service.ts | 272 | Catalog param name mismatch (`key` vs `env_uuid`) | Blocker (CR-01) | Same as above for service envs:delete |
| src/mcp/tools/application.ts | 301-302 | Catalog omits create/update/delete/delete_preview actions | Warning (WR-01) | Agents miss CRUD lifecycle actions in description |
| src/mcp/tools/database.ts | 224-225 | Catalog uses `envs:*`/`backup:*` wildcard stubs | Warning (WR-02) | Hides confirm-gated and required-field guidance from description surface |
| src/mcp/tools/shared-read-params.ts | 322-349 | sharedLogParamsFlatShape.max_chars uses `.min(1)` vs legacy `.min(1000)`; mutationResponseParamsFlatShape format enum includes `table` allowing `format:"table"` for logs | Warning (WR-03) | Validation regression for logs action |
| src/mcp/server.ts | 165-171 | composeToolDescription joins with single `\n` instead of `\n\n` per UI-SPEC anatomy | Warning (WR-04) | Cursor descriptions denser than approved contract |
| src/mcp/tools/manifest.ts | 88-97 | parseManifestAction uses safeParse + generic RECOVERY_HINTS; skips action-aware hints | Warning (WR-05) | Manifest failures give weaker recovery guidance than other domain tools |
| src/mcp/tools/application.ts | 690-692 | rejectDockercomposeBuildPack invoked twice for build_pack==='dockercompose' | Info (IN-01) | Harmless duplicate issue emission |

### Human Verification Required

### 1. Cursor Visual Parameter Panel Rendering

**Test:** Open Cursor → MCP settings → awesome-coolify-mcp server → inspect each of the 16 registered tools. Confirm the parameter panel shows top-level fields (action enum + optional fields like uuid, force, etc.) rather than an empty `properties: {}` UI.
**Expected:** Every tool renders visible, fillable top-level parameters. No tool shows "No parameters" or empty `properties: {}`.
**Why human:** Cursor IDE rendering of MCP JSON Schema is a visual host behavior that cannot be verified programmatically. The flat z.object schemas are structurally correct (grep + tests confirm), but only visual inspection confirms Cursor renders them as expected (Pitfall 10 mitigation).

### Gaps Summary

Two gaps block the phase goal:

1. **CR-01 (BLOCKER):** Hand-maintained action catalogs in `application.ts` and `service.ts` advertise parameter names that the flat schemas reject. `envs:delete` is documented as `(uuid, key, confirm)` but the schema requires `env_uuid` and rejects `key` via `.strict()` superRefine. `envs:bulk-update` (application only) is documented as `(uuid, envs, confirm)` but the schema requires `entries` and rejects `envs`. An agent that follows the DX-01 catalog text — the exact behavior the phase goal promises — will emit invalid payloads and receive `COOLIFY_VALIDATION_ERROR`. This directly fails DX-01 and roadmap SC#1.

2. **Catalog completeness (D-05 violation):** `database.ts` uses `envs:*` and `backup:*` wildcard stubs instead of the concrete `action(param, param?)` tokens required by D-05. `application.ts` omits `create`, `update`, `delete`, and `delete_preview` from its catalog despite those actions being in the schema enum. Agents reading the descriptions miss a meaningful slice of the action surface, partially failing the "rich action catalogs" goal.

Both gaps are confined to the hand-maintained catalog string constants; the underlying schemas, handlers, prompts, wiring, and tests are all correct and green. Fixes are string-only edits to three catalog constants — no schema, handler, or test changes required.

---

_Verified: 2026-07-24T01:40:00Z_
_Verifier: Claude (gsd-verifier)_
