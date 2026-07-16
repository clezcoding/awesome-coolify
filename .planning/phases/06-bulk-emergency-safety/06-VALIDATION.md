---
phase: 6
slug: bulk-emergency-safety
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-16
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run build` |
| **Integration command** | `npx vitest run tests/integration/emergency-safety-flow.test.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green (tsup build green; suite green; baseline ≥ 378 + P6 additions)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-T1 | 01 | 1 | EMG-01, EMG-02, EMG-03, OUT-07 | T-06-01, T-06-03 | COOLIFY_CONFIRM_REQUIRED error code + emergency tool schema (stop_all/redeploy_project/restart_project with .strict() + superRefine) + validateConfirmGate (throws with preview { would_affect, sample_uuids ≤ 5, action } when confirm !== true) + resolveProjectUuid (case-insensitive substring, zero→COOLIFY_404, multi→COOLIFY_AMBIGUOUS_MATCH with ranked list) + RED scaffold | unit | `npx vitest run src/utils/errors.test.ts src/mcp/tools/emergency.test.ts` | ✅ | ✅ green |
| 06-01-T2 | 01 | 1 | EMG-01, EMG-02, EMG-03, OUT-07 | T-06-01, T-06-02, T-06-04, T-06-06 | handleEmergencyAction: stop_all instance-wide apps-only (D-04/D-13) + redeploy_project force/wait (D-15/D-16) + restart_project pure (D-16) + best-effort sequential (D-14) + server.ts registration with destructiveHint + tool description warns agent to ask human before confirm/wait | unit | `npx vitest run src/mcp/tools/emergency.test.ts` | ✅ | ✅ green |
| 06-02-T1 | 02 | 1 | OUT-02 | T-06-10, T-06-11, T-06-12 | sharedReadParamsSchema.reveal (default false) + ParsedReadParams.reveal + parseReadParams returns reveal + sanitizeFullProjection(raw, reveal) bypass when true + projectDeploymentFull/projectAppDiagnose thread reveal + RED scaffold for application/service/database/diagnose/deployment reveal tests | unit | `npx vitest run src/utils/projections.test.ts src/mcp/tools/application.test.ts src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts src/mcp/tools/diagnose.test.ts src/mcp/tools/deployment.test.ts` | ✅ | ✅ green |
| 06-02-T2 | 02 | 1 | OUT-02 | T-06-10, T-06-11, T-06-13 | Thread parsed.reveal through application/service/database/deployment get handlers + diagnose app handler + GREEN tests (reveal:false masked, reveal:true plaintext, summary independence, error-path independence) + server.ts tool descriptions note masking + reveal opt-in | unit | `npx vitest run src/mcp/tools/application.test.ts src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts src/mcp/tools/diagnose.test.ts src/mcp/tools/deployment.test.ts` | ✅ | ✅ green |
| 06-03-T1 | 03 | 2 | EMG-01, EMG-02, EMG-03, OUT-02, OUT-07 | T-06-01..T-06-06, T-06-10..T-06-14 | Integration: handler-level dispatchers across emergency + application/service/database/diagnose/deployment get with mocked HTTP — verifies end-to-end handler composition (confirm gate reject/accept, project name resolution, best-effort sequential, wait/force, reveal masked/plaintext, summary independence, error-path independence) without live Coolify. Mirrors P5 05-05 logs-service-db-flow pattern. | integration | `npx vitest run tests/integration/emergency-safety-flow.test.ts` | ✅ | ✅ green |
| 06-03-T2 | 03 | 2 | EMG-01, EMG-02, EMG-03, OUT-02, OUT-07 | — | Build gate + coverage threshold (emergency.ts ≥ 90% lines via explicit node check on coverage-summary.json) + VALIDATION sign-off: `npm run build` (tsup) green; full suite baseline ≥ 378 + P6 additions; 06-VALIDATION.md Per-Task Verification Map restructured to exactly 6 rows with correct Plan/Wave/Requirement columns; Manual-Only table populated (MCP stdio E2E + live UAT for emergency ops on non-prod project + reveal UAT on real app with secrets) | build + sign-off | `npx vitest run && npx vitest run --coverage && node -e "const s=require('./coverage/coverage-summary.json');const k=Object.keys(s).find(p=>p.endsWith('src/mcp/tools/emergency.ts'));const e=k?s[k]:null;if(!e||e.lines.pct<90){console.error('emergency.ts line coverage '+(e?e.lines.pct:'missing')+' < 90%');process.exit(1);}" && npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/emergency.test.ts` — confirm gate reject (`confirm` missing/false → `COOLIFY_CONFIRM_REQUIRED` + preview `{ would_affect, sample_uuids≤5, action }`); confirm true → sequential best-effort results; `stop_all` filters `type===application` + `status.startsWith('running')`; project resolve zero/multi/single match; apps-only filter
- [x] `src/utils/projections.test.ts` (or existing sanitize tests) — `reveal:false` masks secret keys as `***`; `reveal:true` returns plaintext on full projection; summary path never depends on reveal
- [x] `src/utils/errors.test.ts` — `COOLIFY_CONFIRM_REQUIRED` code + recoveryHints include `Retry with confirm: true`
- [x] `src/mcp/tools/deployment.test.ts` — `reveal:false` masks raw_deployment secrets; `reveal:true` returns plaintext; summary independent of reveal
- [x] `tests/integration/emergency-safety-flow.test.ts` — handler-level integration across emergency + reveal on full get (mocked HTTP; no live Coolify)
- [x] Existing infrastructure (vitest + tsup + npm scripts) — no new framework install

