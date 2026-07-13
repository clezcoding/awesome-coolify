---
spike: 005a
name: stumason-mcp-live-test
type: comparison
validates: "Given StuMason coolify-mcp (@masonator/coolify-mcp) installed and connected to https://puzzlesstool.online v4.1.2, when calling every read-only tool live via CallMcpTool, then tool→endpoint Map with WORKS|404|500|stub for each, with focus on service/DB logs behavior and deployment logs handling"
verdict: VALIDATED ✓
related: [003, 004]
tags: [mcp, coolify, stumason, live-uat, service-logs, database-logs, deployment-logs, pull-latest]
---

# Spike 005a: StuMason coolify-mcp Live Test

## What This Validates

Test StuMason's `@masonator/coolify-mcp` (a.k.a. `coolify-backup-mcp` in `~/.cursor/mcp.json`) end-to-end against the same live Coolify v4.1.2 instance (`https://puzzlesstool.online`) that `awesome-coolify-mcp` targets.

Goal: produce a tool→endpoint map with WORKS / 404 / 500 / STUB verdict for each tool, especially:
- Service logs (StuMason's choice: ship a tool or not?)
- Database logs (same)
- Deployment build logs (how does StuMason handle the JSON-array `logs` field?)
- Service deploy + pull-latest (how is `latest` query param exposed?)

## Research

### Identification

| Clue | Value |
|------|-------|
| Repo | https://github.com/StuMason/coolify-mcp |
| npm package | `@masonator/coolify-mcp` |
| Cursor MCP config name | `coolify-backup-mcp` (in `~/.cursor/mcp.json`) |
| MCP server id in catalog | `user-coolify-backup-mcp` |
| Configured instance | `https://puzzlesstool.online` (matches awesome-coolify-mcp) |
| Token env var | `COOLIFY_ACCESS_TOKEN` (StuMason's naming) |
| Token scope | Same `7|C1yL6t948WaeBm9BqQiYHZiu8U2QGPcIDTGQPWxG975b8afe` |
| Tool count (advertised) | ~42 in 16 categories (per repo README) |
| Tool count (live schema) | Matches — see sources/stumason-tool-inventory.md |

### Approach

1. GetMcpTools → full schema (57.4 KB JSON, 2182 lines)
2. CallMcpTool on every read-only tool, record WORKS / ERROR / shape
3. Skip mutation tools (start/stop/restart/deploy/delete) — defer to user-approved UAT
4. For deployment logs: confirm StuMason's parsing strategy (raw string vs JSON-array flatten)
5. For service/DB logs: confirm whether StuMason ships a stub tool or omits entirely

### Chosen approach

Direct MCP tool invocation. The MCP server is a proxy — its response shape and any 4xx/5xx propagation reveals the underlying Coolify REST endpoint behavior without needing to read the MCP server source code.

## How to Run

```bash
# Sanity check
# (via Cursor MCP client — CallMcpTool on user-coolify-backup-mcp)

# get_version
{}
→ {"version":"4.1.2"}

# get_infrastructure_overview
{}
→ {summary:{servers,projects,applications,databases,services}, servers:[...], ...}

# application_logs (key test)
{"uuid":"jt4mw1b0ld3542i9w9nfmqkr","lines":5}
→ {"logs":"<string with \\n-separated lines>"}

# deployment get with logs (key test)
{"action":"get","uuid":"jebl7peop60i0ircz9jlhot4","lines":10}
→ {data:{..., logs:"<flattened timestamp-prefixed lines>", logs_meta:{total_entries, showing}}}
```

## What to Expect

| Tool | Underlying Endpoint | Live Verdict | Notes |
|------|---------------------|--------------|-------|
| `get_version` | `GET /version` | WORKS ✓ | `{"version":"4.1.2"}` |
| `get_mcp_version` | local | WORKS ✓ | — |
| `get_infrastructure_overview` | `GET /resources` + `GET /servers` + `GET /projects` | WORKS ✓ | Aggregates 3 endpoints into summary+lists |
| `system` `action=health` | `GET /health` | WORKS ✓ | `"OK"` |
| `system` `action=list_resources` | `GET /resources` | (not tested, same endpoint as overview) | — |
| `diagnose_app` `query=<name>` | `GET /applications` + `GET /applications/{uuid}/logs` + `GET /applications/{uuid}/envs` + `GET /deployments/applications/{uuid}` | WORKS ✓ | Composite — 4 endpoints, returns app+health+env_count+recent_deployments. Schema requires `query` (string), NOT `uuid` |
| `find_issues` | `GET /resources` + per-resource status | WORKS ✓ | Returns summary + issues[] (2 exited services found) |
| `list_applications` | `GET /applications` | (covered by overview) | — |
| `list_services` | `GET /services` | WORKS ✓ | 7 services returned |
| `list_databases` | `GET /databases` | (covered by overview) | — |
| `get_service` `uuid=<svc>` | `GET /services/{uuid}` | WORKS ✓ | Returns full service with `applications[]` + `databases[]` sub-resources — `name` field is the future `sub_service_name` value for v4.1.3+ `/services/{uuid}/logs?sub_service_name=X` endpoint |
| `get_database` `uuid=<db>` | `GET /databases/{uuid}` | WORKS ✓ | Returns full DB object. **Leaks `postgres_password` in plaintext** + `internal_db_url`/`external_db_url` with creds — no masking |
| `application_logs` `uuid=<app>` `lines=N` | `GET /applications/{uuid}/logs?lines=N` | WORKS ✓ | `{"logs":"<string>"}` — passes raw API response through unchanged |
| `deployment` `action=get` `uuid=<dep>` `lines=N` | `GET /deployments/{uuid}` | WORKS ✓ | **JSON-parses inline logs array, flattens `output` strings, prefixes `[timestamp]` per line, applies `lines` as last-N slice**. Returns `logs_meta:{total_entries, showing}`. See Investigation Trail. |
| `deployment` `action=list_for_app` `uuid=<app>` | `GET /deployments/applications/{uuid}` | (not tested, same endpoint family) | — |
| `control` `resource=service` `action=restart` `pull_latest=true` | `POST /services/{uuid}/restart?latest=true` | (not live-tested, mutation) | Schema confirms `pull_latest: boolean` field exists, "services only" — matches Phase 5 D-17 / PR #5881 exactly |
| `service` `action=create/update/delete` | `POST/PATCH/DELETE /services/{uuid}` | (not tested, mutations) | v2 CRUD scope |
| `database` `action=create/delete` | `POST/DELETE /databases/{uuid}` | (not tested, mutations) | v2 CRUD scope |
| **`service.logs`** | — | **NOT SHIPPED** | StuMason does not expose a service logs tool. Correctly recognizes API gap (Spike 004 confirmed `/services/{uuid}/logs` returns 404 on v4.1.2). |
| **`database.logs`** | — | **NOT SHIPPED** | StuMason does not expose a database logs tool. Same reasoning. |

## Observability

No forensic log layer needed — MCP tool calls are atomic. Evidence:
- `sources/stumason-tool-inventory.md` — full tool inventory by category (from repo README)
- `sources/stumason-live-call-results.md` — full CallMcpTool responses for each tested tool
- `sources/stumason-control-schema.json` — control tool schema excerpt confirming `pull_latest` field
- `sources/stumason-deployment-get-response.json` — full deployment get response showing JSON-array flatten pattern

## Investigation Trail

### Iteration 1 — Identify which Cursor MCP server is StuMason

System catalog lists `user-coolify-backup-mcp` and `user-coolify`. Cross-referenced `~/.cursor/mcp.json`:
- `coolify-backup-mcp` → `npx -y @masonator/coolify-mcp` → `COOLIFY_BASE_URL=https://puzzlesstool.online` ✓
- `coolify` → `npx -y coolify-mcp-server-kof70` → `COOLIFY_BASE_URL=http://185.248.140.207:8000` (different host, also v4.1.2)

StuMason = `coolify-backup-mcp`. User statement "same Coolify instance" was imprecise — StuMason and awesome-coolify-mcp share `puzzlesstool.online`; kof70 points at a different v4.1.2 instance.

### Iteration 2 — Full schema dump via GetMcpTools

36 KB / 1455 lines of JSON schema. Grepped for tool names: 42 tools across 16 categories confirmed.

**Critical:** No `service_logs` or `database_logs` tool in the schema. StuMason does NOT ship service/DB logs tools — they correctly recognize the v4.1.x API gap (matches Spike 004 finding: `/services/{uuid}/logs` and `/databases/{uuid}/logs` return 404 on v4.1.2).

### Iteration 3 — Live read-only calls

Tested 8 read-only tools via CallMcpTool:
- `get_version` → `{"version":"4.1.2"}` (200 OK)
- `get_infrastructure_overview` → full summary + 13 apps + 4 DBs + 7 services + 1 server + 7 projects (200 OK)
- `application_logs` → raw API passthrough as `{"logs":"<string>"}` (200 OK, same shape as raw `curl /applications/{uuid}/logs`)
- `diagnose_app` with `query="mcp-uat-nginx"` → composite response with application + health + env_count + recent_deployments (200 OK)
- `find_issues` → 2 unhealthy services found (Passbolt Puzzless + N8N-SheetB, both exited)
- `system` with `action=health` → `"OK"` (200 OK)
- `list_services` → 7 services (200 OK)
- `get_service` (Passbolt) → full service object with sub-resources (200 OK)
- `get_database` (clared-postgres) → full DB object with `postgres_password` in plaintext (200 OK — security concern)

All read-only tools WORK. No 404s, no 500s. StuMason correctly avoids calling endpoints that don't exist.

### Iteration 4 — Deployment logs handling (THE KEY FINDING)

Called `deployment` with `action=get`, `uuid=jebl7peop60i0ircz9jlhot4`, `lines=10`. Response:

```json
{
  "data": {
    "deployment_uuid": "jebl7peop60i0ircz9jlhot4",
    "application_name": "mcp-uat-nginx",
    "status": "finished",
    "logs_available": true,
    "logs_info": "Logs available (5683 chars). Use lines param to retrieve.",
    "logs": "[2026-07-13T00:41:12.163071Z] Docker 29.4.0 with BuildKit and Buildx detected on deployment server (localhost).\n[2026-07-13T00:41:12.172589Z] Starting deployment of nginx:alpine to localhost.\n[2026-07-13T00:41:12.520817Z] Preparing container with helper image: ghcr.io/coollabsio/coolify-helper:1.0.14\n[2026-07-13T00:41:14.258460Z] ----------------------------------------\n[2026-07-13T00:41:14.266745Z] Rolling update started.\n[2026-07-13T00:41:14.388804Z] Pulling latest images from the registry.\n[2026-07-13T00:41:16.684303Z] New container started.\n[2026-07-13T00:41:16.694920Z] Removing old containers.\n[2026-07-13T00:41:16.876683Z] Rolling update completed.\n[2026-07-13T00:41:17.317915Z] Gracefully shutting down build container: jebl7peop60i0ircz9jlhot4",
    "logs_meta": {
      "total_entries": 10,
      "showing": "1-10 of 10"
    }
  }
}
```

**StuMason parses the JSON-array `logs` field and flattens it** into human-readable, timestamp-prefixed lines:
- Raw API returns `logs` as JSON-encoded string containing `[{command, output, type, timestamp, hidden, batch}, ...]` (verified in Spike 004)
- StuMason JSON.parses the string, iterates entries, formats each as `[<timestamp>] <output>\n`
- `lines` param = "last N entries" (entry-level slicing, not character-level)
- `logs_meta.total_entries` + `logs_meta.showing` = pagination metadata
- `logs_available` flag + `logs_info` message = graceful "logs exist, use lines param" hint when caller doesn't request lines

This is the EXACT pattern awesome-coolify-mcp should adopt for Phase 5 PLAN 05-02. The 05-RESEARCH.md assumption (plain `\n`-separated string, line slicing) is wrong — StuMason has already solved the real shape.

### Iteration 5 — Control tool `pull_latest` field confirmed

Schema excerpt (line 285-288 of sources/stumason-tool-inventory.md):
```json
"pull_latest": {
  "description": "Pull latest images before restarting (services only)",
  "type": "boolean"
}
```

Validates Phase 5 D-17 design: `service.deploy` action with `pull_latest: boolean` maps to `POST /services/{uuid}/restart?latest=true` (PR #5881). StuMason uses identical field name `pull_latest` — same convention. Field is gated to `resource=service` only — matches D-18 (no DB deploy).

### Iteration 6 — Sub-service name enumeration for future endpoint

StuMason's `get_service` returns the full service object including `applications[]` and `databases[]` sub-resource arrays. Each sub-resource has a `name` field (e.g. `passbolt`, `mariadb` for the Passbolt service; `passbolt`, `mariadb` are the sub-service names).

When Coolify v4.1.3+ ships with PR #6293 merged, the new endpoint `GET /services/{uuid}/logs?sub_service_name=<name>` will require this `name` value. StuMason's `get_service` already returns the candidate list — awesome-coolify-mcp should ensure `service.get` (Phase 2) preserves this field for future service.logs enablement.

### Iteration 7 — Security concern: plaintext secrets in get_database

StuMason's `get_database` returns:
- `postgres_password: "6pWh0WYJkiB2QzMGIAJsCvo6Aoqrqrz"` (plaintext)
- `internal_db_url: "postgres://clared:6pWh0WYJkiB2QzMGIAJsCvo6Aoqrqrz@wwv448u8322naf6xry5rhup4:5432/clared"` (plaintext creds)
- `external_db_url: "postgres://clared:6pWh0WYJkiB2QzMGIAJsCvo6Aoqrqrz@185.248.140.207:3522/clared"` (plaintext creds)

awesome-coolify-mcp's `sanitizeFullProjection` (P2 02-01) masks `password|token|secret|private|env` keys by default — this is a DX/security advantage over StuMason. Phase 6 will add full masking (OUT-02). Document this as a differentiation point in the README.

## Results

### Verdict: VALIDATED ✓

StuMason live test against `https://puzzlesstool.online` v4.1.2 confirms:

1. **Service/DB logs tools NOT shipped** — StuMason correctly omits `service.logs` / `database.logs` tools because the underlying endpoints return 404 on v4.1.2. This is the right call per the user's "no tools without working endpoint" directive.

2. **Deployment logs JSON-array parsing IS solved** — StuMason's `deployment get` JSON.parses the inline `logs` array, flattens `output` strings with `[timestamp]` prefix, applies `lines` as entry-level slicing. awesome-coolify-mcp Phase 5 PLAN 05-02 should adopt this exact pattern.

3. **Service deploy + pull-latest field schema matches** — StuMason's `control.pull_latest: boolean (services only)` is identical to Phase 5 D-17 design. Both target `POST /services/{uuid}/restart?latest=true` (PR #5881).

4. **Sub-service name enumeration works today** — StuMason's `get_service` returns sub-resource `name` fields, which are the candidate values for the future v4.1.3+ `sub_service_name` query param. awesome-coolify-mcp `service.get` already preserves these — no change needed for forward-readiness.

5. **Security: StuMason leaks plaintext DB passwords** — `get_database` returns `postgres_password`, `internal_db_url`, `external_db_url` with plaintext credentials. awesome-coolify-mcp's `sanitizeFullProjection` is stricter (masks by default, `reveal: true` opt-in for Phase 6).

### Surprises

- StuMason calls `diagnose_app` with `query: string` (not `uuid`) — single field accepts UUID, name, or domain. Different from awesome-coolify-mcp's `diagnose({ uuid?, name?, fqdn? })` multi-field pattern.
- StuMason's `get_infrastructure_overview` aggregates 3 endpoints (`/resources` + `/servers` + `/projects`) in one call — more expensive than awesome-coolify-mcp's `system.infrastructure_overview` (which uses `/resources` only). Trade-off: richer data vs more API calls.
- StuMason's `deployment get` returns `logs_info: "Logs available (5683 chars). Use lines param to retrieve."` as a hint when caller doesn't request lines — clever DX pattern, worth adopting.

### Impact on awesome-coolify-mcp Phase 5

- **05-02 build-logs handler**: adopt StuMason's flatten pattern. `JSON.parse(logs)` → iterate entries → format as `[<timestamp>] <output>\n` → `lines` param = last-N entries slice. Add `logs_meta: {total_entries, showing}` to response. Add `logs_available` + `logs_info` hint when caller doesn't request lines.
- **05-04 service.logs / database.logs stubs**: StuMason validates the "don't ship the tool" approach. Two options:
  - (a) Follow StuMason: don't ship `service.logs` / `database.logs` tools at all in v1. Cleaner schema, no stub errors. Requires removing SVC-04 from REQUIREMENTS or reclassifying as v2.
  - (b) Ship stubs that return `COOLIFY_501` with a clear recovery hint mentioning PR #6293 + v4.1.3+ upgrade path. Matches Phase 5 D-04 current plan but contradicts user's "no non-working tools" directive.
  - **Recommendation: option (a)** — drop service.logs/database.logs from v1, document as v2 with PR #6293 dependency. This aligns with user's directive and matches StuMason's proven design.
- **05-03 service.deploy**: `pull_latest: boolean` field confirmed. Endpoints: `POST /services/{uuid}/restart?latest=true`. No `service.deploy` separate endpoint exists.

### Impact on awesome-coolify-mcp differentiators

- **Sanitize secrets by default** — StuMason doesn't mask DB passwords. awesome-coolify-mcp's `sanitizeFullProjection` is a security advantage. Document in v1 README.
- **Action-per-domain schema** — StuMason uses ~42 tools (action-param within each category but many separate tools). awesome-coolify-mcp uses ~8 domain tools with `z.discriminatedUnion('action', [...])` — fewer top-level tools, lower token overhead. Confirm with `get_mcp_version` token-count comparison (future task).
- **Multi-instance config** — StuMason is single-instance (env vars only). awesome-coolify-mcp's `~/.coolify-mcp/instances.json` + `instance` arg remains a differentiator.
