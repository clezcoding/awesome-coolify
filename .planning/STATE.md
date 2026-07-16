---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 07
current_phase_name: distribution-docs
status: complete
stopped_at: Phase 07 UAT + verification passed
last_updated: "2026-07-16T20:32:00Z"
last_activity: 2026-07-16
last_activity_desc: Phase 07 verify-work complete — 32/32 UAT, verification passed
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 37
  completed_plans: 37
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-16)

**Core value:** AI agent manages multiple self-hosted Coolify instances — deploy, logs, diagnose — via one MCP server.
**Current focus:** Phase 07 — distribution-docs

## Current Position

Phase: 07 (distribution-docs) — COMPLETE
Plan: 7 of 7
Status: Verified — UAT 32/32, verification 27/27
Last activity: 2026-07-16 — Phase 07 verify-work complete

Progress: [██████████] 33/33 plans (100%)

## Performance Metrics

**Velocity:**

- Total plans completed: 58
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |
| 1 | 2 | - | - |
| Phase 02 P01 | 4min | 3 tasks | 6 files |
| Phase 02 P02 | 5min | 3 tasks | 8 files |
| Phase 02-discovery-read-projections P03 | 7min | 3 tasks | 10 files |
| Phase 02-discovery-read-projections P04 | 3min | 3 tasks | 6 files |
| Phase 02-discovery-read-projections P05 | 5 | 3 tasks | 5 files |
| 02 | 5 | - | - |
| Phase 03 P01 | 5min | 4 tasks | 13 files |
| Phase 03 P02 | 8 | 2 tasks | 4 files |
| Phase 03 P03 | 6 | 1 tasks | 2 files |
| Phase 03 P04 | 8min | 1 tasks | 2 files |
| Phase 03 P05 | 5min | 1 tasks | 6 files |
| Phase 03 P06 | 5min | 2 tasks | 5 files |
| Phase 03 P07 | 8min | 3 tasks | 5 files |
| 03 | 7 | - | - |
| Phase 05 P01 | 5 | 2 tasks | 10 files |
| Phase 05-logs-service-db-ops P02 | 4 | 2 tasks | 5 files |
| Phase 05-logs-service-db-ops P03 | 5 | 2 tasks | 6 files |
| Phase 05-logs-service-db-ops P04 | 1min | 1 tasks | 1 files |
| 05 | 5 | - | - |
| Phase 06-bulk-emergency-safety P01 | 4min | 2 tasks | 7 files |
| Phase 06-bulk-emergency-safety P03 | 8min | 2 tasks | 3 files |
| 06 | 3 | - | - |
| 07 | 3 | - | - |

## Accumulated Context

### Decisions

