---
spike: 002
name: mcp-ts-sdk-best-practices
type: standard
validates: "Given @modelcontextprotocol/sdk (TS), when reading context7 docs + official guide, then known patterns for action-based tool schema, transport, auth, error reporting, multi-instance context are extracted and verified"
verdict: VALIDATED
related: [001, 003]
tags: [mcp, typescript, sdk, patterns, design]
---

# Spike 002: MCP TypeScript SDK Best Practices

## What This Validates
Given `@modelcontextprotocol/sdk` TypeScript SDK (v1.29.0), when reading context7 docs + official guide, then known patterns for action-based tool schema, transport (stdio/StreamableHTTP), auth, error reporting, structured output, and multi-instance context switching are extracted and verified feasible for v1 design.

## Research

### Sources consulted
- context7 `/modelcontextprotocol/typescript-sdk` (1487 snippets, High reputation, score 90.67) — primary
- Versions available: v1.29.0 (latest stable), v2.0.0-alpha.2 (preview), `__branch__v1.x`
- context7 `/websites/ts_sdk_modelcontextprotocol_io` (436 snippets, High, 75.69) — secondary

### Approach

| Approach | Source | Pros | Cons | Status |
|----------|--------|------|------|--------|
| context7 docs fetch | `/modelcontextprotocol/typescript-sdk` | Curated, version-pinned, code-first | Truncates on broad queries | **Chosen** (3 targeted queries) |
| WebSearch official spec | modelcontextprotocol.io | Spec-authoritative | Narrative, less code | Supplementary |
| Read SDK source | github raw | Ground truth | Heavy | Skipped (context7 sufficient) |

Three targeted context7 queries:
1. Server creation + tool registration + transport + error handling
2. StreamableHTTP + Bearer auth + OAuth + structured output
3. Tool annotations + discriminated union + session/state + requestState

### Gotchas discovered
1. **SDK uses `zod/v4` subpath** in latest docs (`import * as z from 'zod/v4'`). v1 build must verify zod version compatibility — zod v3 stable vs v4 alpha. Use whatever the SDK pins.
2. **v2 SDK renaming**: `McpError` → `SdkError`, `StreamableHTTPError` → `SdkHttpError`. If v1 builds on v1.29.0, use `ProtocolError`/`ProtocolErrorCode`; v2 migration later.
3. **2026-07-28 spec revision replaces sessions with `requestState` codec** (signed payload minted/verified per round). For v1 multi-step flows this matters only if we elicit input mid-tool — we don't. v1 tools are single-round.
4. **Tool annotations are static per tool, not per call.** Can't set `destructiveHint: false` for `application list` and `destructiveHint: true` for `application deploy` on the same tool. Either: (a) split domain into `application` (read) + `application_lifecycle` (write), or (b) set conservative `destructiveHint: true` on whole tool and gate destructive actions with `confirm: true` arg.
5. **stdio transport = no per-request auth.** `authInfo` only flows through `StreamableHTTPServerTransport.handleRequest(req, { authInfo })`. For stdio (Cursor/Claude target), multi-instance must be a tool arg or config-file-driven — not auth-driven.
6. **`registerTool` returns the tool object** — can be enabled/disabled at runtime via `tool.enabled = false` if needed for feature flags.
7. **`outputSchema` + `structuredContent`** gives clients typed output alongside `content` text. Critical for agent reliability — always provide both.

## How to Run
Research spike — no runnable code. Patterns source at `sources/patterns.md`. To re-verify:
```bash
npx -y ctx7@latest docs /modelcontextprotocol/typescript-sdk "McpServer registerTool inputSchema outputSchema annotations stdio StreamableHTTP"
```

## What to Expect
A patterns document at `sources/patterns.md` covering: server bootstrap (stdio), action-based tool schema (zod discriminatedUnion), tool annotations per Coolify action, two-layer error handling, structured error code mapping (Coolify HTTP → MCP), multi-instance context pattern (instance arg + config file), wait-mode polling implementation, sensitive-value masking, destructive-op confirmation gate, and a starter package.json.

## Investigation Trail

### Iteration 1 — library resolution
context7 returned `/modelcontextprotocol/typescript-sdk` (score 90.67, v1.29.0 latest). Picked over the `websites/` mirror because higher snippet count and version-pinned.

