# StuMason coolify-mcp Tool Inventory

Source: https://github.com/StuMason/coolify-mcp README "## Tools" section
Package: `@masonator/coolify-mcp`
Repo tagline: "MCP server for Coolify — 42 optimized tools for managing self-hosted PaaS through AI assistants"

## Tool categories (16) and tools (42)

| Category | Tools |
|----------|-------|
| Infrastructure | get_infrastructure_overview, get_mcp_version, get_version, system (health, list_resources, enable/disable API) |
| Diagnostics | diagnose_app, diagnose_server, find_issues |
| Batch Operations | restart_project_apps, bulk_env_update, stop_all_apps, redeploy_project |
| Servers | list_servers, get_server, validate_server, server_resources, server_domains |
| Projects | projects (list, get, create, update, delete via action param) |
| Environments | environments (list, get, create, delete via action param) |
| Applications | list_applications, get_application, application (CRUD + delete_preview), application_logs |
| Databases | list_databases, get_database, database (create 8 types, delete), database_backups (CRUD schedules, executions incl. delete) |
| Services | list_services, get_service, service (create, update, delete) |
| Control | control (start/stop/restart for apps, databases, services) |
| Env Vars | env_vars (CRUD + bulk_update for application, service, and database env vars) |
| Storages | storages (list, create, update, delete persistent/file storages for apps, databases, services) |
| Scheduled Tasks | scheduled_tasks (list, create, update, delete, list_executions, run_once for apps and services) |
| Deployments | list_deployments, deploy (incl. wait-to-terminal-status), deployment (get, cancel, list_for_app) |
| Private Keys | private_keys (list, get, create, update, delete via action param) |
| GitHub Apps | github_apps (list, get, create, update, delete, list_repos, list_branches) |
| Teams | teams (list, get, get_members, get_current, get_current_members) |
| Cloud Tokens | cloud_tokens (Hetzner/DigitalOcean: list, get, create, update, delete, validate) |
| Hetzner Cloud | hetzner (list_locations, list_server_types, list_images, list_ssh_keys, create_server) |
| Documentation | search_docs (full-text search across Coolify docs) |

## Token optimization claim

"Token-optimized — consolidated action-param tools keep the tool list at ~6,600 tokens instead of ~43,000 (85% less), so the server doesn't eat your context window before you've asked anything."

## Notable design choices

- **NO service_logs tool** — StuMason does not expose service logs (correctly recognizes v4.1.x API gap)
- **NO database_logs tool** — same reasoning
- **NO execute_command tool** — broken endpoint not shipped
- Unified `control` tool with `pull_latest: boolean (services only)` for PR #5881 endpoint
- `application_logs` exists (endpoint /applications/{uuid}/logs works in v4.1.2)
- `deploy` tool supports `wait: true` for terminal-status polling (matches awesome-coolify-mcp Phase 4 D-07/D-08 pattern)
- `deployment` tool with `lines` param for paginated build-log tail + `include_logs: true` opt-in on `list_for_app`

## Security posture

- `env_vars` masks values as `***` by default; `reveal: true` opt-in
- `system list_resources (full mode)` masks webhook HMAC, basic-auth, DB passwords, internal/external_db_url, compose bodies, Traefik labels, nested env vars
- `deployment get` projects raw upstream payload (no secrets leak)
- BUT: `get_database` returns `postgres_password`, `internal_db_url`, `external_db_url` IN PLAINTEXT (verified live in this spike — see stumason-live-call-results.md)
