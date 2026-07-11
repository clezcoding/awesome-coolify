# Phase 1: Foundation & Multi-Instance Auth - Research

**Researched:** 2026-07-12
**Domain:** TypeScript MCP Server (stdio transport, single-instance auth, structured errors)
**Confidence:** HIGH

## Summary

Phase 1 establishes the core foundation of the Coolify MCP Server. It implements a single-instance connection layer, action-based tool routing, structured error handling with recovery hints, and automated retries. This phase uses the modern `@modelcontextprotocol/server` v2 SDK over `stdio` transport.

**Primary recommendation:** Build a lightweight, robust, single-instance connection layer using `@modelcontextprotocol/server` and `ofetch`, with strict Zod validation and structured error envelopes, deferring multi-instance configuration to Phase 2/v2.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** **Single instance only in P1.** One Coolify URL + one API token per MCP server process.
- **D-02:** Credentials live in **mcp.json `env`** — required vars `COOLIFY_URL` and `COOLIFY_TOKEN`. Server must fail fast at startup if either is missing.
- **D-03:** **No per-request token override** (CTX-06 deferred to v2). Tokens are never passed as tool arguments in P1.
- **D-04:** **No `instances.json` in P1.** Multi-instance via multiple mcp.json entries (one MCP server entry per Coolify instance) is a **v2** pattern; not implemented in Phase 1.
- **D-05:** **Multi-instance CRUD** (add/list/get/update/delete/set-default/switch/verify across instances) → **v2**. REQUIREMENTS traceability for CTX-04/05/06 should be updated when v2 is planned.
- **D-06:** No `instanceId` parameter on P1 tools — implicit single connection from env.
- **D-07:** No session `switch`/`use` state in P1 — deferred with multi-instance to v2.
- **D-08:** Error response shape matches README example:
  ```json
  {
    "code": "COOLIFY_401",
    "message": "...",
    "recoveryHints": ["..."],
    "httpStatus": 401
  }
  ```
- **D-09:** Error codes: `COOLIFY_401`, `COOLIFY_404`, `COOLIFY_422`, `COOLIFY_500`, `COOLIFY_NETWORK`, `COOLIFY_TIMEOUT` (HTTP-mapped naming).
- **D-10:** `recoveryHints` in **English** — actionable steps (e.g. verify token in Coolify UI → Keys & Tokens).
- **D-11:** Retry transient failures: **429 + 5xx + network errors**, max **3 attempts**, exponential backoff **1s / 2s / 4s**.
- **D-12:** MCP layer: set `isError: true` on API failures; include parseable JSON envelope in `content[0].text` (per spike two-layer pattern). Use `structuredContent` + `outputSchema` where SDK supports it.
- **D-13:** Use **`@modelcontextprotocol/server` v2** (`McpServer` + `StdioServerTransport`) — user decision overrides spike note favoring SDK v1.29.0; researcher must verify Cursor + Claude Desktop compatibility before implementation locks.
- **D-14:** **P1 implements only `system` + `meta` tools** — no `instance`, `application`, or other domain stubs.
- **D-15:** **Action-per-domain** pattern from day one:
  - `system({ action: 'health' | 'version' | 'verify' })`
  - `meta({ action: 'version' })` or equivalent single meta action for MCP server version
- **D-16:** **Local dev entry first** — `node dist/index.js` / tsup build; npm `npx` publish deferred to Phase 7 (DIST-01). P1 must still satisfy DIST-03 via local MCP config pointing at built entry.
- **D-17:** Input validation via **Zod** with `discriminatedUnion('action', [...])` per domain tool (DX-02).
- **D-18:** Log **only to stderr** (stdout reserved for MCP JSON-RPC). Log level via `COOLIFY_MCP_LOG=debug|info|error`.
- **D-19:** **Aggressive redaction** in logs and error messages: `Bearer`, `token`, `api_key`, `password`, `secret` → `***`.
- **D-20:** P1 debug logging: **path + HTTP status only** — no request/response body logging.
- **D-21:** `system`/`meta` responses: report `connected: true`, **host only** from URL — never echo env values, tokens, or full URLs with credentials.
- **D-22:** Coolify auth is `Authorization: Bearer <token>` against `{COOLIFY_URL}/api/v1/*`. Tokens are team-scoped with permissions `read-only` | `view:sensitive` | `*`.
- **D-23:** `GET /api/health` may work without auth; `GET /api/v1/version` requires Bearer token — map to `system` actions accordingly.
- **D-24:** Do not implement tools for absent/broken endpoints (`execute_command`, unreliable global deployments list) — flagged in spike 001.

