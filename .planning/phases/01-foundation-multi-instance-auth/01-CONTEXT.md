# Phase 1: Foundation & Multi-Instance Auth - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a **single-instance** MCP stdio server foundation: Coolify API client, action-based tool registration, structured errors with recovery hints, and minimal `system` + `meta` tools (health, version, verify-connection, MCP version). Credentials come from **mcp.json env vars** only — no `instances.json` in P1.

**Scope shift from ROADMAP/REQUIREMENTS:** Multi-instance management (CTX-04, CTX-05, CTX-06) and `~/.coolify-mcp/instances.json` are **deferred to v2**. Phase 1 validates the shared connection layer, error envelope, and MCP bootstrap before ops tools in Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Authentication & Instance Model
- **D-01:** **Single instance only in P1.** One Coolify URL + one API token per MCP server process.
- **D-02:** Credentials live in **mcp.json `env`** — required vars `COOLIFY_URL` and `COOLIFY_TOKEN`. Server must fail fast at startup if either is missing.
- **D-03 [deferred]:** **No per-request token override** (CTX-06 deferred to v2). Tokens are never passed as tool arguments in P1.
- **D-04:** **No `instances.json` in P1.** Multi-instance via multiple mcp.json entries (one MCP server entry per Coolify instance) is a **v2** pattern; not implemented in Phase 1.
- **D-05 [deferred]:** **Multi-instance CRUD** (add/list/get/update/delete/set-default/switch/verify across instances) → **v2**. REQUIREMENTS traceability for CTX-04/05/06 should be updated when v2 is planned.

### Instance Selection (simplified for P1)
- **D-06 [deferred]:** No `instanceId` parameter on P1 tools — implicit single connection from env.
- **D-07 [deferred]:** No session `switch`/`use` state in P1 — deferred with multi-instance to v2.

### Error Envelope & Retry
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

### MCP SDK & Phase 1 Tools
- **D-13:** Use **`@modelcontextprotocol/server` v2** (`McpServer` + `StdioServerTransport`) — user decision overrides spike note favoring SDK v1.29.0; researcher must verify Cursor + Claude Desktop compatibility before implementation locks.
- **D-14:** **P1 implements only `system` + `meta` tools** — no `instance`, `application`, or other domain stubs.
- **D-15:** **Action-per-domain** pattern from day one:
  - `system({ action: 'health' | 'version' | 'verify' })`
  - `meta({ action: 'version' })` or equivalent single meta action for MCP server version
- **D-16:** **Local dev entry first** — `node dist/index.js` / tsup build; npm `npx` publish deferred to Phase 7 (DIST-01). P1 must still satisfy DIST-03 via local MCP config pointing at built entry.
- **D-17:** Input validation via **Zod** with `discriminatedUnion('action', [...])` per domain tool (DX-02).

### Logging & Secrets
- **D-18:** Log **only to stderr** (stdout reserved for MCP JSON-RPC). Log level via `COOLIFY_MCP_LOG=debug|info|error`.
- **D-19:** **Aggressive redaction** in logs and error messages: `Bearer`, `token`, `api_key`, `password`, `secret` → `***`.
- **D-20:** P1 debug logging: **path + HTTP status only** — no request/response body logging.
- **D-21:** `system`/`meta` responses: report `connected: true`, **host only** from URL — never echo env values, tokens, or full URLs with credentials.

### Spike-Informed Constraints (apply unless overridden above)
- **D-22:** Coolify auth is `Authorization: Bearer <token>` against `{COOLIFY_URL}/api/v1/*`. Tokens are team-scoped with permissions `read-only` | `view:sensitive` | `*`.
- **D-23:** `GET /api/health` may work without auth; `GET /api/v1/version` requires Bearer token — map to `system` actions accordingly.
- **D-24:** Do not implement tools for absent/broken endpoints (`execute_command`, unreliable global deployments list) — flagged in spike 001.

