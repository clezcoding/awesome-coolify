---
phase: 31
slug: agent-playbooks
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-31
validated: 2026-07-31
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/diagnose.test.ts src/mcp/tools/recipe.test.ts tests/mcp/prompts.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched>.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-00-01 | 00 | 0 | BRAIN-01 | T-31-01 | Cap evidence lines; no fake matches on empty logs | unit | `npx vitest run src/utils/log-patterns.test.ts` | ✅ | ✅ green |
| 31-00-02 | 00 | 0 | BRAIN-01/02 | T-31-01 | Zod + advisory-only analyze | unit | `npx vitest run src/mcp/tools/diagnose.test.ts -t analyze` | ✅ | ✅ green |
| 31-00-03 | 00 | 0 | SREC-01/02 | T-31-03 | Live catalog only; no invent type IDs | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend` | ✅ | ✅ green |
| 31-00-04 | 00 | 0 | PLAY-01/02 | T-31-02 | Prompts cite confirm; no auto-confirm | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ | ✅ green |
| 31-01-01 | 01 | 1 | BRAIN-01/02 | T-31-04 | D-06 advisory gate before analyze | checkpoint | context D-06 confirm | ✅ | ✅ green |
| 31-01-02 | 01 | 1 | BRAIN-01/02 | T-31-04 | Tracer analyze→hints→playbook link | unit | `npx vitest run src/utils/log-patterns.test.ts src/mcp/tools/diagnose.test.ts -t analyze` | ✅ | ✅ green |
| 31-01-03 | 01 | 1 | BRAIN-01/02 | T-31-01 | Four patterns + soft partial edges | unit | `npx vitest run src/utils/log-patterns.test.ts src/mcp/tools/diagnose.test.ts -t analyze` | ✅ | ✅ green |
| 31-02-01 | 02 | 2 | PLAY-01 | T-31-02 | D-09 confirm gate before rollback prompt | checkpoint | context D-09 confirm | ✅ | ✅ green |
| 31-02-02 | 02 | 2 | PLAY-01/02 | T-31-02 | Six prompts; composition cites | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ | ✅ green |
| 31-02-03 | 02 | 2 | PLAY-02 | T-31-07 | Composition hardening asserts | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ | ✅ green |
| 31-03-01 | 03 | 3 | SREC-01 | T-31-09 | D-14 advisory gate before recommend | checkpoint | context D-14 confirm | ✅ | ✅ green |
| 31-03-02 | 03 | 3 | SREC-01/02 | T-31-03 | Live catalog recommend plan_steps | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend` | ✅ | ✅ green |
| 31-03-03 | 03 | 3 | SREC-02 | T-31-03 | Confidence ranking + no invent IDs | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend` | ✅ | ✅ green |
| 31-04-01 | 04 | 4 | D-19 | T-31-11 | diagnose_analyze + recipe_recommend caps | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities` | ✅ | ✅ green |
| 31-04-02 | 04 | 4 | D-18 | T-31-12 | Coverage composite declaration | grep | `rg diagnose.analyze docs/coverage-map.yaml` | ✅ | ✅ green |
| 31-04-03 | 04 | 4 | D-19 | T-31-11 | README EN/DE parity | grep | `rg diagnose.analyze README.md README.de.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/log-patterns.test.ts` — fixture lines per pattern (OOM, 5xx, crash loop, ECONNREFUSED)
- [x] `src/mcp/tools/diagnose.test.ts` — `describe('diagnose analyze')` with analyze handler tests
- [x] `src/mcp/tools/recipe.test.ts` — `describe('recipe recommend')` with live-catalog tests
- [x] `tests/mcp/prompts.test.ts` — six-prompt registration + composition asserts
- [x] `src/mcp/tools/system.test.ts` — seventeen capability keys including diagnose_analyze + recipe_recommend

---

## Requirement Coverage

| Requirement | Status | Test Evidence |
|-------------|--------|---------------|
| BRAIN-01 | COVERED | `log-patterns.test.ts` (4 patterns) + `diagnose.test.ts` analyze |
| BRAIN-02 | COVERED | `enrichPatternHints` tests + `recommended_actions` in analyze response |
| PLAY-01 | COVERED | `prompts.test.ts` six-prompt registration |
| PLAY-02 | COVERED | `prompts.test.ts` atomic composition asserts |
| SREC-01 | COVERED | `recipe.test.ts` recommend plan_steps |
| SREC-02 | COVERED | `recipe.test.ts` live catalog + no invent IDs |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify log analyze against real OOM/5xx | BRAIN-01 | Needs live instance logs | Optional smoke: diagnose.analyze on known noisy app |
| Live list-types recommend mapping | SREC-01 | Catalog CDN content varies | Optional: recipe.recommend "Postgres" returns catalog ID |

*Automated unit/fixture coverage is required; live smoke is optional.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-31 — reconciled against VERIFICATION.md 8/8 pass + 120/120 unit tests green

---

## Validation Audit 2026-07-31

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tasks validated | 16/16 |
| Requirements COVERED | 6/6 (BRAIN-01, BRAIN-02, PLAY-01, PLAY-02, SREC-01, SREC-02) |
| Test files run | 4 (log-patterns, diagnose, recipe, prompts) |
| Tests passed | 120/120 |
| VERIFICATION score | 8/8 |

**Notes:** Vitest 4.x dropped `-x` (bail) flag — commands updated to omit it. Checkpoint tasks (D-06, D-09, D-14) verified via VERIFICATION.md behavioral spot-checks and prompt/handler contract tests.
