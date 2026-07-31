---
phase: 30
slug: deploy-guard
status: ready-for-verify
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-31
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/deployment.test.ts -x` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~45 seconds (application tests subset) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/deployment.test.ts -x`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-00-01 | 00 | 0 | GUARD-01 | T-30-01 | Preflight RED scaffolds lock four factors | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t preflight -x` | ❌ W0 | ⬜ pending |
| 30-00-02 | 00 | 0 | GUARD-03 | T-30-02 | Rollback RED scaffolds lock confirm+pin+deploy | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t rollback -x` | ❌ W0 | ⬜ pending |
| 30-00-03 | 00 | 0 | GUARD-02 | — | Capability RED for deployment_preflight/deployment_rollback | unit | `npx vitest run src/mcp/tools/system.test.ts -t deployment_preflight -x` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | GUARD-01/02 | T-30-01 | Preflight read-only; masked env keys | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t preflight -x` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 2 | GUARD-03 | T-30-02 | Rollback confirm gate + last finished pin | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t rollback -x` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 3 | GUARD-01/02/03 | — | Capabilities + coverage rows present | unit | `npx vitest run src/mcp/tools/system.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/deployment.test.ts` — `it.fails` for preflight (four factors, risk_score, soft partial)
- [ ] `src/mcp/tools/deployment.test.ts` — `it.fails` for rollback (confirm gate, pin+deploy, no target)
- [ ] `src/mcp/tools/system.test.ts` — capability RED for `deployment_preflight` and `deployment_rollback`
- [ ] `src/utils/deploy-preflight.test.ts` — unit scaffolds for `findLastSuccessfulDeployment` and `computeDeployRiskScore`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live rollback on non-git docker app | GUARD-03 | Image-tag rollback varies by build pack | UAT: deploy app, fail deploy, rollback against live Coolify 4.1.x |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags in verify commands
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
