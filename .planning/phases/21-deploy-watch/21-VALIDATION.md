---
phase: 21
slug: deploy-watch
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-25
validated: 2026-07-27
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

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| **WATCH-01** | deployment.watch polls with backoff+jitter; timeout/429 dual-signal | Unit | `npx vitest run src/utils/deploy-watch-poll.test.ts src/mcp/tools/deployment.test.ts -t watch` | ✅ | ✅ green |
| **WATCH-02** | Deploy prompt + README document watch-primary flow | Unit + docs | `npx vitest run tests/mcp/prompts.test.ts -t deploy` | ✅ | ✅ green |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-00-01 | 00 | 0 | WATCH-01 | T-21-01 | Polling bounds prevent API storm | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts` | ✅ | ✅ green |
| 21-00-02 | 00 | 0 | WATCH-01 | T-21-02 | Timeout/fail dual-signal via isError | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "watch"` | ✅ | ✅ green |
| 21-00-03 | 00 | 0 | WATCH-02 | — | Prompt documents watch path | unit | `npx vitest run tests/mcp/prompts.test.ts -t deploy` | ✅ | ✅ green |
| 21-01-01 | 01 | 1 | WATCH-01 | T-21-01 | Backoff+jitter helper GREEN | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts src/utils/deploy-poll.test.ts` | ✅ | ✅ green |
| 21-01-02 | 01 | 1 | WATCH-01 | T-21-01-02 | toStructuredError 429 retry_after | unit | `npx vitest run src/utils/errors.test.ts -t "429"` | ✅ | ✅ green |
| 21-02-01 | 02 | 2 | WATCH-01 | T-21-02 | Watch error codes + RECOVERY_HINTS | unit | `npx vitest run src/utils/errors.test.ts` | ✅ | ✅ green |
| 21-02-02 | 02 | 2 | WATCH-01 | T-21-02 | watch action dual-signal outcomes | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "watch"` | ✅ | ✅ green |
| 21-03-01 | 03 | 3 | WATCH-02 | — | Deploy prompt watch-primary GREEN | unit | `npx vitest run tests/mcp/prompts.test.ts -t deploy` | ✅ | ✅ green |
| 21-03-02 | 03 | 3 | WATCH-02 | T-21-03 | README EN/DE Watch section + table | docs | `rg -n "deployment\.watch" README.md && rg -n "Watch" README.md && rg -n "Beobachten" README.de.md` | ✅ | ✅ green |
| 21-04-01 | 04 | 4 | WATCH-01 | T-21-01 | remainingMs clamp on 429 + normal poll | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts -t "Retry-After exceeds timeoutMs"` | ✅ | ✅ green |
| 21-04-02 | 04 | 4 | WATCH-01 | — | include_logs success path capped, no raw_deployment | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "include_logs"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/deploy-watch-poll.test.ts` — backoff bounds, timeout outcome, 429 continue, injectable RNG
- [x] `src/mcp/tools/deployment.test.ts` — `watch` action cases (schema + handler outcomes)
- [x] `tests/mcp/prompts.test.ts` — watch-primary deploy prompt assertions

*Existing `deploy-poll.test.ts` remains regression gate that `wait:true` helper is untouched.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify long-build watch does not 429-storm | WATCH-01 | Needs real API + slow build | Trigger deploy; call `deployment.watch`; confirm intervals grow and status reaches terminal or soft timeout |
| README EN/DE Watch section readable for agents | WATCH-02 | Docs smoke optional | Skim README.md + README.de.md Watch section for deploy→watch→re-watch guidance |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-07-27

| Metric | Count |
|--------|-------|
| Gaps found | 11 (all per-task rows pending; wave_0_complete false) |
| Resolved | 11 |
| Escalated | 0 |

Nyquist reconciliation (23.1-02): 30 deploy-watch + deployment tests + 6 prompts tests green; WATCH-01/02 COVERED; earned `status: validated` + `nyquist_compliant: true`.
