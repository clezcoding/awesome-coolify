---
phase: 30-deploy-guard
verified: 2026-07-31T01:20:36Z
status: passed
score: 18/18 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 30: Deploy Guard Verification Report

**Phase Goal:** Agent can assess deploy risk before mutation and recover from failed deployments
**Verified:** 2026-07-31T01:20:36Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Agent runs deploy preflight before mutation covering instance health, env completeness, recent deployment failures, and DNS readiness (ROADMAP SC1, GUARD-01) | ✓ VERIFIED | `deployment.preflight` in `src/mcp/tools/deployment.ts:598-615`; four collectors in `deploy-preflight.ts`; test asserts factor keys |
| 2 | Preflight returns deploy risk score with named factor breakdown (ROADMAP SC2, GUARD-02) | ✓ VERIFIED | `computeDeployRiskScore` + `risk_score`/`risk_level`/`score_breakdown`/`factors`; GREEN `returns four factor keys with risk_score...` |
| 3 | Agent rolls back an application to its last successful deployment (ROADMAP SC3, GUARD-03) | ✓ VERIFIED | `executeDeploymentRollback` + `findLastSuccessfulDeployment`; GREEN git pin+deploy and docker_tag tests |
| 4 | Response includes `advisory:true`, `score_breakdown`, findings with FollowUpHint, and `blocking` when critical or latest deploy in_progress | ✓ VERIFIED | Report envelope `deploy-preflight.ts:421-532`; tests for FollowUpHint + blocking |
| 5 | Factor failures isolated — partial payload survives single fetch failure | ✓ VERIFIED | `settleFactor` try/catch + `partial:true` (`deploy-preflight.ts:402-416`); test `soft partial when one factor fetch rejects` |
| 6 | Preflight is read-only — never calls `triggerDeploy`, `updateApplication`, or `cancelDeployment` | ✓ VERIFIED | Spy test `never calls triggerDeploy...`; handler only calls `buildDeployPreflightReport` |
| 7 | Env values masked on preflight path — no reveal | ✓ VERIFIED | `maskEnvRecords(runtime, false)` → `runtime_envs_masked`; test `masks env values on preflight path (T-30-01)` |
| 8 | DNS readiness uses Coolify field signals only — no `node:dns` or HTTP probes | ✓ VERIFIED | `collectDnsReadinessFactor` uses `app.fqdn` + `fetchServerDomains`; rg finds no `node:dns`/`dns.promises` |
| 9 | Without `confirm:true`, rollback returns `COOLIFY_CONFIRM_REQUIRED` with `rollback_target` preview (SAF-01) | ✓ VERIFIED | `executeDeploymentRollback` confirm branch; GREEN confirm-gate test |
| 10 | Git apps: `updateApplication(git_commit_sha)` before `triggerDeploy` | ✓ VERIFIED | Order in `deploy-preflight.ts:621-637`; GREEN call-order test |
| 11 | Dockerimage apps: `triggerDeploy` with `docker_tag` when supported | ✓ VERIFIED | `options?.dockerTag` → query `docker_tag`; GREEN dockerimage test + client test |
| 12 | No finished deployment → `COOLIFY_ROLLBACK_UNAVAILABLE` with no mutations | ✓ VERIFIED | Early throw before writes; GREEN no-finished test |
| 13 | `triggerDeploy` omits `force` query when false (Pitfall 4) | ✓ VERIFIED | `client.ts:1054-1064`; client tests assert `force=` absent when false |
| 14 | Wave 0 preflight/rollback `it.fails` flipped to passing `it()` | ✓ VERIFIED | Zero `it.fails(` in deployment/deploy-preflight/system/client tests; 10+8 GREEN |
| 15 | `system.version` exposes `deployment_preflight` and `deployment_rollback` | ✓ VERIFIED | `capabilities.ts:62-70`; system test asserts both keys |
| 16 | `docs/coverage-map.yaml` records `deployment.preflight` and `deployment.rollback` as MCP composites | ✓ VERIFIED | Rows at `coverage-map.yaml:133-138` mapping existing OpenAPI paths |
| 17 | README EN/DE document preflight factors, advisory semantics, rollback confirm gate, composite pin+deploy | ✓ VERIFIED | `README.md` / `README.de.md` Deploy Guard sections (~409–423, ~658) |
| 18 | Docs do not claim dedicated Coolify rollback API or external DNS probes | ✓ VERIFIED | Explicit negation in README EN/DE; coverage maps to existing GET/PATCH/deploy paths |

