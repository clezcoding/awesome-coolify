# Coolify API

## Requirements

- Coolify API 4.1.x is the target — no Cloud-only features
- v1 ops endpoints must be fully mapped: servers, applications, deployments, logs, diagnose, health, infrastructure overview
- Broken/missing endpoints flagged (e.g. `execute_command`, global deployments list)
- Structured error codes with recovery hints (401/404/422/500)

## How to Build It

### Base client setup

```ts
// Base URL: https://<instance>/api/v1
// Auth: Authorization: Bearer <token> (Laravel Sanctum, granular abilities)
const client = ofetch.create({
  baseURL: `${instance.url}/api/v1`,
  headers: { Authorization: `Bearer ${instance.token}` },
});
```

### System endpoints

| Method | Path | Use |
|--------|------|-----|
| GET | `/health` | Healthcheck (no auth) |
| GET | `/version` | Version string |
| GET | `/enable` | Enable API (root only) |

### Servers

| Method | Path | Notes |
|--------|------|-------|
| GET | `/servers` | List |
| GET | `/servers/{uuid}` | Get |
| GET | `/servers/{uuid}/validate` | Returns **201** — validation started (async) |
| GET | `/servers/{uuid}/resources` | Resources on server |
| GET | `/servers/{uuid}/domains` | Domains incl. IPv4/IPv6 |

### Applications

| Method | Path | Notes |
|--------|------|-------|
| GET | `/applications` | List |
| GET | `/applications/{uuid}` | Get |
| GET | `/applications/{uuid}/logs` | **Only `lines` param (default 100), NO `follow`** |
| GET/POST | `/applications/{uuid}/start\|stop\|restart` | POST preferred |

### Deployments

```ts
// 1. Deploy
const { deployments } = await client('/deploy', { method: 'POST', query: { uuid, force } });
const deploymentUuid = deployments[0].deployment_uuid;

// 2. Wait-mode polling (every 2s until terminal)
const terminal = ['finished', 'failed', 'cancelled-by-user'];
while (!terminal.includes(d.status)) {
  d = await client(`/deployments/${deploymentUuid}`);
  await sleep(2000);
}
// 3. Return d.logs capped by max_chars
```

| Method | Path | Notes |
|--------|------|-------|
| GET | `/deployments` | **Currently running only** — not historical |
| GET | `/deployments/{uuid}` | Includes `logs` string field inline |
| GET | `/deployments/applications/{uuid}` | Per-app history (schema bug: says Application, actually queue) |
| POST | `/deployments/{uuid}/cancel` | 400 if already finished |
| GET/POST | `/deploy` | Returns `{ deployments: [{ deployment_uuid, resource_uuid, message }] }` |

### Unified resources

| Method | Path | Use |
|--------|------|-----|
| GET | `/resources` | Apps + DBs + services unified |

### Error mapping

| HTTP | Code | Hint |
|------|------|------|
| 401 | `UNAUTHORIZED` | Verify token in `~/.coolify-mcp/instances.json` |
| 403 | `FORBIDDEN` | Token lacks ability — regenerate with required abilities |
| 404 | `NOT_FOUND` | Run list tool to find correct UUID |
| 400 | `BAD_REQUEST` | State conflict or malformed args |
| 429 | `RATE_LIMITED` | Honor `Retry-After` header |
| 5xx | `COOLIFY_ERROR` | Check `/health` and instance logs |

## What to Avoid

- **Don't ship `execute_command` tool** — `/applications/{uuid}/execute` does not exist in OpenAPI at all
- **Don't expect `/deployments/{uuid}/logs`** — logs are inline `string` on deployment object, not a separate endpoint
- **Don't implement log follow/tail via REST** — only `lines` param exists; CLI `--follow` uses websocket (not in OpenAPI)
- **Don't use `/deployments` for history** — lists running-only; use `/deployments/applications/{uuid}` per app
- **Don't trust OpenAPI schema for `/deployments/applications/{uuid}`** — returns `ApplicationDeploymentQueue`, not `Application`
- **Don't assume 200 on validate** — `/servers/{uuid}/validate` returns 201

## Constraints

- OpenAPI source: `https://github.com/coollabsio/coolify/blob/v4.x/openapi.yaml` (8786 lines, 295 KB)
- No websocket/SSE/streaming endpoints in OpenAPI
- Deployment logs: one big string, not paginated — mandatory `max_chars` cap; default `include_logs: false` on list
- Rate limiting: 429 with `Retry-After` header
- Auth: Laravel Sanctum bearer tokens with granular abilities

## Origin

Synthesized from spikes: 001
Source files available in: sources/001-coolify-api-surface/
