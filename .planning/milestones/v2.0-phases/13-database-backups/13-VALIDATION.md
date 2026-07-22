---
phase: 13
slug: database-backups
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-21
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `13-RESEARCH.md`, `13-CONTEXT.md`, and plans `13-00`..`13-04`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/database.test.ts src/api/client.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds (backup subset); full suite ~784+ tests |

---

## Sampling Rate

- **After every task commit:** Run the plan task's `<automated>` verify command
- **After Wave 0 (13-00):** Confirm RED — vitest exits non-zero on new backup tests
- **After Wave 1 (13-01):** `npx vitest run src/api/client.test.ts` GREEN + `npm run build`
- **After Wave 2–3 (13-02/03):** `npx vitest run src/mcp/tools/database.test.ts` GREEN (all backup:*)
- **After Wave 4 (13-04):** docs-parity + smoke server tests
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-00-01 | 00 | 0 | BAK-01..06 | T-13-00-01 | Synthetic fixtures only; no real S3 secrets in tests | unit (RED) | `npx vitest run src/mcp/tools/database.test.ts; test $? -ne 0` | ✅ | ⬜ pending |
| 13-00-02 | 00 | 0 | BAK-01..06 | T-13-00-02 | RED scaffolds fail before implementation | unit (RED) | `npx vitest run src/api/client.test.ts; test $? -ne 0` | ✅ | ⬜ pending |
| 13-01-01 | 01 | 1 | BAK-01..06 | T-13-01-01 | Client methods use mapApiError; no raw secrets in thrown errors | unit | `npx vitest run src/api/client.test.ts` | ✅ | ⬜ pending |
| 13-01-02 | 01 | 1 | BAK-01..06, D-15..17 | T-13-01-02 | maskBackupConfig masks S3 fields; frequency schemas encode Pitfall 1 | unit + build | `npx vitest run src/api/client.test.ts && npm run build` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 2 | BAK-01 | T-13-02-01 | backup:create masks S3 credentials; cron accepted on create | unit | `npx vitest run src/mcp/tools/database.test.ts -t "backup:create"` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 2 | BAK-02, BAK-06 | T-13-02-02 | backup:list/history masked; ask_human_reveal on reveal:true | unit | `npx vitest run src/mcp/tools/database.test.ts -t "backup:(list\|history)"` | ✅ | ⬜ pending |
| 13-03-01 | 03 | 3 | BAK-03 | T-13-03-01 | backup:update rejects cron (Pitfall 1) before HTTP | unit | `npx vitest run src/mcp/tools/database.test.ts -t "backup:update"` | ✅ | ⬜ pending |
| 13-03-02 | 03 | 3 | BAK-04, BAK-05 | T-13-03-02 | confirm gate on delete; backup:now via PATCH backup_now:true | unit | `npx vitest run src/mcp/tools/database.test.ts` | ✅ | ⬜ pending |
| 13-04-01 | 04 | 4 | BAK-01..06 | — | Tool description documents confirm, masking, Pitfall 1 | smoke | `npx vitest run src/mcp/tools/database.test.ts src/mcp/server.test.ts` | ✅ | ⬜ pending |
| 13-04-02 | 04 | 4 | BAK-01..06 | — | README EN/DE parity for backup:* actions | integration | `npx vitest run tests/integration/docs-parity.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/database.test.ts` — RED describe blocks for six `backup:*` actions
- [x] `src/api/client.test.ts` — RED describe blocks for five backup client methods
- [ ] Wave 0 complete when both files exist AND vitest exits **non-zero** (RED) before 13-01

*Existing vitest infrastructure covers framework; no new install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| D-17 error-path redaction | D-17 | Inherited from `mapApiError` + `redactSecrets`; no backup-specific error payload in unit fixtures yet | After 13-02/03: trigger mocked API error containing `secret_key` in response body; assert `wrapMcpError` output does not contain plaintext secret. Grep: handlers use `wrapMcpError`; client uses `mapApiError`. |
| Live Coolify backup:list shape | BAK-02 | Live UAT 2026-07-21 — backup:list on db wwv448u8322naf6xry5rhup4 returns ok:true array (0 schedules) | Verified via scripts/live-uat-milestone-optional.mjs |

---

## Requirement Traceability

| Req | Plans | Primary verify |
|-----|-------|----------------|
| BAK-01 | 00, 01, 02, 04 | 13-02-01 GREEN |
| BAK-02 | 00, 01, 02, 04 | 13-02-02 backup:list GREEN |
| BAK-03 | 00, 01, 03, 04 | 13-03-01 GREEN |
| BAK-04 | 00, 01, 03, 04 | 13-03-02 delete confirm tests |
| BAK-05 | 00, 01, 03, 04 | 13-03-02 backup:now PATCH test |
| BAK-06 | 00, 01, 02, 04 | 13-02-02 backup:history GREEN |

---

## Critical Pitfalls (must not regress)

| ID | Check | Verify |
|----|-------|--------|
| Pitfall 1 | create accepts cron; update rejects cron | 13-00 RED tests + `backupFrequencyUpdateSchema` enum in backup-shared.ts |
| D-08 | delete without confirm → COOLIFY_CONFIRM_REQUIRED | database.test.ts backup:delete tests |
| D-09 | delete_s3 default false; true requires confirm | database.test.ts + client delete_s3 query param |
| D-15/D-16 | S3 masked; reveal + ask_human_reveal | maskBackupConfig + list/history handler tests |
| D-12 | backup:now = PATCH `{ backup_now: true }` | database.test.ts backup:now mock assertion |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers RED scaffolds for handler + client layers
- [x] No watch-mode flags in verify commands
- [x] Feedback latency < 90s for quick runs
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-07-21 (milestone tech-debt cleanup --auto -all)

## Validation Audit 2026-07-21
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 2 (live backup list shape, error-path redaction — manual-only) |
