# kof70 coolify-mcp-server Tool Inventory

Source: https://github.com/kof70/coolify-mcp-server README "## 🛠️ Available Tools" section
Package: `coolify-mcp-server-kof70`
MCP server id in Cursor: `user-coolify` (config name `coolify`)

## Tool categories (16+ categories, ~80+ tools — granular per-resource naming)

### Version & Health (2)
- get_version, health_check

### Teams (5)
- list_teams, get_team, get_current_team, get_current_team_members, get_team_members

### Servers (8)
- list_servers, get_server, create_server, update_server, delete_server, validate_server, get_server_resources, get_server_domains

### Projects & Environments (9)
- list_projects, get_project, create_project, update_project, delete_project
- list_environments, get_environment, create_environment, delete_environment

### Applications (18)
- list_applications, get_application
- create_application, create_public_application, create_private_github_app_application, create_private_deploy_key_application, create_dockerfile_application, create_dockerimage_application, create_dockercompose_application
- update_application, delete_application
- start_application, stop_application, restart_application
- deploy_application, deploy (generic by uuid/tag), execute_command
- get_application_logs, get_application_deployments

### Application Environment Variables (5)
- get_application_envs, create_application_env, update_application_env, delete_application_env, update_application_envs_bulk

### Services (10)
- list_services, get_service, create_service, update_service, delete_service
- start_service, stop_service, restart_service  ← NO pull_latest field on restart
- get_service_envs, create_service_env, update_service_env, delete_service_env, update_service_envs_bulk

### Service Environment Variables (5) — listed under Services above

### Databases (10)
- list_databases, get_database, create_database (8 DB types), update_database, delete_database
- start_database, stop_database, restart_database
- get_database_backups, create_database_backup

### Deployments (3)
- list_deployments, get_deployment, cancel_deployment  ← NO lines param on get_deployment

### Private Keys (5)
- list_private_keys, get_private_key, create_private_key, update_private_key, delete_private_key

### GitHub Apps (7)
- list_github_apps, get_github_app, create_github_app, update_github_app, delete_github_app
- get_github_app_repositories, get_github_app_repository_branches

### Resources (1)
- list_resources  ← returns FULL payload by default (403 KB for 24 resources)

### Stub tools (3) — ship but always error
- **get_service_logs** — "This endpoint is not available in Coolify API and will return an error. Service logs are not exposed via the API."
- **get_database_logs** — "This endpoint is not available in Coolify API and will return an error. Database logs are not exposed via the API."
- **execute_command** — "This endpoint is not available in Coolify API and will return an error."

## Notable design choices

- **Granular per-resource tool naming** — 9 separate lifecycle tools (start/stop/restart × application/service/database) vs StuMason's 1 unified `control` tool. Token bloat anti-pattern.
- **Stub tools for absent endpoints** — ships `get_service_logs`, `get_database_logs`, `execute_command` as tools that always return errors. Anti-pattern per user's "no non-working tools" directive.
- **`restart_service` has NO `pull_latest` field** — cannot trigger pull-latest-image restart via PR #5881 `?latest=true` query param.
- **`deploy` has NO `pull_latest` field** — generic deploy by UUID/tag with `force` only.
- **`get_deployment` has NO `lines` param** — returns raw deployment object with `logs` as raw JSON-encoded string array (no parsing, no slicing, no flattening).
- **`list_resources` returns FULL payload** — 403 KB for 24 resources, no summary projection by default. Token catastrophe.
- **ENV-VAR confirm gate** — `COOLIFY_REQUIRE_CONFIRM=true` env var toggles confirmation requirement globally; per-call `confirm: true` only checked when env var is set. Anti-pattern vs StuMason's per-call always-required `confirm: true`.
- **No multi-instance support** — env vars only.

## Security posture

- `env_vars` masks values as `***` by default (per README, not live-verified)
- `get_database` — leaks `postgres_password`, `internal_db_url`, `external_db_url` in plaintext (per Spike 005a test on StuMason — kof70 likely same since both call same endpoint)
- `get_deployment` — leaks `manual_webhook_secret_github/gitlab/bitbucket/gitea`, `http_basic_auth_password`, `destination.server.settings.sentinel_token` IN PLAINTEXT (live-verified in this spike)
- `list_resources` — returns full payload including all secret fields (per live test, 403 KB response)

## Read-Only Mode

Per README: "🔒 Read-Only Mode" — env var `COOLIFY_READ_ONLY=true` disables all mutation tools. Distinct from `COOLIFY_REQUIRE_CONFIRM`.
