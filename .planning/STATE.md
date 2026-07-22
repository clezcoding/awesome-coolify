---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Platform Foundation
current_phase: 17
current_phase_name: Local Manifest & Sync
status: "Phase 16 shipped — PR #37"
stopped_at: Completed 16-04-PLAN.md
last_updated: "2026-07-22T03:07:18.883Z"
last_activity: 2026-07-22
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 10
  completed_plans: 10
  percent: 50
last_activity_desc: "Completed quick task 260722-aal: npm→pnpm Mac migration script"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-21)

**Core value:** AI agent manages Coolify instances — deploy, logs, diagnose, create infrastructure — via one MCP server.
**Current focus:** Phase 17 — Local Manifest & Sync

## Current Position

Phase: 17 — Local Manifest & Sync
Plan: Not started
Status: Phase 16 shipped — PR #37
Last activity: 2026-07-22

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 75
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 5 | - | - |
| 03 | 7 | - | - |
| 04 | 5 | - | - |
| 05 | 5 | - | - |
| 06 | 2 | - | - |
| 07 | 5 | - | - |
| 08 | 6 | - | - |
| 09 | 6 | - | - |
| 10 | 5 | - | - |
| 11 | 7 | - | - |
| 12 | 7 | - | - |
| 13 | 5 | - | - |
| 15 | 5 | - | - |
| 16 | 5 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 10-application-crud-safety P00 | 6min | 2 tasks | 1 files |
| Phase 10-application-crud-safety P01 | 8min | 2 tasks | 4 files |
| Phase 10-application-crud-safety P02 | 5min | 2 tasks | 4 files |
| Phase 10-application-crud-safety P03 | 6min | 2 tasks | 2 files |
| Phase 10-application-crud-safety P04 | 7min | 2 tasks | 2 files |
| Phase 11-service-database-crud P00 | 4 | 3 tasks | 3 files |
| Phase 11-service-database-crud P01 | 3min | 2 tasks | 6 files |
| Phase 11-service-database-crud P02 | 3min | 2 tasks | 2 files |
| Phase 11-service-database-crud P03 | 3min | 2 tasks | 2 files |
| Phase 11-service-database-crud P04 | 3min | 2 tasks | 2 files |
| Phase 11-service-database-crud P05 | 3min | 3 tasks | 4 files |
| Phase 11-service-database-crud P06 | 25min | 2 tasks | 4 files |
| Phase 12-environment-variables-smart-sync P00 | 6min | 3 tasks | 5 files |
| Phase 12-environment-variables-smart-sync P01 | 4 | 2 tasks | 4 files |
| Phase 12-environment-variables-smart-sync P02 | 5 | 2 tasks | 2 files |
| Phase 12-environment-variables-smart-sync P03 | 3min | 2 tasks | 2 files |
| Phase 12-environment-variables-smart-sync P04 | 3min | 2 tasks | 2 files |
| Phase 12-environment-variables-smart-sync P05 | 5 | 2 tasks | 2 files |
| Phase 12-environment-variables-smart-sync P06 | 5min | 2 tasks | 3 files |
| Phase 15-multi-instance-registry-routing P00 | 3min | 2 tasks | 4 files |
| Phase 15-multi-instance-registry-routing P01 | 4min | 2 tasks | 3 files |
| Phase 15-multi-instance-registry-routing P02 | 3min | 2 tasks | 7 files |
| Phase 15-multi-instance-registry-routing P03 | 6min | 2 tasks | 7 files |
| Phase 15-multi-instance-registry-routing P04 | 6min | 2 tasks | 8 files |
| Phase 16-coolify-cloud-server-branding P00 | 4min | 1 tasks | 3 files |
| Phase 16-coolify-cloud-server-branding P01 | 3min | 1 tasks | 2 files |
| Phase 16-coolify-cloud-server-branding P02 | 4min | 1 tasks | 3 files |
| Phase 16-coolify-cloud-server-branding P03 | 2min | 2 tasks | 4 files |
| Phase 16-coolify-cloud-server-branding P04 | 8min | 3 tasks | 7 files |

## Accumulated Context

