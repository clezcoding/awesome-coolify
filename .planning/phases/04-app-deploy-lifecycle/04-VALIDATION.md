---
phase: 04
slug: app-deploy-lifecycle
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-13
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during App Deploy Lifecycle execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools src/utils` |
| **Full suite command** | `npx vitest run` |
| **Integration command** | `npx vitest run tests/integration/deploy-flow.test.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools src/utils`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build` succeeds
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

> Task IDs populated by `/gsd-execute-phase` as plans are executed. Pre-planned REQ→test bindings live in the REQ→Test Map below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 01 | 1 | APP-03 / APP-04 / APP-05 | T-04-01 ambiguous mutation | Mutation input strictly `uuid`/`name`/`fqdn`; multi-match → `COOLIFY_AMBIGUOUS_MATCH`, NO mutation executed | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 04-01-T2 | 01 | 1 | APP-03 / APP-04 / APP-05 | T-04-01 ambiguous mutation | Mutation input strictly `uuid`/`name`/`fqdn`; multi-match → `COOLIFY_AMBIGUOUS_MATCH`, NO mutation executed | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 04-02-T1 | 02 | 2 | APP-06 | T-04-02 wait-mode timeout | Wait-mode polls `GET /deployments/{uuid}` at 3s; exits on `finished`/`failed`/`cancelled-by-user` or 300s default / 1800s max | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 04-02-T2 | 02 | 2 | DEP-02 / DEP-03 | — | Batch deploy returns per-app `{ uuid, status, deployment_uuid?, error? }`; one failure does NOT abort others; `logs_available` hint on every entry | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 04-03-T1 | 03 | 3 | APP-07 / APP-08 | — | `deployment.list` paginates via `paginateArray`; `deployment.get` honors `projection`/`include_full` + `max_chars` cap on inline `logs` | unit | `npx vitest run src/mcp/tools/deployment.test.ts` | ✅ | ✅ green |
| 04-03-T2 | 03 | 3 | APP-09 | T-04-03 cancel idempotency | Cancel returns `{ cancelled: false, already_finished: true, status }` on 400 — no error thrown; status fetched via `GET /deployments/{uuid}` | unit | `npx vitest run src/mcp/tools/deployment.test.ts` | ✅ | ✅ green |
| 04-04-T1 | 04 | 3 | DEP-01 / DEP-03 | — | Single deploy by `name`/`fqdn` substring; response includes `logs_available` FollowUpHint pointing at `available_in_phase: 5`; NO inline logs in P4 | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 04-05-T1 | 05 | 4 | APP-03–09 / DEP-01–03 | — | End-to-end deploy-flow integration (handler-level): trigger → poll → terminal → cancel attempt | integration | `npx vitest run tests/integration/deploy-flow.test.ts` | ✅ | ✅ green |
| 04-05-T2 | 05 | 4 | APP-03–09 / DEP-01–03 | — | Full suite + coverage + build sign-off gate | integration | `npx vitest run && npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **APP-03** | Start, stop, restart app by UUID/name/fqdn (strict, no fuzzy `query`) | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **APP-04** | Deploy app by UUID/name/fqdn; multi-match → `COOLIFY_AMBIGUOUS_MATCH` | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **APP-05** | Deploy with `force: true` (API-native flag, no alias) | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **APP-06** | Deploy wait-mode polls `GET /deployments/{uuid}` at 3s; terminal states `finished`/`failed`/`cancelled-by-user`; 300s default / 1800s max timeout | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **APP-07** | `deployment.list` by app uuid; pagination via `paginateArray` (`page`/`per_page` default 10/max 50) | unit | `npx vitest run src/mcp/tools/deployment.test.ts` | ✅ Wave 0 (new) |
| **APP-08** | `deployment.get` by deployment_uuid; summary/full projection; full includes capped inline `logs` via `max_chars` + `sanitizeFullProjection` | unit | `npx vitest run src/mcp/tools/deployment.test.ts` | ✅ Wave 0 (new) |
| **APP-09** | Cancel gracefully — 400 on already-terminal → `{ cancelled: false, already_finished: true, status }` | unit | `npx vitest run src/mcp/tools/deployment.test.ts` | ✅ Wave 0 (new) |
| **DEP-01** | Deploy by resource `name` or `fqdn` substring (mirrors `diagnose` app input minus `query`) | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **DEP-02** | Batch deploy via `uuids: string[]` AND/OR `tags: string[]`; best-effort sequential; per-app result array | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |
| **DEP-03** | `logs_available` `FollowUpHint` on every deploy response (single/batch/wait terminal) — NO inline logs in P4 | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ Wave 0 (extend) |

---

## Wave 0 Requirements

- [x] `src/mcp/tools/deployment.test.ts` — NEW test file covering `list`, `get`, `cancel` (APP-07/08/09). Inline mocks per P3 D-08 (avoids tsc rootDir fixture imports).
- [x] `src/mcp/tools/application.test.ts` — extend existing tests with `start`/`stop`/`restart`/`deploy` (single + batch + wait-mode + `force` + multi-match `COOLIFY_AMBIGUOUS_MATCH`).
- [x] `tests/integration/deploy-flow.test.ts` — handler-level integration: trigger deploy → poll → terminal → cancel attempt (mirrors P3 03-06 `diagnose-flow.test.ts` pattern).
- [x] `src/utils/deploy-poll.test.ts` (if extracted) — polling loop in isolation: 3s interval, terminal exit, timeout return shape.

*Existing vitest infrastructure from Phase 02 covers framework install + config.*

---

## Property-Based Test Boundaries

Invariants enforced on the wait-mode polling loop:

- **Terminal Invariant**: Every `GET /deployments/{uuid}` response where `status ∈ {finished, failed, cancelled-by-user}` MUST exit the loop immediately. No exception.
- **Timeout Invariant**: Every wait-mode call with `timeout >= 1800` MUST be clamped to 1800s. Every call where elapsed >= timeout MUST return partial state + `deployment.get` re-call hint.
- **Ambiguity Invariant**: Every mutation input that resolves to >1 app UUID MUST return `COOLIFY_AMBIGUOUS_MATCH` and execute NO mutation. No exception.
- **Logs-Hint Invariant**: Every successful deploy response (single, batch entry, wait-mode terminal) MUST include a `logs_available` `FollowUpHint` with `available_in_phase: 5`. No inline `logs` string in P4 deploy responses.

---

## Backstop Tests

- **Force-Flag Isolation**: Assert `application.restart` rejects/ignores `force` param (D-22 — restart is pure container restart, no rebuild). Assert `force` only affects `application.deploy`.
- **Cancel 400 Detection**: Inject 400 response from `POST /deployments/{uuid}/cancel`; assert graceful `{ cancelled: false, already_finished: true, status }` envelope with status fetched via follow-up `GET /deployments/{uuid}`.
- **Tag Resolution Fallback**: Inject `/resources` response missing `tags` field on applications; assert tag-resolution falls back to per-app fetch or surfaces per-tag error in batch result array (D-12 — unmatched tags do NOT abort batch).
- **Batch Sequential Ordering**: Spy on `triggerDeploy` calls during batch wait-mode; assert calls occur in input order, each waiting for terminal before next (D-14).
- **Redaction in `deployment.get` full**: Inject deployment object with env-like keys (`password`, `token`, `secret`, `private`, `env`); assert `sanitizeFullProjection` masks them as `***`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wait-mode polling against slow real build (e.g. first deploy of nixpacks app) | APP-06 / STATE.md pending todo | Requires live Coolify 4.1.x instance + real slow build exceeding 60s | Point MCP client at staging Coolify, trigger deploy with `wait: true` on a fresh nixpacks app, confirm poll loop exits on `finished` within 300s default; if build exceeds 300s, confirm timeout return shape + re-call hint |
| MCP stdio E2E handshake over `application`/`deployment` tools via `createAndConnectServer` | APP-03–09 / DEP-01–03 | vitest cannot reliably exercise stdio child-process handshake; P1 01-05 + P3 03-06 same pattern | Build `dist/index.js`, configure Cursor/Claude Desktop `mcp.json`, invoke `application({action:"deploy", uuid:"...", wait:true})` and `deployment({action:"cancel", deployment_uuid:"..."})`, assert `structuredContent` envelope per spec |
| `tags` field reliability across on-prem Coolify installs | DEP-02 / RESEARCH Open Question #1 | Requires multiple real Coolify instances with tag-configured apps | On staging + production Coolify, call `resource({action:"list"})`, confirm `tags` array present on application resources; if absent, confirm batch tag-resolution fallback path |

---

## Coverage Thresholds

Matches Phase 3 sign-off boundaries:

- **Type-checking:** `tsc --noEmit` — known pre-existing errors predating Phase 3 (per P3 STATE.md decision); `npm run build` (tsup) is the green sign-off gate
- **Build:** `npm run build` succeeds
- **Test execution:** `npx vitest run` all green (286 tests)
- **Coverage:** `@vitest/coverage-v8` — 83.97% lines / 77.23% branches / 86.71% functions (≥ P3 baseline 78.76% / 72.48% / 84.95%); `deployment.ts` 97.81% lines (≥ 90%)

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 40s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter
- [x] Full suite green: `npx vitest run`
- [x] Integration sign-off: `npx vitest run tests/integration/deploy-flow.test.ts`

**Approval:** approved by executor
