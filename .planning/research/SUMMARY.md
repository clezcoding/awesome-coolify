# Project Research Summary

**Project:** awesome-coolify
**Domain:** DevOps MCP Server (Coolify 4.1.x Wrapper)
**Researched:** 2026-07-12
**Confidence:** HIGH

## Executive Summary

awesome-coolify is a TypeScript-based DevOps MCP Server operating as a REST API Wrapper and CLI Distribution for Coolify 4.1.x. It enables AI agents to read context, diagnose issues, and operate deployments natively. The recommended approach utilizes action-based macro-handlers (e.g., `diagnose_app`) rather than 1:1 CRUD endpoint mapping, allowing for simplified context and reduced LLM tool-calling overhead.

The core technology stack centers on the 2026 v2 `@modelcontextprotocol/server`, using `zod` for explicit schema validation and `ofetch` for API interaction, all bundled via `tsup` to ensure rapid `stdio` boot times. Key risks primarily stem from the massive JSON payloads and logs returned by Coolify, threatening to crash the LLM context window. Aggressive payload projection, strict pagination, bounded polling limits, and intentional avoidance of broken 4.1.x endpoints (such as `execute_command`) mitigate these failure points.

## Key Findings

### Recommended Stack

Core uses `@modelcontextprotocol/server` for modern v2 spec standards and `zod` for strict type safety and schema auto-generation.

**Core technologies:**
- `@modelcontextprotocol/server`: MCP protocol implementation — The 2026 v2 standard, offering high-level class abstractions and `serveStdio`.
- `zod`: Schema validation — Integrates directly with tool registration to provide strict inputs.
- `ofetch`: REST API Client — Parses JSON automatically, normalizes errors, and supports retries without the overhead of Axios.
- `tsup`: TypeScript Bundler — Zero-config build tool required for compiling the single minified file needed for fast `stdio` boot.

### Expected Features

**Must have (table stakes):**
- Context/Auth Verify — Basic connection validation to the Coolify API.
- Resource Discovery — Finding Apps, DBs, and Servers using ID/FQDN.
- App/Service/DB Lifecycle — Start, stop, restart, and deploy core operations.
- Logs Access — Debugging capability with strict bounded tail logic.
- Deploy Wait-Mode — Polling status so agents know when a deployment successfully finishes.

**Should have (competitive):**
- Unified Action Schema — Consolidation of CRUD tasks into goal-oriented tools, avoiding 60+ granular tool bloat.
- Payload Limits/Warnings — Summary views and `max_chars` caps to prevent context window bloat.
- Secret Masking — Default hiding of credentials/webhooks to prevent leaks.
- Bulk/Emergency Ops — Fast recovery actions (e.g., stop all, redeploy project).
- Multi-Instance Context — Support for dynamically switching dev/prod server instances.

**Defer (v2+):**
- Create/Update Resources, Config/Env Var Sync, Cloud Tokens, Private Keys/GitHub Apps, Teams, and Backup Scheduling.

### Architecture Approach

The architecture favors context-aware execution and aggressive payload projections mapped through Macro-Action Handlers.

**Major components:**
1. MCP Protocol Layer — Handles JSON-RPC communication via `@modelcontextprotocol/server`.
2. Action Routing Layer — Macro-action handlers mapped to LLM intents (combining multiple HTTP requests into single goal-oriented functions).
3. Context & API Layer — Composed of a Context Manager (for multi-instance setups), Coolify HTTP Client, and crucial Projections/Formatters to shrink massive API payloads.

### Critical Pitfalls

1. **Broken API Endpoints** — Avoid 4.1.x missing features (e.g. container exec, global deploy lists). Hardcode blocks for broken tools and target per-app deploy lists instead.
2. **Tool Bloat (60+ Tools)** — Avoid 1:1 REST API mapping. Implement unified action-based schemas per domain (e.g., `application({ action: 'deploy' })`).
3. **Large Payload Context Crash** — Avoid infinite log streams or full JSON entity dumps. Enforce strict `max_chars` caps, implement pagination, and apply projection summaries to limit data context.
4. **Unmasked Credentials** — Avoid exposing raw secrets in responses. Implement a masking layer to scrub DB passwords and webhooks by default.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: MVP Architecture & Authentication
**Rationale:** Core protocol connection and multi-instance context support are baseline dependencies for all future tool layers.
**Delivers:** Baseline MCP setup, Context Manager, Coolify API client setup, and Auth Verify endpoint.
**Addresses:** Context/Auth Verify, Multi-Instance Context.
**Avoids:** Hardcoded instance configurations.

### Phase 2: Discovery & Projection (Read Operations)
**Rationale:** Agents need ID and status context before taking operational actions. Projections must be established here to prevent downstream crashes.
**Delivers:** Resource discovery tools (Apps, DBs, Servers) and the Data Projection / Formatting layer.
**Uses:** `zod` for schemas, `ofetch` for lists.
**Implements:** Formatters to ensure payloads are drastically reduced before hitting LLM context.
**Avoids:** Large Payload Context Crash (Pitfall 3).

### Phase 3: Lifecycle Control & Debugging (Write Operations)
**Rationale:** Operations depend on Phase 2 discovery endpoints and Phase 1 client setup.
**Delivers:** Start/Stop/Restart tools, Deploy actions, Deploy Wait-Mode polling, and App Logs access.
**Addresses:** App Lifecycle, Logs Access, Deploy Wait-Mode.
**Avoids:** Broken API Endpoints (Pitfall 1), Tool Bloat (Pitfall 2).

### Phase Ordering Rationale

- Dependency flow naturally mandates: Core Setup -> Read -> Mutate.
- Architectural projections (Phase 2) MUST be constructed before executing heavy state read/write operations (Phase 3) to protect the context window.
- The Action Schema pattern prevents feature creep during Phase 3 tool implementation.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Validating wait-mode polling constraints, specifically testing timeout configurations against extremely slow builds.

Phases with standard patterns (skip research-phase):
- **Phase 1 & 2:** Standard MCP Protocol implementations and standard CRUD HTTP fetch projections.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified with v2 `@modelcontextprotocol/server` official standards and modern TS bundlers. |
| Features | HIGH | Directly evaluated against Coolify 4.1.x real-world capabilities. |
| Architecture | HIGH | Established macro-action paradigm addresses direct MCP server anti-patterns. |
| Pitfalls | HIGH | Verified against known REST 4.1.x constraints. |

**Overall confidence:** HIGH

### Gaps to Address

- Deploy Polling Endpoints: Validating exactly which single-app endpoint correctly exposes the build output logs during the wait-mode cycle.
- Testing non-standard Coolify API ports for on-prem installations within Context Manager.

## Sources

### Primary (HIGH confidence)
- Coolify v4.1 API Specifications — Endpoints and feature limitations.
- `mcp_features.md` (Live Audit Jul 2026) — Verified capabilities.
- Official docs URL (https://ts.sdk.modelcontextprotocol.io/v2/) — Verified `McpServer` and `serveStdio` syntax.

### Secondary (MEDIUM confidence)
- /modelcontextprotocol/typescript-sdk — Context7 library (v2 beta, 2026-07-28 spec).
- https://www.ayautomate.com/blog/mcp-server-development-guide — Verified industry defaults for stdio distributions.

---
*Research completed: 2026-07-12*
*Ready for roadmap: yes*