# Coolify v4 OpenAPI Endpoint Map — v1 Ops Scope

Source: `https://github.com/coollabsio/coolify/blob/v4.x/openapi.yaml` (OpenAPI 3.1)
Base URL: `https://<your-instance>/api/v1`
Auth: `Authorization: Bearer <token>` (Laravel Sanctum, granular abilities)

## System
| Method | Path | Summary | Notes |
|--------|------|---------|-------|
| GET | `/health` | Healthcheck | Returns "OK", no auth required |
| GET | `/version` | Coolify version | Returns version string e.g. `v4.0.0` |
| GET | `/enable` | Enable API | Root permissions only |

## Servers
| Method | Path | Summary |
|--------|------|---------|
| GET | `/servers` | List |
| GET | `/servers/{uuid}` | Get |
| GET | `/servers/{uuid}/validate` | Validate (returns 201, validation started) |
| GET | `/servers/{uuid}/resources` | Resources on server |
| GET | `/servers/{uuid}/domains` | Domains (incl. IPv4/IPv6) |
| POST | `/servers` | Create (v2) |
| PATCH | `/servers/{uuid}` | Update (v2) |
| DELETE | `/servers/{uuid}` | Delete (v2) |

## Applications
| Method | Path | Summary | Notes |
|--------|------|---------|-------|
| GET | `/applications` | List | array of Application |
| GET | `/applications/{uuid}` | Get | schema null (inline) |
| GET | `/applications/{uuid}/logs` | Logs | **only `lines` param (default 100), NO `follow`** |
| GET | `/applications/{uuid}/envs` | List envs | |
| PATCH | `/applications/{uuid}/envs/bulk` | Bulk update envs | |
| GET | `/applications/{uuid}/start` | Start | POST also accepted |
| GET | `/applications/{uuid}/stop` | Stop | POST also accepted |
| GET | `/applications/{uuid}/restart` | Restart | POST also accepted |
| GET | `/applications/{uuid}/storages` | List storages | |
| GET | `/applications/{uuid}/scheduled-tasks` | List scheduled tasks | |
| GET | `/applications/{uuid}/scheduled-tasks/{task_uuid}/executions` | Task executions | |

## Databases
| Method | Path | Summary |
|--------|------|---------|
| GET | `/databases` | List |
| GET | `/databases/{uuid}` | Get |
| GET | `/databases/{uuid}/backups` | Backup schedules |
| GET | `/databases/{uuid}/backups/{scheduled_backup_uuid}/executions` | Executions |
| GET | `/databases/{uuid}/start|stop|restart` | Lifecycle |
| GET | `/databases/{uuid}/envs` | List envs |
| PATCH | `/databases/{uuid}/envs/bulk` | Bulk update |
| GET | `/databases/{uuid}/storages` | Storages |

## Services
| Method | Path | Summary |
|--------|------|---------|
| GET | `/services` | List |
| GET | `/services/{uuid}` | Get |
| GET | `/services/{uuid}/envs` | List envs |
| PATCH | `/services/{uuid}/envs/bulk` | Bulk update |
| GET | `/services/{uuid}/start|stop|restart` | Lifecycle |
| GET | `/services/{uuid}/storages` | Storages |
| GET | `/services/{uuid}/scheduled-tasks` | Scheduled tasks |

## Projects & Environments
| Method | Path | Summary |
|--------|------|---------|
| GET | `/projects` | List |
| GET | `/projects/{uuid}` | Get |
| GET | `/projects/{uuid}/environments` | List environments |
| GET | `/projects/{uuid}/{environment_name_or_uuid}` | Get environment |
| DELETE | `/projects/{uuid}/environments/{environment_name_or_uuid}` | Delete env (must be empty) |

## Resources (unified)
| Method | Path | Summary |
|--------|------|---------|
| GET | `/resources` | List apps + DBs + services unified |

## Deployments
| Method | Path | Summary | Notes |
|--------|------|---------|-------|
| GET | `/deployments` | List **currently running only** | Not historical |
| GET | `/deployments/{uuid}` | Get deployment | **Includes `logs` string field inline** |
| GET | `/deployments/applications/{uuid}` | List app deployments | OpenAPI schema bug: returns `Application` items, actually deployment queue |
| POST | `/deployments/{uuid}/cancel` | Cancel | 400 if already finished/failed/cancelled, 403 if no permission |
| GET\|POST | `/deploy` | Deploy by tag/uuid | Query: `tag`, `uuid` (comma-separated lists), `force`, `pr`. Returns `{ deployments: [{message, resource_uuid, deployment_uuid}] }` |

## NOT in OpenAPI (verified absent)
- `/applications/{uuid}/execute` — **no exec-in-container endpoint** (mcp_features.md §20 confirmed)
- `/deployments/{uuid}/logs` — no separate logs endpoint; logs are a `string` field on the deployment object
- Follow/tail for REST logs — only `lines` param exists; `--follow` is CLI-only (likely websocket/private channel, not in OpenAPI)
- No websocket/SSE/streaming endpoints in OpenAPI spec at all

## Error responses (from cancel endpoint pattern)
- 400: bad request / state conflict (e.g. "Deployment cannot be cancelled. Current status: finished")
- 401: unauthorized (bearerAuth)
- 403: forbidden (permission)
- 404: not found
- 429: rate limited (with `Retry-After` header, per DeepWiki)

## ApplicationDeploymentQueue schema (key fields)
- `id`, `application_id`, `deployment_uuid`
- `status` (queued/in_progress/finished/failed/cancelled-by-user)
- `logs` (string — full build log, not paginated)
- `current_process_id`, `restart_only`, `git_type`, `server_id`
- created_at, updated_at

## Deploy wait-mode polling strategy (verified)
1. POST/GET `/deploy?uuid=<uuid>` → returns `{ deployments: [{ deployment_uuid, resource_uuid, message }] }`
2. Poll GET `/deployments/{deployment_uuid}` every N seconds
3. Stop when `status` ∈ {`finished`, `failed`, `cancelled-by-user`}
4. On failure: return `logs` field (bounded by `max_chars` cap)