*Existing infrastructure covers framework requirements; Wave 0 adds test stubs for EMG/OUT behaviors from RESEARCH Validation Architecture.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real MCP stdio E2E with `emergency.stop_all` / `redeploy_project` / `restart_project` + confirm gate + application/service/database/diagnose/deployment get with reveal | EMG-01–03, OUT-02, OUT-07 | Per P1 01-05 + P3 03-06 + P4 04-05 + P5 05-05 pattern: real MCP stdio E2E is MANUAL-ONLY — in-process SDK validation strips unknown keys without failing (03-07 finding) | 1. `npm run build` 2. Configure Cursor/Claude Desktop against a real Coolify 4.1.x instance 3. Invoke each P6 action via MCP client 4. Verify structured response + formatted text + confirm gate preview + reveal masked/plaintext behavior |
| Live UAT emergency ops on non-prod test project only | EMG-01–03 | Destructive bulk ops; operator must choose safe target — NEVER run against production | 1. Set `COOLIFY_URL` + `COOLIFY_TOKEN` 2. `emergency.stop_all` `confirm:false` → verify `COOLIFY_CONFIRM_REQUIRED` preview 3. `emergency.stop_all` `confirm:true` on non-prod project apps → verify apps stopped 4. `emergency.redeploy_project` `confirm:true` on non-prod project → verify deployments queued 5. `emergency.restart_project` `confirm:true` on non-prod project → verify apps restarted |
| Live UAT reveal on real app with secret-bearing full payload | OUT-02 | Needs real app/service/deployment with secret-bearing full payload | 1. `application.get` `projection:full` default → secrets `***` 2. `application.get` `projection:full` `reveal:true` → secrets plaintext 3. `service.get`/`database.get` `projection:full` `reveal:true` → secrets plaintext 4. `diagnose` app `projection:full` `reveal:true` → `raw_application` secrets plaintext 5. Confirm log lines still unmasked (P5 warning preserved) 6. Confirm error messages still redacted when `reveal:true` (D-11 error-path independence) |

---

## Coverage Thresholds

| File | Lines | Branches | Functions |
|------|-------|----------|-----------|
| `emergency.ts` | ≥ 90% | — | — |
| Overall `src/mcp/tools` | ≥ P5 baseline (97.03%) | ≥ P5 baseline (83.92%) | ≥ P5 baseline (98.55%) |

Explicit node check on `coverage/coverage-summary.json` enforces `emergency.ts` lines ≥ 90%. No global `coverage.thresholds` in vitest config (would gate entire suite).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by executor