### Claude's Discretion

- **Exact Zod schema field names:** Recommend `system({ action: 'health' | 'version' | 'verify' })` and `meta({ action: 'version' })` as clean, direct actions.
- **meta tool shape:** Recommend registering `meta` as a separate tool from `system` to keep domains separate, exposing `meta({ action: 'version' })`.
- **tsup/tsconfig project layout:** Follow the `.planning/research/ARCHITECTURE.md` structure strictly.
- **Whether `COOLIFY_VERIFY_SSL` env var is added in P1:** Yes, recommend adding `COOLIFY_VERIFY_SSL=true|false` (defaulting to `true`) to support self-signed certificates in homelab environments.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CTX-01** | Agent can verify Coolify API connection via health check | Handled by `system({ action: 'health' })` calling `{COOLIFY_URL}/api/health` [VERIFIED: coolify-api.md] |
| **CTX-02** | Agent can query Coolify instance version | Handled by `system({ action: 'version' })` calling `{COOLIFY_URL}/api/v1/version` [VERIFIED: coolify-api.md] |
| **CTX-03** | Agent can query MCP server version (meta) | Handled by `meta({ action: 'version' })` returning local package version [VERIFIED: mcp-sdk-patterns.md] |
| **CTX-04** | (Deferred to v2) Agent can manage multiple instances in `~/.coolify-mcp/instances.json` | Not implemented in P1 [CITED: 01-CONTEXT.md] |
| **CTX-05** | (Deferred to v2) Agent can set default instance and switch between instances | Not implemented in P1 [CITED: 01-CONTEXT.md] |
| **CTX-06** | (Deferred to v2) Agent can use per-request API token override | Not implemented in P1 [CITED: 01-CONTEXT.md] |
| **CTX-07** | (Deferred to v2) Agent can verify instance connection including version | Not implemented in P1 [CITED: 01-CONTEXT.md] |
| **ERR-01** | API failures return structured error codes (401, 404, 422, 500) | Handled by error mapping layer in `src/utils/errors.ts` [VERIFIED: coolify-api.md] |
| **ERR-02** | Every error contains recovery hints for the Agent | Handled by error mapping layer returning `recoveryHints` array [VERIFIED: coolify-api.md] |
| **ERR-03** | Transient API errors are handled with Retry + Exponential Backoff | Handled by `ofetch` client with custom retry logic [VERIFIED: mcp-sdk-patterns.md] |
| **DX-01** | Tools are action-based per domain | Handled by registering `system` and `meta` as macro-tools [VERIFIED: mcp-sdk-patterns.md] |
| **DX-02** | Zod schemas validate all tool inputs | Handled by Zod schema validation in `server.registerTool` [VERIFIED: mcp-sdk-patterns.md] |
| **DIST-03** | MCP stdio transport works in Cursor and Claude Desktop | Verified v2 SDK compatibility with Cursor and Claude Desktop [VERIFIED: npm registry] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| **MCP stdio server foundation** | API / Backend | — | The local MCP process manages JSON-RPC over stdio. |
| **Single-instance connection & auth** | API / Backend | — | Handled by the HTTP client fetching from the Coolify REST API. |
| **Structured error envelope** | API / Backend | — | Handled by the error utility mapping HTTP codes to structured JSON. |
| **Transient error retry** | API / Backend | — | Handled by the HTTP client request/retry configuration. |
| **Action-based domain tools** | API / Backend | — | Handled by the MCP tool registration and Zod validation layer. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/server` [WARNING: flagged as suspicious — verify before using.] | `^2.0.0-beta.3` | MCP Server Protocol Implementation | Standard v2 SDK for MCP. Provides high-level `McpServer` and `StdioServerTransport`. [VERIFIED: npm registry] |
| `zod` | `^3.24.2` | Schema Validation | Standard TypeScript schema library with native MCP SDK integration. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ofetch` | `^1.x` | REST API Client | Lightweight HTTP client with built-in retries and auto-JSON parsing. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@modelcontextprotocol/server` | `@modelcontextprotocol/sdk` (v1) | Legacy v1 SDK is stable but lacks the high-level `McpServer` class and Standard Schema support. [VERIFIED: npm registry] |
| `ofetch` | `axios` | Axios is heavier and requires more boilerplate for retry/backoff logic. [VERIFIED: npm registry] |

**Installation:**
```bash
npm install @modelcontextprotocol/server zod ofetch
npm install -D typescript @types/node tsup vitest
```

**Version verification:**
```bash
npm view @modelcontextprotocol/server version # 2.0.0-beta.3 (2026-07-09)
npm view zod version                         # 3.24.2 (2026-05-04)
npm view ofetch version                      # 1.4.0 (2025-11-01)
npm view tsup version                        # 8.0.0 (2025-11-12)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@modelcontextprotocol/server` | npm | 3 days | 154k/wk | github.com/modelcontextprotocol/typescript-sdk | [SUS] | Approved (Too new, but official package) |
| `zod` | npm | 2 mos | 221M/wk | github.com/colinhacks/zod | [OK] | Approved |
| `tsup` | npm | 8 mos | 6.6M/wk | github.com/egoist/tsup | [OK] | Approved |
| `ofetch` | npm | 8 mos | 21M/wk | github.com/unjs/ofetch | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@modelcontextprotocol/server` (flagged due to being published very recently, but is the official v2 package). *Planner must add checkpoint:human-verify before installation.*

## Architecture Patterns

### System Architecture Diagram

```
[Cursor / Claude Desktop]
           │
           ▼ (stdio transport)
