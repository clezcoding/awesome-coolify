---
spike: 001
name: coolify-api-surface
type: standard
validates: "Given Coolify 4.1.x REST API, when querying official OpenAPI spec + context7 docs + web, then v1 ops endpoints are fully mapped with shapes, params, and broken/missing endpoints flagged"
verdict: VALIDATED
related: [002, 003]
tags: [coolify, api, rest, openapi, docs]
---

# Spike 001: Coolify API Surface

## What This Validates
Given Coolify 4.1.x REST API (OpenAPI 3.1 spec at `github.com/coollabsio/coolify/blob/v4.x/openapi.yaml`), when querying via context7 + web, then v1 ops endpoints (servers, apps, deployments, logs, diagnose, health, infrastructure overview) are fully mapped with method, path, params, response shape, and broken/missing endpoints flagged.

## Research

### Sources consulted
- context7 `/coollabsio/coolify-docs` (2014 snippets, High reputation, score 67.73) — OpenAPI GET operations for all v4 domains
- context7 `/coollabsio/coolify-cli` (357 snippets, High, 77.09) — CLI command → API mapping, confirms `--follow`/`--lines`/`--debuglogs` flags
- context7 `/stumason/coolify-mcp` (239 snippets, High, 83.5) — existing third-party Coolify MCP (relevant for Spike 003)
- WebSearch → DeepWiki `coollabsio/coolify/8-api-reference` — confirms REST + Sanctum bearer auth + token abilities + 429 rate limiting
- Raw OpenAPI YAML fetched from `github.com/coollabsio/coolify/blob/v4.x/openapi.yaml` (8786 lines, 295 KB) — primary source of truth, grepped for every endpoint family

### Approach comparison

| Approach | Tool | Pros | Cons | Status |
|----------|------|------|------|--------|
| Read official OpenAPI YAML | github raw + grep | Complete, authoritative, version-pinned (v4.x) | Verbose, 295 KB | **Chosen** |
| context7 docs fetch | `ctx7 docs /coollabsio/coolify-docs` | Curated, indexed | Truncates, misses POST/DELETE families on first query | Chosen (parallel) |
| DeepWiki summary | web | Narrative + auth model | Secondary, may lag | Supplementary |
| Probe live instance | curl against hostunlimited | Real responses | Out of scope for research spike; v1 build will validate | Deferred |

**Chosen approach:** OpenAPI YAML as primary (authoritative), context7 + DeepWiki as cross-check. All v1 ops endpoints verified against raw OpenAPI.

### Gotchas discovered
1. **`/deployments` lists *currently running* deployments only**, not historical. Per-app history lives at `/deployments/applications/{uuid}` — and its OpenAPI response schema is wrong (says `Application` items, actually `ApplicationDeploymentQueue` items). Treat the schema as buggy; expect deployment queue objects.
2. **No `/deployments/{uuid}/logs` endpoint.** Build logs are a `logs: string` field on the `ApplicationDeploymentQueue` object returned by `GET /deployments/{uuid}`. Not paginated, not streamed — one big string. MCP must cap with `max_chars` and optionally offer `include_logs: false` on list calls.
3. **No `/applications/{uuid}/execute` endpoint.** `mcp_features.md` §20 verified — exec-in-container is not in OpenAPI at all (not just broken). Out of scope for v1 and v2 unless Coolify adds it.
4. **REST logs have no `follow`/tail.** Only `lines` query param (default 100). CLI's `--follow` flag must use a different transport (websocket/private channel) not exposed in OpenAPI. v1 MCP: support `lines` only; document follow as not REST-feasible.
5. **`/deploy` accepts both GET and POST** with same query/body params (`uuid`, `tag`, `force`, `pr`). Comma-separated lists accepted for batch deploy. Response: `{ deployments: [{ message, resource_uuid, deployment_uuid }] }` — gives you the deployment UUIDs to poll.
6. **Start/Stop/Restart accept both GET and POST** on the same path. POST is preferred for action semantics; GET works for fire-and-forget.
7. **`/servers/{uuid}/validate` returns 201** (not 200), meaning "validation started" — async. Poll server for updated validation status.
8. **Auth: Laravel Sanctum bearer tokens with granular abilities.** Token abilities control which endpoints a token can call — MCP must surface 403 as "token lacks ability" with recovery hint (regenerate token with required abilities).
9. **Rate limiting: 429 with `Retry-After` header** (per DeepWiki). MCP client must honor backoff.

