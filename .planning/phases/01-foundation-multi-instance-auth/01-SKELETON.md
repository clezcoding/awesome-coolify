# Walking Skeleton — Coolify MCP Server

**Phase:** 1
**Generated:** 2026-07-12

## Capability Proven End-to-End

An AI agent operator can invoke `system({ action: 'health' })` through a local MCP stdio client (Cursor or Claude Desktop) and receive `{ connected: true, host: <hostname> }` from a real Coolify instance — without the API token ever appearing in the response or logs.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | TypeScript + `@modelcontextprotocol/server` v2 (`McpServer` + `StdioServerTransport`) | User-locked D-13; high-level SDK, native Zod integration |
| Data layer | None (stateless MCP server) | P1 single-instance; no DB or config file persistence |
| Auth | `COOLIFY_URL` + `COOLIFY_TOKEN` via mcp.json `env` (D-01, D-02) | Simplest homelab path; multi-instance deferred v2 |
| HTTP client | `ofetch` with Bearer injection | Lightweight retries, JSON parsing; per RESEARCH.md |
| Input validation | Zod `discriminatedUnion('action', [...])` per domain tool (D-17) | DX-02; action-based schema from day one |
| Deployment target | Local `node dist/index.js` via mcp.json `command` + `args` (D-16) | npm publish deferred Phase 7; DIST-03 via local config |
| Directory layout | `src/{index,mcp/,api/,config/,utils/}` per ARCHITECTURE.md | Greenfield; spike-validated structure |
| Logging | stderr only via `COOLIFY_MCP_LOG` (D-18) | stdout reserved for MCP JSON-RPC |
| Error shape | `COOLIFY_*` codes + `recoveryHints` + `isError: true` (D-08–D-12) | Agent recovery path for all later tools |

## Stack Touched in Phase 1

- [x] Project scaffold (package.json, tsconfig, tsup, vitest)
- [x] MCP stdio transport — handshake completes
- [x] Real HTTP call — `GET ${COOLIFY_URL}/api/health` (fallback `/api/v1/version`)
- [x] One real tool — `system({ action: 'health' })`
- [x] Local dev deployment — `node dist/index.js` invokable from mcp.json

## Out of Scope (Deferred to Later Slices)

- `~/.coolify-mcp/instances.json` multi-instance CRUD (CTX-04, CTX-05, D-04)
- Per-request token override (CTX-06, D-03)
- Cross-instance verify/switch (CTX-07, D-06, D-07)
- Domain tools beyond `system` + `meta` (D-14)
- Full error envelope, retry, redaction hardening (subsequent P1 plans 01-02–01-05)
- npm publish / `npx coolify-mcp` (DIST-01, Phase 7)
- Response format foundation `format: table|json|pretty` (OUT-01, Phase 2)

## Subsequent Slice Plan

Each later plan extends this skeleton without renegotiating architectural decisions:

- **01-02:** Structured error envelope + retry client (ERR-01–03)
- **01-03:** Secret redaction + stderr logger (D-19, D-20)
- **01-04:** Full `system` (version, verify) + `meta` tool + Zod schemas (CTX-02, CTX-03, DX-01–02)
- **01-05:** Production build + MCP client handshake smoke (DIST-03)
- **Phase 2+:** Discovery, diagnose, deploy, logs — plug into same `CoolifyClient` + error utilities
