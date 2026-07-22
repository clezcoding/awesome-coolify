---
spike: 004
name: coolify-412-api-reverify
type: standard
validates: "Given Coolify 4.1.2 OpenAPI + live instance https://puzzlesstool.online, when re-verifying all P5 endpoints via WebSearch + Context7 + raw openapi.yaml + live curl, then every endpoint classified EXISTS|ABSENT|BROKEN with response shape and version roadmap"
verdict: VALIDATED ✓
related: [001, 003]
tags: [coolify, api, rest, openapi, live-uat, v4.1.2, service-logs, database-logs, service-deploy]
---

# Spike 004: Coolify 4.1.2 API Re-Verify (Service/DB Logs + Service Deploy+Pull-Latest)

## What This Validates

Given the user's directive — **NO tools in awesome-coolify-mcp without a working Coolify API endpoint** — re-verify every endpoint that Phase 5 (Logs & Service/DB Ops) plans to call, against:

1. Coolify 4.1.2 tagged OpenAPI YAML (raw, from `github.com/coollabsio/coolify/blob/v4.1.2/openapi.yaml`)
2. Coolify `next` branch OpenAPI (for forward-readiness)
3. Live instance `https://puzzlesstool.online` (confirmed v4.1.2 via `/version`)
4. WebSearch for any newer PRs that add/remove endpoints (especially service/DB logs)

Phase 5 RESEARCH.md (D-04) flagged **service/DB logs as COOLIFY_501 stubs** based on Spike 001's earlier finding. This spike re-tests that conclusion against v4.1.2 specifically, because the user suspects the gap may have been closed.

## Research

### Approach

| Source | Method | Purpose |
|--------|--------|---------|
| v4.1.2 OpenAPI YAML | `curl` raw + `grep` for `/services/{uuid}/*` + `/databases/{uuid}/*` | Authoritative endpoint existence |
| `next` branch OpenAPI YAML | Same | Forward-readiness — what's coming |
| WebSearch | "Coolify API service logs endpoint" + "Coolify 4.1 service restart latest" | Surface recent PRs + community state |
| PR #6293 (WebFetch) | Read merge metadata + diff | Service/DB logs endpoint history |
| PR #5881 (WebSearch) | Confirm `latest` query param on service restart | SVC-05 endpoint verification |
| Live `https://puzzlesstool.online` | `curl /version`, `/health`, `/applications/{uuid}/logs`, `/services/{uuid}/logs`, `/databases/{uuid}/logs`, `/services/{uuid}/deploy`, `/deployments/applications/{uuid}`, `/deployments/{uuid}` | Empirical confirmation |

### Chosen approach

Raw OpenAPI + live curl. Both are authoritative — OpenAPI says what the server *should* expose; live curl says what it *actually* exposes. Disagreements become findings.

### Sources verified

- v4.1.2 OpenAPI: 8778 lines, fetched from `raw.githubusercontent.com/coollabsio/coolify/v4.1.2/openapi.yaml`
- `next` OpenAPI: 10348 lines, fetched from `raw.githubusercontent.com/coollabsio/coolify/next/openapi.yaml`
- PR #6293: merged 2026-07-06 by @andrasbacsai into `next` branch (target: `next`, NOT `v4.x`)
- PR #5881: merged 2025-05-23, adds `latest` query param to `POST /services/{uuid}/restart` — IS in v4.1.2
- v4.1.2 release: 2026-06-04 (target_commitish `v4.x`)
- Live instance: confirmed v4.1.2 via `GET /api/v1/version` → `"4.1.2"`

## How to Run

```bash
# Token from .cursor/mcp.json
TOKEN="7|..."

# Application runtime logs (WORKS)
curl -s "https://puzzlesstool.online/api/v1/applications/jt4mw1b0ld3542i9w9nfmqkr/logs?lines=5" \
  -H "Authorization: Bearer $TOKEN"

# Service logs (404 in v4.1.2)
curl -s -w "\n%{http_code}\n" "https://puzzlesstool.online/api/v1/services/j105904z7t8enrqnzjerbd92/logs?lines=5" \
  -H "Authorization: Bearer $TOKEN"

# Database logs (404 in v4.1.2)
curl -s -w "\n%{http_code}\n" "https://puzzlesstool.online/api/v1/databases/wwv448u8322naf6xry5rhup4/logs?lines=5" \
  -H "Authorization: Bearer $TOKEN"

# Service deploy (404 in v4.1.2 — no dedicated deploy endpoint)
curl -s -w "\n%{http_code}\n" -X POST "https://puzzlesstool.online/api/v1/services/j105904z7t8enrqnzjerbd92/deploy" \
  -H "Authorization: Bearer $TOKEN"

# Deployment inline logs (WORKS — but logs field is JSON-array, not plain string)
curl -s "https://puzzlesstool.online/api/v1/deployments/jebl7peop60i0ircz9jlhot4" \
  -H "Authorization: Bearer $TOKEN" | jq '.logs | fromjson | .[0]'
```

