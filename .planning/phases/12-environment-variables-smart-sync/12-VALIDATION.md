---
phase: 12
slug: environment-variables-smart-sync
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v4.1.10 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/mcp/tools/application.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/application.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-W0-01 | 00 | 0 | ENV-01..04 | T-12-01 | Values masked/redacted in fixtures | integration | `npx vitest run tests/integration/envs.test.ts` | ❌ W0 | ⬜ pending |
| 12-W0-02 | 00 | 0 | ENV-05 | T-12-01 | Parser never logs raw values | unit | `npx vitest run src/utils/env-parser.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ENV-06 | — | Flags round-trip | unit | `npx vitest run src/mcp/tools/application.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/envs.test.ts` — stubs for ENV-01..ENV-04
- [ ] `src/utils/env-parser.test.ts` — covers ENV-05 dotenv parser logic

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent asks human before `reveal: true` | ENV-02 / SAF-04 / D-15 | Product policy is conversational | In MCP session, call envs:get without prior reveal preference; confirm ask-human / recovery hint surfaces |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
