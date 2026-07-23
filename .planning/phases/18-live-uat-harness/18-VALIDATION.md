---
phase: 18
slug: live-uat-harness
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm run lint` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run lint`
- **After every plan wave:** Run `pnpm run test` + `pnpm run build`
- **Before `/gsd-verify-work`:** Full suite must be green; local `node scripts/live-uat.mjs` against UAT instance for phase gate
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-W0 | 00 | 0 | UAT-01…06 | — | N/A | scaffold | create harness/matrix stubs | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-01 | T-18-02 | No destructive without flags | integration | `node scripts/live-uat.mjs` | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-02 | T-18-01 | Tokens redacted as `***` | integration | `node scripts/live-uat.mjs` (redaction check) | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-03 | — | JSON report per tool | integration | `node scripts/live-uat.mjs --out report.json` | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-04 | — | v3 suite tags | integration | `node scripts/live-uat.mjs` (+ `--full` when needed) | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-05 | T-18-02 | Write/destructive gated | integration | default run shows `planned`/skip for mutations | ❌ W0 | ⬜ pending |
| 18-* | * | * | UAT-06 | — | Docs present | docs | Inspect `CONTRIBUTING.md` for `uat:live` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/live-uat.mjs` — new CLI live UAT harness
- [ ] `scripts/live-uat.matrix.json` — declarative coverage matrix
- [ ] `CONTRIBUTING.md` — UAT run + interpret docs

*Existing Vitest/lint/build infrastructure covers unit regression; live harness is Wave 0 deliverable.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full live pass against real Coolify UAT project | UAT-01, UAT-04 | Needs local credentials + dedicated `UAT_PROJECT_UUID` | Set env, run `npm run uat:live`, confirm exit 0 and JSON report |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
