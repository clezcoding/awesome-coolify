---
phase: 03
slug: diagnose-issue-scan
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during Diagnose & Issue Scan execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils` |
| **Full suite command** | `npx vitest run` |
| **Integration command** | `npx vitest run tests/integration/diagnose-flow.test.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build` succeeds
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SYS-03 / SYS-04 / SYS-05 / OUT-06 | T-03-04 env leakage | Env count rendered as integer only — env values never serialized | unit | `npx vitest run src/utils/projections.test.ts` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | SYS-03 | — | Issue classifier maps unreachable server → critical invariant | unit | `npx vitest run src/utils/issue-classifier.test.ts` | ✅ | ✅ green |
| 03-01-03 | 01 | 1 | OUT-06 | — | Hint generator produces structured FollowUpHint[] only | unit | `npx vitest run src/utils/diagnose-hints.test.ts` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | SYS-04 | T-03-04 | Diagnose app composes 3 parallel fetches; env values discarded after length read | unit | `npx vitest run src/mcp/tools/diagnose.test.ts` | ✅ | ✅ green |
| 03-03-01 | 03 | 2 | SYS-05 | T-03-01 | Server diagnose composes 4 parallel fetches; /validate non-blocking | unit | `npx vitest run src/mcp/tools/diagnose.test.ts` | ✅ | ✅ green |
| 03-04-01 | 04 | 3 | SYS-03 | — | Scan enumerates fleet in exactly 2 HTTP calls; severity buckets per invariant | unit | `npx vitest run src/mcp/tools/diagnose.test.ts` | ✅ | ✅ green |
| 03-05-01 | 05 | 3 | OUT-06 | — | application/service/database get responses include hints[] | unit | `npx vitest run src/mcp/tools/{application,service,database}.test.ts` | ✅ | ✅ green |
| 03-06-01 | 06 | 4 | SYS-03 / SYS-04 / SYS-05 / OUT-06 | — | End-to-end diagnose flow integration (handler-level) | integration | `npx vitest run tests/integration/diagnose-flow.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/fixtures/coolify-mixed-health.ts` — mixed-health fleet mock
- [x] `tests/fixtures/coolify-empty.ts` — empty fleet mock
- [x] `tests/fixtures/coolify-malformed.ts` — malformed API response shapes
- [x] `tests/integration/diagnose-flow.test.ts` — handler-level integration for SYS-03/04/05 + OUT-06

*Existing vitest infrastructure from Phase 02 covers framework install + config.*

---

## Property-Based Test Boundaries

Invariants enforced on the issue classifier:

- **Server Invariant**: Every server fixture where `is_reachable === false` MUST map to `critical` severity. No exception.
- **Health Invariant**: Every resource fixture where `status` includes `unhealthy` MUST map to `high` severity.
- **Info Invariant**: Every resource fixture where `status` includes `exited` or `stopped` MUST map to `info` severity.

---

## Backstop Tests

- **Validate Trigger Side-Effect**: Assert server diagnose fires `/validate`, returns validation status without blocking hangs.
- **Auxiliary Resilience**: Inject 403 / network timeout on `/envs` or `/deployments` during app diagnose; assert main app details still composed and returned (Promise.allSettled hybrid policy).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `trigger_validate: false` opt-out skips state mutation on real Coolify instance | SYS-05 D-10 | Requires live Coolify + real validation endpoint | Point MCP client at staging Coolify, call diagnose server with `trigger_validate: false`, confirm no validation record created |
| MCP stdio E2E handshake over diagnose tool via `createAndConnectServer` | SYS-03 / SYS-04 / SYS-05 / OUT-06 | vitest cannot reliably exercise stdio child-process handshake; P1 01-05 same pattern | Build `dist/index.js`, configure Cursor/Claude Desktop `mcp.json`, invoke `diagnose({action:"app"\|"server"\|"scan"})` and assert `structuredContent` envelope per 03-06 acceptance |

---

## Coverage Thresholds

Matches Phase 2 sign-off boundaries:

- **Type-checking:** `tsc --noEmit` — known pre-existing errors in `src/api/client.ts` (retryDelay) and test files predating Phase 3; `npm run build` (tsup) passes clean
- **Build:** `npm run build` succeeds
- **Test execution:** `vitest run` all green — 21 files, 198 tests passed (2026-07-12)
- **Coverage:** `@vitest/coverage-v8` — 78.76% lines / 72.48% branches / 84.95% functions; diagnose.ts 96.02% lines; projections.ts 99.18% lines

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 40s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter
- [x] Full suite green: `npx vitest run` — 21 files, 198 tests passed (2026-07-12)
- [x] Integration sign-off: `npx vitest run tests/integration/diagnose-flow.test.ts` — 9 tests passed

**Approval:** signed off — Phase 3 ready for `/gsd-verify-work`