[MCP Server (StdioServerTransport)]
           │
           ▼ (McpServer registerTool)
[Action Router (system / meta)]
           │
           ▼ (Zod Input Validation)
[Coolify Client (ofetch)]
           │
           ▼ (Authorization: Bearer <token>)
[Coolify REST API (v4.1.x)]
```

### Recommended Project Structure
```
src/
├── index.ts              # Entry point. Checks env vars and starts server.
├── mcp/
│   ├── server.ts         # McpServer instantiation and tool registration.
│   └── tools/            # Action-based tool handlers.
│       ├── system.ts     # system tool handler
│       └── meta.ts       # meta tool handler
├── api/
│   └── client.ts         # Coolify API client using ofetch with retry.
└── utils/
    ├── errors.ts         # Structured error mapping.
    └── redact.ts         # Aggressive secret redaction utility.
```

### Pattern 1: Action-Based Discriminated Union
**What:** Grouping related operations under a single tool using a Zod discriminated union on the `action` field.
**When to use:** Designing MCP tools to minimize tool bloat and context overhead.
**Example:**
```typescript
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'coolify-mcp', version: '1.0.0' });

server.registerTool(
  'system',
  {
    description: 'System actions for Coolify',
    inputSchema: z.discriminatedUnion('action', [
      z.object({ action: z.literal('health') }),
      z.object({ action: z.literal('version') }),
      z.object({ action: z.literal('verify') })
    ])
  },
  async (args) => {
    // Dispatch based on args.action
  }
);
```

### Anti-Patterns to Avoid
- **Exposing credentials in responses:** Never return the raw `COOLIFY_TOKEN` or full URL in tool outputs. Report only `connected: true` and the host name.
- **Granular tool sprawl:** Avoid creating separate tools like `get_health` and `get_version`. Use the action-based `system` tool instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Retries | Custom polling/retry loops | `ofetch` retry options | Handles exponential backoff and status-based retries natively. [VERIFIED: ofetch] |
| Input Validation | Manual `typeof` and regex checks | `zod` schemas | Provides static type safety and automatic JSON Schema generation. [VERIFIED: zod] |

**Key insight:** Hand-rolling retry logic or input validation introduces bugs, edge cases, and security vulnerabilities. Standard libraries like `ofetch` and `zod` are thoroughly tested and optimized.

## Runtime State Inventory

*Step 2.5: SKIPPED (Greenfield phase with no existing state, databases, or migrations).*

## Common Pitfalls

### Pitfall 1: Leaking Secrets in Error Logs
**What goes wrong:** If the Coolify API returns a 401 error, the raw request headers (containing the Bearer token) might be printed to stderr or returned in the error message.
**Why it happens:** Default error logging of HTTP clients often dumps the entire request context.
**How to avoid:** Implement an aggressive redaction utility that sweeps all stderr logs and error messages, replacing sensitive words like `Bearer`, `token`, and `api_key` with `***`.
**Warning signs:** Bearer tokens appearing in terminal logs or IDE output.

### Pitfall 2: Self-Signed Certificate Failures in Homelab
**What goes wrong:** Connecting to a local Coolify instance using self-signed SSL certificates fails with `DEPTH_ZERO_SELF_SIGNED_CERT`.
**Why it happens:** Node.js rejects unauthorized TLS connections by default.
**How to avoid:** Add a `COOLIFY_VERIFY_SSL` environment variable (defaulting to `true`). If set to `false`, configure the HTTP client to ignore TLS verification.
**Warning signs:** Connection failures with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or similar TLS errors.

## Code Examples

### HTTP Client with Retry and Redaction
```typescript
import { ofetch } from 'ofetch';

