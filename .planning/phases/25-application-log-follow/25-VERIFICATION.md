---
phase: 25-application-log-follow
verified: 2026-07-28T00:12:00Z
status: gaps_found
score: 8/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Idle stop fires when polls return no new log lines (including never-empty snapshots)"
    status: failed
    reason: "lastNewLineTime stays null until deduped lines appear; empty snapshots never satisfy idle branch — follow runs full budget and returns COOLIFY_LOG_FOLLOW_TIMEOUT instead of stopped_reason idle success (D-05, D-11; REVIEW WR-01)"
    artifacts:
      - path: src/utils/log-follow-poll.ts
        issue: "Idle branch requires lastNewLineTime !== null; never set when every snapshot is empty"
    missing:
      - "Start idle clock after first poll when no new lines (e.g. pollCount === 1 && !hadNewLines)"
      - "Unit test: fetchSnapshot always [] → stoppedReason idle after idleTimeoutMs"
  - truth: "Resolved min_interval/max_interval bounds reject invalid combinations when only one bound is provided"
    status: partial
    reason: "Schema refine compares min_interval and max_interval only when both are set; handler defaults missing bound to 3s/30s — follow:true,max_interval:2 yields minIntervalMs=3000,maxIntervalMs=2000 (REVIEW WR-03)"
    artifacts:
      - path: src/mcp/tools/application.ts
        issue: "applicationLogsSchema and applicationActionSchema extraRefine skip default-resolved ordering check"
    missing:
      - "Compare (min_interval ?? 3) vs (max_interval ?? 30) when follow:true in both refines"
---

# Phase 25: Application Log Follow Verification Report

**Phase Goal:** Agent can follow application runtime logs with bounded polling (watch-style) while existing `application.logs` paths stay unchanged
**Verified:** 2026-07-28T00:12:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent follows application logs with bounded polling until timeout or terminal condition (OBS-02, roadmap SC1) | ✓ VERIFIED | `handleApplicationLogsFollow` + `followApplicationLogs`; tests for dedup, idle (with lines), timeout dual-signal, 429 backoff pass |
| 2 | Idle stop when no new lines for idle window (D-05, D-11) | ✗ FAILED | `log-follow-poll.ts:76-87` — `lastNewLineTime` only set when `hadNewLines`; perpetual empty snapshots never idle-stop |
| 3 | Existing `application.logs` runtime path unchanged (OBS-03, roadmap SC2) | ✓ VERIFIED | `handleApplicationLogs` one-shot branch when `follow !== true`; golden tests `runtime logs follow false uses identical fetchApplicationLogs args` pass |
| 4 | Existing `application.logs` build path unchanged (OBS-03, roadmap SC3) | ✓ VERIFIED | Build path uses `fetchDeployment` / `processDeploymentBuildLogs`; no follow branch; `build logs path calls fetchDeployment not fetchApplicationLogs` passes |
| 5 | `follow:true` + `deployment_uuid` rejected COOLIFY_422 (D-02) | ✓ VERIFIED | `applicationLogsSchema` + `applicationActionSchema` refines; tests pass |
| 6 | Deduped aggregate across polls; shared backoff with deploy-watch (D-09, D-15) | ✓ VERIFIED | `appendDedupedLines` suffix overlap; imports `nextDelayMs`/`sleep` from `deploy-watch-poll.ts`; unit tests pass |
| 7 | Follow timeout dual-signal: COOLIFY_LOG_FOLLOW_TIMEOUT + partial `logs_lines` (D-10) | ✓ VERIFIED | `handleApplicationLogsFollow` throws with recovery hints; application.test.ts dual-signal test passes |
| 8 | Coolify API errors during follow hard-stop with partial aggregate (D-07) | ✓ VERIFIED | `log-follow-poll.ts:114-122` rethrows with `logs_lines`; handler test `returns partial logs_lines on non-429 API error during follow` |
| 9 | `system.version` includes `application_logs_follow` supported true, min 4.1.2 (D-17, D-18) | ✓ VERIFIED | `capabilities.ts:22-26`; `system.test.ts` five-key test passes |
| 10 | Soft capability guidance — no Zod hard-block on follow (D-19) | ✓ VERIFIED | No `safeParse`/`refine` gate on `application_logs_follow` in `application.ts` |

