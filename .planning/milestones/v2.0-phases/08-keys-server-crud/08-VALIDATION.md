---
phase: 8
slug: keys-server-crud
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^1.4.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/private_key.test.ts src/mcp/tools/server.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run target-file vitest (`npx vitest run <files>`)
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-W0-01 | 00 | 0 | KEY-01–05 | T-08-PEM | Never return PEM | unit | `npx vitest run src/mcp/tools/private_key.test.ts` | ❌ W0 | ⬜ pending |
| 08-W0-02 | 00 | 0 | SRV-01–05 | T-08-SSH | Soft success + hints on unreachable | unit | `npx vitest run src/mcp/tools/server.test.ts` | ❌ W0 | ⬜ pending |
| KEY-01 | TBD | TBD | KEY-01 | — | List metadata only | unit | `npx vitest run -t "private_key list"` | ❌ W0 | ⬜ pending |
| KEY-02 | TBD | TBD | KEY-02 | — | Get metadata only | unit | `npx vitest run -t "private_key get"` | ❌ W0 | ⬜ pending |
| KEY-03 | TBD | TBD | KEY-03 | T-08-PEM | Create PEM/file XOR; no PEM in response | unit | `npx vitest run -t "private_key create"` | ❌ W0 | ⬜ pending |
| KEY-04 | TBD | TBD | KEY-04 | — | Update metadata | unit | `npx vitest run -t "private_key update"` | ❌ W0 | ⬜ pending |
| KEY-05 | TBD | TBD | KEY-05 | T-08-409 | confirm + COOLIFY_409 deps | unit | `npx vitest run -t "private_key delete"` | ❌ W0 | ⬜ pending |
| SRV-01 | TBD | TBD | SRV-01 | T-08-SSH | create + auto-validate | unit | `npx vitest run -t "server create"` | ❌ W0 | ⬜ pending |
| SRV-02 | TBD | TBD | SRV-02 | — | update fields | unit | `npx vitest run -t "server update"` | ❌ W0 | ⬜ pending |
| SRV-03 | TBD | TBD | SRV-03 | — | confirm; delete_volumes default false | unit | `npx vitest run -t "server delete"` | ❌ W0 | ⬜ pending |
| SRV-04 | TBD | TBD | SRV-04 | T-08-SSH | validate timeout/pending | unit | `npx vitest run -t "server validate"` | ❌ W0 | ⬜ pending |
| SRV-05 | TBD | TBD | SRV-05 | — | is_build_server | unit | `npx vitest run -t "server build"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/private_key.test.ts` — covers KEY-01 to KEY-05
- [ ] `src/mcp/tools/server.test.ts` — covers SRV-01 to SRV-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify SSH validate against real host | SRV-04 | Needs real server + key | Optional smoke after unit suite green |

*All other phase behaviors have automated verification via mocked ofetch.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-07-21 (milestone tech-debt cleanup --auto -all)

## Validation Audit 2026-07-21
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 1 (live SSH validate — manual-only, non-blocking) |