### Decisions

- v1 = Ops MVP only; Create/Delete deferred to v2 (PROJECT.md D-05)
- Action-based tool schema from v1 foundation — no 60+ granular tools (DX-01)
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
- [Phase 08-keys-server-crud]: Wave 0 RED scaffolds — private_key.test.ts (14 it) + server.test.ts (16 it) fail at handler import; 08-02/08-03 flip GREEN without test rewrites (08-00)
- [Phase 08-keys-server-crud]: Phase 8 shared infrastructure in 08-01 — client CRUD, COOLIFY_409/SSH_UNREACHABLE, PEM hard-mask, resource.list server branch; 08-02/08-03 import without file conflicts (08-01)
- [Phase 08-keys-server-crud]: private_key handler shipped in 08-02 — PEM stripped all paths, reveal on list COOLIFY_422, delete_preview would_delete=false when dependents exist; ready for 08-04 registration (08-02)
- [Phase 08-keys-server-crud]: server handler shipped in 08-03 — auto-validate poll, soft-unreachable no rollback, private_key_uuid lookup on get, delete_volumes default false; Wave 2 complete, ready for 08-04 registration (08-03)
- [Phase 08-keys-server-crud]: private_key + server registered in 08-04 — 12 MCP tools total, openWorldHint only, toolOutputSchema envelope; Phase 8 ready for verify-work (08-04)
- [Phase ?]: Wave 0 RED scaffolds use vitest it.fails for husky pre-commit green; flip to it in 10-02/10-03/10-04
- [Phase ?]: deleteApplication SAF-02 mock asserts delete_connected_networks:false alongside three other flags
- [Phase ?]: Phase 10 Wave 1 foundation: 7 application CRUD client functions + COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough in errors.ts (10-01)
- [Phase ?]: TDD RED+GREEN combined per task commit — husky pre-commit blocks test-only RED commits (10-01)
- [Phase ?]: Schema + handler combined in Task 1 commit — husky pre-commit (10-01 pattern)
- [Phase ?]: 409 force_domain_override hint in toStructuredError when conflicts array present
- [Phase ?]: applicationActionSchema outer z.union for nested create source_type discriminator
- [Phase ?]: updateActionSchema curated PATCH allowlist + post-fetch sanitizeFullProjection for SAF-04 (10-03)
- [Phase ?]: Task 1 schema-only commit for husky green; handler + test flips in Task 2 (10-03)
- [Phase ?]: Task 1 schema-only commit preserves it.fails scaffolds for husky green; handlers + flips in Task 2 (10-04)
- [Phase ?]: validateDeleteConfirm copy-pasted into application.ts per D-17 — canonical SAF reference (10-04)
- [Phase ?]: delete_preview filters fetchResources by application_uuid; empty array when no parent link (10-04)
- [Phase ?]: Wave 0 it.fails RED scaffolds for Phase 11 service/database CRUD — flip to it in 11-01/11-02/11-03/11-04/11-05
- [Phase ?]: fetchResources used for D-18 ambiguous-match mocks — matches resolveServiceMutationUuid/resolveDatabaseUuid
- [Phase ?]: decodeCompose regex-guards invalid base64 before Buffer decode — Node does not throw
- [Phase ?]: TDD RED+GREEN combined per task commit — flip it.fails alongside implementation (10-01 pattern)
- [Phase ?]: readFileSync for compose_file — mirrors private_key pattern and Wave 0 test mocks
- [Phase ?]: handleServiceCreate soft-success on triggerServiceStart failure — no auto-rollback per D-13
- [Phase ?]: createDatabaseSchema 8-engine discriminatedUnion with D-12 schema-level confirm gate on database create
- [Phase ?]: handleDatabaseCreate fire-and-forget instant_deploy with D-13 soft success — no auto-rollback
- [Phase ?]: parseDatabaseAction maps create strict failures to COOLIFY_VALIDATION_ERROR only — update RED scaffolds preserved for 11-05
- [Phase ?]: readFileSync for update compose_file — mirrors 11-02 create path and Wave 0 test mocks
- [Phase ?]: validateDeleteConfirm copy-pasted into service.ts per D-17 — canonical SAF reference
- [Phase ?]: D-12 update-path confirm gate at schema level — mirrors create-path gate for database update
- [Phase ?]: validateDeleteConfirm copy-pasted into database.ts per D-17 — canonical SAF reference
- [Phase ?]: Post-update response via fetchDatabase + sanitizeFullProjection for SAF-04 masking
- [Phase ?]: Plain-YAML compose handled in projectServiceCompose fallback chain — decodeCompose base64 contract unchanged
- [Phase ?]: Live Coolify 4.1.2 compose verification requires GET projection full + reveal — POST create may omit compose
- [Phase ?]: Phase 12 Wave 0: it.fails RED scaffolds for husky-green pre-commit; flip to it in 12-01..12-06
- [Phase ?]: env-parser.test.ts uses dynamic import until env-parser.ts ships in 12-01
- [Phase ?]: fetchApplicationEnvs delegiert an fetchEnvs(application) — Abwärtskompatibilität
- [Phase ?]: detectConflicts(local, remote, baseline, policy) — Baseline = Remote bei Sync-Start
- [Phase ?]: TDD RED+GREEN pro Task kombiniert — Husky pre-commit Muster 10-01
- [Phase ?]: Env value-Feld explizit in maskEnvRecord maskieren — sanitizeFullProjection reicht nicht für generisches value
- [Phase ?]: ask_human_reveal als top-level recoveryHints bei reveal:true auf allen envs:*-Pfaden (D-15)
- [Phase ?]: Env value-Feld immer als *** maskieren via maskEnvRecord (12-02-Muster)
- [Phase ?]: Kein envs:sync auf service — D-09 app-only
- [Phase ?]: is_preview vollständig aus database envs:* entfernt — OpenAPI Pitfall 1 D-16
- [Phase ?]: databaseEnvFlagFields nur drei Flags ohne is_preview
- [Phase ?]: Kein envs:sync auf database — D-09 app-only
- [Phase ?]: Value conflicts for ask-human gate built from diff.updated entries — not only out-of-band detectConflicts
- [Phase ?]: Sync disposition always masked regardless of reveal — control-plane per D-14/D-15
- [Phase ?]: readFileSync for env_file — matches Wave 0 test mocks
- [Phase ?]: Service/database server.ts descriptions avoid envs:sync literal — app-only sync via wording
- [Phase ?]: envs:* docs under Tools reference subsection — separate from COOLIFY_URL config section
- [Phase ?]: Phase 15 Wave 0: it.fails + dynamic import RED scaffolds — husky pre-commit bleibt grün; flip zu it in 15-01..15-04
- [Phase ?]: COOLIFY_MCP_TEST_REGISTRY_DIR als Test-Hook für tmp registry — Plan 15-01 verdrahtet Pfad
- [Phase ?]: withWriteLock serializes full load-modify-save — concurrent add race beyond save-only lock (15-01)
- [Phase ?]: Sync resolveCredentials error tests use try/catch — .rejects invalid for sync throws (15-01)
- [Phase ?]: Error path via wrapMcpError + isInstanceErrorResult — mirrors private_key, not RED scaffold .rejects
- [Phase ?]: envOverride checks optional env param OR process.env — test seam for handleInstanceAction(env?)
- [Phase ?]: import-env auto-derives name from URL hostname when name omitted
- [Phase ?]: parseWithInstanceRouting strip-before-parse preserves strict schemas — z.intersection rejected (15-03)
- [Phase ?]: resolveRoutingEnv uses handler env param for unit-test seam — semantically equivalent to process.env in production (15-03)
- [Phase ?]: Reused parseWithInstanceRouting strip-before-parse for 7 read/CRUD tools — strict schemas preserved (15-04)
- [Phase ?]: CTX-06 error-path integration tests isolated from prod registry default — COOLIFY_NO_INSTANCE contract preserved (15-04)
- [Phase ?]: Phase 16 Wave 0: it.fails RED scaffolds for husky-green pre-commit; flip to it in 16-01..16-03
- [Phase ?]: cloud-info invalid-instance scaffold asserts instance-path Zod issue — fails until 16-02 ships cloud-info branch
- [Phase ?]: Cloud 403/404 mapped via isCloud flag on mapApiError — self-hosted 403 still falls through to COOLIFY_500
- [Phase ?]: Per-error isCloud from fetchError.request — no module-level mutable cloud state (D-03)
- [Phase ?]: cloud-info infer fallback catches COOLIFY_NO_INSTANCE only — unknown instance names still throw COOLIFY_INSTANCE_NOT_FOUND (D-17)
- [Phase ?]: resolveEnv merges handler env param with process.env for source=env detection
- [Phase ?]: McpServer serverInfo branding fields (title/description/websiteUrl/icons) are peer fields in one object — no second identity model (D-08)
- [Phase ?]: Dedicated mcp-icon-192.png asset separate from favicon — jsDelivr @main CDN per D-05/D-06
- [Phase ?]: D-09 closed as documented Cursor client limitation — serverInfo.icons correct; Cursor list shows A fallback
- [Phase ?]: Cloud topic depth in docs/en|de/cloud.md; README quick overview + links only (D-11)

