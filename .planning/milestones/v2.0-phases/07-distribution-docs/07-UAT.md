---
status: complete
phase: 07-distribution-docs
source: [full-mcp-tool-smoke, README.md Tools table, phases 01–06 deliverables]
started: 2026-07-16T16:25:00Z
updated: 2026-07-16T20:30:00Z
restart_reason: post-MCP rebuild restart 2026-07-16
auto_verified: 2026-07-16T20:30:00Z
mode: mcp-tool-smoke
target: https://puzzlesstool.online
scope: all 10 MCP tools / 32 actions (reads + emergency preview first; mutations gated)
auto: true
---

## Current Test

[testing complete]

## Tests

### 1. meta.version
expected: meta({ action: "version" }) returns server name + semver; no Coolify dependency
result: pass

### 2. system.health
expected: system({ action: "health" }) returns reachable/healthy status against live Coolify instance
result: pass

### 3. system.version
expected: system({ action: "version" }) returns Coolify instance version string (e.g. 4.x)
result: pass
source: automated
detail: version 4.1.2

### 4. system.verify
expected: system({ action: "verify" }) authenticates token and returns connectivity + instance version
result: pass
source: automated

### 5. system.infrastructure_overview
expected: system({ action: "infrastructure_overview" }) returns aggregate counts (servers, projects, applications, services, databases)
result: pass
source: automated

### 6. resource.list
expected: resource({ action: "list" }) returns applications/services/databases with summary projections and pagination _meta
result: pass
source: automated

### 7. resource.find
expected: resource({ action: "find", query: "<known name fragment>" }) returns ranked matches (≤10) across servers/resources
result: pass
source: automated
detail: mcp-uat-nginx ranked first

### 8. docs.search
expected: docs({ action: "search", query: "deploy" }) returns bundled Coolify guide hits (static index, not live fetch)
result: pass
source: automated

### 9. application.get
expected: application({ action: "get", uuid|name }) returns app details; sensitive keys masked as *** by default
result: pass
source: automated

### 10. service.get
expected: service({ action: "get", uuid|name }) returns service details; sensitive keys masked as *** by default
result: pass
source: automated

### 11. database.get
expected: database({ action: "get", uuid|name }) returns database details; sensitive keys masked as *** by default
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 post-rebuild — mcp-uat-test-db + mcp-uat-test-redis running:healthy; postgres_password/sentinel_token/url fields *** default; reveal:true plaintext"

### 12. diagnose.app
expected: diagnose({ action: "app", uuid|name }) returns status/health/env/recent deployments synthesize view
result: pass
source: automated

### 13. diagnose.server
expected: diagnose({ action: "server", uuid|name }) returns server resources/domains/reachability (validate side-effect OK)
result: pass
source: automated

### 14. diagnose.scan
expected: diagnose({ action: "scan" }) returns fleet-wide issues grouped by severity buckets
result: pass
source: automated

### 15. deployment.list
expected: deployment({ action: "list", application_uuid|name }) returns per-app deployment list (not global /deployments)
result: pass
source: automated

### 16. deployment.get
expected: deployment({ action: "get", uuid }) returns status, commit, timestamps (optional capped logs)
result: pass
source: automated

### 17. application.logs
expected: application({ action: "logs", uuid }) returns bounded runtime log tail (lines capped; content unmasked)
result: pass
source: automated

### 18. emergency.stop_all preview
expected: emergency({ action: "stop_all" }) WITHOUT confirm returns would_affect + sample_uuids preview; NO apps stopped
result: pass
source: automated

### 19. emergency.restart_project preview
expected: emergency({ action: "restart_project", project }) WITHOUT confirm returns would_affect preview; NO restarts executed
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 — project_name=MCP UAT Test confirm:false → COOLIFY_CONFIRM_REQUIRED would_affect=2 sample_uuids=2; no mutation"

### 20. emergency.redeploy_project preview
expected: emergency({ action: "redeploy_project", project }) WITHOUT confirm returns would_affect preview; NO redeploys executed
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 — project_name=MCP UAT Test confirm:false → COOLIFY_CONFIRM_REQUIRED would_affect=2 sample_uuids=2; no mutation"