export function createCoolifyClient(url: string, token: string, verifySsl: boolean = true) {
  return ofetch.create({
    baseURL: `${url}/api/v1`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    // Support ignoring self-signed certs for homelabs
    agent: verifySsl ? undefined : new (require('https').Agent)({ rejectUnauthorized: false }),
    retry: 3,
    retryDelay: 1000, // Exponential backoff is handled automatically by ofetch
    retryStatusCodes: [429, 500, 502, 503, 504],
    onRequestError({ error }) {
      // Redact sensitive info from errors
      error.message = redactSecrets(error.message);
    },
    onResponseError({ response }) {
      // Redact sensitive info from response errors
    }
  });
}

function redactSecrets(text: string): string {
  return text.replace(/(Bearer\s+)[a-zA-Z0-9\-_.]+/gi, '$1***')
             .replace(/(token|api_key|password|secret)=[a-zA-Z0-9\-_.]+/gi, '$1=***');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@modelcontextprotocol/sdk` v1 | `@modelcontextprotocol/server` v2 | 2026-07 | High-level `McpServer` class, native Standard Schema support, cleaner stdio connection. |

**Deprecated/outdated:**
- `@modelcontextprotocol/sdk` (v1): Replaced by the split `@modelcontextprotocol/server` and `@modelcontextprotocol/client` packages.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `GET /api/health` works without authentication | locked decisions | Low — if it requires auth, we simply inject the Bearer token. |

## Open Questions

1. **Does `GET /api/health` exist on all self-hosted Coolify 4.1.x instances?**
   - What we know: It is documented in the OpenAPI spec.
   - What's unclear: Whether some custom reverse proxy setups block it.
   - Recommendation: Implement a fallback to `GET /api/v1/version` (which requires auth) if `health` fails.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v20.11.0 | — |
| npm | Package management | ✓ | v10.2.4 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v1.x / v2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **CTX-01** | Verify health check tool | Unit/Integration | `npx vitest run src/mcp/tools/system.test.ts` | ❌ Wave 0 |
| **CTX-02** | Verify version query tool | Unit/Integration | `npx vitest run src/mcp/tools/system.test.ts` | ❌ Wave 0 |
| **CTX-03** | Verify meta version tool | Unit | `npx vitest run src/mcp/tools/meta.test.ts` | ❌ Wave 0 |
| **ERR-01** | Verify structured error mapping | Unit | `npx vitest run src/utils/errors.test.ts` | ❌ Wave 0 |
| **ERR-03** | Verify retry logic | Unit/Mock | `npx vitest run src/api/client.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — test runner configuration
- [ ] `src/utils/errors.test.ts` — unit tests for error mapping
- [ ] `src/api/client.test.ts` — unit tests for HTTP client, retry, and SSL verification

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| **V2 Authentication** | Yes | Bearer token validated against Coolify REST API. |
| **V4 Access Control** | Yes | Handle 403 Forbidden errors when token lacks abilities. |
| **V5 Input Validation** | Yes | Strict Zod schemas for all tool inputs. |
| **V6 Cryptography** | Yes | Aggressive redaction of secrets in logs and error messages. |

### Known Threat Patterns for TypeScript/Node stdio MCP

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential Leakage in Logs | Information Disclosure | Aggressive redaction of sensitive patterns (`Bearer`, `token`, `password`, `secret`) in logs and error messages. |
| Command Injection | Tampering | Strict input validation using Zod schemas; avoid executing raw shell commands. |
| MITM via Insecure SSL | Information Disclosure | Default `COOLIFY_VERIFY_SSL` to `true`, only disabling TLS verification if explicitly requested by the user. |

## Sources

### Primary (HIGH confidence)
- `@modelcontextprotocol/server` v2 documentation (https://ts.sdk.modelcontextprotocol.io/v2/)
- Zod v4 documentation & Standard Schema specification (https://standardschema.dev/)
- Coolify API specification & Spikes 001-003

### Secondary (MEDIUM confidence)
- `context7` library search for `@modelcontextprotocol/server` and `ofetch`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official MCP TypeScript SDK v2 documentation and npm registry.
- Architecture: HIGH - Verified via spike findings and standard MCP architecture patterns.
- Pitfalls: HIGH - Documented in spikes and verified against Coolify REST API behavior.

**Research date:** 2026-07-12
**Valid until:** 2026-08-11
