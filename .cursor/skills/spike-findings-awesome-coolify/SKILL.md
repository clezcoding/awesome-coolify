---
name: spike-findings-awesome-coolify
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for building awesome-coolify. Auto-loaded during implementation work.
---

<context>
## Project: awesome-coolify

Research Coolify 4.1.x REST API surface and MCP server best practices to produce verified knowledge for building the `awesome-coolify` MCP server (TS + `@modelcontextprotocol/sdk`). v1 scope = ops-only (deploy, logs, diagnose, multi-instance).

Spike sessions wrapped: 2026-07-12, 2026-07-13
</context>

<requirements>
## Requirements

- Coolify API 4.1.x is the target — no Cloud-only features. Verify against the EXACT running version (v4.1.2), not `main`/`next`.
- v1 ops endpoints must be fully mapped: servers, applications, deployments, logs, diagnose, health, infrastructure overview
- Action-based tool schema (not 60+ granular tools) — must be feasible with MCP TS SDK
- Multi-instance context switching must fit MCP SDK patterns
- Structured error codes with recovery hints (401/404/422/500)
- Broken/missing endpoints flagged (e.g. `execute_command`, global deployments list, service/DB logs in v4.1.2)
- **NO tools without a working Coolify API endpoint.** Absent endpoints → tool OMITTED, not stubbed. (User directive 2026-07-13, reinforced by spikes 004/005a/005b/006.)
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Coolify API (v1 surface) | references/coolify-api.md | v1 ops endpoints fully mapped; logs inline on deployment object; no execute/follow REST |
| MCP SDK Patterns | references/mcp-sdk-patterns.md | discriminatedUnion action schema, stdio multi-instance via config file, structured errors |
| Ecosystem Patterns (001-003) | references/ecosystem-patterns.md | Action-based proven (85% token reduction); 11 patterns to adopt, 5 anti-patterns to avoid |
| Coolify v4.1.2 Endpoints (P5) | references/coolify-v412-endpoints.md | Every P5 endpoint EXISTS\|ABSENT\|BROKEN classified via OpenAPI + live curl; deployment logs = JSON-array; service.deploy = `restart?latest=true` (PR #5881); service/DB logs ABSENT (PR #6293 not in v4.1.2) |
| MCP Ecosystem Comparison (StuMason vs kof70) | references/mcp-ecosystem-comparison.md | StuMason omits absent-endpoint tools + parses deployment logs; kof70 ships stubs + raw passthrough + plaintext secret leak. Adopt StuMason, reject kof70. |
| Coolify CLI Reference | references/coolify-cli-reference.md | CLI = pure REST client (no SSH/socket); `--follow` = poll every 2s; deployment logs hidden-filter default; CLI omits service/DB logs subcommands (agrees with API gap); CLI lacks `--pull-latest` but endpoint exists |

## Source Files

Original spike source files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

- 001-coolify-api-surface
- 002-mcp-ts-sdk-best-practices
- 003-existing-coolify-mcp-patterns
- 004-coolify-412-api-reverify
- 005a-stumason-mcp-live-test
- 005b-kof70-mcp-live-test
- 006-coolify-cli-live-test
</metadata>