**Score:** 8/10 truths verified (2 present, behavior-unverified: 0)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/log-follow-poll.ts` | Follow poll loop + dedup | ✓ VERIFIED | 149 lines; exports `followApplicationLogs`, `appendDedupedLines` |
| `src/mcp/tools/application.ts` | Follow branch + schema | ✓ VERIFIED | `handleApplicationLogsFollow`; follow params on flat + nested schema |
| `src/utils/errors.ts` | COOLIFY_LOG_FOLLOW_TIMEOUT | ✓ VERIFIED | Code + `RECOVERY_HINTS` reference `application.logs` |
| `src/mcp/capabilities.ts` | Fifth capability key | ✓ VERIFIED | `application_logs_follow` entry |
| `docs/coverage-map.yaml` | OBS-02 follow note | ✓ VERIFIED | Comment on `application.logs` row |
| `README.md` / `README.de.md` | Follow callout | ✓ VERIFIED | Line ~732 documents `follow: true` + capability check |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `handleApplicationLogsFollow` | `followApplicationLogs` | `fetchSnapshot` → `fetchApplicationLogs` | ✓ WIRED | `application.ts:1651-1677` |
| `followApplicationLogs` | `deploy-watch-poll` | `nextDelayMs`, `sleep` | ✓ WIRED | `log-follow-poll.ts:1,101-109,136-144` |
| Idle outcome | Response envelope | `buildReadResponse` + `stopped_reason: idle` | ✓ WIRED | `application.ts:1721-1733` |
| `COOLIFY_412_CAPABILITIES` | `system.version` | capabilities passthrough | ✓ WIRED | Existing Phase 24 pattern; five keys in test |
| `applicationActionSchema` logs | `handleApplicationLogs` | action dispatch | ✓ WIRED | `follow === true` branches at line 1561 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleApplicationLogsFollow` | `outcome.aggregate` | `fetchApplicationLogs` per poll | Yes — Coolify API `logs` string split | ✓ FLOWING |
| One-shot runtime | `logs_lines` | `fetchApplicationLogs` + `sliceLogBlob` | Yes — unchanged path | ✓ FLOWING |
| Build logs | `logPayload` | `fetchDeployment` + `processDeploymentBuildLogs` | Yes — unchanged path | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Follow idle + timeout + dedup + 429 tests | `npx vitest run src/utils/log-follow-poll.test.ts` | 4 passed | ✓ PASS |
| Follow handler + OBS-03 golden | `npx vitest run src/mcp/tools/application.test.ts -t "follow\|runtime logs\|build logs"` | 32 passed | ✓ PASS |
| Five capability keys | `npx vitest run src/mcp/tools/system.test.ts -t capabilities` | passed | ✓ PASS |
| Integration follow schema + one-shot | `npx vitest run tests/integration/logs-service-db-flow.test.ts -t "follow\|runtime one-shot"` | 2 passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared `scripts/*/tests/probe-*.sh` for Phase 25.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| OBS-02 | 25-00..25-03 | Bounded watch-style app log follow until timeout/terminal | ⚠️ PARTIAL | Core follow shipped; idle-on-empty-snapshot gap (gap #1) |
| OBS-03 | 25-00, 25-02, 25-03 | Runtime/build one-shot paths unchanged | ✓ SATISFIED | Golden + integration regression tests green |

No orphaned requirement IDs — both OBS-02 and OBS-03 appear in plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in phase-modified implementation files | — | — |

### Prohibitions (judgment-tier)

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No `pollDeploymentWithBackoff` in follow loop | ✓ verified | `rg pollDeploymentWithBackoff src/utils/log-follow-poll.ts` → 0 |
| Incident MCP prompt untouched (D-21) | ✓ verified | No Phase 25 commits touch `src/mcp/prompts.ts` |
| No pattern/until/regex stop (D-08) | ✓ verified | No until/regex stop in follow implementation |
| No Zod hard-block on `application_logs_follow` (D-19) | ✓ verified | No capability gate in handler |

### Human Verification Required

None — idle-on-empty failure is deterministically observable from code and REVIEW WR-01; no runtime-only ambiguity.

### Gaps Summary

Phase 25 delivers the core OBS-02 vertical slice: `application.logs` + `follow:true`, dedup polling, timeout dual-signal, API partial aggregate, capability flag, docs, and OBS-03 regression locks all verified in code and tests.

**Blocking gap:** Quiet apps that never emit log lines do not idle-stop per D-05/D-11 — they exhaust the follow budget and surface `COOLIFY_LOG_FOLLOW_TIMEOUT` (error) instead of `stopped_reason: idle` (success). Code review WR-01; no unit test covers empty snapshots.

**Secondary gap:** Interval bound validation incomplete when only `min_interval` or `max_interval` is set (WR-03) — can silently violate user max bound.

**Info (non-blocking):** Flat `applicationActionSchema.timeout` `.min(10)` prevents sub-10s follow budgets via MCP entry path while nested schema allows `.min(1)` (WR-02). `timeout` on one-shot logs accepted but ignored (IN-01).

---

_Verified: 2026-07-28T00:12:00Z_
_Verifier: Claude (gsd-verifier)_
