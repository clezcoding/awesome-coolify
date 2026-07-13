# MCP Ecosystem Comparison — StuMason vs kof70 (Live UAT)

## Requirements

- awesome-coolify-mcp must follow the PROVEN patterns from the ecosystem and explicitly reject the anti-patterns.
- No non-working tools: omit tools for absent endpoints; never ship stub-error tools.
- Deployment logs must be parsed (JSON-array → flatten → filter), never raw-passthrough.
- Secrets must be masked in all responses; never leak plaintext.
- `pull_latest` for service deploys must be exposed (endpoint exists).

## How to Build It

### Pattern: Omit tools for absent endpoints (StuMason)

StuMason's `coolify-mcp` (`@masonator/coolify-mcp`) correctly OMITS `service.logs` and `database.logs` tools entirely. There is no tool to call, so the agent never wastes a round-trip on a 404.

```
StuMason tool inventory (read-only, live-verified):
- system({action: 'health'|'version'})        → GET /health, GET /version
- server list/details/resources/domains      → GET /servers/*
- project list/get                            → GET /projects/*
- environment list/get                        → GET /projects/{id}/environments/*
- application list/get                        → GET /applications, GET /applications/{uuid}
- application logs                            → GET /applications/{uuid}/logs?lines=N
- application envs (list/create/update/delete/bulk) → /applications/{uuid}/envs/*
- deployment list/get                         → GET /deployments, GET /deployments/{uuid}
- service list/get                            → GET /services, GET /services/{uuid}
- database list/get                           → GET /databases, GET /databases/{uuid}
- diagnose_app({query})                       → composite (health + deployments + logs)
- private_keys/github_apps CRUD               → /private-keys/*, /github-apps/*
```

NO `service.logs`, NO `database.logs`, NO `execute_command`. Omission is the correct stance when the API lacks the endpoint.

### Pattern: Parse deployment logs JSON-array (StuMason)

StuMason's deployment logs handler:
1. Calls `GET /deployments/{uuid}`.
2. Extracts the `logs` field (JSON-encoded string).
3. `JSON.parse` → array of `{command, output, type, timestamp, hidden, batch}`.
4. Filters `hidden: true` entries.
5. Flattens `output` strings with `\n` (timestamp-prefixed).
6. Returns readable lines.

This is the pattern awesome-coolify-mcp must adopt. See `coolify-v412-endpoints.md` "Deployment `logs` field" section for the implementation snippet.

### Pattern: Action-based macro-handler schema (StuMason `control`)

StuMason's `control` tool uses an `action` discriminated string: `{action: 'start'|'stop'|'restart'|'deploy', resource_type, uuid}`. This is the action-based pattern awesome-coolify-mcp already follows — confirms the design choice.

### Pattern: `diagnose_app` composite tool (StuMason)

StuMason ships a `diagnose_app({query})` tool that composite-calls health + deployments + logs in one tool invocation. Query accepts name/uuid/domain — server-side resolution. This is a strong UX pattern for "what's wrong with my app?" agent queries.

### Pattern: Secret masking (StuMason)

StuMason masks secrets in env-var responses (`******` placeholders). awesome-coolify-mcp already does this via `sanitizeFullProjection` (P2). Confirms the pattern.

## What to Avoid

### Anti-pattern: Stub-error tools (kof70)

kof70's `coolify-mcp-server` ships `get_service_logs`, `get_database_logs`, and `execute_command` tools that ALWAYS return an error:

```
"Service logs are not exposed via the API."
"Database logs are not exposed via the API."
"execute_command is not supported in this MCP version."
```

This is the explicit anti-pattern the user directive rejects. A stub that always errors is still a non-working tool. The agent calls it, gets an error, wastes a round-trip, and the tool count is inflated. **OMIT instead.**

### Anti-pattern: Raw JSON-array passthrough (kof70)

kof70's `get_application_logs` and `get_deployment` tools return the `logs` field raw — the JSON-encoded array string is dumped unparsed to the agent. Agent-unfriendly: the agent has to re-parse JSON to read logs. **Always parse + flatten.**

### Anti-pattern: Missing `pull_latest` for service deploy (kof70)

kof70's `deploy` tool for services has NO `pull_latest` field. The endpoint `POST /services/{uuid}/restart?latest=true` exists (PR #5881, in v4.1.2), but kof70 doesn't surface it. **Expose `pull_latest` param.**

### Anti-pattern: Plaintext secret leak (kof70)

kof70's env-var responses leak plaintext secrets. Verified live: `get_application_envs` returns `{value: "actual_secret_value"}` unmasked. **Always mask via `sanitizeFullProjection` or equivalent.**

### Anti-pattern: Granular per-resource tools (kof70)

kof70 ships 60+ granular tools (`list_applications`, `get_application`, `create_application`, `start_application`, `stop_application`, `restart_application`, `deploy_application`, `get_application_envs`, `create_application_env`, ... repeated for services, databases, servers, projects, environments, private_keys, github_apps). This bloats the tool catalog and agent context. awesome-coolify-mcp uses action-based macro-handlers (`application({action:'start'|'stop'|'restart'|'deploy'|'logs'})`) — 85% token reduction per spike 003.

## Constraints

- Both MCP servers (StuMason + kof70) and awesome-coolify-mcp connect to the SAME Coolify instance: `https://puzzlesstool.online` (v4.1.2). kof70's config IP `http://185.248.140.207:8000` resolves to the same instance.
- Live UAT was performed read-only. Mutations (start/stop/restart/deploy) were not fired from the test harness; both MCP servers' mutation tools were inspected for schema correctness only.
- StuMason uses `@modelcontextprotocol/sdk` (Node.js). kof70 uses the Python MCP SDK. awesome-coolify-mcp uses `@modelcontextprotocol/sdk` (TypeScript) — aligns with StuMason.

## Decision Matrix

| Behavior | StuMason | kof70 | awesome-coolify-mcp choice |
|---|---|---|---|
| Service/DB logs absent endpoint | OMIT | STUB (error) | **OMIT** |
| Deployment logs JSON-array | PARSE + FLATTEN + FILTER | RAW passthrough | **PARSE + FLATTEN + FILTER** |
| `pull_latest` for service deploy | n/a | MISSING | **EXPOSE** (`restart?latest=true`) |
| Secret masking | MASK | LEAK plaintext | **MASK** (`sanitizeFullProjection`) |
| Schema style | Action-based macro | Granular per-resource (60+) | **Action-based macro** |
| `execute_command` | OMIT | STUB (error) | **OMIT** |
| Composite diagnose tool | `diagnose_app` | none | **ADOPT** (future phase) |

## Origin

Synthesized from spikes: 005a, 005b
Source files available in: `sources/005a-stumason-mcp-live-test/`, `sources/005b-kof70-mcp-live-test/`
