---
phase: 25-application-log-follow
verified: 2026-07-28T00:40:00Z
status: passed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
re_verification:
  previous_status: passed
  previous_score: 10/10
  gaps_closed:
    - "Idle stop when every poll returns empty snapshots (WR-01 / gap #1)"
    - "One-bound interval ordering with resolved defaults 3s/30s (WR-03 / gap #2)"
  gaps_remaining: []
  regressions: []
---

# Phase 25: Application Log Follow Verification Report

**Phase Goal:** Agent can follow application runtime logs with bounded polling (watch-style) while existing `application.logs` paths stay unchanged
**Verified:** 2026-07-28T00:40:00Z
**Status:** passed
**Re-verification:** Yes — independent gsd-verifier pass after 25-04 gap closure (WR-01/WR-03)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent follows application logs with bounded polling until timeout or terminal condition (OBS-02, roadmap SC1) | ✓ VERIFIED | `handleApplicationLogsFollow` → `followApplicationLogs` with `fetchApplicationLogs` snapshots; `log-follow-poll.test.ts` 5/5 pass (dedup, idle, timeout, 429 backoff) |
| 2 | Idle stop when no new lines for idle window (D-05, D-11) | ✓ VERIFIED | `log-follow-poll.ts:76-89` — `pollCount === 1 && !hadNewLines` starts idle clock; unit test `stops idle when snapshots stay empty`; handler test `returns stopped_reason idle on quiet app with perpetually empty runtime logs (WR-01)` |
| 3 | Existing `application.logs` runtime path unchanged (OBS-03, roadmap SC2) | ✓ VERIFIED | `handleApplicationLogs` one-shot when `follow !== true` (`application.ts:1565-1625`); golden test `runtime logs follow false uses identical fetchApplicationLogs args` passes |
| 4 | Existing `application.logs` build path unchanged (OBS-03, roadmap SC3) | ✓ VERIFIED | Build branch uses `fetchDeployment` + `processDeploymentBuildLogs`; no follow branch; test `build logs path calls fetchDeployment not fetchApplicationLogs` passes |
| 5 | `follow:true` + `deployment_uuid` rejected COOLIFY_422 (D-02) | ✓ VERIFIED | `applicationLogsSchema` + `applicationActionSchema` superRefine at `application.ts:240-246`; tests `rejects follow true with deployment_uuid` pass |
| 6 | Deduped aggregate across polls; shared backoff with deploy-watch (D-09, D-15) | ✓ VERIFIED | `appendDedupedLines` suffix overlap; imports `nextDelayMs`/`sleep` from `deploy-watch-poll.ts`; unit tests pass |
| 7 | Follow timeout dual-signal: COOLIFY_LOG_FOLLOW_TIMEOUT + partial `logs_lines` (D-10) | ✓ VERIFIED | `handleApplicationLogsFollow` throws at `application.ts:1706-1722`; test `returns dual-signal timeout with COOLIFY_LOG_FOLLOW_TIMEOUT and partial logs_lines` passes |
| 8 | Coolify API errors during follow hard-stop with partial aggregate (D-07) | ✓ VERIFIED | `log-follow-poll.ts:116-124` rethrows `CoolifyApiError` with `logs_lines`; handler test `returns partial logs_lines on non-429 API error during follow` passes |
| 9 | `system.version` includes `application_logs_follow` supported true, min 4.1.2 (D-17, D-18) | ✓ VERIFIED | `capabilities.ts:22-26`; `system.test.ts` five-key capabilities test passes |
| 10 | Soft capability guidance — no Zod hard-block on follow (D-19) | ✓ VERIFIED | No `safeParse`/`refine` gate on `application_logs_follow` in handler; capability referenced in tool description only |