**Score:** 18/18 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/deploy-preflight.ts` | Factor collectors, scoring, rollback orchestration | ✓ VERIFIED | Exports `buildDeployPreflightReport`, `findLastSuccessfulDeployment`, `computeDeployRiskScore`, `executeDeploymentRollback` |
| `src/utils/deploy-preflight.test.ts` | GREEN helper tests | ✓ VERIFIED | 8/8 pass |
| `src/mcp/tools/deployment.ts` | `preflight` + `rollback` actions | ✓ VERIFIED | Catalog, schema, switch cases wired |
| `src/mcp/tools/deployment.test.ts` | GREEN preflight/rollback suites | ✓ VERIFIED | 6 preflight + 4 rollback pass; no `it.fails` |
| `src/utils/errors.ts` | `COOLIFY_ROLLBACK_UNAVAILABLE` | ✓ VERIFIED | Code + recovery hints present |
| `src/api/client.ts` | Optional `dockerTag`; omit force when false | ✓ VERIFIED | `triggerDeploy` signature + query builder |
| `src/mcp/capabilities.ts` | `deployment_preflight`, `deployment_rollback` | ✓ VERIFIED | Both `supported: true`, composite notes |
| `src/mcp/tools/system.test.ts` | Capability assertions | ✓ VERIFIED | GREEN capability test |
| `docs/coverage-map.yaml` | Coverage rows | ✓ VERIFIED | Both actions present |
| `README.md` / `README.de.md` | Bilingual deploy-guard docs | ✓ VERIFIED | Aligned EN/DE sections |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `handleDeploymentPreflight` | `resolveAppMutationUuid` | shared app identity resolution | ✓ WIRED | `deployment.ts:602-609` |
| `handleDeploymentPreflight` | `buildDeployPreflightReport` | factor report | ✓ WIRED | `deployment.ts:610` |
| `buildDeployPreflightReport` | four factor collectors | `settleFactor` + `Promise.all` | ✓ WIRED | `deploy-preflight.ts:452-467` |
| `intelligence.ts` | `sortDeploymentsNewestFirst` | import from deploy-preflight | ✓ WIRED | `intelligence.ts:23` |
| `executeDeploymentRollback` | `updateApplication` | git commit pin before deploy | ✓ WIRED | `deploy-preflight.ts:621-627` then `triggerDeploy` |
| `executeDeploymentRollback` | `triggerDeploy` | POST `/deploy` after pin or docker_tag | ✓ WIRED | `deploy-preflight.ts:630-637` |
| `handleDeploymentAction` | `preflight`/`rollback` cases | switch dispatch | ✓ WIRED | `deployment.ts:660-663` |
| `system.version` | `COOLIFY_412_CAPABILITIES` | capability map | ✓ WIRED | `capabilities.ts` |

> Note: `gsd-tools query verify.key-links` reported false negatives because several PLAN `key_links.from` values are symbol names, not file paths. Manual wiring checks above supersede that output.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `deployment.preflight` | `factors` / `risk_score` | Coolify fetches via collectors + `computeDeployRiskScore` | Yes — live API when env set; mocked in tests | ✓ FLOWING |
| `deployment.preflight` | `runtime_envs_masked` | `maskEnvRecords(runtime, false)` | Yes — masked env rows | ✓ FLOWING |
| `deployment.rollback` | `rollback_target` / `rolled_back_to` | `findLastSuccessfulDeployment` + pin/deploy | Yes — derived from deployment history | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Preflight + rollback suites | `npx vitest run src/mcp/tools/deployment.test.ts -t "deployment.preflight\|deployment.rollback"` | 10 passed | ✓ PASS |
| Scoring / selection helpers | `npx vitest run src/utils/deploy-preflight.test.ts` | 8 passed | ✓ PASS |
| Capability keys | `npx vitest run src/mcp/tools/system.test.ts -t "deployment_preflight\|deployment_rollback"` | 1 passed | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| — | — | No phase-declared or conventional `scripts/*/tests/probe-*.sh` | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GUARD-01 | 00, 01, 03 | Deploy preflight: instance health, env completeness, recent failures, DNS readiness | ✓ SATISFIED | Four factors + handler + docs |
| GUARD-02 | 00, 01, 03 | Risk score with named factor breakdown | ✓ SATISFIED | `risk_score` + `factors` + scoring tests |
| GUARD-03 | 00, 02, 03 | Roll back to last successful deployment | ✓ SATISFIED | Confirm-gated rollback composite + tests |

No orphaned Phase 30 requirements — all three IDs claimed by plans and present in REQUIREMENTS.md.

### Prohibitions

| Statement | Verification | Status | Evidence |
|-----------|--------------|--------|----------|
| No external DNS/HTTP probes | test (rg) | ✓ ENFORCED | No `node:dns` / `dns.promises` in preflight path |
| No top-level `deploy_guard` MCP tool | test (rg) | ✓ ENFORCED | No `name: 'deploy_guard'` in `server.ts` |
| No `handleIntelligenceScorecard` inside preflight | test (rg) | ✓ ENFORCED | No scorecard call in deploy-preflight / deployment handlers |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `FIXME`/`XXX`/`TBD` in phase-modified source | — | Clean |
| — | — | No remaining `it.fails(` for GUARD behaviors | — | Clean |

### Human Verification Required

None — all must-haves have automated behavioral evidence via Vitest. No `<human-check>` blocks in PLAN files.

### Gaps Summary

None. Phase goal achieved: preflight risk assessment and confirm-gated rollback are implemented, wired, documented, and covered by passing tests.

---

_Verified: 2026-07-31T01:20:36Z_
_Verifier: Claude (gsd-verifier)_
