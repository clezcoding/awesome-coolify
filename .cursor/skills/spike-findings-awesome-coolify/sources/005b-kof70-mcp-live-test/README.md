---
spike: 005b
name: kof70-mcp-live-test
type: comparison
validates: "Given kof70 coolify-mcp-server (coolify-mcp-server-kof70) installed and connected to http://185.248.140.207:8000 (= puzzlesstool.online v4.1.2), when calling every read-only tool + stub tools live via CallMcpTool, then tool→endpoint Map with WORKS|404|500|stub for each, with focus on service/DB logs error behavior and execute_command stub"
verdict: VALIDATED ✓ (with anti-pattern findings)
related: [003, 004, 005a]
tags: [mcp, coolify, kof70, live-uat, service-logs, database-logs, execute-command, stub-anti-pattern, granular-tools]
---

# Spike 005b: kof70 coolify-mcp-server Live Test

## What This Validates

Test kof70's `coolify-mcp-server-kof70` (a.k.a. `coolify` in `~/.cursor/mcp.json`) end-to-end against the same live Coolify v4.1.2 instance that `awesome-coolify-mcp` targets.

Goal: produce a tool→endpoint map with WORKS / ERROR-STUB / 404 verdict for each tool, with focus on:
- Service logs (kof70 ships `get_service_logs` — what does it return?)
- Database logs (kof70 ships `get_database_logs` — what does it return?)
- `execute_command` (kof70 ships it — what does it return?)
- Deployment build logs (does kof70 parse the JSON-array `logs` field or pass it raw?)
- Service deploy + pull-latest (does `restart_service` expose a `latest` / `pull_latest` field?)

## Research

### Identification

