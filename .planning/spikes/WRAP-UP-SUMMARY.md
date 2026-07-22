# Spike Wrap-Up Summary

**Date:** 2026-07-12 (initial), 2026-07-13 (append: spikes 004-006)
**Spikes processed:** 7 (3 initial + 4 appended)
**Feature areas:** Coolify API, MCP SDK Patterns, Ecosystem Patterns, Coolify v4.1.2 Endpoints, MCP Ecosystem Comparison, Coolify CLI Reference
**Skill output:** `./.cursor/skills/spike-findings-awesome-coolify/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | coolify-api-surface | standard | VALIDATED | Coolify API |
| 002 | mcp-ts-sdk-best-practices | standard | VALIDATED | MCP SDK Patterns |
| 003 | existing-coolify-mcp-patterns | standard | VALIDATED | Ecosystem Patterns |
| 004 | coolify-412-api-reverify | standard | VALIDATED | Coolify v4.1.2 Endpoints |
| 005a | stumason-mcp-live-test | comparison | VALIDATED | MCP Ecosystem Comparison |
| 005b | kof70-mcp-live-test | comparison | VALIDATED | MCP Ecosystem Comparison |
| 006 | coolify-cli-live-test | comparison | VALIDATED | Coolify CLI Reference |

## Key Findings

### API Surface (Spike 001)
- v1 ops endpoints fully mapped against authoritative OpenAPI YAML (`coollabsio/coolify v4.x`)
- Deployment logs are inline `string` on deployment object — no separate logs endpoint; mandatory `max_chars` cap
- `/deployments` lists running-only; per-app history at `/deployments/applications/{uuid}`
- `execute_command` confirmed absent from OpenAPI — not broken, doesn't exist
- REST logs support `lines` only — no follow/tail via REST
- Deploy returns `deployment_uuid` → clean wait-mode polling chain
- Auth errors map cleanly: 401/403/404/400/429 with recovery hints

### MCP SDK Patterns (Spike 002)
- Action-based schema via `z.discriminatedUnion('action', [...])` — ~8 tools, not 60+
- Multi-instance via `instance` arg + `~/.coolify-mcp/instances.json` (stdio has no per-request auth)
- Two-layer error handling: `isError: true` for API failures, `ProtocolError` for malformed args
- 6 structured error codes with recovery hints
- `outputSchema` + `structuredContent` mandatory for agent reliability
- Wait-mode polling hand-rolled — poll every 2s to terminal status
- Build on SDK v1.29.0; avoid v2.0.0-alpha.2 for v1 production

### Ecosystem Comparison (Spike 003)
- Action-based schema proven: stumason achieved 85% token reduction (43k → 6.6k)
- 11 patterns to adopt: unified control, sensitive masking, smart diagnostics, HATEOAS hints, batch ops
- 5 anti-patterns to avoid: granular tools, broken-endpoint tools, env-var confirmation, flat params, free-text errors
- v1 differentiation: multi-instance config, structured errors, wait-mode polling, no broken tools, npm package

### Coolify v4.1.2 Endpoint Re-Verify (Spike 004 — 2026-07-13)
- **Service/DB logs endpoints ABSENT in v4.1.2** (404 confirmed live for all 4 variants). PR #6293 adds them but merged 2026-07-06 to `next`, 32 days AFTER v4.1.2 release. NOT backported.
- **`service.deploy` with `pull_latest` EXISTS** — `POST /services/{uuid}/restart?latest=true` (PR #5881, merged 2025-05-23, IS in v4.1.2). No dedicated `/services/{uuid}/deploy` endpoint (404).
- **Application runtime logs WORKS** — `GET /applications/{uuid}/logs?lines=N` → 200 `{logs: string}` (plain string).
- **Deployment build logs: SHAPE CORRECTION** — `logs` field is a **JSON-encoded string containing an array** of `{command, output, type, timestamp, hidden, batch}` entries, NOT a plain `\n`-separated string. Handler must `JSON.parse` + flatten + filter `hidden:true` by default. `api.sensitive` token ability required; absent `logs` field → `COOLIFY_403_SENSITIVE_REQUIRED` error.
- **Service/DB lifecycle endpoints EXIST** (OpenAPI 4004/4037/4077 + 7395/7428/7468). Fire-and-forget (no `deployment_uuid` returned).

### MCP Ecosystem Comparison (Spikes 005a + 005b — 2026-07-13)
- **StuMason (`@masonator/coolify-mcp`):** OMITS `service.logs` + `database.logs` + `execute_command` tools (correct stance for absent endpoints). Parses deployment logs JSON-array + flattens + filters hidden. Masks secrets. Action-based `control` tool. Ships `diagnose_app` composite tool.
- **kof70 (`coolify-mcp-server-kof70`):** Ships stub tools that always error for absent endpoints (ANTI-PATTERN). Raw JSON-array passthrough for deployment logs (ANTI-PATTERN). Missing `pull_latest` for service deploy. Leaks plaintext secrets. 60+ granular tools (ANTI-PATTERN).
- **Decision:** Adopt StuMason patterns, explicitly reject kof70 anti-patterns. awesome-coolify-mcp omits absent-endpoint tools, parses deployment logs, masks secrets, uses action-based schema, exposes `pull_latest`.
- Both MCP servers + awesome-coolify-mcp connect to the SAME instance: `https://puzzlesstool.online` v4.1.2 (kof70's `http://185.248.140.207:8000` resolves to the same IP).

### Coolify CLI Reference (Spike 006 — 2026-07-13)
- **CLI v1.6.2 = pure REST client.** No SSH, no docker socket, no websocket. Same `/api/v1/*` surface as MCP servers.
- **Subcommand → endpoint map** extracted via `--debug` traces: `app list` → `/applications`, `app logs` → `/applications/{uuid}/logs?lines=N`, `app deployments logs` → `/deployments/{depUuid}`, `service list` → `/services`, `database list` → `/databases`, `resource list` → `/resources`, `deploy list` → `/deployments` (global).
- **CLI omits `service logs` + `database logs` subcommands** — agrees with API gap (S004). Omission precedent for awesome-coolify-mcp.
- **Deployment logs hidden-filter:** CLI default excludes `hidden:true` entries (10 vs 23 with `--debuglogs`). Confirms StuMason pattern. awesome-coolify-mcp uses `include_hidden: boolean` (default false).
- **`--follow` = polling every ~2s**, NOT streaming. MCP is request/response — expose `lines` param, document polling pattern, do NOT implement server-side `follow`.
- **CLI lacks `--pull-latest` flag** for `service restart`, BUT endpoint `restart?latest=true` exists (S004). CLI flag gap ≠ API gap. awesome-coolify-mcp EXPOSES `service.deploy` with `pull_latest`.

### Build Readiness
All 7 spikes VALIDATED. v1 design fully validated across API surface, SDK feasibility, ecosystem comparison, v4.1.2 endpoint re-verification, live MCP ecosystem behavior, and official CLI behavior. Phase 5 plan amended per `05-SPIKE-SYNTHESIS.md` (2 tools removed, 1 shape corrected, 1 endpoint confirmed, 1 error code added). Ready for Phase 5 implementation.
