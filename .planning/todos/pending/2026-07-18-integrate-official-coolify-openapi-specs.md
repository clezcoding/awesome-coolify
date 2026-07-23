---
created: 2026-07-18T00:38:21.095Z
title: Integrate official Coolify OpenAPI specs
area: docs
resolves_phase: 23
files:
  - docs/coolify_openapi.json
  - docs/coolify_openapi.yaml
---

## Problem

User downloaded the official Coolify API specification from the official Coolify repository and added it to the project in two formats:

- `docs/coolify_openapi.json` (~13.7k lines, OpenAPI 3.1.0)
- `docs/coolify_openapi.yaml` (~8.8k lines)

Both files are currently untracked in git. The MCP server project lacks an authoritative, versioned API reference for validating client methods, checking endpoint coverage against implemented tools, and planning future CRUD phases (e.g. Phase 10 Application CRUD). Prior work relied on ad-hoc API discovery and spike findings rather than the upstream OpenAPI source of truth.

## Solution

TBD — suggested next steps:

1. Commit both spec files to `docs/` (or pick one canonical format and document why).
2. Run coverage gap analysis: map OpenAPI paths/operations → existing `src/api/client.ts` methods → registered MCP tools.
3. Wire into planning/validation workflow (e.g. phase COVERAGE.md, nyquist checks, or codegen for types).
4. Document spec provenance (Coolify repo URL, version/date fetched) in a short README or comment block.
5. Consider MCP "API specification" server integration already available in `.cursor/mcp.json` for agent-side introspection.
