# OpenAPI Coverage — awesome-coolify-mcp

> Committed gap report — regenerate with `pnpm run openapi:coverage`.

## Summary

| bucket | count |
| --- | ---: |
| covered | 5 |
| deferred | 1 |
| out-of-scope | 6 |
| gap | 210 |

## Actions

| tool.action | client | openapi | bucket | reason |
| --- | --- | --- | --- | --- |
| `application.deploy` | triggerDeploy | POST /deploy | gap | Mapped OpenAPI key missing from dereferenced spec |
| `application.get` | fetchApplication | GET /applications/{uuid} | covered | — |
| `application.restart` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `application.start` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `application.stop` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.restart` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.start` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.stop` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `database.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `deployment.cancel` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `deployment.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `deployment.list` | fetchAppDeployments | GET /deployments/applications/{uuid} | covered | — |
| `deployment.watch` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `diagnose.app` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `diagnose.scan` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `diagnose.server` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `docs.search` | — | — | out-of-scope | Local docs index — no Coolify REST op |
| `emergency.redeploy_project` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `emergency.restart_project` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `emergency.stop_all` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `environment.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `environment.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `environment.delete_preview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `environment.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `environment.list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.add` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.cloud-info` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.import-env` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.set-default` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `instance.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `manifest.clear` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `manifest.diff` | — | — | out-of-scope | Local workspace file only — no Coolify REST op |
| `manifest.get` | — | — | out-of-scope | Local workspace file only — no Coolify REST op |
| `manifest.remove` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `manifest.set` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `manifest.sync` | — | — | out-of-scope | Local workspace file only — no Coolify REST op |
| `manifest.upsert` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `meta.version` | — | — | out-of-scope | Package version — not Coolify API |
| `private_key.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `private_key.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `private_key.delete_preview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `private_key.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `private_key.list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `private_key.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.delete_preview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `project.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `recipe.create-app-db` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `recipe.create-git-app` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `recipe.create-one-click` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `resource.find` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `resource.list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.delete_preview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `server.validate` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.delete_preview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.deploy` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:bulk-update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:create` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:delete` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:get` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:list` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.envs:update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.get` | fetchService | GET /services/{uuid} | covered | — |
| `service.list-types` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.restart` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.start` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.stop` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `service.update` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `setup.preflight` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `setup.resume` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `setup.wire` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `system.health` | fetchHealth | GET /health | covered | — |
| `system.infrastructure_overview` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `system.verify` | — | — | gap | No OpenAPI mapping in coverage-map.yaml |
| `system.version` | fetchVersion | GET /version | covered | — |
| `GET /services/{uuid}/logs` | — | GET /services/{uuid}/logs | deferred | SVC-04 — Coolify 4.1.x has no service log endpoint |
| `execute_command` | — | execute_command | out-of-scope | Absent from OpenAPI per Spike 001 — not in v4.x spec |
| `GET /applications` | — | GET /applications | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/public` | — | POST /applications/public | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/private-github-app` | — | POST /applications/private-github-app | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/private-deploy-key` | — | POST /applications/private-deploy-key | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/dockerfile` | — | POST /applications/dockerfile | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/dockerimage` | — | POST /applications/dockerimage | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}` | — | PATCH /applications/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /applications/{uuid}` | — | DELETE /applications/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/logs` | — | GET /applications/{uuid}/logs | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/envs` | — | GET /applications/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/{uuid}/envs` | — | POST /applications/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}/envs` | — | PATCH /applications/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}/envs/bulk` | — | PATCH /applications/{uuid}/envs/bulk | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /applications/{uuid}/envs/{env_uuid}` | — | DELETE /applications/{uuid}/envs/{env_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/start` | — | GET /applications/{uuid}/start | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/stop` | — | GET /applications/{uuid}/stop | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/restart` | — | GET /applications/{uuid}/restart | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/storages` | — | GET /applications/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/{uuid}/storages` | — | POST /applications/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}/storages` | — | PATCH /applications/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /applications/{uuid}/storages/{storage_uuid}` | — | DELETE /applications/{uuid}/storages/{storage_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /applications/{uuid}/previews/{pull_request_id}` | — | DELETE /applications/{uuid}/previews/{pull_request_id} | gap | OpenAPI operation has no MCP action mapping |
| `GET /cloud-tokens` | — | GET /cloud-tokens | gap | OpenAPI operation has no MCP action mapping |
| `POST /cloud-tokens` | — | POST /cloud-tokens | gap | OpenAPI operation has no MCP action mapping |
| `GET /cloud-tokens/{uuid}` | — | GET /cloud-tokens/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /cloud-tokens/{uuid}` | — | PATCH /cloud-tokens/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /cloud-tokens/{uuid}` | — | DELETE /cloud-tokens/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `POST /cloud-tokens/{uuid}/validate` | — | POST /cloud-tokens/{uuid}/validate | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases` | — | GET /databases | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/backups` | — | GET /databases/{uuid}/backups | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/{uuid}/backups` | — | POST /databases/{uuid}/backups | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}` | — | GET /databases/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}` | — | PATCH /databases/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}` | — | DELETE /databases/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}` | — | PATCH /databases/{uuid}/backups/{scheduled_backup_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}` | — | DELETE /databases/{uuid}/backups/{scheduled_backup_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/postgresql` | — | POST /databases/postgresql | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/clickhouse` | — | POST /databases/clickhouse | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/dragonfly` | — | POST /databases/dragonfly | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/redis` | — | POST /databases/redis | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/keydb` | — | POST /databases/keydb | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/mariadb` | — | POST /databases/mariadb | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/mysql` | — | POST /databases/mysql | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/mongodb` | — | POST /databases/mongodb | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}/executions/{execution_uuid}` | — | DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}/executions/{execution_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions` | — | GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/start` | — | GET /databases/{uuid}/start | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/stop` | — | GET /databases/{uuid}/stop | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/restart` | — | GET /databases/{uuid}/restart | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/envs` | — | GET /databases/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/{uuid}/envs` | — | POST /databases/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/envs` | — | PATCH /databases/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/envs/bulk` | — | PATCH /databases/{uuid}/envs/bulk | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}/envs/{env_uuid}` | — | DELETE /databases/{uuid}/envs/{env_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/storages` | — | GET /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/{uuid}/storages` | — | POST /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/storages` | — | PATCH /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}/storages/{storage_uuid}` | — | DELETE /databases/{uuid}/storages/{storage_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /deployments` | — | GET /deployments | gap | OpenAPI operation has no MCP action mapping |
| `GET /deployments/{uuid}` | — | GET /deployments/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `POST /deployments/{uuid}/cancel` | — | POST /deployments/{uuid}/cancel | gap | OpenAPI operation has no MCP action mapping |
| `GET /deploy` | — | GET /deploy | gap | OpenAPI operation has no MCP action mapping |
| `GET /github-apps` | — | GET /github-apps | gap | OpenAPI operation has no MCP action mapping |
| `POST /github-apps` | — | POST /github-apps | gap | OpenAPI operation has no MCP action mapping |
| `GET /github-apps/{github_app_id}/repositories` | — | GET /github-apps/{github_app_id}/repositories | gap | OpenAPI operation has no MCP action mapping |
| `GET /github-apps/{github_app_id}/repositories/{owner}/{repo}/branches` | — | GET /github-apps/{github_app_id}/repositories/{owner}/{repo}/branches | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /github-apps/{github_app_id}` | — | PATCH /github-apps/{github_app_id} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /github-apps/{github_app_id}` | — | DELETE /github-apps/{github_app_id} | gap | OpenAPI operation has no MCP action mapping |
| `GET /hetzner/locations` | — | GET /hetzner/locations | gap | OpenAPI operation has no MCP action mapping |
| `GET /hetzner/server-types` | — | GET /hetzner/server-types | gap | OpenAPI operation has no MCP action mapping |
| `GET /hetzner/images` | — | GET /hetzner/images | gap | OpenAPI operation has no MCP action mapping |
| `GET /hetzner/ssh-keys` | — | GET /hetzner/ssh-keys | gap | OpenAPI operation has no MCP action mapping |
| `POST /servers/hetzner` | — | POST /servers/hetzner | gap | OpenAPI operation has no MCP action mapping |
| `GET /enable` | — | GET /enable | gap | OpenAPI operation has no MCP action mapping |
| `GET /disable` | — | GET /disable | gap | OpenAPI operation has no MCP action mapping |
| `POST /mcp/enable` | — | POST /mcp/enable | gap | OpenAPI operation has no MCP action mapping |
| `POST /mcp/disable` | — | POST /mcp/disable | gap | OpenAPI operation has no MCP action mapping |
| `GET /projects` | — | GET /projects | gap | OpenAPI operation has no MCP action mapping |
| `POST /projects` | — | POST /projects | gap | OpenAPI operation has no MCP action mapping |
| `GET /projects/{uuid}` | — | GET /projects/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /projects/{uuid}` | — | PATCH /projects/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /projects/{uuid}` | — | DELETE /projects/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /projects/{uuid}/{environment_name_or_uuid}` | — | GET /projects/{uuid}/{environment_name_or_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /projects/{uuid}/environments` | — | GET /projects/{uuid}/environments | gap | OpenAPI operation has no MCP action mapping |
| `POST /projects/{uuid}/environments` | — | POST /projects/{uuid}/environments | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /projects/{uuid}/environments/{environment_name_or_uuid}` | — | DELETE /projects/{uuid}/environments/{environment_name_or_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /resources` | — | GET /resources | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/scheduled-tasks` | — | GET /applications/{uuid}/scheduled-tasks | gap | OpenAPI operation has no MCP action mapping |
| `POST /applications/{uuid}/scheduled-tasks` | — | POST /applications/{uuid}/scheduled-tasks | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}/scheduled-tasks/{task_uuid}` | — | PATCH /applications/{uuid}/scheduled-tasks/{task_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /applications/{uuid}/scheduled-tasks/{task_uuid}` | — | DELETE /applications/{uuid}/scheduled-tasks/{task_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /applications/{uuid}/scheduled-tasks/{task_uuid}/executions` | — | GET /applications/{uuid}/scheduled-tasks/{task_uuid}/executions | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/scheduled-tasks` | — | GET /services/{uuid}/scheduled-tasks | gap | OpenAPI operation has no MCP action mapping |
| `POST /services/{uuid}/scheduled-tasks` | — | POST /services/{uuid}/scheduled-tasks | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}/scheduled-tasks/{task_uuid}` | — | PATCH /services/{uuid}/scheduled-tasks/{task_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /services/{uuid}/scheduled-tasks/{task_uuid}` | — | DELETE /services/{uuid}/scheduled-tasks/{task_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/scheduled-tasks/{task_uuid}/executions` | — | GET /services/{uuid}/scheduled-tasks/{task_uuid}/executions | gap | OpenAPI operation has no MCP action mapping |
| `GET /security/keys` | — | GET /security/keys | gap | OpenAPI operation has no MCP action mapping |
| `POST /security/keys` | — | POST /security/keys | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /security/keys` | — | PATCH /security/keys | gap | OpenAPI operation has no MCP action mapping |
| `GET /security/keys/{uuid}` | — | GET /security/keys/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /security/keys/{uuid}` | — | DELETE /security/keys/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /servers` | — | GET /servers | gap | OpenAPI operation has no MCP action mapping |
| `POST /servers` | — | POST /servers | gap | OpenAPI operation has no MCP action mapping |
| `GET /servers/{uuid}` | — | GET /servers/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /servers/{uuid}` | — | PATCH /servers/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /servers/{uuid}` | — | DELETE /servers/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /servers/{uuid}/resources` | — | GET /servers/{uuid}/resources | gap | OpenAPI operation has no MCP action mapping |
| `GET /servers/{uuid}/domains` | — | GET /servers/{uuid}/domains | gap | OpenAPI operation has no MCP action mapping |
| `GET /servers/{uuid}/validate` | — | GET /servers/{uuid}/validate | gap | OpenAPI operation has no MCP action mapping |
| `GET /services` | — | GET /services | gap | OpenAPI operation has no MCP action mapping |
| `POST /services` | — | POST /services | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}` | — | PATCH /services/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /services/{uuid}` | — | DELETE /services/{uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/envs` | — | GET /services/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `POST /services/{uuid}/envs` | — | POST /services/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}/envs` | — | PATCH /services/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}/envs/bulk` | — | PATCH /services/{uuid}/envs/bulk | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /services/{uuid}/envs/{env_uuid}` | — | DELETE /services/{uuid}/envs/{env_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/start` | — | GET /services/{uuid}/start | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/stop` | — | GET /services/{uuid}/stop | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/restart` | — | GET /services/{uuid}/restart | gap | OpenAPI operation has no MCP action mapping |
| `GET /services/{uuid}/storages` | — | GET /services/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `POST /services/{uuid}/storages` | — | POST /services/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}/storages` | — | PATCH /services/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /services/{uuid}/storages/{storage_uuid}` | — | DELETE /services/{uuid}/storages/{storage_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /teams` | — | GET /teams | gap | OpenAPI operation has no MCP action mapping |
| `GET /teams/{id}` | — | GET /teams/{id} | gap | OpenAPI operation has no MCP action mapping |
| `GET /teams/{id}/members` | — | GET /teams/{id}/members | gap | OpenAPI operation has no MCP action mapping |
| `GET /teams/current` | — | GET /teams/current | gap | OpenAPI operation has no MCP action mapping |
| `GET /teams/current/members` | — | GET /teams/current/members | gap | OpenAPI operation has no MCP action mapping |

---

_Generated by `pnpm run openapi:coverage`._

