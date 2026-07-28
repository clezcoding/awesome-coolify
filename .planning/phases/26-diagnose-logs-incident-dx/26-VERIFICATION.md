---
phase: 26-diagnose-logs-incident-dx
verified: 2026-07-28T03:19:25Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
behavior_unverified_items: []
human_verification: []
---

# Phase 26: Diagnose Logs & Incident DX Verification Report

**Phase Goal:** Agent gets a one-shot diagnose+logs shortcut and updated incident/setup guidance for app-only log troubleshooting
**Verified:** 2026-07-28T03:19:25Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent calls `diagnose.logs` for an application and receives diagnose triage plus a bounded log tail in one action (ROADMAP SC1 / DIAG-01) | ✓ VERIFIED | `handleDiagnoseLogs` → `runDiagnoseAppCore` + `buildRuntimeLogPayload` / `processDeploymentBuildLogs`; `diagnose.test.ts` describe `diagnose logs` 8/8 pass — nested `diagnose`+`logs.logs_lines` on mode full |
| 2 | `mode: logs-only` omits diagnose key; `deployment_uuid` returns build logs only with no runtime tail (D-03, D-05) | ✓ VERIFIED | Handler branches; tests `mode logs-only omits diagnose key` + `deployment_uuid fetches build logs only` pass |
| 3 | Soft partial: diagnose half failure returns `diagnose_failed` sibling and logs when fetch succeeds (D-07) | ✓ VERIFIED | try/catch around `runDiagnoseAppCore`; test `diagnose_failed but still includes logs` pass; top-level not `isDiagnoseErrorResult` |
| 4 | Empty runtime logs return soft OK with hint on logs object (D-08) | ✓ VERIFIED | `EMPTY_RUNTIME_LOGS_HINT`; test `empty runtime logs returns soft OK with hint` pass |
| 5 | Defaults `lines=100` / `max_chars=20000`; `application.logs` runtime uses shared `buildRuntimeLogPayload` (D-09 / OBS-03) | ✓ VERIFIED | Schema defaults + `application.ts` L1666; schema defaults test + `buildRuntimeLogPayload` / application runtime spot-checks pass |
| 6 | MCP prompt `incident` documents `deployment.logs`, application log follow, and `diagnose.logs` (application-only; no service/DB log steps) (ROADMAP SC2 / PROMPT-01) | ✓ VERIFIED | `prompts.ts` incident steps 2–4; guardrail "App-only: do not attempt service/DB log tools"; `prompts.test.ts` incident assertion pass |
| 7 | `system.version` capabilities includes `diagnose_logs` sixth key `supported: true`, `coolify_min_version: 4.1.2` (D-14) | ✓ VERIFIED | `capabilities.ts`; `system.ts` returns `COOLIFY_412_CAPABILITIES`; system test six keys including `diagnose_logs` pass |
| 8 | `diagnoseActionsCatalog` and README EN/DE mention `diagnose.logs` / capability discovery; `docs/COVERAGE.md` has diagnose.logs row (D-17) | ✓ VERIFIED | Catalog string includes `logs(...)`; README.md / README.de.md capability callout; coverage-map.yaml + COVERAGE.md row present |
| 9 | Diagnose prompt has brief one-line pointer to `diagnose.logs` | ✓ VERIFIED | `prompts.ts` diagnose assistant step 2: prefer `diagnose.logs` with `mode: "full"` |
| 10 | `coolify-setup` skill documents app log troubleshooting, capability discovery via `system.version`, and links to incident/deploy/diagnose skills (ROADMAP SC3 / SKILL-01) | ✓ VERIFIED | `## App log troubleshooting` after Example calls; steps for version / diagnose.logs / follow / deployment.logs; links to coolify-incident / coolify-deploy / coolify-diagnose |
| 11 | `skills-manifest.test.ts` asserts troubleshooting section content | ✓ VERIFIED | Test `coolify-setup documents app log troubleshooting and diagnose.logs` pass (6 coolify-setup-related tests in file run green) |
| 12 | `application.logs` OBS-03 golden runtime paths remain green after Phase 26 handler work | ✓ VERIFIED | Spot-check `OBS-03\|runtime logs\|buildRuntimeLogPayload` → 6 passed across application + log-helpers tests |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/log-helpers.ts` | `buildRuntimeLogPayload` + `EMPTY_RUNTIME_LOGS_HINT` | ✓ VERIFIED | Exports present; substantive slice/cap logic |
| `src/mcp/tools/diagnose.ts` | `logs` action schema + `handleDiagnoseLogs` + switch case | ✓ VERIFIED | Schema keys include `logs`; handler L503–607; `case 'logs'` L749 |
| `src/mcp/tools/application.ts` | Runtime branch calls `buildRuntimeLogPayload` | ✓ VERIFIED | Import + L1666 call site |
| `src/mcp/tools/diagnose.test.ts` | Green diagnose.logs suite | ✓ VERIFIED | `describe('diagnose logs')` 8 `it` (not `it.fails`) |
| `src/mcp/prompts.ts` | Rewritten incident + diagnose pointer | ✓ VERIFIED | incident steps 2–4; diagnose pointer |
| `src/mcp/capabilities.ts` | `diagnose_logs` entry | ✓ VERIFIED | Sixth key supported true / 4.1.2 |
| `tests/mcp/prompts.test.ts` | PROMPT-01 assertions | ✓ VERIFIED | Incident content test pass |
| `src/mcp/tools/system.test.ts` | Six-key capabilities | ✓ VERIFIED | Named test pass |
| `README.md` / `README.de.md` | diagnose.logs capability callout | ✓ VERIFIED | Both mention `capabilities.diagnose_logs` |
| `docs/coverage-map.yaml` / `docs/COVERAGE.md` | diagnose.logs coverage row | ✓ VERIFIED | Map action + regenerated table row |
| `skills/coolify-setup/SKILL.md` | App log troubleshooting section | ✓ VERIFIED | Standalone `##` after Example calls (~9 lines body) |
| `src/skills/skills-manifest.test.ts` | Troubleshooting assertion | ✓ VERIFIED | Asserts section + diagnose.logs + system.version + coolify-incident |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `handleDiagnoseLogs` | `runDiagnoseAppCore` / `projectAppDiagnose` | mode full triage half | ✓ WIRED | L540–548 try/catch; nested `diagnose` in response |
| `handleDiagnoseLogs` | `fetchApplicationLogs` + `buildRuntimeLogPayload` | runtime tail path | ✓ WIRED | L579–592 |
| `handleDiagnoseLogs` | `processDeploymentBuildLogs` | `deployment_uuid` build path | ✓ WIRED | L554–568 |
| `handleApplicationLogs` (runtime) | `buildRuntimeLogPayload` | shared OBS-03 helper | ✓ WIRED | application.ts L1666 |
| `handleDiagnoseAction` switch | `handleDiagnoseLogs` | `case 'logs'` | ✓ WIRED | L749–750 |
| incident prompt step 2 | `diagnose({ action: "logs", mode: "full" })` | assistant numbered steps | ✓ WIRED | prompts.ts L184–186 |
| `system.version` | `COOLIFY_412_CAPABILITIES.diagnose_logs` | capabilities map | ✓ WIRED | system.ts imports + returns map |
| `coverage-map.yaml` diagnose.logs | `docs/COVERAGE.md` | openapi:coverage output | ✓ WIRED | Row present in both |
| coolify-setup troubleshooting | `skills/coolify-incident/SKILL.md` (+ deploy/diagnose) | markdown relative links | ✓ WIRED | SKILL.md L140 |
| capability check step | `system({ action: "version" })` → `diagnose_logs` | documented MCP pattern | ✓ WIRED | SKILL.md L135 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleDiagnoseLogs` response | `diagnose` | `fetchApplication` + envs + deployments → `projectAppDiagnose` | Yes (mocked in unit tests; live Coolify in production) | ✓ FLOWING |
| `handleDiagnoseLogs` response | `logs.logs_lines` | `fetchApplicationLogs` → `buildRuntimeLogPayload` or `fetchDeployment` → `processDeploymentBuildLogs` | Yes | ✓ FLOWING |
| Soft partial path | `diagnose_failed` | CoolifyApiError / `toStructuredError` envelope | Yes — code+message sibling | ✓ FLOWING |
| incident / setup skill | guidance text | static prompt/skill strings | N/A (docs) | ✓ FLOWING (content) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| diagnose.logs suite | `npx vitest run -t "diagnose logs" src/mcp/tools/diagnose.test.ts` | 8 passed | ✓ PASS |
| six capability keys | `npx vitest run -t "system.version capabilities has exactly six keys" src/mcp/tools/system.test.ts` | 1 passed | ✓ PASS |
| incident prompt PROMPT-01 | `npx vitest run -t "incident" tests/mcp/prompts.test.ts` | 2 passed | ✓ PASS |
| coolify-setup SKILL-01 | `npx vitest run -t "coolify-setup" src/skills/skills-manifest.test.ts` | 6 passed | ✓ PASS |
| buildRuntimeLogPayload | `npx vitest run -t "buildRuntimeLogPayload" src/utils/log-helpers.test.ts` | 1 passed | ✓ PASS |
| OBS-03 runtime regression | `npx vitest run -t "OBS-03\|runtime logs\|..." application.test.ts log-helpers.test.ts` | 6 passed | ✓ PASS |
| schema rejects `follow` on logs | `diagnoseToolSchema.safeParse({ action:'logs', uuid:'x', follow:true })` | `Unrecognized key: "follow"` | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No phase-declared or conventional probes for Phase 26 | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| DIAG-01 | 26-00, 26-01, 26-02 | Agent can call `diagnose.logs` — diagnose triage + bounded log tail in one action | ✓ SATISFIED | Handler + 8 unit tests; catalog; capability |
| PROMPT-01 | 26-02 | `incident` documents deployment.logs, app log follow, diagnose.logs (app-only) | ✓ SATISFIED | prompts.ts + prompts.test.ts |
| SKILL-01 | 26-03 | coolify-setup documents troubleshooting, system.version discovery, skill links | ✓ SATISFIED | SKILL.md section + skills-manifest.test.ts |

**Orphaned requirements:** none — REQUIREMENTS.md maps DIAG-01, PROMPT-01, SKILL-01 to Phase 26 only; all appear in plan frontmatter.

### Prohibitions

| Statement | Tier | Status | Evidence |
| --------- | ---- | ------ | -------- |
| Do not embed `follow:true` in diagnose.logs (D-02) | test-like (rg) | ✓ enforced | No `follow` in diagnose.ts; schema rejects unrecognized `follow` |
| Do not call `handleApplicationAction` from diagnose.ts | test-like (rg) | ✓ enforced | 0 matches |
| Do not hard-fail whole action when diagnose half fails but logs succeed (D-07) | test | ✓ enforced | Soft partial test pass |
| Do not add service/DB log steps to incident (D-13) | judgment | ✓ enforced (content) | Guardrail steers away; no cite of service/DB log tools as available |
| Do not Zod hard-block diagnose.logs on capability flag | test-like (rg) | ✓ enforced | 0 `diagnose_logs` imports in diagnose.ts |
| Do not duplicate full incident runbook in setup skill (D-15) | judgment | ✓ enforced | Troubleshooting section ~9 lines; links out |
| Do not place troubleshooting inside Workflow numbered setup steps (D-16) | judgment | ✓ enforced | Section after Example calls, not inside Workflow |
| Do not document service/DB diagnose.logs in setup skill | judgment | ✓ enforced | Explicit application-only wording; no availability claims for service/DB logs |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in phase-touched implementation files | — | — |

**Info (process hygiene, not a goal gap):** ROADMAP.md Wave 2 still shows `[ ] 26-03-PLAN.md` while `26-03-SUMMARY.md` exists and deliverables are present — checkbox lag only.

### Human Verification Required

None — documentation and composite handler behaviors covered by unit/content tests; no live Coolify dependency required for phase goal truths as scoped.

### Gaps Summary

No gaps. Phase goal achieved: one-shot `diagnose.logs`, updated `incident` prompt (app-only), and `coolify-setup` troubleshooting guidance with capability discovery and sibling skill links.

---

_Verified: 2026-07-28T03:19:25Z_
_Verifier: Claude (gsd-verifier)_
