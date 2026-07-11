# Spike Wrap-Up Summary

**Date:** 2026-07-12
**Spikes processed:** 3
**Feature areas:** Coolify API, MCP SDK Patterns, Ecosystem Patterns
**Skill output:** `./.cursor/skills/spike-findings-awesome-coolify/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | coolify-api-surface | standard | VALIDATED | Coolify API |
| 002 | mcp-ts-sdk-best-practices | standard | VALIDATED | MCP SDK Patterns |
| 003 | existing-coolify-mcp-patterns | standard | VALIDATED | Ecosystem Patterns |

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

### Build Readiness
All three spikes VALIDATED. v1 design fully validated across API surface, SDK feasibility, and ecosystem comparison. Ready for `/gsd-plan-phase 1`.
