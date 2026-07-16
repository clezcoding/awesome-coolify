---
phase: 5
slug: logs-service-db-ops
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run build` |
| **Integration command** | `npx vitest run tests/integration/logs-service-db-flow.test.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green (tsup build green; suite green; baseline ≥ 289 + P5 additions — 378 tests)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 01 | 1 | APP-10, APP-11 | T-05-01 | sharedLogParamsSchema (D-07 amended — include_hidden + type) + log-helpers (sliceLogBlob/capLogOutput/parseBuildLogEntries with defensive fallback) + fetchApplicationLogs + COOLIFY_403_SENSITIVE_REQUIRED error code + RED scaffold; log lines never logged to stderr (unit spy assertion covers T-05-01) | unit | `npx vitest run src/utils/log-helpers.test.ts src/utils/errors.test.ts src/api/client.test.ts src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 05-01-T2 | 01 | 1 | APP-10, APP-11 | T-05-01, T-05-02 | application.logs action + handleApplicationLogs runtime/build dispatcher + `.strict()` rejects `follow` with `unrecognized_keys` (D-05) + superRefine neither/both uuid+deployment_uuid → COOLIFY_422 + COOLIFY_403_SENSITIVE_REQUIRED on absent `logs` field (D-09 amended) + JSON-array parse+filter+flatten (D-08/D-10/D-11 amended) + filter metadata entries_total/entries_hidden/entries_shown + max_chars cap + stderr/console spy asserting log blob content not leaked | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ✅ green |
| 05-02-T1 | 02 | 2 | SVC-03, SVC-05 | — | triggerServiceStart/Stop/Restart client helpers (restart with `latest` query param) + RED service.test.ts scaffold | unit | `npx vitest run src/api/client.test.ts src/mcp/tools/service.test.ts` | ✅ | ✅ green |
| 05-02-T2 | 02 | 2 | SVC-03, SVC-05 | — | service start/stop/restart/deploy + resolveServiceMutationUuid (strict uuid\|name, COOLIFY_AMBIGUOUS_MATCH with project+env context) + service.deploy maps to POST /services/{uuid}/restart?latest=pull_latest (RESEARCH §3) + server.ts drops readOnlyHint (D-14) | unit | `npx vitest run src/mcp/tools/service.test.ts` | ✅ | ✅ green |
| 05-03-T1 | 03 | 2 | SVC-03 | — | triggerDatabaseStart/Stop/Restart client helpers + RED database.test.ts scaffold | unit | `npx vitest run src/api/client.test.ts src/mcp/tools/database.test.ts` | ✅ | ✅ green |
| 05-03-T2 | 03 | 2 | SVC-03 | — | database start/stop/restart + resolveDatabaseMutationUuid + NO deploy action (D-18) + restart rejects pull_latest (D-16) + server.ts drops readOnlyHint (D-14) | unit | `npx vitest run src/mcp/tools/database.test.ts` | ✅ | ✅ green |
| 05-04-T1 | 04 | 3 | SVC-04 (deferred) | — | DOC-ONLY: ROADMAP Phase 5 SC4 marked DEFERRED to v1.1 with rationale (no endpoint v4.1.2; PR #6293 v1.1 re-addition). No code, no tests, no COOLIFY_501. service.logs/database.logs actions OMITTED from v1 per D-04 amended / RESEARCH §2. | doc | `grep -n "DEFERRED to v1.1" .planning/ROADMAP.md` | ✅ | ✅ green |
| 05-05-T1 | 05 | 4 | APP-10, APP-11, SVC-03, SVC-05 | — | Integration: handler-level dispatchers across application/service/database with mocked HTTP — verifies end-to-end handler composition (application.logs runtime + build JSON-array + token gate + filter metadata + defensive fallback; service+database lifecycle + multi-match; service.deploy pull_latest mapping) without live Coolify. NO service.logs/database.logs cases (D-04 amended). Mirrors P4 04-05 deploy-flow pattern. | integration | `npx vitest run tests/integration/logs-service-db-flow.test.ts` | ✅ | ✅ green |
| 05-05-T2 | 05 | 4 | APP-10, APP-11, SVC-03, SVC-05 | — | Build gate + VALIDATION sign-off: `npm run build` (tsup) green; full suite baseline ≥ 289 + P5 additions (378 tests); 05-VALIDATION.md Per-Task Verification Map restructured to exactly 9 rows with correct Plan/Wave/Requirement columns (SVC-04 dropped from 05-05 rows); Manual-Only table populated (MCP stdio E2E + live UAT with api.sensitive token for APP-11 + service.deploy pull_latest image-pull verification; NO service/DB logs UAT rows) | build + sign-off | `npx vitest run && npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/application.test.ts` — extend with `logs` action coverage (runtime path: `{ logs: string }` envelope; build path: `logs` inline string with `api.sensitive` gate; `max_chars` cap; `offset`+`lines` slicing; filter metadata; defensive fallback; superRefine; `.strict()` follow-reject; stderr spy)
- [x] `src/mcp/tools/service.test.ts` — extend with `start`/`stop`/`restart`/`deploy` coverage (POST `{ message }` envelope; `service.deploy` maps to `restart?latest=true`; NO logs tests per D-04 amended)
- [x] `src/mcp/tools/database.test.ts` — extend with `start`/`stop`/`restart` coverage (POST `{ message }` envelope; NO logs tests; NO deploy per D-18)
- [x] `src/utils/log-helpers.test.ts` — slice/cap/parseBuildLogEntries with defensive fallback
- [x] `tests/integration/logs-service-db-flow.test.ts` — handler-level integration suite (NO service/DB logs cases per D-04 amended)
- [x] Inline test mocks pattern (per P3 03-02 decision: inline mocks avoid tsc rootDir fixture import — tests/fixtures outside src/ triggers TS6059)

*Existing infrastructure (vitest + tsup + npm scripts) covers framework requirements; no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real MCP stdio E2E handshake with `application.logs` / `service.start\|stop\|restart\|deploy` / `database.start\|stop\|restart` | APP-10, APP-11, SVC-03–05 | Per P1 01-05 + P3 03-06 + P4 04-05 pattern: real MCP stdio E2E is MANUAL-ONLY — in-process SDK validation strips unknown keys without failing (03-07 finding). No `service.logs` / `database.logs` invocations — those actions do not exist in v1. | 1. `npm run build` 2. Configure Cursor/Claude Desktop against a real Coolify 4.1.x instance 3. Invoke each P5 action via MCP client 4. Verify structured response + formatted text |
| Live UAT against real Coolify 4.1.x (e.g. https://puzzlesstool.online) | APP-10, APP-11, SVC-03–05 | Endpoints require real Coolify instance + valid API token with `api.sensitive` ability for build-logs path (D-09 amended / RESEARCH §4) | 1. Set `COOLIFY_URL` + `COOLIFY_TOKEN` (token MUST have `api.sensitive` for APP-11) 2. Run `application.logs uuid=<app-uuid> lines=100` (runtime logs) 3. Run `application.logs deployment_uuid=<dep-uuid>` (build logs — verify api.sensitive gate by also testing with a token lacking api.sensitive to confirm COOLIFY_403_SENSITIVE_REQUIRED) 4. Run `service.start\|stop\|restart\|deploy` 5. Run `database.start\|stop\|restart` 6. Confirm `service.deploy` with `pull_latest: true` triggers image pull on the instance |
| `service.deploy` `pull_latest: true` actually pulls new images | SVC-05 | Requires a service with outdated image + registry access on the live instance | 1. Deploy a service with a pinned outdated image tag 2. `service.deploy { name, pull_latest: true }` 3. Verify via Coolify UI / `docker images` on server that the latest tag was pulled 4. Verify response `{ status: 'requested', pull_latest: true }` |

---

## Coverage Thresholds

Matches Phase 4 sign-off boundaries:

| File | Lines | Branches | Functions |
|------|-------|----------|-----------|
| `service.ts` | 99.73% | 86.36% | 100% |
| `database.ts` | 97.83% | 83.33% | 100% |
| Overall `src/mcp/tools` | 97.03% | 83.92% | 98.55% |

Full suite: 378 tests (P4 baseline 289 + P5 additions 89). Coverage run exit 0.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by executor
