# Coolify v4.1.2 Endpoint Verification (P5 Scope)

## Requirements

- Coolify API 4.1.2 is the target — verify every endpoint against this EXACT version, not `main`/`next`.
- No tool ships without a working endpoint. Absent endpoints → tool omitted (NOT stubbed).
- Endpoint existence must be confirmed via TWO sources: (a) raw OpenAPI YAML for the tagged version, (b) live curl against the running instance.
- Version-roadmap awareness: track PRs that add/remove endpoints so we know when to revisit.

## How to Build It

### Verification procedure (per endpoint)

1. **Fetch the tagged OpenAPI YAML** for the exact Coolify version running on the instance:
   ```bash
   curl -s "https://raw.githubusercontent.com/coollabsio/coolify/v4.1.2/openapi.yaml" > /tmp/coolify-openapi-v412.yaml
   curl -s "https://raw.githubusercontent.com/coollabsio/coolify/next/openapi.yaml" > /tmp/coolify-openapi-next.yaml
   ```
2. **Grep for the endpoint path** in both YAMLs:
   ```bash
   grep '/services/{uuid}/logs' /tmp/coolify-openapi-v412.yaml   # absent → not in v4.1.2
   grep '/services/{uuid}/logs' /tmp/coolify-openapi-next.yaml   # present → added in next
   ```
3. **Live curl the running instance** (token from `.cursor/mcp.json`):
   ```bash
   TOKEN="7|..."
   curl -s -w "\n%{http_code}\n" "https://puzzlesstool.online/api/v1/services/{uuid}/logs?lines=5" \
     -H "Authorization: Bearer $TOKEN"
   ```
   200 → exists. 404 → absent. 401 → token issue. 422 → param issue.
4. **Classify**: `EXISTS` | `ABSENT` | `BROKEN`. Record in a verdict table.

### Confirmed v4.1.2 endpoint map (P5 scope)

