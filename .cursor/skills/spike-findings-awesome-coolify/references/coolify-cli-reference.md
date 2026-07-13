# Coolify CLI Reference (Official Behavior)

## Requirements

- When the API lacks an endpoint, the official Coolify CLI's stance is the reference behavior. If the CLI omits a subcommand, that's strong evidence the API has no corresponding endpoint.
- awesome-coolify-mcp is an API wrapper, NOT a CLI wrapper. CLI flag gaps do NOT justify omitting API endpoints. (CLI lacks `--pull-latest`, but `restart?latest=true` exists — we expose it.)
- Log-follow semantics: MCP is request/response; no server-side `follow`. Document polling pattern instead.

## How to Build It

### CLI subcommand → endpoint map (live-verified v1.6.2)

| CLI subcommand | Method | Endpoint |
|---|---|---|
| `coolify app list` | GET | `/api/v1/applications` |
| `coolify app logs <uuid> -n N` | GET | `/api/v1/applications/{uuid}/logs?lines=N` |
| `coolify app deployments logs <appUuid> <depUuid> -n N` | GET | `/api/v1/deployments/{depUuid}` |
| `coolify service list` | GET | `/api/v1/services` |
| `coolify database list` | GET | `/api/v1/databases` |
| `coolify resource list` | GET | `/api/v1/resources` |
| `coolify deploy list` | GET | `/api/v1/deployments` (global) |
| `coolify deploy app <uuid>` | POST | `/api/v1/applications/{uuid}/deploy` (inferred) |
| `coolify service restart <uuid>` | POST | `/api/v1/services/{uuid}/restart` (inferred) |

Trace procedure: `coolify <cmd> --debug --format json 2>&1 | grep -E "GET https|POST https|Response status"`.

### Deployment logs — hidden-filter behavior (CLI reference)

`coolify app deployments logs <appUuid> <depUuid> --format json` returns a parsed JSON array of entries. Filtering:

```bash
# Default (hidden filtered)
coolify app deployments logs <app> <dep> -n 0 --format json | jq 'length'   # → 10
coolify app deployments logs <app> <dep> -n 0 --format json | jq '[.[].hidden] | unique'   # → [false]

# With --debuglogs (all entries)
coolify app deployments logs <app> <dep> -n 0 --debuglogs --format json | jq 'length'   # → 23
coolify app deployments logs <app> <dep> -n 0 --debuglogs --format json | jq '[.[].hidden] | unique'   # → [false, true]
```

awesome-coolify-mcp must match this: default excludes `hidden:true`, optional `include_hidden: true` surfaces all. Entry shape: `{id, created_at, type, batch, hidden, message}` (CLI keys) ≈ `{command, output, type, timestamp, hidden, batch}` (API keys).

### Log-follow = polling (NOT streaming)

`coolify app logs <uuid> --follow --debug` shows repeated `GET /applications/{uuid}/logs?lines=N` calls at ~2-second intervals:

```
05:07:08 GET /applications/{uuid}/logs?lines=3  → 200
05:07:10 GET /applications/{uuid}/logs?lines=3  → 200
05:07:12 GET /applications/{uuid}/logs?lines=3  → 200
05:07:14 GET /applications/{uuid}/logs?lines=3  → 200
05:07:16 GET /applications/{uuid}/logs?lines=3  → 200
"Stopping log follow..."
```

No SSE, no WebSocket. The CLI polls the same REST endpoint every 2s and prints new lines on SIGINT.

**For awesome-coolify-mcp:** MCP tools are stateless request/response. A long-running `follow` tool does not fit the model. Instead:
- Expose `application.logs` with a `lines` param.
- Document in the tool description: "For follow-like behavior, re-invoke this tool periodically. CLI polls every 2s; choose your own cadence."
- Do NOT implement server-side `follow` / streaming / polling loops inside a tool handler.

### CLI omission = API absence (for service/DB logs)

CLI exposes NO `service logs` or `database logs` subcommand. `coolify service --help` lists only `list` (+ `restart`/`start`/`stop`). `coolify database --help` lists only `list` and `backups`.

This reinforces spike 004's finding: the API has no `/services/{uuid}/logs` or `/databases/{uuid}/logs` endpoint in v4.1.2 (404 confirmed). The CLI by omission agrees. awesome-coolify-mcp omits the tools too.

### CLI flag gap ≠ API gap (for `pull_latest`)

CLI `coolify service restart <uuid>` has NO `--pull-latest` flag. BUT the endpoint `POST /services/{uuid}/restart?latest=true` exists (PR #5881, in v4.1.2, confirmed spike 004).

awesome-coolify-mcp EXPOSES `service.deploy` with `pull_latest` param, mapping to `restart?latest=true`. The CLI's flag gap is a CLI feature limitation, not an API limitation. We wrap the API, not the CLI.

## What to Avoid

- **Do NOT implement server-side `follow` loops in MCP tool handlers.** MCP is request/response. The CLI polls every 2s by re-calling the same endpoint — the agent can do the same by re-invoking the tool. A long-running tool handler blocks the MCP transport and never returns a clean response.
- **Do NOT use the CLI as a subprocess from the MCP server.** The CLI is a Go binary; shelling out to it would add a runtime dependency, parse complexity, and version-coupling. Use the REST API directly (same endpoints the CLI uses).
- **Do NOT assume CLI subcommand absence proves API endpoint absence.** Verify via OpenAPI + curl. The CLI omitting `service logs` is CONSISTENT with the API gap, but the verification comes from spike 004's live curl (404), not from the CLI's `--help` output.
- **Do NOT copy the CLI's `--debuglogs` flag name verbatim.** Use `include_hidden: boolean` (default `false`) in the MCP schema — clearer for agents.

## Constraints

- **CLI version tested:** `coolify v1.6.2` (config: `~/.config/coolify/config.json`).
- **CLI is a pure REST client.** No SSH, no docker socket, no websocket. Same `/api/v1/*` surface as the MCP servers. Tracing `--debug` shows only `GET`/`POST` HTTP lines.
- **CLI polling cadence:** ~2 seconds for `--follow`. Not configurable. Choose your own cadence when re-invoking the MCP tool.
- **CLI `--debuglogs` flag:** only on `app deployments logs`. Surfaces `hidden:true` entries. No equivalent on `app logs` (runtime logs are plain strings, no `hidden` field).

## Origin

Synthesized from spikes: 006
Source files available in: `sources/006-coolify-cli-live-test/`