- v1 = Ops MVP only; Create/Delete deferred to v2 (PROJECT.md D-05)
- Action-based tool schema from Phase 1 — no 60+ granular tools (DX-01)
- Multi-instance via `~/.coolify-mcp/instances.json` (CTX-04, CTX-05)
- 7 vertical MVP phases; standard granularity; mvp mode per phase
- sanitizeFullProjection masks password/token/secret/private/env keys — OUT-02 reveal deferred to Phase 6 (02-01)
- truncateAndGuard hard-caps output when footer exceeds small max_chars (02-01)
- buildReadResponse exported as reusable helper for P2 read tool handlers (02-01)
- Handlers parse args through Zod schema at entry for read param defaults (02-02)
- infrastructure_overview on system tool per ecosystem spike D-04 (02-02)
- rejectTableFormatOnFullProjection returns COOLIFY_422 for table+full per D-11 (02-03)
- Domain tools get-only — list via resource tool per D-02 (02-03)
- [Phase 02-discovery-read-projections]: find caps at 10 ranked matches — no ambiguity error per D-19 — Agent picks UUID from ranked list instead of erroring on multiple matches
- [Phase 02-discovery-read-projections]: docs tool uses static DOCS_INDEX not live API fetch per D-03 — Curated troubleshooting catalog avoids external fetch attack surface
- [Phase 02-discovery-read-projections]: docs.search empty results preserve notice via buildReadResponse with data: [] — Uniform envelope without losing no-results UX from 02-04
- [Phase 02-discovery-read-projections]: system infrastructure_overview structuredContent splits data and _meta like domain tools — Consistent _meta exposure for agent truncation recovery per D-12 D-14
- [Phase 03-diagnose-issue-scan]: Diagnose projectors in projections.ts not separate file — CONTEXT.md wins over RESEARCH.md file placement
- [Phase 03-diagnose-issue-scan]: fetchServer base in 03-01 — 03-03 server handler does not add conditionally
- [Phase 03-diagnose-issue-scan]: 03-01 Wave 1 foundation only — handleDiagnoseAction not-implemented; first vertical slice in 03-02
- [Phase 03-diagnose-issue-scan]: Inline test mocks in diagnose.test.ts avoid tsc rootDir fixture import — tests/fixtures outside src/ triggers TS6059; inline mocks match application.test.ts pattern
- [Phase 03-diagnose-issue-scan]: First agent-callable diagnose vertical slice shipped in 03-02 (SYS-04 app only) — server/scan remain stubs until 03-03/03-04 per wave plan
- [Phase 03-diagnose-issue-scan]: Server diagnose shipped in 03-03 (SYS-05) — 4-way Promise.allSettled, trigger_validate default true, scan remains stub until 03-04
- [Phase 03-diagnose-issue-scan]: Reachable server hints[] empty — generateHints server branch only emits hints for unreachable status
- [Phase 03-diagnose-issue-scan]: Global issue scan shipped in 03-04 (SYS-03) — 2-call enumeration, all 3 diagnose branches complete — Promise.all fetchServers+fetchResources; classifyIssues severity buckets; scan was last stub
- [Phase 03-diagnose-issue-scan]: Scan pagination meta only — full severity buckets in data — paginateArray drives _meta page/per_page/total; bucket content not sliced per page
- [Phase 03-diagnose-issue-scan]: P2 get handlers attach hints at handler level after projection — projectors unchanged per D-16 additive retrofit; generateHints single source for get and diagnose
- [Phase 03-diagnose-issue-scan]: Handler-level integration only for diagnose-flow — real MCP stdio E2E MANUAL-ONLY per P1 01-05 pattern
- [Phase 03-diagnose-issue-scan]: tsc --noEmit has pre-existing errors predating Phase 3 — npm run build (tsup) is green sign-off gate
- [Phase 03-diagnose-issue-scan]: toolOutputSchema must declare _meta/_formattedText/_size_warning matching ReadResponse — JSON Schema additionalProperties:false caused live MCP -32602 when _meta omitted (03-07)
- [Phase 03-diagnose-issue-scan]: MCP schema regression via child-process test + z.toJSONSchema key parity — in-process SDK validation alone strips unknown keys without failing (03-07)
- [Phase 04-app-deploy-lifecycle]: COOLIFY_AMBIGUOUS_MATCH error on mutation multi-match — NO mutation executes; ranked Top 10 in recoveryHints (D-16)
- [Phase 04-app-deploy-lifecycle]: Strict mutation identifier uuid|name|fqdn only — no fuzzy query on start/stop/restart/deploy (D-15)
- [Phase 04-app-deploy-lifecycle]: application tool drops readOnlyHint — openWorldHint only for mutating lifecycle (D-05)
- [Phase 04-app-deploy-lifecycle]: restart schema .strict() rejects force param — deploy-only rebuild flag (D-22)
- [Phase 04-app-deploy-lifecycle]: resolveAppMutationUuid colocated in application.ts — reuse by 04-02 deploy and 04-04 batch
- [Phase 04-app-deploy-lifecycle]: pollDeploymentUntilTerminal extracted to deploy-poll.ts — injected fetcher, 3s interval, timeout partial return (D-07/D-08/D-09)
- [Phase 04-app-deploy-lifecycle]: Deploy responses carry logs_available FollowUpHint only — no inline logs in P4 per DEP-03/D-19
- [Phase 04-app-deploy-lifecycle]: Batch deploy schema fields land in 04-02 — handler not-implemented guard until 04-04
- [Phase 04-app-deploy-lifecycle]: application.deploy wait:false returns status queued immediately — wait:true polls until terminal or timeout (D-06/D-10)
- [Phase 04-app-deploy-lifecycle]: HTTP 400 maps to COOLIFY_422 in statusToCode — enables D-21 graceful cancel detection via code or httpStatus
- [Phase 04-app-deploy-lifecycle]: deployment tool owns list/get/cancel — per-app list via /deployments/applications/{uuid} not global /deployments (D-01/D-03, APP-07)
- [Phase 04-app-deploy-lifecycle]: Cancel on already-terminal returns { cancelled: false, already_finished: true, status } — fetchDeployment populates status (D-21)
- [Phase 04-app-deploy-lifecycle]: deployment.list per_page max 50 via schema override — matches CONTEXT discretion over sharedReadParams 100 cap
- [Phase 04-app-deploy-lifecycle]: resolveTagUuids filters raw /resources by case-insensitive tags[] — no GET /applications?tag= fallback; missing field surfaces per-tag error
- [Phase 04-app-deploy-lifecycle]: Batch deploy best-effort sequential — per-app try/catch, dedup via Set, aggregated results array (D-13/D-14)
- [Phase 04-app-deploy-lifecycle]: Batch wait-mode per-app timeout reset — pollDeploymentUntilTerminal fresh startTime each app
- [Phase 04-app-deploy-lifecycle]: Handler-level integration only for deploy-flow — real MCP stdio E2E MANUAL-ONLY per P1 01-05 + P3 03-06
- [Phase 04-app-deploy-lifecycle]: Phase 4 validation sign-off — nyquist_compliant true, wave_0_complete true, 286 tests green
- [Phase 04-app-deploy-lifecycle]: Live UAT 2026-07-13 against https://puzzlesstool.online — 12/12 tool calls green (application get/deploy wait+poll/restart/stop/start, deployment list/get/cancel, resource.find, diagnose app/scan, system health/infrastructure_overview)
- [Phase 04-app-deploy-lifecycle]: Coolify 4.1.x deployment.list envelope bug found + fixed — fetchAppDeployments unwraps {count, deployments} (src/api/client.ts:175); 3 regression tests added; suite now 289 green
- [Phase 04-app-deploy-lifecycle]: Wait-mode polling verified against live deploy — nginx:alpine first deploy, 9.9s elapsed, status=finished, deployment_uuid returned (D-07/D-08/D-09 confirmed end-to-end)
- [Phase 04-app-deploy-lifecycle]: D-21 cancel idempotency verified live — cancel on already-terminal deployment returned { cancelled:false, already_finished:true, status:finished } exact spec match
- [Phase 05-logs-service-db-ops]: Logs actions co-located on existing domain tools — application.logs, NO unified logs tool (D-01 / P1 D-17 action-per-domain)
- [Phase 05-logs-service-db-ops]: application.logs accepts uuid (runtime logs) OR deployment_uuid (build logs) — exactly-one-of via superRefine (D-02)
- [Phase 05-logs-service-db-ops]: Build logs shipped as JSON-array pipeline — JSON.parse → filter hidden:true (unless include_hidden) → flatten entry.output → cap; defensive fallback to plain-string slicing on parse failure (D-08/D-10/D-11 / RESEARCH §4)
- [Phase 05-logs-service-db-ops]: sharedLogParamsSchema includes include_hidden (default false) + type ('stdout'|'stderr'|'all' default 'all') per D-07 amended
- [Phase 05-logs-service-db-ops]: Hidden-log reveal gated by COOLIFY_403_SENSITIVE_REQUIRED — caller must pass api.sensitive token; bare COOLIFY_403 NOT used (D-09 amended)
- [Phase 05-logs-service-db-ops]: SVC-04 (service/DB bounded log tail) DEFERRED to v1.1 — Coolify 4.1.x REST API has no /services/{uuid}/logs or /databases/{uuid}/logs endpoint (D-04 amended / RESEARCH §2 / spike 004 404 confirmed). User directive "KEINE Tools die nicht funktionieren" — no 501 stub. PR #6293 merged to `next` 2026-07-06, backport pending
- [Phase 05-logs-service-db-ops]: service.deploy maps to POST /services/{uuid}/restart?latest=true — no dedicated /services/{uuid}/deploy endpoint (RESEARCH finding 3, D-17); restart stays pure — no pull_latest flag on restart (D-16, mirrors P4 D-22 force-only-on-deploy)
- [Phase 05-logs-service-db-ops]: Database has NO deploy action — D-18 (DB image updates are Coolify-managed); database ships start/stop/restart only
- [Phase 05-logs-service-db-ops]: Service/Database mutation ambiguity error includes project+environment context — services/DBs NOT globally unique (RESEARCH finding 7)
- [Phase 05-logs-service-db-ops]: application.logs shipped — runtime (uuid) + build (deployment_uuid) dispatcher with JSON-array pipeline (05-01)
- [Phase 05-logs-service-db-ops]: name/fqdn on logs schema for resolveAppMutationUuid reuse — runtime XOR build via superRefine (05-01)
- [Phase 05-logs-service-db-ops]: Log line content unmasked in P5 — tool description warns agents; OUT-02 deferred P6 (05-01)
- [Phase 05-logs-service-db-ops]: Service lifecycle shipped — start/stop/restart/deploy by uuid|name, fire-and-forget response (05-02)
- [Phase 05-logs-service-db-ops]: resolveServiceMutationUuid derives environment_name from raw.environment.name — project+env in COOLIFY_AMBIGUOUS_MATCH (05-02)
- [Phase 05-logs-service-db-ops]: service tool drops readOnlyHint — openWorldHint only for mutating lifecycle (05-02)
- [Phase 05-logs-service-db-ops]: Database lifecycle shipped — start/stop/restart by uuid|name, fire-and-forget, no deploy (05-03)
- [Phase 05-logs-service-db-ops]: resolveDatabaseMutationUuid derives environment_name from raw.environment.name — project+env in COOLIFY_AMBIGUOUS_MATCH (05-03)
- [Phase 05-logs-service-db-ops]: Handler-level integration only for logs-service-db-flow — real MCP stdio E2E MANUAL-ONLY per P1 01-05 + P3 03-06 + P4 04-05 (05-05)
- [Phase 06-bulk-emergency-safety]: Handler-level integration only for emergency-safety-flow — real MCP stdio E2E MANUAL-ONLY per P1–P5 precedent (06-03)
- [Phase 07-distribution-docs]: Package name + bin = awesome-coolify-mcp; prepublishOnly replaces prepare (D-04)
- [Phase 07-distribution-docs]: npm files allowlist = dist, .env.example, LICENSE — verified via npm pack --dry-run (D-07)
- [Phase 07-distribution-docs]: Wave 0 docs-parity.test.ts RED scaffold — Plan 07-02 turns GREEN (D-11/D-13/D-14/D-09)
- [Phase 07-distribution-docs]: Maintainer publish workflow in CONTRIBUTING.md — no .planning links, no .mcpb (D-01/D-18)
- [Phase 07-distribution-docs]: README EN/DE full parity — 11 H2 sections, 32 action literals, 3 install paths, Safety section (D-09/D-11/D-15/D-17)
- [Phase 07-distribution-docs]: docs-parity.test.ts GREEN — Wave 0 scaffold satisfied by README rewrite (DIST-02)
- [Phase 07-distribution-docs]: GitHub Pages install configurator client-side only — docs/install.html + docs/index.html, 16 clients, D-22 adapters (DIST-02)
- [Phase 07-distribution-docs]: Service stop defaults docker_cleanup=false — Coolify 4.1.x compose one-click no-op stop fix; optional schema param for destructive cleanup (07-05)
- [Phase 07-distribution-docs]: mapApiError/toStructuredError extract ofetch response._data.message — COOLIFY_422 shows Coolify human text not generic HTTP string (07-05)
- [Phase 07-distribution-docs]: UAT gap 29 closed — uat-uptime-a stop→exited @25s, start→running:healthy @45s; 29/32 passed 0 issues (07-05)

### Pending Todos

- ~~Validate deploy wait-mode polling against slow builds~~ — verified 2026-07-13 via live UAT against https://puzzlesstool.online (nginx:alpine first deploy, 9.9s, status=finished). Slow-build >60s scenario remains unit-test-only (cached-warm pull); 300s timeout path not exercised against real slow build.

### Blockers/Concerns

- Coolify 4.1.x: `execute_command` endpoint broken/missing — out of scope v1
- Global deployments list unreliable — per-app list only (APP-07)
- ~~Deployment list envelope shape~~ — fixed 2026-07-13: `fetchAppDeployments` now unwraps `{count, deployments}` envelope from Coolify 4.1.x (src/api/client.ts:175). 3 regression tests added. Suite 289 green.

## Session Continuity

Last session: 2026-07-16T19:05:00.000Z
Stopped at: Completed 07-05-PLAN.md
Resume file: None