### Claude's Discretion
- Exact Zod schema field names (`verify` vs `verify_connection`)
- `meta` tool shape (separate tool vs `system` action `mcp_version`)
- tsup/tsconfig project layout matching `.planning/research/ARCHITECTURE.md` structure
- Whether `COOLIFY_VERIFY_SSL` env var is added in P1 (user did not discuss — default `true`, document for homelab)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints (note: multi-instance via instances.json superseded for P1 by decisions above)
- `.planning/REQUIREMENTS.md` — CTX-01–03, ERR-01–03, DX-01–02, DIST-03 for Phase 1 (CTX-04–07 deferred v2)
- `.planning/ROADMAP.md` — Phase 1 success criteria (interpret with P1 scope shift documented in `<domain>`)
- `README.md` — Error envelope example (§ structured errors), mcp.json config examples

### Spike Findings (validated 2026-07-12)
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — Index of spike outputs
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — Endpoint map, auth, deployment/logs constraints
- `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md` — Action schema, error layers, outputSchema (multi-instance section applies to v2 only)
- `.cursor/skills/spike-findings-awesome-coolify/references/ecosystem-patterns.md` — Patterns to adopt in later phases
- `.planning/spikes/WRAP-UP-SUMMARY.md` — Spike verdicts and key findings

### Architecture & Stack
- `.planning/research/ARCHITECTURE.md` — Recommended `src/` layout (mcp/, api/, config/, utils/)
- `.planning/research/STACK.md` — `@modelcontextprotocol/server`, zod, ofetch, tsup
- `.planning/research/PITFALLS.md` — Token storage pitfalls, payload bloat warnings
- `mcp_features.md` — Full feature catalog (v2 reference)

### External
- Coolify API auth: https://coolify.io/docs/api-reference/authorization — Bearer token, team scope, permissions
- Coolify OpenAPI: https://github.com/coollabsio/coolify/blob/main/app/Http/Controllers/Api/OpenApi.php

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Greenfield** — no `src/` yet. README documents target architecture diagram and error format.
- **Spike skill** — implementation blueprint at `.cursor/skills/spike-findings-awesome-coolify/` with copy-paste SDK patterns.

### Established Patterns
- Action-based domain tools (~8 at full v1, **2 in P1**: `system`, `meta`)
- `ofetch` client with Bearer injection from env
- Two-layer errors: MCP `isError` + structured JSON body
- Spike: `outputSchema` + `structuredContent` for agent reliability

### Integration Points
- MCP client config: `~/.cursor/mcp.json` or project `.cursor/mcp.json` with `command` + `args` + `env.COOLIFY_URL` / `env.COOLIFY_TOKEN`
- Coolify API base: `${COOLIFY_URL}/api/v1`
- Phase 2+ tools will plug into same `CoolifyClient` + error utilities built here

</code_context>

<specifics>
## Specific Ideas

- User initially preferred multi-instance + instances.json, then pivoted to **single instance** with tokens in mcp.json after Coolify API research (Bearer per URL, team-scoped tokens).
- User explored secure storage (gitignore, encryption, keychain) — chose simplest path: **mcp.json env only** for P1.
- User produced spikes 001–003 before context finalize — findings incorporated; SDK v1 recommendation in spike **overridden** by user choice of `@modelcontextprotocol/server` v2.

</specifics>

<deferred>
## Deferred Ideas

### Multi-Instance (v2)
- `~/.coolify-mcp/instances.json` with add/list/get/update/delete/set-default/switch/verify
- Per-request token override (CTX-06)
- `instanceId` optional on every tool + session `switch` memory
- One mcp.json entry per Coolify instance pattern
- CTX-04, CTX-05 requirements

### Secure Storage Alternatives (explored, not chosen for P1)
- Project-local `.coolify-mcp/instances.json` with auto-`.gitignore`
- OS Keychain for tokens with JSON metadata only
- Encrypted `instances.json.enc`

### Additional Gray Areas (not discussed)
- `health` vs `verify` response semantics
- `COOLIFY_VERIFY_SSL` default for homelab self-signed certs
- Response format foundation (`format: table|json|pretty`) — Phase 2 (OUT-01)

### ROADMAP Alignment Note
- Phase name still "Foundation & Multi-Instance Auth" but P1 scope is **single-instance foundation**. Consider renaming in ROADMAP or adding Phase 1b/v2 milestone entry for multi-instance.

</deferred>

---

*Phase: 01-Foundation & Multi-Instance Auth*
*Context gathered: 2026-07-12*