### Pending Todos

- ~~Validate deploy wait-mode polling against slow builds~~ — verified 2026-07-13 via live UAT against https://puzzlesstool.online (nginx:alpine first deploy, 9.9s, status=finished). Slow-build >60s scenario remains unit-test-only (cached-warm pull); 300s timeout path not exercised against real slow build.

### Blockers/Concerns

- Coolify 4.1.x: `execute_command` endpoint broken/missing — out of scope v1
- Global deployments list unreliable — per-app list only (APP-07)
- ~~Deployment list envelope shape~~ — fixed 2026-07-13: `fetchAppDeployments` now unwraps `{count, deployments}` envelope from Coolify 4.1.x (src/api/client.ts:175). 3 regression tests added. Suite 289 green.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260716-a1 | Split into private dev repo + public repo, npm + GitHub Pages setup | 2026-07-16 | 7cbcb8f | [260716-a1-split-public-repo](./quick/260716-a1-split-public-repo/) |
| 260716-t80 | README hero + architecture regen, jsDelivr CDN for images | 2026-07-16 | 9f6680b | [260716-t80-task-1-erstelle-mit-dem-higgsfield-mcp-s](./quick/260716-t80-task-1-erstelle-mit-dem-higgsfield-mcp-s/) |
| 260718-94w | GitHub cleanup: audit, privatize 3 legacy repos, new private canonical repo | 2026-07-18 | b142c23 | [260718-94w-github-repo-cleanup-audit-local-setup-pr](./quick/260718-94w-github-repo-cleanup-audit-local-setup-pr/) |
| 260718-9ij | Single public repo: consolidate dev+public, GitHub setup, Pages, deps | 2026-07-18 | 3ff45af | [260718-9ij-single-public-repo-setup-consolidate-dev](./quick/260718-9ij-single-public-repo-setup-consolidate-dev/) |
| 260718-ast | Expand .github/labels.yml — MCP scopes + Dependabot labels | 2026-07-18 | 2f5c743 | [260718-ast-update-die-github-labels-yml-mache-sie-v](./quick/260718-ast-update-die-github-labels-yml-mache-sie-v/) |
| 260718-up6 | Update die repo beschreibung und die README | 2026-07-18 | d78a0e9 | [260718-up6-update-die-repo-beschreibung-und-die-rea](./quick/260718-up6-update-die-repo-beschreibung-und-die-rea/) |
| 260719-8ol | Install GitHub repo tooling (Kodiak, Release Drafter, MCP/Comfy publish, publint, MegaLinter) | 2026-07-19 | a58f904 | [260719-8ol-install-github-repo-tooling-per-locked-d](./quick/260719-8ol-install-github-repo-tooling-per-locked-d/) |
| 260719-fju | GitHub Actions/Bots/Workflows Audit — MCP publish gaps + verify script | 2026-07-19 | 75d61d3 | [260719-fju-berpr-fe-ob-alle-github-action-tools-bot](./quick/260719-fju-berpr-fe-ob-alle-github-action-tools-bot/) |
| 260721-70k | CI/CD speed audit + Kodiak autodeploy activation | 2026-07-21 | 0d5fbb5 | [260721-70k-die-github-prs-dauern-teils-mehrere-minu](./quick/260721-70k-die-github-prs-dauern-teils-mehrere-minu/) |
| 260722-aal | SH Script: MacBook-Projekte npm → pnpm (ANSI TUI) | 2026-07-22 | 905c948 | [260722-aal-schreibe-ein-sh-script-um-alle-meine-pro](./quick/260722-aal-schreibe-ein-sh-script-um-alle-meine-pro/) |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-07-16:

