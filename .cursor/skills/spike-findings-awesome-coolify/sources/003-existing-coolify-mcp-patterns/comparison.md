# Existing Coolify MCP Servers — Pattern Comparison

Three existing Coolify MCP servers inspected: `user-coolify`, `user-coolify-backup-mcp`, `stumason/coolify-mcp`. All target the same Coolify 4.1.x API. Schemas inspected via MCP tool discovery; stumason docs via context7.

## At-a-glance

| Server | Tool count | Schema style | Token cost | Multi-instance | Confirmation | Sensitive masking |
|--------|-----------|--------------|-----------|----------------|--------------|-------------------|
| user-coolify | ~75 | Granular (one tool per op) | High (~43k baseline) | Env vars (single instance) | Env var `COOLIFY_REQUIRE_CONFIRM=true` | None documented |
| user-coolify-backup-mcp | ~42 | Action-based (flat params) | Medium | Env vars (single instance) | Per-call `confirm: true` arg | `reveal: true` opt-in; `***` default |
| stumason/coolify-mcp v2.0.0 | 38 | Action-based (`resource`+`action`) | Low (~6.6k, 85% reduction) | Unknown (likely env vars) | Per-call `confirm` | Summary mode; `_actions` hints |

## Proven patterns to adopt (v1)

### 1. Action-based tool schema — confirmed by 2 of 3 servers
- **stumason**: `control({ resource: 'application', action: 'restart', uuid })` — unified lifecycle across resource types
- **user-coolify-backup-mcp**: `application({ action: 'create_public'|'update'|'delete'|..., ...args })` — flat params
- **v1 decision**: use zod `discriminatedUnion('action', [...])` for type safety (improvement over flat-params approach). One tool per domain: `application`, `server`, `deployment`, `database`, `service`, `project`, `instance`, `system`.

### 2. Unified `control` tool for start/stop/restart
- **user-coolify-backup-mcp**: `control({ resource, action, uuid })` — single tool replaces 9 granular tools (start/stop/restart × app/db/service)
- **v1 decision**: adopt. Reduces tool count, clean annotations (all destructive+idempotent).

### 3. Sensitive-value masking with `reveal` opt-in
- **user-coolify-backup-mcp**: env vars returned as `***` by default; `reveal: true` for plaintext. Same pattern for `system` tool's `include_full: true` + `reveal: true`.
- **v1 decision**: adopt. Apply to env vars, webhook secrets, DB passwords, compose bodies, connection strings, custom labels.

### 4. `include_logs` / `include_full` opt-in for large payloads
- **user-coolify-backup-mcp `deployment`**: "Logs excluded by default on all actions — for get use `lines` (paginated tail), for list_for_app use `include_logs: true`"
- **user-coolify-backup-mcp `system`**: `list_resources` defaults to essential projection (uuid/name/type/status); `include_full: true` for raw payload
- **v1 decision**: adopt. Default to summary projections; opt-in for full payloads. Matches Spike 001 finding (deployment logs are inline string, must cap with `max_chars`).

### 5. Per-call `confirm: true` for destructive ops
- **user-coolify-backup-mcp**: `stop_all_apps` requires `confirm: true`; `delete_*` tools require `confirm: true`
- **stumason**: `stop_all_apps` requires `confirm: true`
- **user-coolify (anti-pattern)**: uses env var `COOLIFY_REQUIRE_CONFIRM=true` — global toggle, inflexible
- **v1 decision**: per-call `confirm: true` arg (matches PROJECT.md). No env-var gate.

### 6. Smart diagnostics by UUID/name/domain/IP
- **user-coolify-backup-mcp**: `diagnose_app({ uuid?, name?, domain? })`, `diagnose_server({ uuid?, name?, ip? })`
- **stumason**: "smart lookup for diagnostic tools accepting various identifiers (name, domain, IP) not just UUIDs"
- **v1 decision**: adopt. v1 ops scope includes diagnose — smart lookup is core DX.

### 7. Global issue scan + infrastructure overview
- **user-coolify-backup-mcp**: `find_issues` (scan unhealthy apps/DBs/services, unreachable servers, exited services), `get_infrastructure_overview` (counts)
- **stumason**: similar batch/diagnostic tools
- **v1 decision**: adopt both. Direct match for PROJECT.md "Global Issue-Scan" + "Infrastructure-Overview".

