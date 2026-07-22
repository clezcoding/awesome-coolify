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
- **Tagged-version verification (NEW 2026-07-13)**: when verifying endpoints for a specific running Coolify version, fetch the OpenAPI YAML for the EXACT git tag (e.g. `v4.1.2`), not `v4.x` or `next`. PRs merged after the tag's release date are NOT in that version. Cross-check with the `next` branch YAML to detect forward-roadmap endpoints.
- **Live curl confirmation**: for endpoint existence claims, ALWAYS live-curl the running instance in addition to OpenAPI grep. 200 = exists, 404 = absent, 401 = token issue, 422 = param issue. Record HTTP status in the spike README.
- **MCP live UAT (NEW 2026-07-13)**: for MCP ecosystem comparison, use `GetMcpTools` + `CallMcpTool` against installed MCP servers pointing at the same instance. Record tool → endpoint → WORKS|404|ERROR-STUB mapping.
- **CLI trace procedure (NEW 2026-07-13)**: `coolify <cmd> --debug --format json 2>&1 | grep -E "GET https|POST https|Response status"` extracts the underlying REST endpoint. CLI is a pure REST client — same surface as MCP servers.
- **Cross-reference multiple sources**: context7 + web + (if applicable) MCP tool discovery + CLI trace. Triangulate findings.
- **Document investigation trail**: every spike README has an Investigation Trail section documenting iterations — what was tried, what revealed, what was tried next. Not just conclusions.
- **Verdict requires evidence**: VALIDATED needs concrete evidence (endpoint names, code snippets, pattern matches, live HTTP statuses). Never "VALIDATED — it works" without nuance.
- **Surprises get explicit callouts**: when live evidence contradicts a prior assumption (e.g. deployment `logs` is JSON-array not plain string), mark the finding as CORRECTION and propagate the amendment to the affected plan docs.

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
- OpenAPI source: `github.com/coollabsio/coolify/blob/v4.x/openapi.yaml` — BUT verify against the EXACT tagged version running on the instance (e.g. `v4.1.2`), not `v4.x` or `next`. PRs merged after the tag's release date are NOT in that version.
- **No tools for absent endpoints** (`execute_command`, DB/service logs via REST in v4.1.2). OMIT the tool entirely — do NOT ship `COOLIFY_501` stubs. (Reinforced 2026-07-13 by spikes 004/005a/005b/006 + user directive.)
- Deploy wait-mode: poll `GET /deployments/{uuid}` every 2s to terminal status
- REST logs: `lines` param only (no follow/tail). For follow-like behavior, caller re-invokes the tool (CLI polls every 2s — choose own cadence).
- **Deployment `logs` field shape (CRITICAL):** `logs` is a JSON-encoded string containing an array of `{command, output, type, timestamp, hidden, batch}` entries — NOT a plain `\n`-separated string. Handler must `JSON.parse` (defensive fallback to plain string on parse failure) → filter `hidden:true` by default → flatten `output` with `\n` → cap with `max_chars` AFTER flattening. Optional `include_hidden: boolean` (default false) + `type: 'stdout'|'stderr'|'all'` (default 'all') schema params.
- **`api.sensitive` token ability** required for `deployment.logs` field. Absent `logs` → `COOLIFY_403_SENSITIVE_REQUIRED` error, NOT empty logs.
- **`service.deploy` with `pull_latest`**: maps to `POST /services/{uuid}/restart?latest=true` (PR #5881, in v4.1.2). Tool param `pull_latest`, API param `latest`. No dedicated `/services/{uuid}/deploy` endpoint.
- **Service/DB lifecycle endpoints are fire-and-forget**: response `{message: "..."}`, no `deployment_uuid`. No wait-mode polling on the response itself.
- **Roadmap (revisit when instance upgrades to v4.1.3+):** PR #6293 adds `GET /services/{uuid}/logs?sub_service_name=<name>&lines=N&show_timestamps=bool` and `GET /databases/{uuid}/logs?lines=N&show_timestamps=bool`. Then re-add `service.logs` + `database.logs` tools. Services require `sub_service_name` enumeration helper (`GET /services/{uuid}` returns sub-resources).

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
