---
phase: 24
slug: capabilities-deployment-logs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-27
validated: 2026-07-28
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/system.test.ts src/mcp/tools/deployment.test.ts src/mcp/tools/meta.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (quick) / ~2–5 min (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/system.test.ts src/mcp/tools/deployment.test.ts src/mcp/tools/meta.test.ts src/utils/log-helpers.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-W0-01 | 00 | 0 | CAP-02 | — | N/A | unit | `npx vitest run src/mcp/tools/system.test.ts -t "capabilities"` | ✅ | ✅ green |
| 24-W0-02 | 00 | 0 | OBS-01 | T-24-01 | sensitive-required path | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "logs"` | ✅ | ✅ green |
| 24-01-01 | 01 | 1 | CAP-01 | — | no token in version JSON | unit | `npx vitest run src/mcp/tools/system.test.ts -t "version"` | ✅ | ✅ green |
| 24-01-02 | 01 | 1 | CAP-02 | — | N/A | unit | `npx vitest run src/mcp/tools/system.test.ts -t "capabilities"` | ✅ | ✅ green |
| 24-01-03 | 01 | 1 | CAP-01 | — | N/A | unit | `npx vitest run src/mcp/tools/meta.test.ts` | ✅ | ✅ green |
| 24-02-01 | 02 | 2 | OBS-01 | T-24-01 | XOR schema + sensitive gate | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "schema"` | ✅ | ✅ green |
| 24-02-02 | 02 | 2 | OBS-01 | — | N/A | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "latest"` | ✅ | ✅ green |
| 24-02-03 | 02 | 2 | OBS-01 | — | structured error hints | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "no deployments"` | ✅ | ✅ green |
| 24-02-04 | 02 | 2 | OBS-01 | T-24-02 | empty logs soft OK | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "empty logs"` | ✅ | ✅ green |
| 24-02-05 | 02 | 2 | OBS-01 | — | N/A | integration | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| 24-02-06 | 02 | 2 | OBS-01 | — | build path regression | unit | `npx vitest run src/mcp/tools/application.test.ts -t "build logs"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/deployment.test.ts` — `describe('deployment logs')` with scaffolds flipped GREEN (Plans 24-01/24-02)
- [x] `src/mcp/tools/system.test.ts` — version shape + capabilities object tests green
- [x] `src/mcp/tools/meta.test.ts` — assert `mcpVersion === readPackageVersion()` not hardcoded constant
- [x] `src/utils/log-helpers.test.ts` — tests for extracted `processDeploymentBuildLogs`
- [x] `docs/coverage-map.yaml` — `deployment.logs` row
- [x] `src/utils/errors.test.ts` — `COOLIFY_NO_DEPLOYMENTS` recovery hints
- [x] Regenerate `docs/COVERAGE.md` after coverage-map update (Plan 24-03)

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-28 — 121/121 phase tests green; stale draft rows reconciled (no new tests required)

---

## Validation Audit 2026-07-28

| Metric | Count |
|--------|-------|
| Gaps found | 11 (stale ⬜ pending rows in draft VALIDATION.md) |
| Resolved | 11 (vitest confirm — tests already green from Plans 24-00..24-03) |
| Escalated | 0 |

**Audit notes:** No `it.fails` scaffolds remain. Nyquist auditor skipped — gaps were documentation drift only (same pattern as Phases 19–23 reconciliation per STATE.md).
