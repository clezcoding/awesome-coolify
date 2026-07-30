---
phase: 28-instance-intelligence
verified: 2026-07-30T02:14:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 28: Instance Intelligence Verification Report

**Phase Goal:** Agent can assess instance health, map resource dependencies, and identify safe cleanup candidates
**Verified:** 2026-07-30T02:14:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Agent fetches per-instance health scorecard with factor breakdown (deployments, backups, exited resources, diagnose.scan summary) and severity-tagged findings with recovery hints | ✓ VERIFIED | `handleIntelligenceScorecard` collects four factors via `collectDeploymentsFactor`, `collectBackupsFactor`, `collectExitedResourcesFactor`, `collectDiagnoseScanFactor`; returns `severity`, `score`, `score_breakdown`, `factors`, `findings[]` with `FollowUpHint`-shaped hints. Tests: `scorecard (INTEL-01)`, `findings (INTEL-02)`, `partial (D-17)` — all pass. |
| 2 | Agent builds live dependency graph from resources showing application ↔ database ↔ service links | ✓ VERIFIED | `resource-graph.ts`: `edgesFromFlatResources` (database_uuid, application_uuid), `enrichServiceEdges` (service_child), `buildGraph`. `handleIntelligenceGraph` fetches live `/resources` + per-service enrichment. Tests: `graph (GRAPH-01)` describe (3 tests) — pass. |
| 3 | Agent queries impact analysis before delete or restart ("what breaks if resource X goes down") | ✓ VERIFIED | `handleIntelligenceImpact` returns `direct_dependents`, `transitive_dependents`, `depth_cap`, `advisory: true`, `intent` delete/restart; restart adds `impact_level` degraded/outage. No delete/restart mutation. Test: `impact (GRAPH-02)` — pass. |
| 4 | Agent lists orphaned, stopped, or long-exited resources with safe cleanup suggestions | ✓ VERIFIED | `findJanitorCandidates` unions stopped, long_exited (default 7d), orphan via UUID graph; each candidate has `suggestion` (delete_preview), `preview_only: true`, `safe_to_delete`. `handleIntelligenceJanitor` read-only. Test: `janitor (JANI-01)` — pass. |
| 5 | Janitor destructive cleanup mutations blocked without explicit confirm gate per SAF pattern | ✓ VERIFIED | `handleIntelligenceCleanup` calls `validateConfirmGate` before mutations; `confirm: false` → `COOLIFY_CONFIRM_REQUIRED`; reuses domain handlers with `delete_volumes`/`delete_configurations` default false. Test: `cleanup (JANI-02)` confirm gate + SAF-02 — pass. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/mcp/tools/intelligence.ts` | Five-action intelligence tool (scorecard/graph/impact/janitor/cleanup) | ✓ VERIFIED | 968 lines; all five handlers implemented and wired in `handleIntelligenceAction` switch |
| `src/utils/resource-graph.ts` | UUID-only graph helpers | ✓ VERIFIED | 570 lines; edges, nodes, dependents, orphans, janitor candidates |
| `src/mcp/server.ts` | `intelligence` tool registration | ✓ VERIFIED | `registerTool('intelligence', ...)` with catalog + safety footer |
| `src/mcp/capabilities.ts` | Five `intelligence_*` capability keys | ✓ VERIFIED | scorecard, graph, impact, janitor, cleanup — all `supported: true`, `coolify_min_version: 4.1.2` |
| `src/mcp/tools/intelligence.test.ts` | Behavioral tests for all actions | ✓ VERIFIED | 11 tests across 5 describes — all pass |
| `src/utils/resource-graph.test.ts` | Graph helper unit tests | ✓ VERIFIED | Passes in suite |
| `README.md` / `README.de.md` | Instance intelligence shipped note | ✓ VERIFIED | Row at line 732 listing all five actions |
| `docs/coverage-map.yaml` | intelligence.* action rows | ✓ VERIFIED | Five rows: scorecard, graph, impact, janitor, cleanup |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `server.ts` registerTool | `intelligence.ts` | `handleIntelligenceAction` import + async handler | ✓ WIRED | Lines 331–344 |
| `intelligence.scorecard` | `classifyIssues` / `generateHints` | direct import from `issue-classifier` / `diagnose-hints` | ✓ WIRED | No `handleDiagnoseAction` coupling (prohibition satisfied) |
| `intelligence.graph/impact/janitor` | `resource-graph.ts` | `buildGraph`, `findDependents`, `findJanitorCandidates` | ✓ WIRED | `loadResourceGraph` shared loader |
| `intelligence.cleanup` | domain delete handlers | `handleApplicationAction` / `handleServiceAction` / `handleDatabaseAction` | ✓ WIRED | No raw `deleteApplication`/`deleteService`/`deleteDatabase` HTTP calls |
| `system.version` | `capabilities.ts` | `COOLIFY_412_CAPABILITIES` | ✓ WIRED | Eleven keys including five `intelligence_*` — `system.test.ts` passes |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `handleIntelligenceScorecard` | `factors`, `findings` | `fetchServers`, `fetchResources`, `fetchAppDeployments`, `fetchDatabaseBackups` | Yes — live API reads with soft partial on factor failure | ✓ FLOWING |
| `handleIntelligenceGraph` | `nodes`, `edges` | `fetchResources` + `fetchService` enrichment | Yes — UUID fields from live resources | ✓ FLOWING |
| `handleIntelligenceImpact` | `direct_dependents`, `transitive_dependents` | Graph built from live resources | Yes — reverse BFS on live edges | ✓ FLOWING |
| `handleIntelligenceJanitor` | `candidates` | Live resources + graph orphans/stopped | Yes — status + `updated_at` threshold | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| All intelligence + graph + system tests | `npx vitest run src/mcp/tools/intelligence.test.ts src/utils/resource-graph.test.ts src/mcp/tools/system.test.ts` | 3 files, 24 tests passed | ✓ PASS |
| Confirm gate blocks cleanup | Test: `without confirm true → COOLIFY_CONFIRM_REQUIRED` | Error code matches; delete clients not called | ✓ PASS |
| SAF-02 defaults on confirmed cleanup | Test: `delete handlers receive both flags false` | `delete_volumes: false`, `delete_configurations: false` | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probes; migration/tooling probe phase not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| INTEL-01 | 28-02 | Per-instance health scorecard with factor breakdown | ✓ SATISFIED | Four factors in scorecard response + tests |
| INTEL-02 | 28-02 | Severity-tagged findings with structured recovery hints | ✓ SATISFIED | `ScorecardFinding` type + findings test |
| GRAPH-01 | 28-01 | Live dependency graph (app ↔ db ↔ service) | ✓ SATISFIED | `resource-graph.ts` + graph tests |
| GRAPH-02 | 28-03 | Impact analysis before delete/restart | ✓ SATISFIED | `handleIntelligenceImpact` + test |
| JANI-01 | 28-03 | Orphan/stopped/long-exited with cleanup suggestions | ✓ SATISFIED | `findJanitorCandidates` + janitor test |
| JANI-02 | 28-04 | Cleanup requires confirm gate | ✓ SATISFIED | `validateConfirmGate` + cleanup test |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None | — | No TBD/FIXME/XXX/TODO stubs in `intelligence.ts` or `resource-graph.ts` |

### Prohibitions Verified

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No fuzzy/env-var primary graph edges (D-08) | ✓ VERIFIED | `rg` on intelligence.ts + resource-graph.ts — no fuzzy/env_var/nameEquals |
| No raw delete HTTP in intelligence.ts (D-14) | ✓ VERIFIED | Cleanup delegates to domain action handlers only |
| No ML/anomaly scoring (D-06) | ✓ VERIFIED | Rule-based `computeScoreBreakdown` only |
| No auto-execute cleanup from reads (D-15) | ✓ VERIFIED | janitor/scorecard/graph/impact are read-only; only `cleanup` mutates |

### Human Verification Required

None — all five roadmap success criteria have automated behavioral test coverage.

### Gaps Summary

No gaps. Phase 28 goal achieved: composite `intelligence` MCP tool delivers scorecard, live dependency graph, advisory impact analysis, read-only janitor, and confirm-gated cleanup with capability/docs parity.

---

_Verified: 2026-07-30T02:14:00Z_
_Verifier: Claude (gsd-verifier)_
