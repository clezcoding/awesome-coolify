---
phase: 24
slug: capabilities-deployment-logs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-27
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^1.4.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/system.test.ts src/mcp/tools/deployment.test.ts src/mcp/tools/meta.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (quick) / ~2–5 min (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/system.test.ts src/mcp/tools/deployment.test.ts src/mcp/tools/meta.test.ts src/utils/log-helpers.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-W0-01 | 00 | 0 | CAP-02 | — | N/A | unit | `npx vitest run src/mcp/tools/system.test.ts -t "capabilities" -x` | ❌ W0 | ⬜ pending |
| 24-W0-02 | 00 | 0 | OBS-01 | T-24-01 | sensitive-required path | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "logs" -x` | ❌ W0 | ⬜ pending |
| 24-01-01 | 01 | 1 | CAP-01 | — | no token in version JSON | unit | `npx vitest run src/mcp/tools/system.test.ts -t "version" -x` | ✅ extend | ⬜ pending |
| 24-01-02 | 01 | 1 | CAP-02 | — | N/A | unit | `npx vitest run src/mcp/tools/system.test.ts -t "capabilities" -x` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | CAP-01 | — | N/A | unit | `npx vitest run src/mcp/tools/meta.test.ts -x` | ✅ extend | ⬜ pending |
| 24-02-01 | 02 | 2 | OBS-01 | T-24-01 | XOR schema + sensitive gate | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "schema" -x` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 2 | OBS-01 | — | N/A | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "latest" -x` | ❌ W0 | ⬜ pending |
| 24-02-03 | 02 | 2 | OBS-01 | — | structured error hints | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "no deployments" -x` | ❌ W0 | ⬜ pending |
| 24-02-04 | 02 | 2 | OBS-01 | T-24-02 | empty logs soft OK | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "empty logs" -x` | ❌ W0 | ⬜ pending |
| 24-02-05 | 02 | 2 | OBS-01 | — | N/A | integration | `npx vitest run tests/openapi-coverage.test.ts -x` | ✅ extend | ⬜ pending |
| 24-02-06 | 02 | 2 | OBS-01 | — | build path regression | unit | `npx vitest run src/mcp/tools/application.test.ts -t "build logs" -x` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/deployment.test.ts` — `describe('deployment logs')` with `it.fails` scaffolds (schema XOR, fetch by uuid, latest resolution, no-deployments error, empty logs hint, sensitive-required)
- [ ] `src/mcp/tools/system.test.ts` — `it.fails` or updated stubs for new version shape + capabilities object
- [ ] `src/mcp/tools/meta.test.ts` — assert `mcpVersion === readPackageVersion()` not hardcoded constant
- [ ] `src/utils/log-helpers.test.ts` — tests for extracted `processDeploymentBuildLogs` (optional if covered via deployment tests)
- [ ] `docs/coverage-map.yaml` — `deployment.logs` row
- [ ] `src/errors.test.ts` (or equivalent) — `COOLIFY_NO_DEPLOYMENTS` recovery hints scaffold
- [ ] Regenerate `docs/COVERAGE.md` after coverage-map update

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