| Endpoint | v4.1.2 Status | Live HTTP | Notes |
|----------|---------------|-----------|-------|
| `GET /version` | exists | 200 `"4.1.2"` | Instance version check |
| `GET /health` | exists | 200 `"OK"` | — |
| `GET /applications/{uuid}/logs?lines=N` | exists | 200 `{logs: string}` | Plain string, NOT JSON-array |
| `GET /deployments/{uuid}` | exists | 200 (deployment obj) | Inline `logs` field = JSON-encoded array string |
| `GET /deployments/applications/{uuid}` | exists | 200 `{count, deployments:[...]}` | — |
| `POST /applications/{uuid}/deploy` | exists | not live-tested | Mutation, deferred |
| `POST /services/{uuid}/start` | exists (OpenAPI 7395) | not live-tested | `{message:"Service starting request queued."}` |
| `POST /services/{uuid}/stop` | exists (OpenAPI 7428) | not live-tested | — |
| `POST /services/{uuid}/restart` | exists (OpenAPI 7468) | not live-tested | Accepts `?latest=true` (PR #5881) |
| `POST /services/{uuid}/restart?latest=true` | exists (PR #5881, in v4.1.2) | not live-tested | SVC-05 pull-latest path |
| `POST /services/{uuid}/deploy` | **ABSENT** | **404** | No dedicated deploy endpoint — use `restart?latest=true` |
| `GET /services/{uuid}/logs` | **ABSENT** | **404** | PR #6293 merged 2026-07-06 to `next`, NOT in v4.1.2 |
| `GET /services/{uuid}/logs?sub_service_name=...` | **ABSENT** | **404** | Same — PR #6293 not backported |
| `GET /databases/{uuid}/logs` | **ABSENT** | **404** | Same — PR #6293 not backported |
| `POST /databases/{uuid}/start|stop|restart` | exists (OpenAPI 4004/4037/4077) | not live-tested | — |

### Deployment `logs` field — JSON-array shape (CRITICAL)

The `logs` field on `GET /deployments/{uuid}` is a **JSON-encoded string containing an array**, not a plain `\n`-separated string:

```json
[
  {"command": null|string, "output": string, "type":"stdout"|"stderr",
   "timestamp":"ISO8601Z", "hidden": boolean, "batch": integer},
  ...
]
```

Handler implementation:
```typescript
let entries: LogEntry[];
try {
  entries = JSON.parse(deployment.logs);
} catch {
  entries = deployment.logs.split('\n').map(line => ({output: line, type:'all', hidden:false, batch:0, timestamp:null, command:null}));
}
if (!includeHidden) entries = entries.filter(e => !e.hidden);
if (type !== 'all') entries = entries.filter(e => e.type === type);
const lines = entries.map(e => e.output);
const sliced = lines.slice(offset, offset + lines);
const flat = sliced.join('\n');
const { text, truncated } = truncateAndGuard(flat, max_chars);
```

**Security:** if the API token lacks `api.sensitive` ability, the `logs` field is absent (hidden server-side). Handler returns `COOLIFY_403_SENSITIVE_REQUIRED`, NOT empty logs.

### `service.deploy` with `pull_latest` — the correct path

- `POST /services/{uuid}/deploy` → **404** (no dedicated endpoint).
- `POST /services/{uuid}/restart?latest=true` → **200** (PR #5881, merged 2025-05-23, IS in v4.1.2).
- `service.deploy` action with `pull_latest: true` → maps to `restart?latest=true`.
- `service.deploy` action with `pull_latest: false` → maps to plain `restart` (or just use `service.restart`).
- Tool param name: `pull_latest` (clarity). API query param name: `latest` (boolean). Handler: `pull_latest → ?latest=true`.

## What to Avoid

- **Do NOT trust the `next` branch OpenAPI for v4.1.2 endpoints.** PR #6293 (service/DB logs) merged 2026-07-06 to `next`, 32 days AFTER v4.1.2 release. Always grep the tagged YAML for the exact running version.
- **Do NOT ship `COOLIFY_501` stub tools for absent endpoints.** A stub that always errors is still a non-working tool. User directive: "KEINE Tools die nicht funktionieren." Omit the tool entirely. (See `mcp-ecosystem-comparison.md` for the kof70 stub anti-pattern.)
- **Do NOT treat `deployment.logs` as a plain `\n` string.** It is a JSON-encoded array. Raw passthrough (kof70 approach) produces agent-unfriendly output. Parse + flatten + filter.
- **Do NOT assume CLI flag availability implies endpoint availability.** The Coolify CLI lacks `--pull-latest` for `service restart`, but the endpoint `POST /services/{uuid}/restart?latest=true` exists. CLI gap ≠ API gap.
- **Do NOT assume CLI subcommand availability implies endpoint availability either direction.** CLI omits `service logs` / `database logs` subcommands — and the endpoints are also absent in v4.1.2. But the reasoning is: API absent → CLI omits. Not: CLI omits → API absent. Verify via OpenAPI + curl.

## Constraints

- **Coolify v4.1.2 release date:** 2026-06-04. Any PR merged after this date to `next` is NOT in v4.1.2 unless backported.
- **PR #6293** (service/DB logs endpoints): merged 2026-07-06 to `next`. Expected in v4.1.3+. NOT in v4.1.2.
- **PR #5881** (`latest` query param on service restart): merged 2025-05-23. IS in v4.1.2.
- **`api.sensitive` token ability** required for `deployment.logs` field. Without it, `logs` is hidden server-side.
- **No API-enforced upper bound on `lines` param** for `/applications/{uuid}/logs`. Zod `max:1000` is a safe client-side cap (SSH timeout + context-bloat protection).
- **Service/DB lifecycle endpoints are fire-and-forget:** response is `{message: "..."}`, NO `deployment_uuid` returned. No wait-mode polling possible on the response itself.

## Roadmap (revisit when instance upgrades)

When the live Coolify instance upgrades to v4.1.3+ (or `next`), add these back:

- `service.logs` → `GET /services/{uuid}/logs?sub_service_name=<name>&lines=N&show_timestamps=bool` → `{logs: string}`. Requires `sub_service_name` enumeration helper: `GET /services/{uuid}` returns sub-resources with valid `name` values.
- `database.logs` → `GET /databases/{uuid}/logs?lines=N&show_timestamps=bool` → `{logs: string}`. No `sub_service_name` needed (databases are monolithic).

Endpoint shapes captured in spike 004 `sources/next-services-logs-endpoint.yaml` + `sources/next-databases-logs-endpoint.yaml`.

## Origin

Synthesized from spikes: 004
Source files available in: `sources/004-coolify-412-api-reverify/`