| Category | Item | Status |
|----------|------|--------|
| debug | project-name-default-mismatch | resolved (07-04) |
| debug | service-stop-start-422 | resolved (07-05) |

Items acknowledged and deferred at v2.0 milestone close on 2026-07-21:

| Category | Item | Status |
|----------|------|--------|
| todo | 2026-07-16-custom-skills-pro-ide-f-r-coolify.md | deferred to v3 backlog |
| todo | 2026-07-16-lokale-projekt-manifest-datei-f-r-coolify-metadaten.md | deferred to v3 backlog |
| todo | 2026-07-16-mcp-server-f-r-coolify-cloud-erweitern.md | deferred to v3 backlog |
| todo | 2026-07-16-standard-setup-tool-f-r-neue-coolify-projekte.md | deferred to v3 backlog |
| todo | 2026-07-18-integrate-official-coolify-openapi-specs.md | deferred to v3 backlog |

## Session Continuity

**Last session:** 2026-07-22T02:11:59.046Z
**Stopped at:** Completed 16-04-PLAN.md
**Resume file:** None

Last activity: 2026-07-22 — Quick 260722-85p path 3: marketing site live at https://awesome-coolify.higgsfield.app

## Operator Next Steps

- Run `/gsd-plan-phase 16` (Coolify Cloud & Server Branding) — next after audit
- Or close gaps per `.planning/v3.0-MILESTONE-AUDIT.md` (CLD/BRND → MAN → UAT)

