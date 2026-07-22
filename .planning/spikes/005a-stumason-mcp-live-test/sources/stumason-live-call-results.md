# StuMason coolify-mcp Live Call Results

Date: 2026-07-13
Instance: https://puzzlesstool.online (v4.1.2)
Token: `7|C1yL6t948WaeBm9BqQiYHZiu8U2QGPcIDTGQPWxG975b8afe`
MCP server: user-coolify-backup-mcp (@masonator/coolify-mcp)

## get_version
```json
{"version":"4.1.2"}
```
Verdict: WORKS ✓ — maps to GET /version

## get_infrastructure_overview
```json
{
  "summary": {"servers":1,"projects":7,"applications":13,"databases":4,"services":7},
  "servers": [{"uuid":"ozwpdpj5bgxax8v6gfs5lolv","name":"localhost","ip":"host.docker.internal","is_reachable":true}],
  "projects": [7 projects: Internals, SheetB, Clared, wosnimmi, Perpetual-Living, baccarat, MCP UAT Test],
  "applications": [13 apps: baccarat-admin, baccarat-landing, baccarat-license-server, baccarat-web, clared-api, clared-gotenberg, clared-web, clared-worker, frankfurter, mcp-uat-nginx, pl-crawler, pl-dashboard, wosnimmi-ghcr],
  "databases": [4 DBs: clared-postgres, clared-redis, wosnimmi-db, pl-postgres],
  "services": [7 services: Passbolt Puzzless (exited), plane, Vaultwarden Puzzless, youtrack, N8N-SheetB (exited), pl-libretranslate, baccarat-supabase]
}
```
Verdict: WORKS ✓ — aggregates GET /resources + /servers + /projects

## application_logs (uuid=jt4mw1b0ld3542i9w9nfmqkr, lines=5)
```json
{"logs":"2026/07/13 02:26:50 [error] 32#32: *26 open() \"/usr/share/nginx/html/favicon.ico\" failed (2: No such file or directory), client: 10.0.1.22, server: localhost, request: \"GET /favicon.ico HTTP/1.1\", host: \"jt4mw1b0ld3542i9w9nfmqkr.puzzlesstool.online\", referrer: \"https://jt4mw1b0ld3542i9w9nfmqkr.puzzlesstool.online/\"\n10.0.1.22 - - [13/Jul/2026:02:26:50 +0000] \"GET /favicon.ico HTTP/1.1\" 404 555 \"https://jt4mw1b0ld3542i9w9nfmqkr.puzzlesstool.online/\" \"Mozilla/5.0 ...\"\n..."}
```
Verdict: WORKS ✓ — raw passthrough of GET /applications/{uuid}/logs response shape `{logs: string}`

## diagnose_app (query="mcp-uat-nginx")
```json
{
  "application": {"uuid":"jt4mw1b0ld3542i9w9nfmqkr","name":"mcp-uat-nginx","status":"running:unknown","fqdn":"https://jt4mw1b0ld3542i9w9nfmqkr.puzzlesstool.online","git_repository":"coollabsio/coolify","git_branch":"main"},
  "health": {"status":"healthy","issues":[]},
  "logs": null,
  "environment_variables": {"count":0,"variables":[]},
  "recent_deployments": [{"status":"finished","created_at":"2026-07-13T00:41:10.000000Z"},...]
}
```
Verdict: WORKS ✓ — composite: GET /applications + /applications/{uuid}/logs + /applications/{uuid}/envs + /deployments/applications/{uuid}

## diagnose_app ERROR (first attempt with uuid instead of query)
```
MCP error -32602: Input validation error: Invalid arguments for tool diagnose_app: [
  {"expected":"string","code":"invalid_type","path":["query"],"message":"Invalid input: expected string, received undefined"}
]
```
Note: schema requires `query: string` (single field for UUID/name/domain), NOT `uuid: string`.

## find_issues
```json
{
  "summary": {"total_issues":2,"unhealthy_applications":0,"unhealthy_databases":0,"unhealthy_services":2,"unreachable_servers":0},
  "issues": [
    {"type":"service","uuid":"j105904z7t8enrqnzjerbd92","name":"Passbolt Puzzless","issue":"Service status: exited","status":"exited"},
    {"type":"service","uuid":"etwtfao3ni169on8wutzuu8y","name":"N8N-SheetB","issue":"Service status: exited","status":"exited"}
  ]
}
```
Verdict: WORKS ✓ — aggregates GET /resources + per-resource status check

## system (action=health)
```json
"OK"
```
Verdict: WORKS ✓ — maps to GET /health

## system ERROR (first attempt without action)
```
MCP error -32602: Invalid option: expected one of "health"|"list_resources"|"enable_api"|"disable_api"
```

## list_services
```json
[
  {"uuid":"j105904z7t8enrqnzjerbd92","name":"Passbolt Puzzless","status":"exited"},
  {"uuid":"ax407zfqc730hyl38h1urifw","name":"plane","status":"running:healthy"},
  {"uuid":"t4oc2g4rmgeugrrqvpporsqi","name":"Vaultwarden Puzzless","status":"running:healthy"},
  {"uuid":"ywd6du7dqofdomv0hm3rgd46","name":"youtrack","status":"running:unknown"},
  {"uuid":"etwtfao3ni169on8wutzuu8y","name":"N8N-SheetB","status":"exited"},
  {"uuid":"z1litmweo7x3lw54x4hbwq0d","name":"pl-libretranslate","status":"running:healthy"},
  {"uuid":"ng9axbmbd2x3pjaljanhpp4r","name":"baccarat-supabase","status":"running:healthy"}
]
```
Verdict: WORKS ✓ — maps to GET /services

