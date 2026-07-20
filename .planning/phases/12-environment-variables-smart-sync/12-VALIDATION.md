---
phase: 12
slug: environment-variables-smart-sync
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
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

- **After every task commit:** Run `npx vitest run src/mcp/tools/application.test.ts` (or the file touched by the task)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-W0-01 | 00 | 0 | ENV-01..04 | T-12-01 | Values masked/redacted in fixtures | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ extended | ⬜ pending |
| 12-W0-02 | 00 | 0 | ENV-01..04 | T-12-01 | Values masked/redacted in fixtures | unit | `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts` | ✅ extended | ⬜ pending |
| 12-W0-03 | 00 | 0 | ENV-01..04 | T-12-01 | Client methods parameterized by resource type | unit | `npx vitest run src/api/client.test.ts` | ✅ extended | ⬜ pending |
| 12-W0-04 | 00 | 0 | ENV-05 | T-12-01 | Parser never logs raw values | unit | `npx vitest run src/utils/env-parser.test.ts` | ❌ W0 (new) | ⬜ pending |
| 12-W0-05 | 00 | 0 | ENV-06 | — | Flags round-trip via subsequent envs:get | unit | `npx vitest run src/mcp/tools/application.test.ts -t "envs:"` | ✅ extended | ⬜ pending |
| 12-W0-06 | 00 | 0 | SAF-04 / D-15 | T-12-02 | ask_human_reveal recovery hint surfaced on reveal:true | unit | `npx vitest run src/mcp/tools/application.test.ts -t "reveal"` | ✅ extended | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/application.test.ts` — extended with RED describe blocks for `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `envs:sync` (covers ENV-01..06 + SAF-04 + D-15)
- [x] `src/mcp/tools/service.test.ts` — extended with RED describe blocks for the six envs:* CRUD/bulk actions (no sync per D-09)
- [x] `src/mcp/tools/database.test.ts` — extended with RED describe blocks for the six envs:* CRUD/bulk actions + is_preview rejection tests (Pitfall 1, D-16)
- [x] `src/api/client.test.ts` — extended with RED specs for `fetchEnvs`, `createEnv`, `updateEnvViaBulk`, `bulkUpdateEnvs`, `deleteEnv` parameterized by `ResourceType`
- [ ] `src/utils/env-parser.test.ts` — NEW file; covers `parseEnvFile`, `diffEnvs`, `detectConflicts` (D-08 enum overwrite|keep_remote|abort)

Note: `tests/integration/envs.test.ts` is NOT used in Phase 12 — env behavior is covered by unit tests colocated with source (matching the Phase 11 convention: `src/mcp/tools/*.test.ts`, `src/api/client.test.ts`, `src/utils/*.test.ts`). The integration test path was a planning placeholder that did not match the repo convention; it is dropped in favor of the colocated unit tests above.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent asks human before `reveal: true` | ENV-02 / SAF-04 / D-15 | Product policy is conversational | In MCP session, call envs:get without prior reveal preference; confirm ask-human / recovery hint surfaces in the response `data.recoveryHints` array |
| Agent asks human before `conflict_policy` on sync apply with conflicts | ENV-05 / D-08 | Product policy is conversational | In MCP session, call envs:sync (apply) with conflicts and no conflict_policy; confirm COOLIFY_CONFIRM_REQUIRED surfaces with ask_human_conflict_policy recovery hint |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (env-parser.test.ts is the only new file)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Wave-0 paths synchronized with plan 12-00 (src/* colocated unit tests, not tests/integration/envs.test.ts)

**Approval:** validated
