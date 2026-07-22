# Spike 006 — Coolify CLI Live Test

**Verdict:** VALIDATED ✓
**Date:** 2026-07-13
**Instance:** https://puzzlesstool.online (Coolify v4.1.2)
**CLI:** `coolify v1.6.2` (config: `/Users/puzzless/.config/coolify/config.json`)
**Repo:** https://github.com/coollabsio/coolify-cli

## Hypothesis

Given the official `coolify` CLI (v1.6.2) installed and pointed at the same
v4.1.2 instance as the MCP servers, when tracing every subcommand with
`--debug` + `--format json`, then:

1. The CLI's subcommand→endpoint map is fully extracted.
2. We learn how the CLI handles Service/DB logs (the API gap from Spike 004).
3. We learn whether the CLI exposes a `pull_latest` flow for services.
4. We can decide what (if anything) to adapt into `awesome-coolify-mcp`.

## Method

- `coolify --debug` writes `GET/POST https://...` + `Response status` + `Response body` to stderr.
- Run every relevant subcommand with `--debug --format json`, capture stderr+stdout, grep for HTTP lines.
- Probe the two known API gaps (service logs, database logs) by trying the CLI's `service` and `database` subcommands.
- Probe `--follow` mode with a `timeout 10` to observe polling cadence.
- Probe `--debuglogs` flag on `app deployments logs` to observe hidden-entry filtering.

All raw traces saved to `sources/`.

## Findings

### 1. CLI is a pure REST client

Every CLI subcommand maps 1:1 to a Coolify REST endpoint under `/api/v1/*`.
No SSH, no docker socket, no websocket. Same surface the MCP servers use.

| Subcommand | Method | Endpoint |
|---|---|---|
| `app list` | GET | `/api/v1/applications` |
| `app logs <uuid> -n N` | GET | `/api/v1/applications/{uuid}/logs?lines=N` |
| `app deployments logs <uuid> <dep> -n N` | GET | `/api/v1/deployments/{dep}` |
| `service list` | GET | `/api/v1/services` |
| `database list` | GET | `/api/v1/databases` |
| `resource list` | GET | `/api/v1/resources` |
| `deploy list` | GET | `/api/v1/deployments` (global) |
| `server list` (inferred) | GET | `/api/v1/servers` |

Trace excerpt (`sources/cli-endpoint-map.txt`):

```10:3:cli-endpoint-map.txt
2026/07/13 05:06:16 GET https://puzzlesstool.online/api/v1/applications/jt4mw1b0ld3542i9w9nfmqkr/logs?lines=3
2026/07/13 05:06:16 Response status: 200
2026/07/13 05:06:16 GET https://puzzlesstool.online/api/v1/services
2026/07/13 05:06:17 Response status: 200
2026/07/13 05:06:17 GET https://puzzlesstool.online/api/v1/applications
2026/07/13 05:06:17 Response status: 200
2026/07/13 05:06:17 GET https://puzzlesstool.online/api/v1/resources
2026/07/13 05:06:18 Response status: 200
2026/07/13 05:06:18 GET https://puzzlesstool.online/api/v1/databases
2026/07/13 05:06:19 Response status: 200
2026/07/13 05:06:19 GET https://puzzlesstool.online/api/v1/deployments
2026/07/13 05:06:19 Response status: 200
```

### 2. Service logs / DB logs — CLI does NOT solve the gap

The CLI exposes **no** `service logs` or `database logs` subcommand. `coolify service --help` lists only `list` (and `restart`/`start`/`stop` — see §4). `coolify database --help` lists only `list` and `backups`.

The API gap confirmed in Spike 004 (404 on `/services/{uuid}/logs` and `/databases/{uuid}/logs`) is **not** papered over by the CLI. The CLI simply omits those subcommands — the same stance StuMason's MCP takes (Spike 005a) and the opposite of kof70's stub-error anti-pattern (Spike 005b).

**Implication for `awesome-coolify-mcp`:** Omit `service.logs` and `database.logs` tools entirely. No stub, no fake. The CLI by omission has set the precedent.

### 3. Deployment logs — CLI handles the JSON-array correctly

`coolify app deployments logs <appUuid> <deployUuid> --format json` returns a parsed array of structured entries (not the raw JSON-encoded string from the API). Each entry has `{id, created_at, type, batch, hidden, message}`.

Filtering behavior verified empirically:

```5:7:cli-deployment-logs-filter.txt
=== default (no --debuglogs, hidden filtered) ===
entries: 10
hidden values: {False}
=== with --debuglogs (all entries) ===
entries: 23
hidden values: {False, True}
types: {'stdout', 'stderr'}
batches: {8, 1, 2, 10}
```

- Default: 10 entries, all `hidden: false` (i.e. `hidden: true` entries are filtered out).
- `--debuglogs`: 23 entries, mixed `hidden: true/false`.
- The CLI parses the API's `logs` JSON-encoded string into a JSON array, then filters `hidden: true` by default.

**Implication for `awesome-coolify-mcp`:**
- Parse `deployment.logs` from JSON-encoded string into array (matches Spike 004 / 005a finding).
- Default scope: filter `hidden: true`.
- Add an optional `includeHidden`/`debug` param to surface everything.
- This is the same shape StuMason uses (Spike 005a) and exactly what kof70 fails to do (Spike 005b — raw passthrough).

