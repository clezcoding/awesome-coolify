---
phase: 25
slug: application-log-follow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^1.4.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/application.test.ts src/utils/log-follow-poll.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched>.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-00-01 | 00 | 0 | OBS-02 | T-25-01 | Zod strict + follow XOR guards | unit | `npx vitest run src/utils/log-follow-poll.test.ts -x` | ❌ W0 | ⬜ pending |
| 25-01-01 | 01 | 1 | OBS-02 | T-25-02 | timeout + backoff bounded poll | unit | `npx vitest run src/utils/log-follow-poll.test.ts -x` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | OBS-02 | — | idle stop OK + stopped_reason | unit | `npx vitest run src/mcp/tools/application.test.ts -t idle -x` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 1 | OBS-02 | — | timeout dual-signal + partial logs | unit | `npx vitest run src/mcp/tools/application.test.ts -t timeout -x` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 2 | OBS-02 | — | follow + deployment_uuid → COOLIFY_422 | unit | `npx vitest run src/mcp/tools/application.test.ts -t deployment_uuid -x` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | OBS-02 | — | application_logs_follow capability | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities -x` | ✅ | ⬜ pending |
| 25-03-02 | 03 | 2 | OBS-03 | — | one-shot runtime unchanged | unit | `npx vitest run src/mcp/tools/application.test.ts -t runtime -x` | ✅ | ⬜ pending |
| 25-03-03 | 03 | 2 | OBS-03 | — | one-shot build unchanged | unit | `npx vitest run src/mcp/tools/application.test.ts -t build -x` | ✅ | ⬜ pending |
| 25-04-01 | 04 | 2 | OBS-03 | — | integration logs flow regression | integration | `npx vitest run tests/integration/logs-service-db-flow.test.ts -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/log-follow-poll.ts` + `log-follow-poll.test.ts` — dedup, idle, timeout, 429 backoff
- [ ] `COOLIFY_LOG_FOLLOW_TIMEOUT` in `errors.ts` + `RECOVERY_HINTS`
- [ ] Flip `applicationLogsSchema rejects follow` → acceptance tests
- [ ] Update `system.test.ts` five capability keys
- [ ] Integration test: `rejects follow:true` → happy-path or schema-accept

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify follow against real app | OBS-02 | Requires live instance | UAT host: `application.logs` with `follow:true`, verify aggregate + idle/timeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
