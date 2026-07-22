# kof70 coolify-mcp-server Live Call Results

Date: 2026-07-13
Instance: http://185.248.140.207:8000 (= puzzlesstool.online v4.1.2, same backend IP)
Token: `1|w3Uwx021IAk8tDr7A7MFYVonXklYQaLuRbSEksji8d72dbf4` (kof70's configured token, different scope from StuMason's)
MCP server: user-coolify (coolify-mcp-server-kof70)

## Instance identity verification

`http://185.248.140.207:8000` confirmed as same backend as `https://puzzlesstool.online`:
- DNS: puzzlesstool.online resolves to 185.248.140.207
- `/version` returns "4.1.2" on both URLs
- `list_resources` returns identical UUIDs (e.g. `jdjb1z6iaj0dkib9vzwgr9nr` = clared-gotenberg on both)

User's "same Coolify instance" statement verified.

## get_version
```json
"4.1.2"
```
Verdict: WORKS ✓ — maps to GET /version

## health_check
```json
"OK"
```
Verdict: WORKS ✓ — maps to GET /health

## list_resources
Response: 403.8 KB / 4852 lines (written to /Users/puzzless/.cursor/projects/Users-puzzless-Desktop-awesome-coolify/agent-tools/f81b32c6-1e05-4ce6-baf8-d6cc3e7f6704.txt)
Shape: array of 24 resource objects, each with full projection (id, uuid, name, fqdn, config_hash, git_repository, docker_compose, custom_labels, manual_webhook_secret_*, etc.)
Verdict: WORKS ✓ — maps to GET /resources. **Anti-pattern: returns full payload by default, no summary projection. 403 KB / ~100k tokens for 24 resources.**

## get_application_logs (uuid=jt4mw1b0ld3542i9w9nfmqkr, lines=5)
```json
{"logs":"10.0.1.22 - - [13/Jul/2026:02:26:50 +0000] \"GET /favicon.ico HTTP/1.1\" 404 555 ..."}
```
Verdict: WORKS ✓ — raw passthrough of GET /applications/{uuid}/logs. Same shape as StuMason application_logs.

## get_service_logs (uuid=j105904z7t8enrqnzjerbd92, lines=5) — KEY STUB TEST
```json
{"error":"Service logs endpoint is not available in Coolify API. Service logs are not exposed via the API."}
```
Verdict: **ERROR-STUB** — tool ships but always returns this error. Anti-pattern per user's "no non-working tools" directive. Confirms Spike 004 finding: `/services/{uuid}/logs` returns 404 on v4.1.2 (PR #6293 endpoints merged 2026-07-06 to `next` branch, NOT in v4.1.2).

## get_database_logs (uuid=wwv448u8322naf6xry5rhup4, lines=5) — KEY STUB TEST
```json
{"error":"Database logs endpoint is not available in Coolify API. Database logs are not exposed via the API."}
```
Verdict: **ERROR-STUB** — same anti-pattern as get_service_logs. Confirms Spike 004 finding: `/databases/{uuid}/logs` returns 404 on v4.1.2.

## get_deployment (uuid=jebl7peop60i0ircz9jlhot4) — KEY DEPLOYMENT LOGS TEST
Response: deployment object with full application embedded, plus `logs` field as RAW JSON-encoded string array.

Key fields:
- `id: 1032`
- `application: {id: 61, uuid: "jt4mw1b0ld3542i9w9nfmqkr", name: "mcp-uat-nginx", ..., manual_webhook_secret_github: "Xft08TAJK0d17cfIdWjDPPhiomabbbpTplpVt1cP", manual_webhook_secret_gitlab: "AevQ14LjZmMBxLKjdoyG3rlDrYUpQbx93QRWyJS2", manual_webhook_secret_bitbucket: "tLk8rIC6aQ42cPdA76dB5tFzAtxTHK4PKlLu4zNZ", manual_webhook_secret_gitea: "WH3tgkJ1fi98WasPrmZDy5FI3EEiIB2kLwtljtKJ", ..., destination: {server: {settings: {sentinel_token: "eyJpdiI6Ik5kbVRQTDJPUndZUDlZb3REYVBPWmc9PSI..."}}}}`
- `deployment_uuid: "jebl7peop60i0ircz9jlhot4"`
- `status: "finished"`
- `logs: "[{\"command\":null,\"output\":\"Docker 29.4.0 with BuildKit and Buildx detected on deployment server (localhost).\",\"type\":\"stdout\",\"timestamp\":\"2026-07-13T00:41:12.163071Z\",\"hidden\":false,\"batch\":1},{\"command\":null,\"output\":\"Starting deployment of nginx:alpine to localhost.\",\"type\":\"stdout\",\"timestamp\":\"2026-07-13T00:41:12.172589Z\",\"hidden\":false,\"batch\":1,\"order\":2},...]"` — 5683 chars of JSON-as-string, 23 entries, NOT parsed

