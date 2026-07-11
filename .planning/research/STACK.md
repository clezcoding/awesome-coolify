# Stack Research

**Domain:** TypeScript MCP Server (REST API Wrapper / CLI Distribution)
**Researched:** 2026-07-12
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@modelcontextprotocol/server` | v2.x | MCP Server Protocol Implementation | The 2026 v2 standard for MCP. Provides the high-level `McpServer` class and `serveStdio` runner. Much better DX than the legacy v1 `@modelcontextprotocol/sdk`. |
| `zod` | v3.x / v4.x | Schema Validation | Native integration with `McpServer.registerTool`. Enforces strict type safety for agent tool inputs and automatically converts to JSON Schema for the client. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ofetch` | v1.x | REST API Client | Wraps Coolify 4.1.x API. Provides auto-JSON parsing, error normalization, and easy retry logic without the heavy bundle size of Axios. |
| Node.js native `fs/promises` & `os` | Node 20+ | Multi-instance config | Managing `~/.coolify-mcp/instances.json`. Standard, zero-dependency, secure. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsup` | TypeScript Bundler | Zero-config build tool. Compiles the MCP server into a single minified `dist/index.js`. Fast execution is critical for `stdio` MCP server boot times. |
| `typescript` | Static Typing | Essential for managing the large REST payload types from Coolify. |

## Installation

```bash
# Core & Supporting
npm install @modelcontextprotocol/server zod ofetch

# Dev dependencies
npm install -D typescript @types/node tsup
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@modelcontextprotocol/server` | `@modelcontextprotocol/sdk` (v1) | When interacting with legacy MCP clients that do not yet support the 2026-07-28 protocol spec. |
| `ofetch` | `axios` | If the REST API wrapper requires complex request/response interceptors or legacy XMLHttpRequest fallbacks (not needed for Coolify). |
| `ofetch` | Native `fetch` | If absolute zero-dependency is required. `ofetch` is preferred here for auto-retries and better error handling. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Express / Hono | This is a CLI-distributed MCP server (`stdio` transport). An HTTP transport layer is unnecessary overhead for a local IDE/Agent plugin. | `@modelcontextprotocol/server/stdio` |
| Legacy low-level `Server` class | Requires manual capability negotiation, request routing, and JSON schema conversion. Error prone. | High-level `McpServer` class |

## Stack Patterns by Variant

**If building the NPM distribution CLI (`npx coolify-mcp`):**
- Use `tsup` with `format: ["cjs"]` and `minify: true`.
- Because fast startup is required when Claude/Cursor spawns the `stdio` subprocess.

**If validating destructive operations (`confirm: true`):**
- Use `zod` with `.default(false)` or `.describe("...")` explicitly asking the agent to pass confirmation.
- Because `McpServer` will reflect this requirement perfectly to the LLM context.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@modelcontextprotocol/server` v2.x | `zod` v3.x or v4.x | Ensure `zod` types align with the specific MCP server input schemas. |
| Node.js | v20.x+ | Required for native fetch (used under the hood by `ofetch`) and recent MCP SDK improvements. |

## Sources

- /modelcontextprotocol/typescript-sdk — Context7 library (v2 beta, 2026-07-28 spec).
- Official docs URL (https://ts.sdk.modelcontextprotocol.io/v2/) — Verified new `McpServer` and `serveStdio` syntax.
- https://www.ayautomate.com/blog/mcp-server-development-guide — Verified 2026 industry defaults for MCP stdio distributions.

---
*Stack research for: TypeScript MCP server wrapping a REST API*
*Researched: 2026-07-12*