### 21. application.restart
expected: application({ action: "restart", uuid|name }) on agreed safe app returns success; app becomes running
result: pass
source: automated

### 22. application.deploy (wait:false)
expected: application({ action: "deploy", uuid|name, wait: false }) queues deploy; returns deployment_uuid / queued status quickly
result: pass
source: automated

### 23. deployment.cancel (idempotent)
expected: deployment({ action: "cancel", uuid }) on already-finished deploy returns { cancelled: false, already_finished: true, status } — no error
result: pass
source: automated

### 24. service.restart
expected: service({ action: "restart", uuid|name }) on agreed safe service returns fire-and-forget success
result: pass
source: automated

### 25. database.restart
expected: database({ action: "restart", uuid|name }) on agreed safe DB returns fire-and-forget success (no deploy action exists)
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 — hdmvxmx8yg9ftgd8t5q3t5hj pre-check running:healthy; restart {status:requested}; healthy @2s; deploy action rejected as expected"

### 26. service.deploy
expected: service({ action: "deploy", uuid|name }) redeploys service (restart + optional latest pull); fire-and-forget success
result: pass
source: automated

### 27. application.start / stop cycle
expected: application stop then start on agreed safe app both succeed; final state running
result: pass
source: automated

### 28. database.start / stop cycle
expected: database stop then start on agreed safe DB both succeed; final state running (DESTRUCTIVE to dependents — confirm target first)
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 — hdmvxmx8yg9ftgd8t5q3t5hj stop {status:requested} → exited:unhealthy @12s; start {status:requested} → running:healthy @46s; post-check MCP confirm running:healthy"
notes: "Pre-check was running:starting (still settling after test 25 restart); cycle behavior correct"

### 29. service.start / stop cycle
expected: service stop then start on agreed safe service both succeed; final state running
result: pass
source: live
verified_by: "Subagent UAT 2026-07-16 — poo9i3gvbpa0euukp8m36zte pre-check running:healthy; stop {status:requested} → exited; start {status:requested} → running:healthy"

### 30. emergency confirm-gate rejection
expected: emergency actions with confirm: false or omitted never mutate; only confirm: true executes (verify gate still holds)
result: pass
source: automated

### 31. secret masking + reveal
expected: get/diagnose with default masks password/token/secret/private/env as ***; reveal: true returns plaintext when requested
result: pass
source: automated

### 32. structured error envelope
expected: invalid uuid / bad action returns parseable { code, message, recoveryHints } (e.g. COOLIFY_404 / COOLIFY_422) — not raw stack
result: pass
source: automated

## Summary

total: 32
passed: 32
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "emergency.restart_project preview works with project_name from resource/application projections"
  status: resolved
  resolved_by: 07-04-PLAN.md
  test: 19
  verification: "buildProjectEnvironmentIndex + enriched read handlers; live project_name=MCP UAT Test → COOLIFY_CONFIRM_REQUIRED would_affect=2"

- truth: "emergency.redeploy_project preview works with project_name from resource/application projections"
  status: resolved
  resolved_by: 07-04-PLAN.md
  test: 20
  verification: "same fix as test 19; live redeploy preview would_affect=2"

- truth: "service stop then start on agreed safe service both succeed; final state running"
  status: resolved
  resolved_by: 07-05-PLAN.md
  test: 29
  verification: "triggerServiceStop docker_cleanup=false default; live stop→exited @25s, start→running:healthy @45s on uat-uptime-a; COOLIFY_422 now surfaces Coolify message body"

- truth: "database tools resolve Coolify 4.1.x standalone-* types by name (get/start/stop/restart) and resource.list type=database returns live DBs"
  status: resolved
  resolved_by: 07-06-PLAN.md
  test: 11
  verification: "isDatabaseRawType + normalizeResourceSummaryType; database.get uuid|name; 505 unit tests green; live MCP re-verify after server restart"

- truth: "database full projection masks internal_db_url and external_db_url connection strings by default"
  status: resolved
  resolved_by: 07-07-PLAN.md
  test: 11
  verification: "SENSITIVE_URL_KEY_PATTERN + CREDENTIAL_URI_PATTERN in sanitizeFullProjection; database.test.ts full projection asserts *** on URL fields"
