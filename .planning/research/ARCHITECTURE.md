# Architecture Research

**Domain:** DevOps MCP Server (Model Context Protocol)
**Researched:** 2026-07-12
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Protocol Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Tool Setup   │  │ Prompts      │  │ Resources    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
├─────────┴─────────────────┴─────────────────┴───────────────┤
│                        Action Routing Layer                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Macro-Action Handlers                 │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     Context & API Layer                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐    │
│  │ Context Manager │ │ Coolify Client  │ │ Formatters  │    │
│  └─────────────────┘ └─────────────────┘ └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| MCP Protocol Layer | Handles JSON-RPC communication, exposes schemas | `@modelcontextprotocol/sdk` Server class |
| Action Routing Layer | Maps LLM intents to execution logic (e.g., `diagnose_app`) | Async TS functions parsing inputs to API calls |
| Context Manager | Manages multi-instance state (URLs, tokens) | Singleton or Config class loading from ENV |
| Coolify Client | Typed HTTP requests, error handling, retries | Generic `fetch` wrapper with Auth injection |
| Formatters | Reduces payload size, masks secrets | Pure functions transforming raw API JSON |

## Recommended Project Structure

```
src/
├── index.ts              # Entry point. Starts MCP server and initializes config.
├── mcp/
│   ├── server.ts         # MCP protocol instantiation and tool registration.
│   └── tools/            # Action-based handlers.
│       ├── diagnose.ts   # diagnostic tools
│       └── ops.ts        # operational tools (deploy, restart)
├── config/
│   └── manager.ts        # Multi-instance config loader and state holder.
├── api/
│   ├── client.ts         # Base HTTP client with multi-token override support.
│   └── endpoints/        # Typed API call definitions for Coolify v4.1.
└── utils/
    ├── errors.ts         # Structured error parsing (401 vs 404).
    └── projections.ts    # JSON reducers for LLM context optimization.
```

### Structure Rationale

- **`mcp/tools/`:** Isolates macro-actions from protocol overhead. Promotes action-based design.
- **`config/`:** Centralizes multi-instance awareness. The rest of the app requests a specific "context".
- **`utils/projections.ts`:** Critical for limiting LLM context bloat. Separates API data structures from MCP output structures.

## Architectural Patterns

### Pattern 1: Macro-Action Design (Action-Based)

**What:** Designing tools around user goals (e.g., `diagnose_app`) rather than 1:1 CRUD API mapping.
**When to use:** Building MCP servers for LLMs.
**Trade-offs:** Requires more custom logic per tool. Significantly reduces the number of tool calls the LLM must make to accomplish a task.

**Example:**
```typescript
// Instead of separate getApp, getAppLogs, getAppHealth
async function diagnose_app(args: { appId: string, contextId?: string }) {
  const [app, logs, health] = await Promise.all([
    api.getApp(args.appId, args.contextId),
    api.getAppLogs(args.appId, args.contextId, { tail: 50 }),
    api.getAppHealth(args.appId, args.contextId)
  ]);
  return projectDiagnosticResult(app, logs, health);
}
```

### Pattern 2: Context-Aware Execution

**What:** Every API call accepts an optional `contextId` to support multi-instance Coolify setups.
**When to use:** Systems managing multiple remote environments simultaneously.
**Trade-offs:** Context must be threaded through the call stack. Allows cross-instance workflows natively.

**Example:**
```typescript
function getApiClient(contextId?: string) {
  const config = ContextManager.get(contextId || ContextManager.defaultId);
  return new CoolifyClient(config.url, config.token);
}
```

### Pattern 3: Aggressive Payload Projection

**What:** Stripping non-essential fields from API responses before sending them back over MCP.
**When to use:** Always, as Coolify API payloads contain huge nested structures.
**Trade-offs:** LLM might miss obscure metadata. Solved by adding an `include_full_details` flag to tools.

## Data Flow

### Request Flow

```
[LLM Tool Call: deploy_project]
    ↓
[MCP Server] → [Action Handler: deploy.ts]
    ↓
[Context Manager] (resolves URL/Token)
    ↓
[Coolify Client] → [HTTP POST /deploy] → [Coolify API]
    ↓
[Raw Response] → [Formatter] (extracts essential status)
    ↓
[MCP Response] → [LLM]
```

### State Management

```
[ENV / Config File]
    ↓ (load at boot)
[Context Manager (Singleton)]
    ↓ (read per request)
[API Client]
```

### Key Data Flows

1. **Discovery:** LLM requests tool list -> MCP Server returns goal-oriented schemas.
2. **Execution:** Action Handler coordinates multiple sequential/parallel API calls to fulfill the macro-action.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 instances | In-memory `ContextManager` loaded from ENV. |
| 10+ instances | Dynamic config loading, potentially a separate secrets manager. |

### Scaling Priorities

1. **First bottleneck:** LLM Context Window limits. Fix by strictly enforcing Data Projections and limiting log line returns.
2. **Second bottleneck:** API Rate Limits. Fix by adding Retry with Exponential Backoff in the `CoolifyClient`.

## Anti-Patterns

### Anti-Pattern 1: 1:1 CRUD Mapping

**What people do:** Creating 60+ tools like `get_app`, `create_app`, `delete_app`.
**Why it's wrong:** Overwhelms the LLM's tool context. Forces the LLM to make 5 sequential tool calls to perform one logical task (e.g., finding an app, checking health, fetching logs).
**Do this instead:** Group operations into logical actions like `diagnose_app` or `emergency_stop_project`.

### Anti-Pattern 2: Raw Response Dumping

**What people do:** Returning the exact JSON received from the external API to the LLM.
**Why it's wrong:** Wastes context tokens on null fields, huge timestamps, and unnecessary metadata. Risks leaking secrets (e.g., DB passwords, webhook tokens).
**Do this instead:** Always map external API responses through a projection function to return clean, concise, and safe objects.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Coolify API (v4.1) | HTTP REST (Bearer Auth) | Payload limits required. Handle 401/404 explicitly. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Tool Handler ↔ API Client | Function calls with `Context` | Handlers must not hold state. |

## Sources

- Coolify v4.1 API Specifications
- MCP Protocol Documentation
- `mcp_features.md` Feature Catalog

---
*Architecture research for: DevOps MCP Server (Coolify)*
*Researched: 2026-07-12*