## Rebuild Log

- timestamp: 2026-07-18T05:43:45.828Z
  kind: by-phase-table-reconciled
  section: ## Performance Metrics
  before: | Phase | Plans | Total | Avg/Plan | \n |-------|-------|-------|----------| \n | — | — | — | — | \n | v1 P1 | 2 | - | - | \n | Phase 02 P01 | 4min | 3 tasks | 6 files | \n | Phase 02 P02 | 5min | 3 tasks | 8 files | \n | Phase 02-discovery-read-projections P03 | 7min | 3 tasks | 10 files | \n | Phase 02-discovery-read-projections P04 | 3min | 3 tasks | 6 files | \n | Phase 02-discovery-read-projections P05 | 5 | 3 tasks | 5 files | \n | 02 | 5 | - | - | \n | Phase 03 P01 | 5min | 4 tasks | 13 files | \n | Phase 03 P02 | 8 | 2 tasks | 4...
  after: | Phase | Plans | Total | Avg/Plan | \n |-------|-------|-------|----------| \n | 02 | 0 | - | - | \n | 03 | 0 | - | - | \n | 04 | 0 | - | - | \n | 05 | 0 | - | - | \n | 06 | 0 | - | - | \n | 07 | 3 | - | - | \n | 08 | 6 | - | - | \n | 09 | 6 | - | - |
  reason: phase dirs on disk are canonical; rows for missing phases dropped, missing phases added

- timestamp: 2026-07-18T05:45:00.000Z
  kind: manual-reconcile
  section: frontmatter + ## Performance Metrics + ## Session Continuity
  before: total_plans 15/15, total_phases 9, completed_phases 3, total completed 86, v1 phases 0 plans, stopped_at forensic
  after: v2.0 scope (6 phases, 2 done, 12 plans), total completed 41 from SUMMARY artifacts, session restored to Phase 10 next
  reason: forensics drift fix — front matter aligned to v2.0 milestone, metrics from disk SUMMARY count