## How to Run
Research spike — no runnable code. Sources are documented above. To re-verify:
```bash
npx -y ctx7@latest library "Coolify" "..."
npx -y ctx7@latest docs /coollabsio/coolify-docs "..."
# Or fetch raw OpenAPI:
curl -fsSL https://raw.githubusercontent.com/coollabsio/coolify/v4.x/openapi.yaml
```

## What to Expect
A complete endpoint map at `sources/endpoint-map.md` covering: System, Servers, Applications, Databases, Services, Projects/Environments, Resources (unified), Deployments, plus a "NOT in OpenAPI" section and verified deploy wait-mode polling strategy.

## Investigation Trail

### Iteration 1 — context7 docs fetch (GET operations)
First `ctx7 docs` call returned full GET path keys for Applications, Databases, Services, Servers, Projects, Resources, Deployments with response types. Confirmed all v1 read endpoints exist.

### Iteration 2 — POST/DELETE gap
First fetch truncated before POST/DELETE/PUT families. Ran second `ctx7 docs` query targeting POST/DELETE — returned server create schema, env create schema, healthcheck, but still incomplete.

### Iteration 3 — raw OpenAPI YAML via WebSearch
WebSearch found `github.com/coollabsio/coolify/blob/v4.x/openapi.yaml`. Fetched raw, grepped for `/deploy`, `/version`, `/health`, `/enable`, `cancel`, `/execute`, `bulk`, `logs`, `ApplicationDeploymentQueue`.

### Iteration 4 — broken-endpoint verification
Grep for `execute` → zero matches in OpenAPI (confirmed absent, not just broken). Grep for `/deployments/{uuid}/logs` → zero matches; instead `ApplicationDeploymentQueue.logs` field exists. Grep for follow param on `/applications/{uuid}/logs` → only `lines` param.

### Iteration 5 — deploy + cancel semantics
Confirmed `POST /deployments/{uuid}/cancel` with explicit 400 (state conflict), 403 (permission), 404 responses. `/deploy` returns array of `{deployment_uuid, resource_uuid, message}` — perfect for wait-mode polling chain.

## Results

**Verdict: VALIDATED ✓**

v1 ops endpoint surface fully mapped and verified against authoritative OpenAPI spec. Every endpoint in `mcp_features.md` §3 (System/Overview), §6 (Servers), §10 (Applications lifecycle), §14 (Databases lifecycle), §13 (Services lifecycle), §16 (Deployments) is present and confirmed.

**Key findings that reshape v1 design:**

1. **Logs follow-mode is NOT REST-feasible.** Only `lines` param exists. v1 ships with `lines`-only; follow requires websocket (out of scope).
2. **Deployment logs are inline on the deployment object**, not a separate endpoint. `max_chars` cap is mandatory. List endpoints should default `include_logs: false`.
3. **`/deployments` lists running-only.** For "show recent deployments" use `/deployments/applications/{uuid}` (per-app). Global history is not available — surface as known limitation.
4. **`execute_command` confirmed absent** — not in OpenAPI at all. Update `mcp_features.md` §20 from "broken" to "endpoint does not exist in v4.x OpenAPI".
5. **Deploy returns deployment_uuids** → wait-mode = poll `GET /deployments/{uuid}` until terminal status. Clean, no race conditions.
6. **Auth errors carry semantics**: 401 (bad token), 403 (token lacks ability), 404 (wrong UUID), 429 (rate limit, retry-after), 400 (state conflict e.g. cancel finished deployment). Maps cleanly to structured error codes requirement.

**No endpoint surprises that break v1 scope.** All ops endpoints in PROJECT.md "Ops-Tools v1" list (Infrastructure-Overview, Diagnose, Deploy+wait, Logs, Global Issue-Scan) are present.

## Impact on Remaining Spikes
- **Spike 002** (MCP TS SDK): now knows exact endpoint shapes to model in tool schemas; knows it must build wait-mode polling client; knows follow-mode is out.
- **Spike 003** (existing Coolify MCP patterns): can compare how `user-coolify` and `coolify-backup-mcp` handle the inline-logs problem and the running-only deployments list; verify they don't claim features the API doesn't have.
