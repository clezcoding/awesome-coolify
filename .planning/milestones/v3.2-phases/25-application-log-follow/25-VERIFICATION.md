---
phase: 25-application-log-follow
verified: 2026-07-28T01:17:11Z
status: passed
score: 12/13 must-haves verified
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 10/10
  gaps_closed:

    - "G-25-1 handler path: applicationActionMcpSchema boundary split so follow+deployment_uuid reaches throwValidationError → structuredContent.error.code COOLIFY_422"
  gaps_remaining: []
  regressions: []
behavior_unverified_items:

  - truth: "Live MCP call application.logs with follow:true + deployment_uuid returns structuredContent.error.code COOLIFY_422 (D-02 / G-25-1), not generic Input validation error"
    test: "Re-run UAT test 5 against live MCP stdio — application action logs with follow:true and deployment_uuid"
    expected: "Error envelope includes structuredContent.error.code COOLIFY_422 (and follow/deployment_uuid message); must NOT be only 'Input validation error: Invalid arguments for tool application'"
    why_human: "Unit/handler tests prove parseApplicationAction + throwValidationError; they do not exercise MCP SDK validateToolInput over stdio against a live server. UAT originally failed on that live envelope."
human_verification:

  - test: "Live MCP UAT test 5 — follow:true + deployment_uuid"
    expected: "structuredContent.error.code === COOLIFY_422 with follow/deployment_uuid message (not SDK generic Input validation error)"
    why_human: "G-25-1 root cause fixed in code (boundary vs handler schema split proven); live stdio envelope still needs human confirm per 25-05-SUMMARY D3 and 25-UAT gap G-25-1"
---

# Phase 25: Application Log Follow Verification Report

**Phase Goal:** Agent can follow application runtime logs with bounded polling (watch-style) while existing `application.logs` paths stay unchanged
**Verified:** 2026-07-28T01:17:11Z
**Status:** human_needed
**Re-verification:** Yes — after 25-05 gap closure (G-25-1 / `applicationActionMcpSchema` split)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent follows application logs with bounded polling until timeout or terminal condition (OBS-02, roadmap SC1) | ✓ VERIFIED | `handleApplicationLogsFollow` → `followApplicationLogs`; `log-follow-poll.test.ts` 5/5 pass |
| 2 | Idle stop when no new lines for idle window (D-05, D-11 / WR-01) | ✓ VERIFIED | Idle clock on empty snapshots; WR-01 handler + unit tests pass (regression) |
| 3 | Existing `application.logs` runtime path unchanged (OBS-03, roadmap SC2) | ✓ VERIFIED | One-shot when `follow !== true`; golden `runtime logs follow false` pass |
| 4 | Existing `application.logs` build path unchanged (OBS-03, roadmap SC3) | ✓ VERIFIED | Build branch via `fetchDeployment`; `build logs path` test pass |
| 5 | `follow:true` + `deployment_uuid` rejected COOLIFY_422 on handler schema (D-02) | ✓ VERIFIED | `applicationExtraRefine` + `applicationActionSchema`; schema + `handleApplicationAction` tests pass |
| 6 | Deduped aggregate across polls; shared backoff with deploy-watch (D-09, D-15) | ✓ VERIFIED | `appendDedupedLines` + `nextDelayMs`/`sleep` from deploy-watch; unit tests pass |
| 7 | Follow timeout dual-signal: COOLIFY_LOG_FOLLOW_TIMEOUT + partial `logs_lines` (D-10) | ✓ VERIFIED | Handler throw path + prior dual-signal test (unchanged by 25-05) |
| 8 | Coolify API errors during follow hard-stop with partial aggregate (D-07) | ✓ VERIFIED | `log-follow-poll.ts` rethrows `CoolifyApiError` with `logs_lines` |
| 9 | `system.version` includes `application_logs_follow` supported true, min 4.1.2 (D-17, D-18) | ✓ VERIFIED | `capabilities.ts`; system capabilities tests 3/3 pass |
| 10 | Soft capability guidance — no Zod hard-block on follow (D-19) | ✓ VERIFIED | No capability gate in handler; catalog text only |
| 11 | Live MCP follow+deployment_uuid returns structured COOLIFY_422 not SDK generic error (G-25-1) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code path closed: `applicationActionMcpSchema` accepts combo (`mcp_success:true`); `applicationActionSchema` fails `COOLIFY_422`; server registers McpSchema; handler test returns `structuredContent.error.code === COOLIFY_422`. Live stdio UAT test 5 not re-run. |
| 12 | Handler `throwValidationError` maps Zod `params.code` COOLIFY_422 for applicationActionSchema superRefine guards | ✓ VERIFIED | `parseApplicationAction` → `applicationActionSchema` → `throwValidationError`; handler test asserts code |
| 13 | Existing follow/one-shot live behavior unchanged by schema split (OBS-03) | ✓ VERIFIED | 25-05 only split registration schema; poll loop untouched; WR-01/WR-03 + one-shot golden regressions green |

