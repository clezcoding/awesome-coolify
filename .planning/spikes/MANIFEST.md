# Spike Manifest

## Idea
Research Coolify 4.1.x REST API surface and MCP server best practices via context7 + web search, to produce verified knowledge for building the `awesome-coolify` MCP server (TS + `@modelcontextprotocol/sdk`). v1 scope = ops-only (deploy, logs, diagnose, multi-instance).

## Requirements
- Coolify API 4.1.x is the target — no Cloud-only features
- v1 ops endpoints must be fully mapped: servers, applications, deployments, logs, diagnose, health, infrastructure overview
- Action-based tool schema (not 60+ granular tools) — must be feasible with MCP TS SDK
- Multi-instance context switching must fit MCP SDK patterns
- Structured error codes with recovery hints (401/404/422/500)
- Broken/missing endpoints flagged (e.g. `execute_command`, global deployments list)

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | coolify-api-surface | standard | Given Coolify 4.1.x REST API, when querying official docs + OpenAPI + community, then v1 ops endpoints fully mapped with shapes, params, broken endpoints flagged | VALIDATED ✓ | coolify, api, rest, docs |
| 002 | mcp-ts-sdk-best-practices | standard | Given `@modelcontextprotocol/sdk` (TS), when reading context7 docs + official guide, then known patterns for action-based tool schema, transport, auth, error reporting, multi-instance context | VALIDATED ✓ | mcp, typescript, sdk, patterns |
| 003 | existing-coolify-mcp-patterns | standard | Given existing Coolify MCPs (user-coolify, coolify-backup-mcp) + MCP SDK examples, when inspecting schemas, then proven patterns + anti-patterns extracted for v1 action-schema design | VALIDATED ✓ | mcp, coolify, comparison, patterns |
| 004 | coolify-412-api-reverify | standard | Given Coolify 4.1.2 OpenAPI + live instance https://puzzlesstool.online, when re-verifying all P5 endpoints via WebSearch + Context7 + raw openapi.yaml + live curl, then every endpoint classified EXISTS\|ABSENT\|BROKEN with response shape and version roadmap | VALIDATED ✓ | coolify, api, rest, openapi, live-uat, v4.1.2, service-logs, database-logs, service-deploy |
| 005a | stumason-mcp-live-test | comparison | Given StuMason coolify-mcp (@masonator/coolify-mcp) installed and connected to https://puzzlesstool.online v4.1.2, when calling every read-only tool live via CallMcpTool, then tool→endpoint Map with WORKS\|404\|500\|stub for each, with focus on service/DB logs behavior and deployment logs handling | VALIDATED ✓ | mcp, coolify, stumason, live-uat, service-logs, database-logs, deployment-logs, pull-latest |
| 005b | kof70-mcp-live-test | comparison | Given kof70 coolify-mcp-server (coolify-mcp-server-kof70) installed and connected to http://185.248.140.207:8000 (= puzzlesstool.online v4.1.2), when calling every read-only tool + stub tools live via CallMcpTool, then tool→endpoint Map with WORKS\|ERROR-STUB\|404 for each, with focus on service/DB logs error behavior, execute_command stub, deployment logs raw passthrough, and missing pull_latest field | VALIDATED ✓ | mcp, coolify, kof70, live-uat, stub-anti-pattern, granular-tools, secret-leak |
| 006 | coolify-cli-live-test | comparison | Given the official coolify CLI v1.6.2 connected to https://puzzlesstool.online v4.1.2, when tracing every subcommand with --debug --format json, then subcommand→endpoint Map, service/DB logs handling (omitted by CLI), deployment logs JSON-array parsing with hidden:true default-filter, follow=polling, and absence of pull_latest for services | VALIDATED ✓ | coolify, cli, live-uat, rest-client, deployment-logs, follow-polling, pull-latest |