## What to Expect

| Endpoint | v4.1.2 Status | Live HTTP | Notes |
|----------|---------------|-----------|-------|
| `GET /version` | exists | 200 "4.1.2" | Confirms live instance version |
| `GET /health` | exists | 200 "OK" | — |
| `GET /applications/{uuid}/logs?lines=N` | exists | 200 `{logs: string}` | D-06 confirmed |
| `GET /deployments/{uuid}` | exists | 200 (deployment obj) | Inline `logs` field present |
| `GET /deployments/applications/{uuid}` | exists | 200 `{count, deployments: [...]}` | D-01/D-03 confirmed |
| `POST /services/{uuid}/start` | exists (OpenAPI 7395) | not live-tested (mutation) | Phase 5 RESEARCH verified via routes/api.php |
| `POST /services/{uuid}/stop` | exists (OpenAPI 7428) | not live-tested (mutation) | Phase 5 RESEARCH verified |
| `POST /services/{uuid}/restart` | exists (OpenAPI 7468) | not live-tested (mutation) | — |
| `POST /services/{uuid}/restart?latest=true` | exists (PR #5881, in v4.1.2) | not live-tested (mutation) | SVC-05 canonical path |
| `POST /services/{uuid}/deploy` | **ABSENT** | **404 Not found** | No dedicated deploy endpoint — use `restart?latest=true` |
| `GET /services/{uuid}/logs` | **ABSENT** | **404 Not found** | PR #6293 merged 2026-07-06 to `next`, NOT in v4.1.2 |
| `GET /services/{uuid}/logs?sub_service_name=...` | **ABSENT** | **404 Not found** | Same — PR #6293 endpoint not backported |
| `GET /databases/{uuid}/logs` | **ABSENT** | **404 Not found** | Same — PR #6293 endpoint not backported |
| `POST /databases/{uuid}/start|stop|restart` | exists (OpenAPI 4004/4037/4077) | not live-tested (mutation) | Phase 5 RESEARCH verified |

## Observability

No forensic log layer needed — pure endpoint verification. Evidence captured in `sources/`:
- `v412-applications-logs-endpoint.yaml` — OpenAPI excerpt for `/applications/{uuid}/logs`
- `v412-databases-lifecycle-endpoints.yaml` — OpenAPI excerpt for `/databases/{uuid}/start|stop|restart`
- `v412-services-lifecycle-endpoints.yaml` — OpenAPI excerpt for `/services/{uuid}/start|stop|restart`
- `next-databases-logs-endpoint.yaml` — `next` branch OpenAPI excerpt for `/databases/{uuid}/logs` (post-PR #6293)
- `next-services-logs-endpoint.yaml` — `next` branch OpenAPI excerpt for `/services/{uuid}/logs?sub_service_name=...` (post-PR #6293)
- `live-curl-results.txt` — full live curl output against `https://puzzlesstool.online` v4.1.2

## Investigation Trail

### Iteration 1 — WebSearch surfaces PR #6293

Search for "Coolify 4.1 API service logs endpoint" surfaced GitHub Discussion #6287 which references PR #6293 "feat(api): add endpoint to retrieve database and service logs". PR author @Jacxk, merged by @andrasbacsai on 2026-07-06.

This threatened the Phase 5 D-04 assumption (service/DB logs = ABSENT). If PR #6293 was in v4.1.2, the COOLIFY_501 stub plan would be wrong — we'd have real endpoints to wire up.

### Iteration 2 — Timeline check

v4.1.2 released 2026-06-04. PR #6293 merged 2026-07-06 (target: `next`). 32 days **after** v4.1.2 release. So v4.1.2 should NOT include PR #6293.

Verified via raw OpenAPI grep:
- `grep '/services/{uuid}/logs' /tmp/coolify-openapi-v412.yaml` → no matches
- `grep '/databases/{uuid}/logs' /tmp/coolify-openapi-v412.yaml` → no matches
- `grep '/services/{uuid}/logs' /tmp/coolify-openapi-next.yaml` → match at line 8338
- `grep '/databases/{uuid}/logs' /tmp/coolify-openapi-next.yaml` → match at line 4158

### Iteration 3 — Live curl confirmation

Hit the live v4.1.2 instance directly:
- `GET /services/{uuid}/logs` → 404 "Not found"
- `GET /services/{uuid}/logs?sub_service_name=app` → 404 (PR #6293 query param not recognized)
- `GET /services/{uuid}/logs?show_timestamps=true` → 404
- `GET /databases/{uuid}/logs` → 404
- `GET /databases/{uuid}/logs?show_timestamps=true` → 404
- `POST /services/{uuid}/deploy` → 404 (confirms no dedicated deploy endpoint)

All four `logs` variants return 404 — empirically confirms PR #6293 endpoints absent from v4.1.2.

### Iteration 4 — Service deploy + pull-latest path

WebSearch for "Coolify API services uuid restart latest pull images" surfaced:
- PR #5881 (merged 2025-05-23): adds `latest` boolean query param to `POST /services/{uuid}/restart` — `?latest=true` makes `StartService` pull newest images before starting
- Issue #5318: webhook with `force=true` didn't pull latest (pre-PR #5881 bug, now fixed)

This confirms Phase 5 RESEARCH's D-17 finding: **service deploy with pull-latest = `POST /services/{uuid}/restart?latest=true`**. No dedicated `/services/{uuid}/deploy` endpoint exists. The Phase 5 design mapping `service.deploy → POST /services/{uuid}/restart?latest=true` is correct.

### Iteration 5 — Application logs + deployment logs (happy-path re-verify)

- `GET /applications/{uuid}/logs?lines=5` → 200 with `{"logs": "<string>"}` — confirms D-06 shape
- `GET /deployments/{deployment_uuid}` → 200 with deployment object containing inline `logs` field

### Iteration 6 — SURPRISE: deployment.logs is JSON-array, not plain string

Phase 5 RESEARCH D-08/D-10/D-11 assumed `logs` is a plain `\n`-separated string. Live evidence:

```
logs type: <class 'str'>   ← it IS a string
logs len: 5683             ← 5683 chars
logs sample: '[{"command":null,"output":"Docker 29.4.0 ...","type":"stdout","timestamp":"2026-07-13T00:41:12.163071Z","hidden":false,"batch":1},...'
```

The `logs` field is a **JSON-encoded string containing an array of structured log entries**:

```json
[
  {
    "command": null | string,
    "output": string,           // the actual log line text
    "type": "stdout" | "stderr",
    "timestamp": "ISO8601Z",
    "hidden": boolean,          // some entries are marked hidden (UI filter)
    "batch": integer            // logical grouping (e.g. build phases)
  },
  ...
]
```

Sample deployment had 23 entries across batches {1,2,8,10}, types {stdout, stderr}, hidden {true, false}.

**This contradicts the Phase 5 PLAN 05-02 assumption.** The build-logs handler in 05-02 must:
1. `JSON.parse(logs)` to get the entries array
2. Flatten to display: join `entry.output` with `\n` (or filter by `type`/`batch`/`hidden`)
3. Optionally expose `type`/`batch` filters in the action schema (new capability vs plain string slicing)
4. Cap with `max_chars` AFTER flattening (not before — raw JSON is denser than displayed text)

Phase 5 PLAN 05-02 needs an amendment / re-research note before implementation.

### Iteration 7 — Mutations deferred

Did NOT live-test `POST /services/{uuid}/start|stop|restart`, `POST /databases/{uuid}/start|stop|restart`, `POST /services/{uuid}/restart?latest=true` because:
- They are state-changing on a production-adjacent instance
- Phase 5 RESEARCH already verified them against `routes/api.php` source code
- Spike 005a (StuMason) and 005b (kof70) will exercise these MCP servers' mutation tools against the same instance — those tests indirectly confirm endpoint health without us firing raw curls

If 005a/005b reveal a mutation endpoint mismatch, we re-test raw here.

## Results

### Verdict: VALIDATED ✓

All P5 endpoints re-verified against v4.1.2 OpenAPI + live instance. Findings:

1. **Service/DB logs endpoints ABSENT in v4.1.2** (confirmed live: 404 for all 4 variants). PR #6293 adds them but merged 2026-07-06 to `next`, 32 days after v4.1.2 release. **D-04 stub plan stands for v4.1.2.** When the live instance upgrades to v4.1.3+ (or `next`), the stubs can become real handlers wired to:
   - `GET /databases/{uuid}/logs?lines=N&show_timestamps=bool` → `{logs: string}`
   - `GET /services/{uuid}/logs?sub_service_name=<name>&lines=N&show_timestamps=bool` → `{logs: string}`
   - `sub_service_name` required — must first fetch service sub-resources via `GET /services/{uuid}` to enumerate valid names

2. **Service deploy endpoint: NO `/services/{uuid}/deploy`** (confirmed live: 404). SVC-05 maps to `POST /services/{uuid}/restart?latest=true` per PR #5881. Phase 5 D-17 design is correct.

3. **Application runtime logs: WORKS** (`GET /applications/{uuid}/logs?lines=N` → 200 `{logs: string}`). D-06 confirmed.

4. **Deployment build logs: WORKS but shape differs from assumption**. `GET /deployments/{uuid}` returns object with inline `logs` field, but `logs` is a JSON-encoded string containing an array of `{command, output, type, timestamp, hidden, batch}` entries — NOT a plain `\n`-separated string. **Phase 5 PLAN 05-02 needs amendment** before implementation:
   - Handler must `JSON.parse(logs)` then flatten `output` strings
   - New filtering capability: `type` (stdout/stderr), `batch` (phase), `hidden` (include hidden entries or not)
   - Cap with `max_chars` AFTER flattening

5. **Service/DB lifecycle endpoints EXIST** (OpenAPI 4004/4037/4077 + 7395/7428/7468). Not live-tested (mutations deferred to 005a/005b). Phase 5 RESEARCH verified via `routes/api.php` source.

### Surprises

- **PR #6293 timing**: extremely recent merge (2026-07-06). The Phase 5 D-04 finding was correct for v4.1.2 but will be stale once Coolify releases v4.1.3+ (presumably within weeks). Roadmap implication: add a v1.1 / v2 task to wire up real service/DB logs handlers when the live instance upgrades.
- **Deployment logs JSON-array shape**: 05-RESEARCH.md D-08/D-10/D-11 explicitly says "plain string with `\n` separators". Live evidence contradicts this. Likely the researcher read the `ApplicationDeploymentQueue` model column type (`text`/`longText`) without inspecting actual content. Needs correction before 05-02 implementation.

### Impact on Remaining Spikes

- **005a / 005b (StuMason + kof70 MCP live tests)**: When these MCP servers expose `service.logs` / `database.logs` tools, we now know they either (a) return a 404/error to the agent (v4.1.2 has no endpoint), (b) hit a different non-REST path (SSH? Docker socket? websocket?), or (c) call the `next`-branch endpoints that don't exist on v4.1.2. The spike will reveal which.
- **006 (Coolify CLI live test)**: CLI is a Go binary that may bypass the REST API and SSH directly to the server to run `docker logs`. If so, that's a candidate adaptation path for awesome-coolify-mcp — but requires SSH credentials, not just API token. Worth confirming.

### Impact on Phase 5 PLAN

Two amendments needed before 05-02 implementation:

1. **05-02 build-logs handler**: `logs` field is JSON-encoded array, not plain string. Update `sliceLogBlob` to JSON-parse first, flatten `output` strings, optionally filter by `type`/`batch`/`hidden`. Add new optional schema fields `type?: 'stdout'|'stderr'|'all'` and `include_hidden?: boolean` (default false) to `application.logs` action when `deployment_uuid` is provided. Cap with `max_chars` AFTER flattening.

2. **05-04 (or wherever service.logs/database.logs stubs are implemented)**: Stubs return `COOLIFY_501` with a recovery hint that mentions (a) PR #6293 will add these endpoints in v4.1.3+, (b) workaround via CLI / SSH / docker logs directly (pending 006 findings), (c) upgrade Coolify instance to `next` for early access. Document the future endpoint shape in the hint so agents know what to expect.

### Roadmap Implications

- Add a v1.1 follow-up task (or v2 if scope too large): "Wire real `service.logs` + `database.logs` handlers when Coolify instance upgrades to v4.1.3+". Endpoint shapes already captured in `sources/next-*-logs-endpoint.yaml`.
- Consider adding `sub_service_name` enumeration helper: `GET /services/{uuid}` returns sub-resources with `name` field — that's the valid `sub_service_name` value list. Phase 5+ service.logs handler (post-v4.1.3) will need this lookup pattern.