## get_service (uuid=j105904z7t8enrqnzjerbd92 — Passbolt Puzzless)
```json
{
  "uuid":"j105904z7t8enrqnzjerbd92",
  "name":"Passbolt Puzzless",
  "applications":[{"uuid":"e10a4e5euqkef9kpev7n6nq5","name":"passbolt","status":"exited","image":"passbolt/passbolt:latest-ce",...}],
  "databases":[{"uuid":"vas0mzk2xihpigs147ortzqk","name":"mariadb","status":"exited","image":"mariadb:11",...}],
  "docker_compose":"services:\n  passbolt:\n    image: 'passbolt/passbolt:latest-ce'\n...",
  "server":{"uuid":"ozwpdpj5bgxax8v6gfs5lolv","name":"localhost","ip":"host.docker.internal",...},
  "status":"exited",
  "service_type":"passbolt"
}
```
Verdict: WORKS ✓ — maps to GET /services/{uuid}. Returns sub-resources with `name` field — these are the `sub_service_name` candidates for future v4.1.3+ /services/{uuid}/logs?sub_service_name=X endpoint.

## get_database (uuid=wwv448u8322naf6xry5rhup4 — clared-postgres)
```json
{
  "uuid":"wwv448u8322naf6xry5rhup4",
  "name":"clared-postgres",
  "database_type":"standalone-postgresql",
  "image":"postgres:16-alpine",
  "status":"running:healthy",
  "postgres_password":"<REDACTED>",  // PLAINTEXT LEAK (redacted before git commit)
  "internal_db_url":"postgres://user:<REDACTED>@internal-host:5432/db",  // PLAINTEXT
  "external_db_url":"postgres://user:<REDACTED>@external-host:3522/db",  // PLAINTEXT
  "is_public":true,
  "public_port":3522,
  ...
}
```
Verdict: WORKS ✓ — maps to GET /databases/{uuid}. SECURITY CONCERN: plaintext password + connection strings. awesome-coolify-mcp's sanitizeFullProjection masks these by default.

## deployment (action=get, uuid=jebl7peop60i0ircz9jlhot4, lines=10)
```json
{
  "data": {
    "deployment_uuid":"jebl7peop60i0ircz9jlhot4",
    "application_name":"mcp-uat-nginx",
    "server_name":"localhost",
    "status":"finished",
    "commit":"HEAD",
    "force_rebuild":true,
    "is_webhook":false,
    "is_api":true,
    "created_at":"2026-07-13T00:41:10.000000Z",
    "updated_at":"2026-07-13T00:41:17.000000Z",
    "logs_available":true,
    "logs_info":"Logs available (5683 chars). Use lines param to retrieve.",
    "logs":"[2026-07-13T00:41:12.163071Z] Docker 29.4.0 with BuildKit and Buildx detected on deployment server (localhost).\n[2026-07-13T00:41:12.172589Z] Starting deployment of nginx:alpine to localhost.\n[2026-07-13T00:41:12.520817Z] Preparing container with helper image: ghcr.io/coollabsio/coolify-helper:1.0.14\n[2026-07-13T00:41:14.258460Z] ----------------------------------------\n[2026-07-13T00:41:14.266745Z] Rolling update started.\n[2026-07-13T00:41:14.388804Z] Pulling latest images from the registry.\n[2026-07-13T00:41:16.684303Z] New container started.\n[2026-07-13T00:41:16.694920Z] Removing old containers.\n[2026-07-13T00:41:16.876683Z] Rolling update completed.\n[2026-07-13T00:41:17.317915Z] Gracefully shutting down build container: jebl7peop60i0ircz9jlhot4",
    "logs_meta":{"total_entries":10,"showing":"1-10 of 10"}
  }
}
```
Verdict: WORKS ✓ — KEY FINDING: StuMason JSON.parses the inline `logs` array (raw API returns JSON-encoded string of structured entries), flattens `output` strings with `[timestamp]` prefix, applies `lines` as last-N entries slice, returns `logs_meta` pagination metadata. Pattern to adopt in awesome-coolify-mcp Phase 5 PLAN 05-02.

## Tools NOT tested live (mutations — deferred to user-approved UAT)

- `control` with action=start|stop|restart (any resource) — would mutate live state
- `application` action=create|update|delete — mutations
- `service` action=create|update|delete — mutations
- `database` action=create|delete — mutations
- `deploy` (with or without wait:true) — mutation (deploys app)
- `deployment` action=cancel — mutation
- `env_vars` create/update/delete — mutations
- `storages` create/update/delete — mutations
- `scheduled_tasks` create/update/delete/run_once — mutations
- `private_keys` create/update/delete — mutations
- `github_apps` create/update/delete — mutations
- `cloud_tokens` create/update/delete — mutations
- `hetzner` create_server — mutation (would provision real cloud server)
- `restart_project_apps`, `stop_all_apps`, `redeploy_project`, `bulk_env_update` — bulk mutations
- `system` action=enable_api|disable_api — mutation (toggles Coolify API access)

## Tools confirmed absent (StuMason correctly omits)

- `service_logs` — NOT SHIPPED (endpoint 404 in v4.1.2)
- `database_logs` — NOT SHIPPED (endpoint 404 in v4.1.2)
- `execute_command` — NOT SHIPPED (endpoint broken/absent)
