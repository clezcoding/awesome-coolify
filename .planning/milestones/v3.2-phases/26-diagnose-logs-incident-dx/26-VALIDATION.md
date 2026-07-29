---
phase: 26
slug: diagnose-logs-incident-dx
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/diagnose.test.ts -t logs -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/diagnose.test.ts -t logs -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-00-01 | 00 | 0 | DIAG-01 | T-26-01 | Zod XOR/mode rules reject invalid combos | unit | `npx vitest run src/mcp/tools/diagnose.test.ts -t logs -x` | ❌ W0 | ⬜ pending |
| 26-01-01 | 01 | 1 | DIAG-01 | T-26-02 | mode:full returns nested diagnose + logs | unit | same | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | DIAG-01 | — | mode:logs-only omits diagnose | unit | same | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | DIAG-01 | — | deployment_uuid → build logs only (XOR) | unit | same | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 1 | DIAG-01 | — | diagnose failure soft partial + logs present | unit | same | ❌ W0 | ⬜ pending |
| 26-01-05 | 01 | 1 | DIAG-01 | — | empty runtime logs soft OK + hint | unit | same | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | PROMPT-01 | — | incident prompt cites diagnose.logs, deployment.logs, follow, app-only | unit | `npx vitest run tests/mcp/prompts.test.ts -t incident -x` | ✅ extend | ⬜ pending |
| 26-02-02 | 02 | 2 | D-14 | — | sixth capability key diagnose_logs | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities -x` | ✅ extend | ⬜ pending |
| 26-03-01 | 03 | 3 | SKILL-01 | — | coolify-setup documents system.version + diagnose.logs + skill links | unit | `npx vitest run src/skills/skills-manifest.test.ts -x` | ✅ extend | ⬜ pending |
| 26-03-02 | 03 | 3 | OBS-03 | — | application.logs golden paths unchanged | regression | `npx vitest run src/mcp/tools/application.test.ts -t "runtime logs" -x` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/diagnose.test.ts` — `it.fails` scaffolds for `action: 'logs'` (husky-green RED per Phase 24/25 pattern)
- [ ] `tests/mcp/prompts.test.ts` — incident prompt assertions for PROMPT-01 (may start as failing expectations)
- [ ] `src/mcp/tools/system.test.ts` — update capability key count 5 → 6
- [ ] `docs/coverage-map.yaml` — `diagnose.logs` row
- [ ] `src/utils/log-helpers.ts` — `buildRuntimeLogPayload` extraction (enables DIAG-01 without OBS-03 drift)
- [ ] Optional: `src/skills/skills-manifest.test.ts` — coolify-setup troubleshooting section assertion

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live MCP stdio E2E | DIAG-01 | Handler-level integration only per P1–P5 precedent | MANUAL-ONLY: invoke diagnose.logs via live MCP against Coolify 4.1.2 instance |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
