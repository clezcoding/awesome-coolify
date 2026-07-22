---
phase: 17
slug: local-manifest-sync
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | none — uses default workspace config |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-xx-01 | 01 | 0 | MAN-01 | T-17-01 | No secrets in manifest; path confined to workspace | unit | `pnpm test src/utils/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 17-xx-02 | 01 | 0 | MAN-02 | — | `.coolify/` gitignored on first write | unit | `pnpm test src/utils/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 17-xx-03 | 02 | 1 | MAN-03 | — | sync reconciles stale UUIDs via live API | integration | `pnpm test src/mcp/tools/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 17-xx-04 | 02 | 1 | MAN-04 | T-17-02 | 404 on stale UUID surfaces refresh hint | integration | `pnpm test src/mcp/tools/manifest.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/manifest.test.ts` — stubs for MAN-01 and MAN-02
- [ ] `src/mcp/tools/manifest.test.ts` — stubs for MAN-03 and MAN-04

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