**Score:** 10/10 truths verified (0 present, behavior-unverified: 0)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/log-follow-poll.ts` | Follow poll loop + dedup | ✓ VERIFIED | 150 lines; exports `followApplicationLogs`, `appendDedupedLines` |
| `src/mcp/tools/application.ts` | Follow branch + schema | ✓ VERIFIED | `handleApplicationLogsFollow`; follow params on flat + nested schema |
| `src/utils/errors.ts` | COOLIFY_LOG_FOLLOW_TIMEOUT | ✓ VERIFIED | Code + `RECOVERY_HINTS` reference `application.logs` |
| `src/mcp/capabilities.ts` | Fifth capability key | ✓ VERIFIED | `application_logs_follow` entry |
| `docs/coverage-map.yaml` | OBS-02 follow note | ✓ VERIFIED | Comment on `application.logs` row |
| `README.md` / `README.de.md` | Follow callout | ✓ VERIFIED | Line ~732 documents `follow: true` + capability check |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `handleApplicationLogsFollow` | `followApplicationLogs` | `fetchSnapshot` → `fetchApplicationLogs` | ✓ WIRED | `application.ts:1655-1681` |
| `followApplicationLogs` | `deploy-watch-poll` | `nextDelayMs`, `sleep` | ✓ WIRED | `log-follow-poll.ts:1,103-111,138-147` |
| Idle outcome | Response envelope | `buildReadResponse` + `stopped_reason: idle` | ✓ WIRED | `application.ts:1725-1737` |
| `COOLIFY_412_CAPABILITIES` | `system.version` | capabilities passthrough | ✓ WIRED | Phase 24 pattern; five keys in test |
| `applicationActionSchema` logs | `handleApplicationLogs` | action dispatch | ✓ WIRED | `follow === true` branches at line 1565 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleApplicationLogsFollow` | `outcome.aggregate` | `fetchApplicationLogs` per poll | Yes — Coolify API `logs` string split | ✓ FLOWING |
| One-shot runtime | `logs_lines` | `fetchApplicationLogs` + `sliceLogBlob` | Yes — unchanged path | ✓ FLOWING |
| Build logs | `logPayload` | `fetchDeployment` + `processDeploymentBuildLogs` | Yes — unchanged path | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Follow poll loop (dedup, idle, timeout, 429) | `npx vitest run src/utils/log-follow-poll.test.ts` | 5 passed | ✓ PASS |
| Follow handler + OBS-03 golden + WR-01/WR-03 | `npx vitest run src/mcp/tools/application.test.ts -t "follow\|runtime logs\|build logs\|WR-01\|WR-03\|applicationLogsSchema"` | 30 passed | ✓ PASS |
| Five capability keys | `npx vitest run src/mcp/tools/system.test.ts -t capabilities` | 3 passed | ✓ PASS |
| Integration follow schema + one-shot | `npx vitest run tests/integration/logs-service-db-flow.test.ts -t "follow\|runtime one-shot"` | 2 passed | ✓ PASS |
| COOLIFY_LOG_FOLLOW_TIMEOUT hints | `npx vitest run src/utils/errors.test.ts -t COOLIFY_LOG_FOLLOW_TIMEOUT` | 1 passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared `scripts/*/tests/probe-*.sh` for Phase 25.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| OBS-02 | 25-00..25-04 | Bounded watch-style app log follow until timeout/terminal | ✓ SATISFIED | Core follow shipped; WR-01 empty-snapshot idle + WR-03 interval guards locked in regression tests |
| OBS-03 | 25-00, 25-02, 25-03, 25-04 | Runtime/build one-shot paths unchanged | ✓ SATISFIED | Golden + integration regression tests green |

No orphaned requirement IDs — both OBS-02 and OBS-03 appear in all plan frontmatter (25-00 through 25-04).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in phase implementation files | — | — |

### Prohibitions (judgment-tier)

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No `pollDeploymentWithBackoff` in follow loop | ✓ verified | `rg pollDeploymentWithBackoff src/utils/log-follow-poll.ts` → 0 |
| Incident MCP prompt untouched (D-21) | ✓ verified | No follow-related edits in `src/mcp/prompts.ts` |
| No pattern/until/regex stop (D-08) | ✓ verified | No until/regex stop in follow implementation |
| No Zod hard-block on `application_logs_follow` (D-19) | ✓ verified | No capability gate in handler |

### Human Verification Required

None — all behavior-dependent truths exercised by targeted regression tests.

### Gaps Summary

All prior verification gaps closed in 25-04. Independent re-verification confirms:

1. **WR-01 (gap #1) — VERIFIED:** Empty snapshots idle-stop via `pollCount === 1 && !hadNewLines` idle clock. Unit + handler tests pass.
2. **WR-03 (gap #2) — VERIFIED:** One-bound interval ordering uses resolved defaults (`min_interval ?? 3` vs `max_interval ?? 30`) in both schemas. Flat + nested schema tests pass.

**Informational only (non-blocking):** Flat `applicationActionSchema.timeout` `.min(10)` vs nested `.min(1)` on follow budgets (WR-02). `timeout` on one-shot logs accepted but ignored (IN-01).

---

_Verified: 2026-07-28T00:40:00Z_
_Verifier: Claude (gsd-verifier)_