### 8. `run_once` composite for scheduled tasks
- **user-coolify-backup-mcp `scheduled_tasks`**: "run_once: composite that creates a throwaway `* * * * *` task, polls list_executions every ~5s for first terminal execution (or until wait_seconds elapses, default 90), deletes the task, returns status+message. WARNING: cron may fire more than once — make command idempotent. Coolify stores `command` in varchar(255) — keep ≤255 chars (#234)."
- **v1 decision**: v2 feature (scheduled tasks not in v1 ops scope), but document the 255-char limit and idempotency warning in REQUIREMENTS.md.

### 9. HATEOAS-style `_actions` hints in responses (stumason)
- **stumason**: every response includes `_actions: [{ tool, args, hint }]` suggesting next steps, `_pagination: { next: { tool, args } }` for pagination
- Example: `get_application` returns app + `_actions: [{ tool: 'application_logs', args: {uuid}, hint: 'View logs' }, { tool: 'control', args: {resource:'application', action:'restart', uuid}, hint: 'Restart' }]`
- **v1 decision**: adopt. Matches `mcp_features.md` §2 "Follow-up Action Hints nach Get-Operationen". High DX value for agents — reduces follow-up guessing.

### 10. Batch ops with `Promise.allSettled` (stumason)
- **stumason**: `restart_project_apps`, `redeploy_project`, `stop_all_apps`, `bulk_env_update` — all return `BatchOperationResult { summary: {total, succeeded, failed}, succeeded: [...], failed: [...] }`
- Uses `Promise.allSettled` for partial-failure tolerance
- **v1 decision**: v1 includes `stop_all_apps` (emergency) + project-restart/redeploy is v2. Adopt `Promise.allSettled` + `BatchOperationResult` shape for v1 emergency stop.

### 11. `search_docs` tool
- **user-coolify-backup-mcp**: `search_docs` — search Coolify documentation for how-to/config/troubleshooting
- **v1 decision**: v2 feature (not in v1 ops scope). Document in REQUIREMENTS.md.

## Anti-patterns to avoid (v1)

### 1. Granular 75-tool schema (user-coolify)
- 75 tools = ~43k tokens of schema alone before any call
- stumason reduced to 38 tools / 6.6k tokens (85% reduction) via action-based schema
- **v1 avoids**: action-based from day one (PROJECT.md DX-01)

### 2. Shipping tools for broken/missing endpoints (user-coolify)
- user-coolify ships `execute_command` (marked "endpoint not available"), `get_database_logs` (marked "not available"), `get_service_logs` (marked "not available")
- Agent may call these, get error, waste a round-trip
- **v1 avoids**: don't ship tools for endpoints not in OpenAPI (Spike 001 confirmed: no execute, no DB/service logs via REST). Surface as documented limitations, not tools.

### 3. Env-var-only confirmation gate (user-coolify)
- `COOLIFY_REQUIRE_CONFIRM=true` is global toggle — either every destructive op needs confirm or none do
- Inflexible: emergency stop should always need confirm; restart might not
- **v1 avoids**: per-call `confirm: true` arg on destructive actions only

### 4. Flat param schema for action tools (user-coolify-backup-mcp `application`)
- All params (`project_uuid`, `server_uuid`, `github_app_uuid`, `private_key_uuid`, `destination_uuid`, `git_repository`, `git_branch`, `environment_name`, `environment_uuid`, `build_pack`, `ports_exposes`, ...) visible for every action
- Agent can't tell which params apply to `create_public` vs `update` vs `delete`
- **v1 avoids**: zod `discriminatedUnion('action', [...])` — each action variant exposes only its relevant params. Type-safe, self-documenting.

### 5. No structured error codes (all three)
- All three return errors as text in `content[0].text` — no structured `error: { code, message, hint }` field
- Agent must parse free-text to recover
- **v1 avoids**: structured error codes per Spike 002 (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, RATE_LIMITED, COOLIFY_ERROR) with recovery hints in `structuredContent.error`

## Feature gaps in existing servers (v1 differentiation)

