---
phase: 29
slug: drift-heal
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/manifest.test.ts src/mcp/tools/application.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/manifest.test.ts src/mcp/tools/application.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-00-01 | 00 | 0 | DRIFT-01 | — | N/A (RED scaffolds) | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t audit -x` | ❌ W0 | ⬜ pending |
| 29-00-02 | 00 | 0 | DRIFT-02 | — | N/A (RED scaffolds) | unit | `npx vitest run src/mcp/tools/application.test.ts -t "envs:promote" -x` | ❌ W0 | ⬜ pending |
| 29-01-01 | 01 | 1 | DRIFT-01 | T-29-03 | Audit read-only / no side effects | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t audit -x` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | DRIFT-01 | T-29-03 | Missing manifest → structured error + hints | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t "missing manifest" -x` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 1 | DRIFT-03 | — | findings include FollowUpHint shape | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t findings -x` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 2 | DRIFT-02 | T-29-01 | Preview masks env values by default | unit | `npx vitest run src/mcp/tools/application.test.ts -t "envs:promote" -x` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 2 | DRIFT-02 | T-29-02 | Apply requires confirm | unit | `npx vitest run src/mcp/tools/application.test.ts -t "promote apply" -x` | ❌ W0 | ⬜ pending |
| 29-02-03 | 02 | 2 | DRIFT-02 | T-29-02 | conflict_policy keep_remote skips mismatches | unit | `npx vitest run src/mcp/tools/application.test.ts -t "promote conflict" -x` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 3 | D-15 | — | capability keys manifest_audit + envs_promote | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/manifest.test.ts` — `it.fails` scaffolds: audit findings, missing manifest, partial fetch, domain_drift, nesting_mismatch
- [ ] `src/mcp/tools/application.test.ts` — `it.fails` scaffolds: envs:promote preview, confirm gate, conflict_policy, masked values
- [ ] `src/mcp/tools/system.test.ts` — extend capability expectations for `manifest_audit` + `envs_promote`
- [ ] `src/utils/manifest.ts` / tests — `ManifestManager.exists()` with unit coverage if added in Wave 0

*Existing Vitest infrastructure covers runner; Wave 0 adds RED scaffolds only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live audit against real Coolify instance | DRIFT-01 | Needs live credentials + workspace manifest | Optional UAT: run `manifest.audit` with real instance; confirm findings match known drift |

*Core phase behaviors have automated verification via Wave 0 → green flip.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
