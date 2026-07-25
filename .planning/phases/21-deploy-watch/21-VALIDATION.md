---
phase: 21
slug: deploy-watch
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/deploy-watch-poll.test.ts src/mcp/tools/deployment.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest files for touched areas
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-00-01 | 00 | 0 | WATCH-01 | T-21-01 | Polling bounds prevent API storm | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts` | ❌ W0 | ⬜ pending |
| 21-00-02 | 00 | 0 | WATCH-01 | T-21-02 | Timeout/fail dual-signal via isError | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "watch"` | ❌ W0 | ⬜ pending |
| 21-00-03 | 00 | 0 | WATCH-02 | — | Prompt documents watch path | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ (update) | ⬜ pending |
| 21-01-01 | 01 | 1 | WATCH-01 | T-21-01 | Backoff+jitter helper GREEN | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts src/utils/deploy-poll.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | WATCH-01 | T-21-01-02 | toStructuredError 429 retry_after | unit | `npx vitest run src/utils/errors.test.ts -t "429"` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | WATCH-01 | T-21-02 | Watch error codes + RECOVERY_HINTS | unit | `npx vitest run src/utils/errors.test.ts` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | WATCH-01 | T-21-02 | watch action dual-signal outcomes | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "watch"` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 3 | WATCH-02 | — | Deploy prompt watch-primary GREEN | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ (update) | ⬜ pending |
| 21-03-02 | 03 | 3 | WATCH-02 | T-21-03 | README EN/DE Watch section + table | docs | `rg -n "deployment\.watch" README.md && rg -n "Watch" README.md && rg -n "Beobachten" README.de.md && rg -n "300" README.md && rg -n "Phase 22" README.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/deploy-watch-poll.test.ts` — stubs for backoff bounds, timeout outcome, 429 continue, injectable RNG
- [ ] `src/mcp/tools/deployment.test.ts` — add `watch` action cases (schema + handler outcomes)
- [ ] `tests/mcp/prompts.test.ts` — replace "future Phase 21" / get-before-watch ordering assertions

*Existing `deploy-poll.test.ts` remains the regression gate that `wait:true` helper is untouched.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify long-build watch does not 429-storm | WATCH-01 | Needs real API + slow build | Trigger deploy; call `deployment.watch`; confirm intervals grow and status reaches terminal or soft timeout |
| README EN/DE Watch section readable for agents | WATCH-02 | Docs smoke optional | Skim README.md + README.de.md Watch section for deploy→watch→re-watch guidance |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
