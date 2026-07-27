# OpenAPI Coverage — awesome-coolify-mcp

> Committed gap report — regenerate with `pnpm run openapi:coverage`.

## Summary

| bucket | count |
| --- | ---: |
| covered | 85 |
| deferred | 2 |
| out-of-scope | 31 |
| gap | 57 |

## Actions

| tool.action | client | openapi | bucket | reason |
| --- | --- | --- | --- | --- |
| `application.create` | createPublicApplication, createPrivateDeployKeyApplication, createPrivateGithubAppApplication, createDockerfileApplication, createDockerimageApplication, triggerDeploy | POST /applications/public, POST /applications/private-deploy-key, POST /applications/private-github-app, POST /applications/dockerfile, POST /applications/dockerimage, GET /deploy | covered | — |
| `application.delete` | deleteApplication | DELETE /applications/{uuid} | covered | — |
| `application.delete_preview` | fetchResources | GET /resources | covered | — |
| `application.deploy` | triggerDeploy, fetchDeployment | GET /deploy, GET /deployments/{uuid} | covered | — |
| `application.envs:bulk-update` | bulkUpdateEnvs | PATCH /applications/{uuid}/envs/bulk | covered | — |
| `application.envs:create` | createEnv, fetchEnvs | POST /applications/{uuid}/envs, GET /applications/{uuid}/envs | covered | — |
| `application.envs:delete` | deleteEnv | DELETE /applications/{uuid}/envs/{env_uuid} | covered | — |
| `application.envs:get` | fetchEnvs | GET /applications/{uuid}/envs | covered | — |
| `application.envs:list` | fetchEnvs | GET /applications/{uuid}/envs | covered | — |
| `application.envs:sync` | fetchEnvs, createEnv, updateEnvViaBulk, deleteEnv | GET /applications/{uuid}/envs, POST /applications/{uuid}/envs, PATCH /applications/{uuid}/envs/bulk, DELETE /applications/{uuid}/envs/{env_uuid} | out-of-scope | File↔remote env reconciliation orchestration |
| `application.envs:update` | fetchEnvs, updateEnvViaBulk | GET /applications/{uuid}/envs, PATCH /applications/{uuid}/envs/bulk | covered | — |
| `application.get` | fetchApplication | GET /applications/{uuid} | covered | — |
| `application.logs` | fetchApplicationLogs, fetchDeployment | GET /applications/{uuid}/logs, GET /deployments/{uuid} | covered | — |
| `application.restart` | triggerAppRestart | GET /applications/{uuid}/restart | covered | — |
| `application.start` | triggerAppStart | GET /applications/{uuid}/start | covered | — |
| `application.stop` | triggerAppStop | GET /applications/{uuid}/stop | covered | — |
| `application.update` | updateApplication, fetchApplication | PATCH /applications/{uuid}, GET /applications/{uuid} | covered | — |
| `database.backup:create` | createDatabaseBackup | POST /databases/{uuid}/backups | covered | — |
| `database.backup:delete` | deleteDatabaseBackup | DELETE /databases/{uuid}/backups/{scheduled_backup_uuid} | covered | — |
| `database.backup:history` | fetchBackupExecutions | GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions | covered | — |
| `database.backup:list` | fetchDatabaseBackups | GET /databases/{uuid}/backups | covered | — |
| `database.backup:now` | updateDatabaseBackup | PATCH /databases/{uuid}/backups/{scheduled_backup_uuid} | covered | — |
| `database.backup:update` | updateDatabaseBackup, fetchDatabaseBackups | PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}, GET /databases/{uuid}/backups | covered | — |
| `database.create` | createPostgresqlDatabase, createMysqlDatabase, createMariadbDatabase, createMongodbDatabase, createRedisDatabase, createClickhouseDatabase, createDragonflyDatabase, createKeydbDatabase | POST /databases/postgresql, POST /databases/mysql, POST /databases/mariadb, POST /databases/mongodb, POST /databases/redis, POST /databases/clickhouse, POST /databases/dragonfly, POST /databases/keydb | covered | — |
| `database.delete` | deleteDatabase | DELETE /databases/{uuid} | covered | — |
| `database.delete_preview` | fetchResources | GET /resources | covered | — |
| `database.envs:bulk-update` | bulkUpdateEnvs | PATCH /databases/{uuid}/envs/bulk | covered | — |
| `database.envs:create` | createEnv, fetchEnvs | POST /databases/{uuid}/envs, GET /databases/{uuid}/envs | covered | — |
| `database.envs:delete` | deleteEnv | DELETE /databases/{uuid}/envs/{env_uuid} | covered | — |
| `database.envs:get` | fetchEnvs | GET /databases/{uuid}/envs | covered | — |
| `database.envs:list` | fetchEnvs | GET /databases/{uuid}/envs | covered | — |
| `database.envs:update` | fetchEnvs, updateEnvViaBulk | GET /databases/{uuid}/envs, PATCH /databases/{uuid}/envs/bulk | covered | — |
| `database.get` | fetchDatabase | GET /databases/{uuid} | covered | — |
| `database.restart` | triggerDatabaseRestart | GET /databases/{uuid}/restart | covered | — |
| `database.start` | triggerDatabaseStart | GET /databases/{uuid}/start | covered | — |
| `database.stop` | triggerDatabaseStop | GET /databases/{uuid}/stop | covered | — |
| `database.update` | updateDatabase, fetchDatabase | PATCH /databases/{uuid}, GET /databases/{uuid} | covered | — |
| `deployment.cancel` | cancelDeployment | POST /deployments/{uuid}/cancel | covered | — |
| `deployment.get` | fetchDeployment | GET /deployments/{uuid} | covered | — |
| `deployment.list` | fetchAppDeployments | GET /deployments/applications/{uuid} | covered | — |
| `deployment.watch` | fetchDeployment | GET /deployments/{uuid} | out-of-scope | Polling orchestration over fetchDeployment |
| `diagnose.app` | fetchApplication, fetchApplicationEnvs, fetchAppDeployments | GET /applications/{uuid}, GET /applications/{uuid}/envs, GET /deployments/applications/{uuid} | covered | — |
| `diagnose.scan` | fetchServers, fetchResources | GET /servers, GET /resources | out-of-scope | Cross-resource scan orchestration |
| `diagnose.server` | fetchServer, fetchServerResources, fetchServerDomains, triggerServerValidate | GET /servers/{uuid}, GET /servers/{uuid}/resources, GET /servers/{uuid}/domains, GET /servers/{uuid}/validate | covered | — |
| `docs.search` | — | — | out-of-scope | Local docs index — no Coolify REST op |
| `emergency.redeploy_project` | fetchProject, fetchResources, triggerDeploy, fetchDeployment | GET /projects/{uuid}, GET /resources, GET /deploy, GET /deployments/{uuid} | out-of-scope | Fan-out deploy orchestration |
| `emergency.restart_project` | fetchResources, triggerAppRestart | GET /resources, GET /applications/{uuid}/restart | out-of-scope | Fan-out restart orchestration |
| `emergency.stop_all` | fetchResources, triggerAppStop | GET /resources, GET /applications/{uuid}/stop | out-of-scope | Fan-out orchestration over running applications |
| `environment.create` | createEnvironment, fetchProject | POST /projects/{uuid}/environments, GET /projects/{uuid} | covered | — |
| `environment.delete` | deleteEnvironment | DELETE /projects/{uuid}/environments/{environment_name_or_uuid} | covered | — |
| `environment.delete_preview` | fetchResources, fetchProject, fetchEnvironment | GET /resources, GET /projects/{uuid}, GET /projects/{uuid}/{environment_name_or_uuid} | covered | — |
| `environment.get` | fetchEnvironment, fetchProject | GET /projects/{uuid}/{environment_name_or_uuid}, GET /projects/{uuid} | covered | — |
| `environment.list` | fetchEnvironments, fetchProject | GET /projects/{uuid}/environments, GET /projects/{uuid} | covered | — |
| `instance.add` | — | — | out-of-scope | Local InstanceManager registry |
| `instance.cloud-info` | — | — | out-of-scope | Local inference — no Coolify REST op |
| `instance.delete` | — | — | out-of-scope | Local InstanceManager registry |
| `instance.get` | — | — | out-of-scope | Local InstanceManager registry |
| `instance.import-env` | — | — | out-of-scope | Local registry from env vars |
| `instance.list` | — | — | out-of-scope | Local InstanceManager registry — no Coolify REST op |
| `instance.set-default` | — | — | out-of-scope | Local InstanceManager registry |
| `instance.update` | — | — | out-of-scope | Local InstanceManager registry |
| `manifest.clear` | — | — | out-of-scope | Local manifest file only |
| `manifest.diff` | fetchResources, fetchProjects, fetchServers, fetchProject | GET /resources, GET /projects, GET /servers, GET /projects/{uuid} | out-of-scope | Local workspace diff — REST reads are ancillary |
| `manifest.get` | — | — | out-of-scope | Local workspace file only — no Coolify REST op |
| `manifest.remove` | — | — | out-of-scope | Local manifest file only |
| `manifest.set` | — | — | out-of-scope | Local manifest file only |
| `manifest.sync` | fetchResources, fetchProjects, fetchServers, fetchProject | GET /resources, GET /projects, GET /servers, GET /projects/{uuid} | out-of-scope | Local workspace file orchestration — REST reads are ancillary |
| `manifest.upsert` | — | — | out-of-scope | Local .coolify/manifest.json only |
| `meta.version` | — | — | out-of-scope | Package version — not Coolify API |
| `private_key.create` | createPrivateKey, fetchPrivateKey | POST /security/keys, GET /security/keys/{uuid} | covered | — |
| `private_key.delete` | fetchServers, deletePrivateKey | GET /servers, DELETE /security/keys/{uuid} | covered | — |
| `private_key.delete_preview` | fetchServers, fetchPrivateKey | GET /servers, GET /security/keys/{uuid} | covered | — |
| `private_key.get` | fetchPrivateKey | GET /security/keys/{uuid} | covered | — |
| `private_key.list` | fetchPrivateKeys | GET /security/keys | covered | — |
| `private_key.update` | updatePrivateKey | PATCH /security/keys | covered | — |
| `project.create` | createProject, fetchEnvironments, createEnvironment | POST /projects, GET /projects/{uuid}/environments, POST /projects/{uuid}/environments | covered | — |
| `project.delete` | fetchEnvironments, deleteProject | GET /projects/{uuid}/environments, DELETE /projects/{uuid} | covered | — |
| `project.delete_preview` | fetchEnvironments | GET /projects/{uuid}/environments | covered | — |
| `project.get` | fetchProject | GET /projects/{uuid} | covered | — |
| `project.list` | fetchProjects | GET /projects | covered | — |
| `project.update` | updateProject | PATCH /projects/{uuid} | covered | — |
| `recipe.create-app-db` | createPostgresqlDatabase, createMysqlDatabase, createMariadbDatabase, createMongodbDatabase, createRedisDatabase, createClickhouseDatabase, createDragonflyDatabase, createKeydbDatabase, triggerDatabaseStart, createPublicApplication, fetchDatabase, bulkUpdateEnvs, triggerDeploy | POST /databases/postgresql, POST /databases/mysql, POST /databases/mariadb, POST /databases/mongodb, POST /databases/redis, POST /databases/clickhouse, POST /databases/dragonfly, POST /databases/keydb, GET /databases/{uuid}/start, POST /applications/public, GET /databases/{uuid}, PATCH /applications/{uuid}/envs/bulk, GET /deploy | out-of-scope | Multi-resource orchestration (database + application + env) |
| `recipe.create-git-app` | createPublicApplication, triggerDeploy | POST /applications/public, GET /deploy | out-of-scope | Orchestration wrapper over application.create + deploy |
| `recipe.create-one-click` | fetchVersion, createService | GET /version, POST /services | out-of-scope | Orchestration wrapper over service.create |
| `resource.find` | fetchResources | GET /resources | covered | — |
| `resource.list` | fetchResources, fetchServers, fetchProjects | GET /resources, GET /servers, GET /projects | covered | — |
| `server.create` | createServer, validateServer, pollServerUntilReachable, fetchServer | POST /servers, GET /servers/{uuid}/validate, GET /servers/{uuid} | covered | — |
| `server.delete` | deleteServer | DELETE /servers/{uuid} | covered | — |
| `server.delete_preview` | fetchServerResources | GET /servers/{uuid}/resources | covered | — |
| `server.get` | fetchServer, fetchPrivateKeys | GET /servers/{uuid}, GET /security/keys | covered | — |
| `server.update` | updateServer | PATCH /servers/{uuid} | covered | — |
| `server.validate` | validateServer, pollServerUntilReachable, fetchServer | GET /servers/{uuid}/validate, GET /servers/{uuid} | covered | — |
| `service.create` | createService, triggerServiceStart | POST /services, GET /services/{uuid}/start | covered | — |
| `service.delete` | deleteService | DELETE /services/{uuid} | covered | — |
| `service.delete_preview` | fetchService | GET /services/{uuid} | covered | — |
| `service.deploy` | triggerServiceRestart | GET /services/{uuid}/restart | covered | — |
| `service.envs:bulk-update` | bulkUpdateEnvs | PATCH /services/{uuid}/envs/bulk | covered | — |
| `service.envs:create` | createEnv, fetchEnvs | POST /services/{uuid}/envs, GET /services/{uuid}/envs | covered | — |
| `service.envs:delete` | deleteEnv | DELETE /services/{uuid}/envs/{env_uuid} | covered | — |
| `service.envs:get` | fetchEnvs | GET /services/{uuid}/envs | covered | — |
| `service.envs:list` | fetchEnvs | GET /services/{uuid}/envs | covered | — |
| `service.envs:update` | fetchEnvs, updateEnvViaBulk | GET /services/{uuid}/envs, PATCH /services/{uuid}/envs/bulk | covered | — |
| `service.get` | fetchService | GET /services/{uuid} | covered | — |
| `service.list-types` | fetchVersion | GET /version | out-of-scope | CDN/GitHub service templates — fetchVersion ancillary only |
| `service.restart` | triggerServiceRestart | GET /services/{uuid}/restart | covered | — |
| `service.start` | triggerServiceStart | GET /services/{uuid}/start | covered | — |
| `service.stop` | triggerServiceStop | GET /services/{uuid}/stop | covered | — |
| `service.update` | updateService, fetchService | PATCH /services/{uuid}, GET /services/{uuid} | covered | — |
| `setup.preflight` | — | — | out-of-scope | GitHub CLI preflight — no Coolify REST op |
| `setup.resume` | — | — | out-of-scope | Delegates to preflight/wire — no standalone REST op |
| `setup.wire` | fetchProject, fetchEnvironment, fetchServer, createProject, createEnvironment, createPublicApplication, triggerDeploy, fetchDeployment | — | out-of-scope | Multi-step onboarding orchestration |
| `system.health` | fetchHealth | GET /health | covered | — |
| `system.infrastructure_overview` | fetchResources, fetchServers, fetchProjects | GET /resources, GET /servers, GET /projects | covered | — |
| `system.verify` | fetchVersion | GET /version | covered | — |
| `system.version` | fetchVersion | GET /version | covered | — |
| `GET /services/{uuid}/logs` | — | GET /services/{uuid}/logs | deferred | SVC-04 — Coolify 4.1.x has no service log endpoint |
| `GET /databases/{uuid}/logs` | — | GET /databases/{uuid}/logs | deferred | SVC-04 — Coolify 4.1.x has no database log endpoint |
| `execute_command` | — | execute_command | out-of-scope | Absent from OpenAPI per Spike 001 — not in v4.x spec |
| `GET /applications` | — | GET /applications | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /applications/{uuid}/envs` | — | PATCH /applications/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
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
| `DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}/executions/{execution_uuid}` | — | DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}/executions/{execution_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/envs` | — | PATCH /databases/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
| `GET /databases/{uuid}/storages` | — | GET /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `POST /databases/{uuid}/storages` | — | POST /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /databases/{uuid}/storages` | — | PATCH /databases/{uuid}/storages | gap | OpenAPI operation has no MCP action mapping |
| `DELETE /databases/{uuid}/storages/{storage_uuid}` | — | DELETE /databases/{uuid}/storages/{storage_uuid} | gap | OpenAPI operation has no MCP action mapping |
| `GET /deployments` | — | GET /deployments | gap | OpenAPI operation has no MCP action mapping |
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
| `GET /services` | — | GET /services | gap | OpenAPI operation has no MCP action mapping |
| `PATCH /services/{uuid}/envs` | — | PATCH /services/{uuid}/envs | gap | OpenAPI operation has no MCP action mapping |
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