### Iteration 2 — server + tool registration query
Confirmed `McpServer.registerTool(name, { description, inputSchema (zod), outputSchema, annotations, title, icons }, handler)` API. Handler returns `{ content: [...], structuredContent?, isError?: true }`. Got `StdioServerTransport` + `serveStdio` factory.

### Iteration 3 — transport + auth query
Confirmed `StreamableHTTPServerTransport` (stateless with `sessionIdGenerator: undefined`, or stateful). Bearer auth via `requireBearerAuth({ verifier, requiredScopes })` middleware or manual `verifyBearer()` returning `AuthInfo` passed to `handleRequest(req, { authInfo })`. **Key finding:** authInfo only flows through HTTP transport, NOT stdio. Determines v1 multi-instance design.

### Iteration 4 — annotations + structured output + state query
Confirmed `ToolAnnotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`). Confirmed `calc` example uses `z.enum(['add','sub','mul'])` — direct precedent for action-based schema. Confirmed `outputSchema` + `structuredContent` for typed output. Discovered 2026-07-28 `requestState` codec pattern (not needed for v1 single-round tools).

### Iteration 5 — design synthesis
Mapped every PROJECT.md v1 requirement to a concrete SDK pattern:
- Action-based schema → `z.discriminatedUnion('action', [...])` ✓
- Multi-instance → `instance` arg + `~/.coolify-mcp/instances.json` (stdio has no auth) ✓
- Structured error codes → `isError: true` + `structuredContent.error: { code, message, hint }` ✓
- Sensitive masking → client-side shaping in `CoolifyClient` ✓
- Destructive confirmation → `confirm: true` arg gate inside handler ✓
- Wait-mode polling → manual loop on `GET /deployments/{uuid}` (no SDK built-in) ✓

## Results

**Verdict: VALIDATED ✓**

Every PROJECT.md v1 design decision is feasible with `@modelcontextprotocol/sdk` v1.29.0. No SDK gaps block v1.

**Key findings:**

1. **Action-based tool schema confirmed via SDK precedent.** The SDK's own `calc` example uses `z.enum(['add','sub','mul'])` for the `op` field. Coolify tools use `z.discriminatedUnion('action', [...])` with one variant per action. One tool per Coolify domain (application, server, deployment, database, service, project, instance, system) = ~8 tools total, not 60+.

2. **Multi-instance via `instance` arg + config file is the right pattern for stdio.** HTTP transport could use `authInfo`, but v1 targets Cursor/Claude (stdio) where no per-request auth flows. Every tool takes optional `instance?: string` defaulting to config default. Dedicated `instance` tool manages config (`add/list/get/update/delete/set-default/use/verify`).

3. **Tool annotations are static per tool — split read vs write tools OR use conservative defaults.** Decision for v1: one tool per domain with `destructiveHint: true` as conservative default; gate destructive actions with `confirm: true` arg inside handler. Agent sees annotation, treats whole tool as potentially destructive, but read actions still work without confirm. Acceptable DX trade-off.

4. **Two-layer error handling:** tool-level (`isError: true` + structured error) for API failures, protocol-level (thrown `ProtocolError`) for malformed args. Coolify HTTP status codes map cleanly to 6 structured codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, RATE_LIMITED, COOLIFY_ERROR) with recovery hints — satisfies PROJECT.md "Structured Error Codes" requirement.

5. **`outputSchema` + `structuredContent` is mandatory for agent reliability.** Always return typed structured output alongside text content. Agents parse structured fields more reliably than free-text.

6. **Wait-mode polling is hand-rolled.** No SDK primitive. Loop `GET /deployments/{uuid}` every 2s until terminal status, with `max_chars` cap on returned `logs` field. Clean integration with Spike 001 finding (logs inline on deployment object).

7. **v2 SDK migration path exists** (`SdkError`/`SdkHttpError` replacing `McpError`/`StreamableHTTPError`). Build v1 on v1.29.0, migrate later. Avoid v2.0.0-alpha.2 for v1 production.

8. **2026-07-28 spec revision's `requestState` codec is not needed for v1.** All v1 tools are single-round (no elicitation mid-tool). If v2 adds interactive flows, revisit.

## Impact on Remaining Spikes
- **Spike 003** (existing Coolify MCP patterns): now compare `user-coolify` and `coolify-backup-mcp` against this patterns baseline. Specifically: do they use action-schema or granular tools? How do they handle multi-instance? Do they return structured errors or just text? Do they implement wait-mode polling or fire-and-forget?
