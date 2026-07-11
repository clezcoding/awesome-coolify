---
name: spike-findings-awesome-coolify
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for building awesome-coolify. Auto-loaded during implementation work.
---

<context>
## Project: awesome-coolify

Research Coolify 4.1.x REST API surface and MCP server best practices to produce verified knowledge for building the `awesome-coolify` MCP server (TS + `@modelcontextprotocol/sdk`). v1 scope = ops-only (deploy, logs, diagnose, multi-instance).

Spike sessions wrapped: 2026-07-12
</context>

<requirements>
## Requirements

- Coolify API 4.1.x is the target — no Cloud-only features
- v1 ops endpoints must be fully mapped: servers, applications, deployments, logs, diagnose, health, infrastructure overview
- Action-based tool schema (not 60+ granular tools) — must be feasible with MCP TS SDK
- Multi-instance context switching must fit MCP SDK patterns
- Structured error codes with recovery hints (401/404/422/500)
- Broken/missing endpoints flagged (e.g. `execute_command`, global deployments list)
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Coolify API | references/coolify-api.md | v1 ops endpoints fully mapped; logs inline on deployment object; no execute/follow REST |
| MCP SDK Patterns | references/mcp-sdk-patterns.md | discriminatedUnion action schema, stdio multi-instance via config file, structured errors |
| Ecosystem Patterns | references/ecosystem-patterns.md | Action-based proven (85% token reduction); 11 patterns to adopt, 5 anti-patterns to avoid |

## Source Files

Original spike source files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

- 001-coolify-api-surface
- 002-mcp-ts-sdk-best-practices
- 003-existing-coolify-mcp-patterns
</metadata>