Verdict: WORKS ✓ (but raw) — maps to GET /deployments/{uuid}.
**Anti-pattern 1**: `logs` returned as raw JSON-encoded string array — agent must JSON.parse it themselves to get human-readable lines. Compare StuMason (Spike 005a): JSON-parses, flattens `output` strings with `[timestamp]` prefix, supports `lines` slicing, returns `logs_meta` pagination.
**Anti-pattern 2**: leaks plaintext `manual_webhook_secret_*` (4 different git providers) + `http_basic_auth_password` (null in this sample but field exists) + `destination.server.settings.sentinel_token` (JWT-like Coolify auth token).

## Stub tool schemas (NOT live-tested, schema-confirmed)

### get_service_logs
```json
{
  "tool": "get_service_logs",
  "description": "Get logs from a service. NOTE: This endpoint is not available in Coolify API and will return an error. Service logs are not exposed via the API.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Service UUID"},
      "lines": {"type": "number", "description": "Number of lines (default: 100)", "default": 100}
    },
    "required": ["uuid"]
  }
}
```

### get_database_logs
```json
{
  "tool": "get_database_logs",
  "description": "Get logs from a database. NOTE: This endpoint is not available in Coolify API and will return an error. Database logs are not exposed via the API.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Database UUID"},
      "lines": {"type": "number", "description": "Number of lines (default: 100)", "default": 100}
    },
    "required": ["uuid"]
  }
}
```

### execute_command
```json
{
  "tool": "execute_command",
  "description": "Execute a command in an application container. NOTE: This endpoint is not available in Coolify API and will return an error.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Application UUID"},
      "command": {"type": "string", "description": "Command to execute"},
      "confirm": {"type": "boolean", "description": "Confirm the dangerous operation (required when COOLIFY_REQUIRE_CONFIRM=true)"}
    },
    "required": ["uuid", "command"]
  }
}
```

### restart_service
```json
{
  "tool": "restart_service",
  "description": "Restart a service. When COOLIFY_REQUIRE_CONFIRM=true, requires confirm: true parameter.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Service UUID"},
      "confirm": {"type": "boolean", "description": "Confirm the dangerous operation (required when COOLIFY_REQUIRE_CONFIRM=true)"}
    },
    "required": ["uuid"]
  }
}
```
**NO `latest` or `pull_latest` field** — cannot trigger pull-latest-image restart via PR #5881.

### deploy
```json
{
  "tool": "deploy",
  "description": "Deploy resources by UUID or tag. Supports deploying multiple resources at once using comma-separated values.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Resource UUID(s) to deploy (comma-separated for multiple)"},
      "tag": {"type": "string", "description": "Tag(s) to deploy (comma-separated for multiple)"},
      "force": {"type": "boolean", "description": "Force rebuild without cache", "default": false},
      "confirm": {"type": "boolean", "description": "Confirm the dangerous operation (required when COOLIFY_REQUIRE_CONFIRM=true)"}
    },
    "required": []
  }
}
```
**NO `pull_latest` field** — cannot satisfy SVC-05 (service deploy with pull-latest-images).

### deploy_application
```json
{
  "tool": "deploy_application",
  "description": "Deploy an application. When COOLIFY_REQUIRE_CONFIRM=true, requires confirm: true parameter.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uuid": {"type": "string", "description": "Application UUID"},
      "tag": {"type": "string", "description": "Tag to deploy (optional)"},
      "force": {"type": "boolean", "description": "Force rebuild without cache", "default": false},
      "instant_deploy": {"type": "boolean", "description": "Deploy immediately", "default": false},
      "confirm": {"type": "boolean", "description": "Confirm the dangerous operation (required when COOLIFY_REQUIRE_CONFIRM=true)"}
    },
    "required": ["uuid"]
  }
}
```
**NO `pull_latest` field** — app-only deploy, no service pull-latest support.

## Tools NOT tested live (mutations + would error anyway)

- start_application, stop_application, restart_application (mutations)
- start_service, stop_service, restart_service (mutations)
- start_database, stop_database, restart_database (mutations)
- deploy, deploy_application (mutations — would deploy apps)
- execute_command (mutation + would error per stub description)
- create_*/update_*/delete_* for all resource types (mutations)
- cancel_deployment (mutation)
- env_vars create/update/delete (mutations)
- private_keys create/update/delete (mutations)
- github_apps create/update/delete (mutations)
- bulk operations (mutations)

## Comparison summary vs StuMason (Spike 005a)

| Aspect | kof70 | StuMason |
|--------|-------|----------|
| service.logs tool | STUB (always errors) | NOT SHIPPED |
| database.logs tool | STUB (always errors) | NOT SHIPPED |
| execute_command tool | STUB (always errors) | NOT SHIPPED |
| deployment.logs handling | Raw JSON-array string passthrough | JSON-parse + flatten + timestamp prefix |
| service pull-latest | NOT EXPOSED | `control.pull_latest: boolean (services only)` |
| Schema style | ~80+ granular tools | 42 category-action-param tools |
| Confirm gate | ENV-VAR `COOLIFY_REQUIRE_CONFIRM=true` | Per-call `confirm: true` |
| Secret masking | NONE (leaks webhook + sentinel + DB password) | PARTIAL (env_vars + system masked; get_database leaks) |
| list_resources projection | FULL payload by default (403 KB / 24 resources) | SUMMARY by default |