**Score:** 12/13 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/log-follow-poll.ts` | Follow poll loop + dedup | ✓ VERIFIED | Exports `followApplicationLogs`, `appendDedupedLines`; no TBD/FIXME |
| `src/mcp/tools/application.ts` | Boundary + handler schemas + follow branch | ✓ VERIFIED | `applicationExtraRefine`, `buildApplicationActionSchema`, `applicationActionMcpSchema` (no refine), `applicationActionSchema` (full refine), `handleApplicationLogsFollow` |
| `src/mcp/server.ts` | registerTool uses boundary schema | ✓ VERIFIED | `inputSchema: withInstanceRoutingSchema(applicationActionMcpSchema)` at L330; import L32 |
| `src/mcp/tools/application.test.ts` | Handler COOLIFY_422 regression | ✓ VERIFIED | `handleApplicationAction follow true with deployment_uuid returns COOLIFY_422` pass |
| `src/utils/errors.ts` | COOLIFY_LOG_FOLLOW_TIMEOUT | ✓ VERIFIED | Prior phase; unchanged |
| `src/mcp/capabilities.ts` | Fifth capability key | ✓ VERIFIED | `application_logs_follow` present |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `server.registerTool('application')` | `applicationActionMcpSchema` | `withInstanceRoutingSchema` | ✓ WIRED | Structural only — `buildApplicationActionSchema()` with no `extraRefine` |
| MCP args after SDK validate | `parseApplicationAction` | `handleApplicationAction` | ✓ WIRED | Full `applicationActionSchema` + `throwValidationError` |
| `applicationExtraRefine` | follow+deployment_uuid | `params.code: COOLIFY_422` | ✓ WIRED | L438–444; D-02 guard retained |
| `handleApplicationLogsFollow` | `followApplicationLogs` | `fetchSnapshot` → `fetchApplicationLogs` | ✓ WIRED | Unchanged by 25-05 |
| `followApplicationLogs` | `deploy-watch-poll` | `nextDelayMs`, `sleep` | ✓ WIRED | Unchanged |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Follow handler | `outcome.aggregate` | Coolify `fetchApplicationLogs` per poll | Yes | ✓ FLOWING |
| G-25-1 error path | `structuredContent.error` | Zod refine → `throwValidationError` → `CoolifyApiError` | Yes — code from `params.code` | ✓ FLOWING |
| One-shot / build | `logs_lines` / build payload | Unchanged fetch paths | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------- |
| follow+deployment_uuid schema + handler | `npx vitest run src/mcp/tools/application.test.ts -t "follow.*deployment_uuid"` | 3 passed | ✓ PASS |
| Handler COOLIFY_422 envelope (G-25-1) | `… -t "handleApplicationAction follow true with deployment_uuid"` | pass | ✓ PASS |
| server registers McpSchema | `npx vitest run src/mcp/server.test.ts -t "withInstanceRoutingSchema"` | 1 passed | ✓ PASS |
| Boundary accepts / handler rejects | `npx tsx` safeParse combo | `mcp_success:true`, `handler_codes:["COOLIFY_422"]` | ✓ PASS |
| Follow poll loop | `npx vitest run src/utils/log-follow-poll.test.ts` | 5 passed | ✓ PASS |
| Capabilities | `npx vitest run src/mcp/tools/system.test.ts -t capabilities` | 3 passed | ✓ PASS |
| WR-01/WR-03 + one-shot golden | `… -t "WR-01\|WR-03\|runtime logs follow false\|build logs path"` | 6 passed | ✓ PASS |
| Live MCP UAT test 5 | stdio against live Coolify | not re-run this verify | ? SKIP → human |

### Probe Execution

Step 7c: SKIPPED — no phase-declared `scripts/*/tests/probe-*.sh` for Phase 25.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| OBS-02 | 25-00..25-05 | Bounded watch-style app log follow until timeout/terminal | ✓ SATISFIED (pending live G-25-1 confirm) | Follow shipped; G-25-1 code closed; live envelope human |
| OBS-03 | 25-00, 25-02..25-05 | Runtime/build one-shot paths unchanged | ✓ SATISFIED | Golden + regression tests green; schema split does not alter poll/one-shot |

No orphaned requirement IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in phase implementation files touched by 25-05 | — | — |

### Prohibitions

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| Do not remove follow+deployment_uuid guard (D-02) | ✓ verified | Guard in `applicationExtraRefine` L438–444; handler test asserts COOLIFY_422 |
| Do not change follow poll loop behavior | ✓ verified | 25-05 files: application.ts schemas + server.ts + tests only; `log-follow-poll` regressions green |
| No `pollDeploymentWithBackoff` in follow loop | ✓ verified | Absent from `log-follow-poll.ts` |
| No Zod hard-block on `application_logs_follow` (D-19) | ✓ verified | Soft capability only |

### Human Verification Required

### 1. Live MCP UAT test 5 (G-25-1)

**Test:** Call live MCP `application` tool with `action: logs`, `follow: true`, `deployment_uuid: <any>` (stdio / Cursor MCP).
**Expected:** Structured error with `code: COOLIFY_422` and follow/deployment_uuid message — **not** only `Input validation error: Invalid arguments for tool application`.
**Why human:** SDK `validateToolInput` path only observable via live MCP client; unit tests stop at `handleApplicationAction`.

### Gaps Summary

No code gaps remaining for Phase 25 goal.

**G-25-1 (code):** CLOSED — `applicationActionMcpSchema` (boundary, no `extraRefine`) registered on `server.ts`; `applicationActionSchema` (full `applicationExtraRefine`) used in `parseApplicationAction`. Proven: boundary accepts follow+deployment_uuid; handler returns `structuredContent.error.code === COOLIFY_422`.

**G-25-1 (live envelope):** PENDING human — re-run UAT test 5; until then overall status `human_needed` (not `gaps_found`).

Prior 25-04 closures (WR-01 idle-on-empty, WR-03 interval ordering) still hold under regression.

**Informational (non-blocking):** IN-01 timeout on one-shot accepted/ignored if still present; no new debt markers.

---

_Verified: 2026-07-28T01:17:11Z_
_Verifier: Claude (gsd-verifier)_
