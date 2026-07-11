# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack
- **Research spikes**: context7 (`npx ctx7@latest`) for library/framework docs, WebSearch for APIs/services without context7 entry, MCP tool discovery (GetMcpTools) for installed MCP servers, raw OpenAPI YAML via `curl` + `grep` for endpoint verification.
- **Build spikes (future)**: TypeScript + `@modelcontextprotocol/sdk` v1.29.0 (per Spike 002). zod for schema. stdio transport for v1 (Cursor/Claude target).
- **Why**: TS is the MCP SDK's primary language, community-friendly, matches PROJECT.md stack decision.

## Structure
- Spikes live in `.planning/spikes/NNN-descriptive-name/`
- Each spike has `README.md` (with YAML frontmatter) + `sources/` directory for reference artifacts (endpoint maps, pattern docs, comparisons)
- MANIFEST.md at `.planning/spikes/` root tracks all spikes with verdicts
- CONVENTIONS.md (this file) captures cross-spike patterns

## Patterns
- **Research before code**: context7 `library` → `docs` for any library/framework/API question. WebSearch for services without context7 entry. Always cite source (library ID, snippet count, reputation, score).
- **Raw spec verification**: when context7 truncates, fetch raw spec (OpenAPI YAML, GitHub source) and grep for specific endpoints/patterns. Don't rely on truncated summaries for endpoint verification.
- **Cross-reference multiple sources**: context7 + web + (if applicable) MCP tool discovery. Triangulate findings.
- **Document investigation trail**: every spike README has an Investigation Trail section documenting iterations — what was tried, what revealed, what was tried next. Not just conclusions.
- **Verdict requires evidence**: VALIDATED needs concrete evidence (endpoint names, code snippets, pattern matches). Never "VALIDATED — it works" without nuance.

## Build Conventions (from wrap-up)

Established during spike wrap-up (2026-07-12). Apply during v1 implementation.

### Tool layout
- ~8 domain tools with `z.discriminatedUnion('action', [...])`: `application`, `server`, `deployment`, `database`, `service`, `project`, `instance`, `system`
- Unified `control` tool for start/stop/restart across resource types
- Every tool takes optional `instance?: string` defaulting to config default

### Error handling
- Two layers: `isError: true` + `structuredContent.error` for API failures; thrown `ProtocolError` for malformed args
- 6 codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `RATE_LIMITED`, `COOLIFY_ERROR`
- Always return `outputSchema` + `structuredContent` alongside text content

### Security & DX
- Multi-instance: `~/.coolify-mcp/instances.json` + `instance` arg (not env vars)
- Sensitive values masked as `***`; `reveal: true` opt-in
- Destructive ops require per-call `confirm: true` (not global env-var gate)
- HATEOAS `_actions` hints in responses for agent follow-up
- Default `include_logs: false` on list; cap deployment logs with `max_chars`

### API constraints
- OpenAPI source: `github.com/coollabsio/coolify/blob/v4.x/openapi.yaml`
- No tools for absent endpoints (`execute_command`, DB/service logs via REST)
- Deploy wait-mode: poll `GET /deployments/{uuid}` every 2s to terminal status
- REST logs: `lines` param only (no follow/tail)

## Tools & Libraries
### Verified working
- `npx -y ctx7@latest` — context7 CLI for library docs (no API key needed for basic use)
- context7 library IDs confirmed:
  - `/coollabsio/coolify-docs` (High rep, 67.73) — Coolify docs
  - `/coollabsio/coolify-cli` (High rep, 77.09) — Coolify CLI
  - `/stumason/coolify-mcp` (High rep, 83.5) — third-party Coolify MCP
  - `/modelcontextprotocol/typescript-sdk` (High rep, 90.67, v1.29.0) — MCP TS SDK
- MCP tool discovery via GetMcpTools for installed servers

### To avoid
- Relying on first context7 `docs` query for broad topics — truncates. Run targeted queries per concern.
- WebSearch-only for library docs — context7 is more current and code-first.