| Capability | user-coolify | user-coolify-backup-mcp | stumason | v1 plan |
|-----------|--------------|------------------------|----------|---------|
| Multi-instance (config file) | ✗ (env vars) | ✗ (env vars) | ✗ (likely env vars) | **✓** (`~/.coolify-mcp/instances.json` + `instance` arg) |
| Structured error codes | ✗ | ✗ | ✗ | **✓** (6 codes + hints) |
| Action-based schema | ✗ | ✓ (flat) | ✓ (resource+action) | **✓** (zod discriminatedUnion) |
| HATEOAS `_actions` hints | ✗ | ✗ | ✓ | **✓** (adopt) |
| Wait-mode deploy polling | ✗ (fire-and-forget) | Partial | Unknown | **✓** (poll `/deployments/{uuid}` to terminal) |
| Smart diagnostics | ✗ (UUID only) | ✓ (name/domain/IP) | ✓ | **✓** |
| `reveal` opt-in masking | ✗ | ✓ | Partial | **✓** |
| No broken-endpoint tools | ✗ (ships broken) | Mostly | Unknown | **✓** |
| npm package | Unknown | Unknown | Unknown | **✓** (`npx coolify-mcp`) |

**v1 differentiation**: multi-instance via config file + structured error codes + wait-mode deploy polling + no broken-endpoint tools. These are the three gaps none of the existing servers fill well.

## Tool inventory reference

### user-coolify (75 tools, granular) — NOT v1 model
- Lifecycle split across: `start_application`, `stop_application`, `restart_application`, `start_database`, `stop_database`, `restart_database`, `start_service`, `stop_service`, `restart_service` (9 tools)
- Create split across: `create_application`, `create_public_application`, `create_private_github_app_application`, `create_private_deploy_key_application`, `create_dockerfile_application`, `create_dockerimage_application`, `create_dockercompose_application`, `create_database`, `create_service`, `create_project`, `create_environment`, `create_server`, `create_private_key`, `create_github_app`, `create_application_env`, `create_service_env`, `create_database_backup` (17 tools)
- Get split across: `get_application`, `get_database`, `get_service`, `get_server`, `get_project`, `get_environment`, `get_deployment`, `get_application_deployments`, `get_application_envs`, `get_application_logs`, `get_database_logs`, `get_database_backups`, `get_service_envs`, `get_service_logs`, `get_server_domains`, `get_server_resources`, `get_github_app`, `get_github_app_repositories`, `get_github_app_repository_branches`, `get_private_key`, `get_team`, `get_team_members`, `get_current_team`, `get_current_team_members`, `get_version` (25 tools)
- List: `list_applications`, `list_databases`, `list_services`, `list_servers`, `list_projects`, `list_environments`, `list_resources`, `list_deployments`, `list_github_apps`, `list_private_keys`, `list_teams` (11 tools)
- Update: 11 update tools
- Delete: 10 delete tools
- Broken: `execute_command`, `get_database_logs`, `get_service_logs` (3 tools that return errors)
- Auth/meta: `mcp_auth`, `health_check`, `get_version`, `deploy`, `deploy_application`, `cancel_deployment`, `validate_server`, `update_application_envs_bulk`, `update_service_envs_bulk` (9 tools)

### user-coolify-backup-mcp (~42 tools, action-based) — partial v1 model
- Domain tools: `application`, `database`, `service`, `projects`, `environments`, `servers` (via `get_server`/`list_servers`/`validate_server`/`server_domains`/`server_resources`), `teams`, `github_apps`, `private_keys`, `cloud_tokens`, `hetzner`, `scheduled_tasks`, `storages`, `database_backups`
- Unified: `control` (start/stop/restart), `env_vars` (app/service/db), `deployment` (get/cancel/list_for_app)
- Diagnostic: `diagnose_app`, `diagnose_server`, `find_issues`, `get_infrastructure_overview`
- Batch: `stop_all_apps`, `redeploy_project`, `restart_project_apps`, `bulk_env_update`
- Meta: `get_version`, `get_mcp_version`, `mcp_auth`, `search_docs`, `system`
- Read shortcuts: `list_applications`, `list_databases`, `list_services`, `list_servers`, `list_deployments`, `get_application`, `get_database`, `get_service`, `get_server`, `application_logs`

### stumason/coolify-mcp v2.0.0 (38 tools, action-based) — closest v1 model
- Same action-based philosophy, HATEOAS `_actions`/`_pagination` in responses, summary mode, smart lookup, `Promise.allSettled` batch ops
- 85% token reduction vs granular baseline