### 4. `--follow` mode = polling, not streaming

`coolify app logs <uuid> -n 3 --follow --debug` shows repeated `GET /applications/{uuid}/logs?lines=3` calls at ~2-second intervals:

```7:10:cli-follow-polling.txt
2026/07/13 05:07:08 GET https://puzzlesstool.online/api/v1/applications/{uuid}/logs?lines=3
2026/07/13 05:07:08 Response status: 200
2026/07/13 05:07:10 GET https://puzzlesstool.online/api/v1/applications/{uuid}/logs?lines=3
2026/07/13 05:07:12 GET https://puzzlesstool.online/api/v1/applications/{uuid}/logs?lines=3
2026/07/13 05:07:14 GET https://puzzlesstool.online/api/v1/applications/{uuid}/logs?lines=3
2026/07/13 05:07:16 GET https://puzzlesstool.online/api/v1/applications/{uuid}/logs?lines=3
```

No SSE, no WebSocket — just polling the same endpoint every 2s. CLI then prints "Stopping log follow..." on SIGINT.

**Implication for `awesome-coolify-mcp`:** MCP tools are stateless request/response. A long-running `follow` tool does not fit the model. Instead:
- Expose `application.logs` with a `lines` param.
- Caller (agent) polls by re-invoking the tool.
- Document the polling pattern in tool description. Do NOT implement server-side `follow`.

### 5. `pull_latest` for services — CLI does not expose the flag, but the endpoint exists

`coolify service restart <uuid>` calls `POST /services/{uuid}/restart` (inferred). There is **no** `--pull-latest` flag on any `service` subcommand. **However**, Spike 004 confirmed via PR #5881 (merged 2025-05-23, IS in v4.1.2) that the endpoint itself accepts a `?latest=true` query param — the CLI simply does not surface it.

So: endpoint `POST /services/{uuid}/restart?latest=true` EXISTS in v4.1.2 (per Spike 004 + PR #5881 + OpenAPI line 7468). The dedicated `POST /services/{uuid}/deploy` does NOT exist (404, Spike 004). The CLI's omission of `--pull-latest` is a CLI feature gap, not an API gap.

**Implication for `awesome-coolify-mcp`:**
- DO expose a `service.deploy` action (or `service.restart` with `pull_latest` param) mapping to `POST /services/{uuid}/restart?latest=true`. This matches P5 RESEARCH §3 (D-17) and is valid against v4.1.2.
- The CLI's lack of `--pull-latest` is irrelevant — the API supports it. We are an API wrapper, not a CLI wrapper.

### 6. Application deploy — CLI uses `POST /applications/{uuid}/deploy`

`coolify deploy app <uuid>` (inferred from `coolify deploy --help`) hits `POST /applications/{uuid}/deploy`. Same endpoint `awesome-coolify-mcp` already plans to use. No surprises.

## Verdict

The official Coolify CLI v1.6.2 is a thin REST wrapper. It does not invent endpoints the API lacks. For the four P5 questions:

| Question | CLI answer | Action for `awesome-coolify-mcp` |
|---|---|---|
| Service logs? | Omitted | Omit tool entirely |
| Database logs? | Omitted | Omit tool entirely |
| Deployment logs JSON-array? | Parsed + `hidden:true` filtered by default | Adopt same pattern + `includeHidden` opt |
| Service `pull_latest` deploy? | CLI omits `--pull-latest` flag, but endpoint `POST /services/{uuid}/restart?latest=true` EXISTS (Spike 004 / PR #5881) | Expose `service.deploy` mapping to `restart?latest=true`; CLI flag gap is irrelevant |

The CLI reinforces the conclusions of Spikes 004, 005a, 005b. No new endpoints surface. No new log-handling tricks beyond what StuMason already does. The "follow = poll every 2s" detail is the only new operational insight.

## Sources

- `sources/cli-endpoint-map.txt` — `--debug` HTTP traces for all `list`/`logs` subcommands.
- `sources/cli-deployment-logs-filter.txt` — `--debuglogs` vs default filter comparison (10 vs 23 entries).
- `sources/cli-follow-polling.txt` — `--follow` polling cadence (2s intervals).
- Live CLI binary `coolify v1.6.2`, config at `/Users/puzzless/.config/coolify/config.json`.

## Implications for Phase 5 Plan

1. **`service.logs`** — REMOVE from P5 toolset (no endpoint, CLI confirms by omission).
2. **`database.logs`** — REMOVE from P5 toolset (no endpoint, CLI confirms by omission).
3. **`deployment.logs`** — IMPLEMENT with JSON-array parsing + `hidden:true` default-filter + optional `includeHidden` param. Pattern matches StuMason + CLI.
4. **`application.logs`** — IMPLEMENT as-is (`lines` param). Document polling pattern for follow-like use; do NOT implement server-side `follow`.
5. **`service.deploy` (with `pull_latest`)** — KEEP. Maps to `POST /services/{uuid}/restart?latest=true` (Spike 004 / PR #5881 / OpenAPI 7468). CLI lacks `--pull-latest` flag but endpoint exists — CLI gap ≠ API gap.
6. **`database.restart`** — IMPLEMENT (`POST /databases/{uuid}/restart` exists).
7. **`application.deploy`** — IMPLEMENT (`POST /applications/{uuid}/deploy` exists, unchanged).
