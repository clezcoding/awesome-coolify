---
phase: 31
slug: agent-playbooks
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-31
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/diagnose.test.ts src/mcp/tools/recipe.test.ts tests/mcp/prompts.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched>.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-00-01 | 00 | 0 | BRAIN-01 | T-31-01 | Cap evidence lines; no fake matches on empty logs | unit | `npx vitest run src/utils/log-patterns.test.ts -x` | ❌ W0 | ⬜ pending |
| 31-00-02 | 00 | 0 | BRAIN-01/02 | T-31-01 | Zod + advisory-only analyze | unit | `npx vitest run src/mcp/tools/diagnose.test.ts -t analyze -x` | ❌ W0 | ⬜ pending |
| 31-00-03 | 00 | 0 | SREC-01/02 | T-31-03 | Live catalog only; no invent type IDs | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend -x` | ❌ W0 | ⬜ pending |
| 31-00-04 | 00 | 0 | PLAY-01/02 | T-31-02 | Prompts cite confirm; no auto-confirm | unit | `npx vitest run tests/mcp/prompts.test.ts -x` | ✅ extend | ⬜ pending |
| 31-01-01 | 01 | 1 | BRAIN-01/02 | T-31-04 | D-06 advisory gate before analyze | checkpoint | context D-06 confirm | ✅ | ⬜ pending |
| 31-01-02 | 01 | 1 | BRAIN-01/02 | T-31-04 | Tracer analyze→hints→playbook link | unit | `npx vitest run src/utils/log-patterns.test.ts src/mcp/tools/diagnose.test.ts -t analyze -x` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | BRAIN-01/02 | T-31-01 | Four patterns + soft partial edges | unit | `npx vitest run src/utils/log-patterns.test.ts src/mcp/tools/diagnose.test.ts -t analyze -x` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 2 | PLAY-01 | T-31-02 | D-09 confirm gate before rollback prompt | checkpoint | context D-09 confirm | ✅ | ⬜ pending |
| 31-02-02 | 02 | 2 | PLAY-01/02 | T-31-02 | Six prompts; composition cites | unit | `npx vitest run tests/mcp/prompts.test.ts -x` | ✅ extend | ⬜ pending |
| 31-02-03 | 02 | 2 | PLAY-02 | T-31-07 | Composition hardening asserts | unit | `npx vitest run tests/mcp/prompts.test.ts -x` | ✅ | ⬜ pending |
| 31-03-01 | 03 | 3 | SREC-01 | T-31-09 | D-14 advisory gate before recommend | checkpoint | context D-14 confirm | ✅ | ⬜ pending |
| 31-03-02 | 03 | 3 | SREC-01/02 | T-31-03 | Live catalog recommend plan_steps | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend -x` | ❌ W0 | ⬜ pending |
| 31-03-03 | 03 | 3 | SREC-02 | T-31-03 | Confidence ranking + no invent IDs | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend -x` | ❌ W0 | ⬜ pending |
| 31-04-01 | 04 | 4 | D-19 | T-31-11 | diagnose_analyze + recipe_recommend caps | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities -x` | ✅ | ⬜ pending |
| 31-04-02 | 04 | 4 | D-18 | T-31-12 | Coverage composite declaration | grep | `rg diagnose.analyze docs/coverage-map.yaml` | ✅ | ⬜ pending |
| 31-04-03 | 04 | 4 | D-19 | T-31-11 | README EN/DE parity | grep | `rg diagnose.analyze README.md README.de.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/log-patterns.test.ts` — fixture lines per pattern (OOM, 5xx, crash loop, ECONNREFUSED)
- [ ] `src/mcp/tools/diagnose.test.ts` — `describe('diagnose analyze')` with `it.fails` scaffolds
- [ ] `src/mcp/tools/recipe.test.ts` — `describe('recipe recommend')` with `it.fails` scaffolds
- [ ] `tests/mcp/prompts.test.ts` — expected prompt count 4→6 with `it.fails` until Wave 2
- [ ] `src/mcp/tools/system.test.ts` — `it.fails` for new capability keys until Wave 4

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify log analyze against real OOM/5xx | BRAIN-01 | Needs live instance logs | Optional smoke: diagnose.analyze on known noisy app |
| Live list-types recommend mapping | SREC-01 | Catalog CDN content varies | Optional: recipe.recommend "Postgres" returns catalog ID |

*Automated unit/fixture coverage is required; live smoke is optional.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