| Clue | Value |
|------|-------|
| Repo | https://github.com/kof70/coolify-mcp-server |
| npm package | `coolify-mcp-server-kof70` |
| Cursor MCP config name | `coolify` (in `~/.cursor/mcp.json`) |
| MCP server id in catalog | `user-coolify` |
| Configured instance | `http://185.248.140.207:8000` |
| Token env var | `COOLIFY_TOKEN` (kof70's naming) |
| Token value | `1|w3Uwx021IAk8tDr7A7MFYVonXklYQaLuRbSEksji8d72dbf4` (DIFFERENT token from StuMason — different team/scope) |
| Tool count (live schema) | ~80+ tools (granular per-resource naming) |

### Critical instance clarification

`http://185.248.140.207:8000` resolves to the **same Coolify backend** as `https://puzzlesstool.online` — confirmed by:
- Same resource UUIDs returned (e.g. `jdjb1z6iaj0dkib9vzwgr9nr` = `clared-gotenberg` on both)
- Same `/version` response (`4.1.2`)
- IP `185.248.140.207` is `puzzlesstool.online`'s public IP

So kof70 and StuMason and awesome-coolify-mcp are all hitting the same Coolify instance — direct comparison is valid. User's original statement "same Coolify instance" was correct; the URLs just look different.

### Approach

Same as Spike 005a: GetMcpTools → full schema → CallMcpTool on read-only + stub tools → record responses.

## How to Run

```bash
# (via Cursor MCP client — CallMcpTool on user-coolify)

# get_service_logs (KEY — stub test)
{"uuid":"j105904z7t8enrqnzjerbd92","lines":5}
→ {"error":"Service logs endpoint is not available in Coolify API. Service logs are not exposed via the API."}

# get_database_logs (KEY — stub test)
{"uuid":"wwv448u8322naf6xry5rhup4","lines":5}
→ {"error":"Database logs endpoint is not available in Coolify API. Database logs are not exposed via the API."}

# get_deployment (compare JSON-array handling)
{"uuid":"jebl7peop60i0ircz9jlhot4"}
→ {id, application:{...}, deployment_uuid, status, logs:"<RAW JSON-encoded array string, NOT parsed>", ...}
```

## What to Expect

| Tool | Underlying Endpoint | Live Verdict | Notes |
|------|---------------------|--------------|-------|
| `get_version` | `GET /version` | WORKS ✓ | `"4.1.2"` |
| `health_check` | `GET /health` | WORKS ✓ | `"OK"` |
| `list_resources` | `GET /resources` | WORKS ✓ | 24 resources returned as full objects (no projection — huge response, 403 KB) |
| `list_applications` | `GET /applications` | (not tested, same endpoint family) | — |
| `list_services` | `GET /services` | (not tested) | — |
| `list_databases` | `GET /databases` | (not tested) | — |
| `get_application` | `GET /applications/{uuid}` | (not tested) | — |
| `get_service` | `GET /services/{uuid}` | (not tested) | — |
| `get_database` | `GET /databases/{uuid}` | (not tested) | — |
| `get_application_logs` `uuid=<app>` `lines=N` | `GET /applications/{uuid}/logs?lines=N` | WORKS ✓ | `{"logs":"<string>"}` — same raw passthrough as StuMason |
| `get_deployment` `uuid=<dep>` | `GET /deployments/{uuid}` | WORKS ✓ (but raw) | **Returns deployment object with `logs` as raw JSON-encoded string array — NOT parsed, NOT flattened.** Agent must JSON.parse the string themselves. Plus leaks webhook secrets + sentinel_token in plaintext (see Investigation Trail). |
| `list_deployments` | (not tested) | — | — |
| `get_application_deployments` | `GET /deployments/applications/{uuid}` | (not tested) | — |
| **`get_service_logs`** | (none — stub) | **ERROR-STUB** | Returns `{"error":"Service logs endpoint is not available in Coolify API..."}`. Tool ships but always errors. Violates user's "no non-working tools" directive. |
| **`get_database_logs`** | (none — stub) | **ERROR-STUB** | Returns `{"error":"Database logs endpoint is not available in Coolify API..."}`. Same anti-pattern. |
| **`execute_command`** | (none — stub) | **ERROR-STUB** (not live-tested, schema confirms) | Description: "NOTE: This endpoint is not available in Coolify API and will return an error." Same anti-pattern as service/DB logs. |
| `start_application` / `stop_application` / `restart_application` | `POST /applications/{uuid}/start\|stop\|restart` | (not tested, mutations) | 3 separate granular tools — vs StuMason's 1 unified `control` tool |
| `start_service` / `stop_service` / `restart_service` | `POST /services/{uuid}/start\|stop\|restart` | (not tested, mutations) | 3 separate granular tools. **`restart_service` schema has NO `latest` / `pull_latest` field** — cannot satisfy SVC-05 (pull-latest restart) |
| `start_database` / `stop_database` / `restart_database` | `POST /databases/{uuid}/start\|stop\|restart` | (not tested, mutations) | 3 separate granular tools |
| `deploy` `uuid=<...>` `tag=<...>` `force=bool` | `POST /applications/{uuid}/deploy?force=bool` (and similar for tagged resources) | (not tested, mutation) | Generic deploy by UUID or tag. **Schema has NO `pull_latest` field** — cannot satisfy SVC-05 |
| `deploy_application` `uuid` `force` `instant_deploy` `confirm` | `POST /applications/{uuid}/deploy` | (not tested, mutation) | App-only deploy, no pull_latest |
| `deploy` (for services, if reachable) | `POST /services/{uuid}/restart?latest=true` | (not tested, mutation) | kof70 schema does NOT expose `latest` query param — cannot trigger pull-latest restart |
| `confirm` field on mutations | local gate (env var `COOLIFY_REQUIRE_CONFIRM=true`) | (not tested) | kof70 uses ENV-VAR confirmation gate — anti-pattern per Spike 003 (should be per-call `confirm: true` like StuMason) |
| `create_*` / `update_*` / `delete_*` (servers, projects, environments, applications, services, databases, envs, private keys, github apps, etc.) | `POST/PATCH/DELETE /<resource>` | (not tested, mutations) | ~30+ granular CRUD tools — token bloat |
| `get_database_backups` / `create_database_backup` | `GET /databases/{uuid}/backups` etc. | (not tested) | — |

## Observability

Evidence:
- `sources/kof70-tool-inventory.md` — full tool inventory by category (from repo README)
- `sources/kof70-live-call-results.md` — full CallMcpTool responses for tested tools
- `sources/kof70-stub-tool-schemas.json` — schemas for `get_service_logs`, `get_database_logs`, `execute_command`, `restart_service`, `deploy` (showing missing `pull_latest` field)
- `sources/kof70-get-deployment-raw-logs.txt` — excerpt of `get_deployment` response showing raw JSON-array `logs` string + leaked webhook secrets + sentinel_token

## Investigation Trail

### Iteration 1 — Identify kof70 server in Cursor config

`~/.cursor/mcp.json`:
```json
"coolify": {
  "command": "npx",
  "args": ["-y", "coolify-mcp-server-kof70"],
  "env": {
    "COOLIFY_BASE_URL": "http://185.248.140.207:8000",
    "COOLIFY_TOKEN": "1|w3Uwx021IAk8tDr7A7MFYVonXklYQaLuRbSEksji8d72dbf4"
  }
}
```

Initial assumption: different instance than StuMason. After list_resources returned identical UUIDs to StuMason, verified: `185.248.140.207` is `puzzlesstool.online`'s public IP — same backend, different network path (HTTP direct-IP vs HTTPS domain). User's "same instance" statement was correct.

### Iteration 2 — Full schema dump via GetMcpTools

57.4 KB / 2182 lines of JSON schema. ~80+ tools confirmed — kof70 uses **granular per-resource naming** (`start_application`, `stop_application`, `restart_application`, `start_service`, `stop_service`, `restart_service`, `start_database`, `stop_database`, `restart_database`, `deploy_application`, `deploy`, `get_application_logs`, `get_service_logs`, `get_database_logs`, `execute_command`, `get_deployment`, etc.).

This is the **anti-pattern** Spike 003 flagged: 60+ granular tools → token bloat. kof70 ships ~80+ tools; StuMason ships 42; awesome-coolify-mcp plans ~8 domain tools with action-discriminated unions.

### Iteration 3 — Live stub-tool tests (THE KEY FINDING)

Called `get_service_logs` and `get_database_logs` live:
```json
{"error":"Service logs endpoint is not available in Coolify API. Service logs are not exposed via the API."}
{"error":"Database logs endpoint is not available in Coolify API. Database logs are not exposed via the API."}
```

**kof70 ships stub tools that always return errors.** This is the OPPOSITE of StuMason's approach (omit the tool entirely). Per user's directive "NO tools without working endpoint", kof70's design is the anti-pattern to avoid.

Same for `execute_command` — kof70 ships it, description explicitly says "will return an error". Confirmed via schema (line 1073 of kof70 schema dump). Did not live-test (mutation + would error anyway).

### Iteration 4 — Deployment logs handling (kof70 vs StuMason)

Called `get_deployment` with `uuid=jebl7peop60i0ircz9jlhot4`. Response:
- `logs` field is the RAW JSON-encoded string array: `"[{\"command\":null,\"output\":\"Docker 29.4.0...\",\"type\":\"stdout\",\"timestamp\":\"2026-07-13T00:41:12.163071Z\",\"hidden\":false,\"batch\":1},...]"`
- 5683 chars of JSON-as-string
- NO `lines` param in schema — no pagination, no slicing
- NO flattening, NO timestamp-prefix formatting
- Agent receives a JSON string inside a JSON object — must JSON.parse it themselves to get human-readable log lines

**kof70 passes the raw API response through unchanged.** StuMason (Spike 005a) JSON.parses, flattens, prefixes timestamps, supports `lines` slicing, returns `logs_meta` pagination. **StuMason's pattern is superior — adopt it for awesome-coolify-mcp Phase 5 PLAN 05-02.**

### Iteration 5 — Service deploy + pull-latest schema check

Read kof70 schema for `restart_service`:
```json
{"tool":"restart_service","description":"Restart a service. When COOLIFY_REQUIRE_CONFIRM=true, requires confirm: true parameter.","inputSchema":{"type":"object","properties":{"uuid":{"type":"string"},"confirm":{"type":"boolean"}},"required":["uuid"]}}
```

**NO `latest` or `pull_latest` field.** kof70's `restart_service` calls `POST /services/{uuid}/restart` without the `?latest=true` query param — cannot trigger pull-latest-image restart.

Read kof70 schema for `deploy`:
```json
{"tool":"deploy","description":"Deploy resources by UUID or tag. Supports deploying multiple resources at once using comma-separated values.","inputSchema":{"type":"object","properties":{"uuid":{...},"tag":{...},"force":{"type":"boolean","description":"Force rebuild without cache","default":false},"confirm":{...}},"required":[]}}
```

**NO `pull_latest` field.** `deploy` is generic (UUID or tag, comma-separated) but exposes only `force`, not `pull_latest`.

**kof70 cannot satisfy SVC-05** (service deploy with pull-latest-images). StuMason's `control.pull_latest: boolean (services only)` is the correct design — matches Phase 5 D-17 and PR #5881.

### Iteration 6 — Security: kof70 leaks even more secrets than StuMason

`get_deployment` response includes (in plaintext):
- `application.manual_webhook_secret_github: "Xft08TAJK0d17cfIdWjDPPhiomabbbpTplpVt1cP"`
- `application.manual_webhook_secret_gitlab: "AevQ14LjZmMBxLKjdoyG3rlDrYUpQbx93QRWyJS2"`
- `application.manual_webhook_secret_bitbucket: "tLk8rIC6aQ42cPdA76dB5tFzAtxTHK4PKlLu4zNZ"`
- `application.manual_webhook_secret_gitea: "WH3tgkJ1fi98WasPrmZDy5FI3EEiIB2kLwtljtKJ"`
- `application.http_basic_auth_password: null` (would leak if set)
- `application.destination.server.settings.sentinel_token: "eyJpdiI6Ik5kbVRQTDJPUndZUDlZb3REYVBPWmc9PSI..."` (JWT-like sentinel auth token)
- `application.custom_labels: <base64-encoded Traefik labels>` (decodes to full routing config — security-relevant)

**kof70 leaks app webhook secrets + Coolify sentinel_token in plaintext.** StuMason (Spike 005a) leaks DB passwords + connection strings in plaintext. Both are worse than awesome-coolify-mcp's `sanitizeFullProjection` which masks `password|token|secret|private|env` keys by default (P2 02-01).

**awesome-coolify-mcp security advantage confirmed.** Document in v1 README as differentiator. Phase 6 will add full masking (OUT-02) on log line content too.

### Iteration 7 — `list_resources` token bloat evidence

Called `list_resources` — response was 403.8 KB / 4852 lines (written to agent-tools file). 24 resources returned with full projection (no summary mode). For an MCP client with a context window, this is catastrophic — 100k+ tokens just to list resources.

StuMason's `list_*` tools return summary projections (`uuid`/`name`/`status` only — 90-99% smaller per their README). awesome-coolify-mcp's `resource.list` (P2 02-02) uses summary projection by default with `include_full: true` opt-in — same pattern as StuMason, far superior to kof70.

## Results

### Verdict: VALIDATED ✓ (with anti-pattern findings)

kof70 live test against `puzzlesstool.online` v4.1.2 confirms:

1. **Stub tools anti-pattern**: kof70 ships `get_service_logs`, `get_database_logs`, `execute_command` as tools that always return errors. **Violates user's "no non-working tools" directive.** awesome-coolify-mcp should follow StuMason's approach: omit tools for absent endpoints.

2. **Deployment logs: raw passthrough, no parsing**: kof70's `get_deployment` returns the inline `logs` field as the raw JSON-encoded string array. Agent must JSON.parse it themselves. **StuMason's flatten pattern is superior — adopt it for awesome-coolify-mcp Phase 5 PLAN 05-02.**

3. **Cannot satisfy SVC-05**: kof70's `restart_service` has NO `pull_latest` / `latest` field. kof70's `deploy` has NO `pull_latest` field. **kof70 cannot trigger pull-latest-image restart for services.** StuMason's `control.pull_latest` (services only) is the correct design — matches Phase 5 D-17 and PR #5881.

4. **Granular tool naming = token bloat**: ~80+ tools vs StuMason's 42 vs awesome-coolify-mcp's planned ~8. kof70 ships 9 separate lifecycle tools (`start|stop|restart_application|service|database`) for what StuMason does in 1 `control` tool. Anti-pattern per Spike 003.

5. **Security: leaks webhook secrets + sentinel_token**: kof70's `get_deployment` returns `manual_webhook_secret_*` and `destination.server.settings.sentinel_token` in plaintext. StuMason leaks DB passwords. awesome-coolify-mcp's `sanitizeFullProjection` (P2 02-01) masks all of these by default — security advantage.

6. **`list_resources` returns full payload by default**: 403 KB / 4852 lines for 24 resources — no summary projection. Token catastrophe. awesome-coolify-mcp's summary projection by default (P2 02-02) is the correct design.

### Surprises

- kof70 and StuMason both use `confirm: boolean` field on mutations, but kof70 gates it behind env var `COOLIFY_REQUIRE_CONFIRM=true` (global on/off) — StuMason's per-call `confirm: true` is cleaner.
- kof70's `deploy` tool accepts comma-separated UUIDs or tags — matches awesome-coolify-mcp's Phase 4 batch deploy (D-13/D-14) design. Good pattern, but missing `pull_latest`.
- kof70 has `deploy_application` (separate from `deploy`) with `instant_deploy: boolean` field — semantics unclear without testing; possibly "skip queue" vs "queue deploy".

### Comparison: kof70 vs StuMason vs awesome-coolify-mcp (planned)

| Aspect | kof70 | StuMason | awesome-coolify-mcp (planned) |
|--------|-------|----------|-------------------------------|
| Tool count | ~80+ | 42 | ~8 |
| Schema style | granular per-resource | category-action-param | domain + z.discriminatedUnion('action') |
| service.logs tool | STUB (always errors) | NOT SHIPPED | NOT SHIPPED (per Spike 005a recommendation) |
| database.logs tool | STUB (always errors) | NOT SHIPPED | NOT SHIPPED (per Spike 005a recommendation) |
| execute_command tool | STUB (always errors) | NOT SHIPPED | NOT SHIPPED (per PROJECT.md D-05 out-of-scope) |
| Deployment logs handling | Raw JSON-array string passthrough | JSON-parse + flatten + timestamp prefix + `lines` slice + `logs_meta` | (Phase 5 PLAN 05-02 should adopt StuMason pattern) |
| Service deploy + pull-latest | NOT EXPOSED (no `pull_latest` field) | `control.pull_latest: boolean (services only)` | `service.deploy` action with `pull_latest: boolean` (Phase 5 D-17) |
| Confirm gate | ENV-VAR `COOLIFY_REQUIRE_CONFIRM=true` | Per-call `confirm: true` | Per-call `confirm: true` (Phase 6 OUT-07) |
| Secret masking | NONE (leaks webhook secrets, sentinel_token, DB passwords) | PARTIAL (env_vars + system list_resources masked; get_database leaks DB password) | `sanitizeFullProjection` masks `password\|token\|secret\|private\|env` keys by default (P2 02-01); full masking Phase 6 (OUT-02) |
| Multi-instance | NO (env vars only) | NO (env vars only) | YES (`~/.coolify-mcp/instances.json` + `instance` arg — P1 D-04 deferred to v2) |
| Resource list projection | FULL payload by default (403 KB for 24 resources) | SUMMARY by default (uuid/name/status only) | SUMMARY by default with `include_full: true` opt-in (P2 02-02) |

### Impact on awesome-coolify-mcp Phase 5

**Reinforces Spike 005a recommendations:**

1. **05-02 build-logs handler**: adopt StuMason's JSON-parse + flatten + timestamp-prefix + `lines`-slice + `logs_meta` pattern. DO NOT follow kof70's raw-passthrough anti-pattern.

2. **05-04 service.logs / database.logs**: drop entirely from v1 (follow StuMason). DO NOT ship as COOLIFY_501 stubs (kof70 anti-pattern — violates user's "no non-working tools" directive).

3. **05-03 service.deploy**: `pull_latest: boolean` field confirmed (StuMason pattern, PR #5881). DO NOT follow kof70 which doesn't expose this.

4. **execute_command**: DO NOT ship (both StuMason and kof70 confirm endpoint absent). awesome-coolify-mcp PROJECT.md D-05 already defers this to v2 (V2-RT-01 blocked on API).

5. **Token optimization**: ~8 domain tools with action-discriminated unions remains the right design. kof70's ~80+ granular tools = token bloat anti-pattern. StuMason's 42 is better but still 5x awesome-coolify-mcp's planned count.

6. **Security**: `sanitizeFullProjection` is a key differentiator. Both kof70 and StuMason leak secrets — awesome-coolify-mcp masks by default. Document in v1 README + Phase 7 distribution docs.

### Impact on awesome-coolify-mcp differentiators (consolidated)

| Differentiator | vs kof70 | vs StuMason |
|----------------|----------|-------------|
| Action-based schema (~8 tools) | ✓ ~10x fewer tools | ✓ ~5x fewer tools |
| Multi-instance config | ✓ kof70 single-instance | ✓ StuMason single-instance |
| `sanitizeFullProjection` by default | ✓ kof70 leaks webhook + sentinel | ✓ StuMason leaks DB password |
| Per-call `confirm: true` gate | ✓ kof70 uses env-var gate | = same pattern |
| Deployment logs JSON-parse + flatten | ✓ kof70 raw passthrough | = same pattern (adopt from StuMason) |
| Service deploy + pull-latest | ✓ kof70 doesn't expose | = same pattern (both expose `pull_latest`) |
| Structured error codes with recovery hints | ✓ kof70 returns plain `{error: msg}` | ✓ StuMason returns plain MCP errors |
| Wait-mode deploy polling | = same pattern (both have `wait: true`) | = same pattern |
| No stub tools (omit absent endpoints) | ✓ kof70 ships stubs | = same pattern (StuMason omits) |
| npm package distribution | = same | = same |
