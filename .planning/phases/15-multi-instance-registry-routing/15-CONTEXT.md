# Phase 15: Multi-Instance Registry & Routing - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can manage named Coolify instances in a secure local registry (`~/.coolify-mcp/instances.json`) and route any of the existing 14 domain tool calls to a chosen instance without cross-instance credential leakage. Scope is registry CRUD + per-request credential resolution + soft bootstrap — not Coolify Cloud quirks (Phase 16), not workspace manifest (Phase 17), not live UAT harness (Phase 18).

</domain>

<decisions>
## Implementation Decisions

### Tool surface (Registry API)
- **D-01:** New domain tool `instance` (not `meta` / `system`) for registry CRUD.
- **D-02:** v1 actions: `list`, `get`, `add`, `update`, `delete`, `set-default`. Optional live `verify` on `add` (ping Coolify). No session `switch` action.
- **D-03:** Registry tool never takes an `instance` routing param — ops always target the local file.
- **D-04:** `delete` requires `confirm: true`. Default and last remaining instance cannot be deleted without `force`.
- **D-05:** Opt-in migration action `instance.import-env` — never auto-write Env into the registry.

### Instance identity & schema
- **D-06:** Primary key = stable slug/name (e.g. `prod`, `cloud`). Used as CTX-06 `instance` param value.
- **D-07:** `add` fields: `name`, `url`, `token`, `type` (`self-hosted` | `cloud`), `verifySsl` (default `true`).
- **D-08:** Name regex: `^[a-z][a-z0-9_-]{1,31}$`.
- **D-09:** Duplicate URLs allowed (same host, different tokens/teams).

### Routing precedence
- **D-10:** Resolve credentials: explicit `instance` param → Env (`COOLIFY_URL` + `COOLIFY_TOKEN` both set) → registry `default`.
- **D-11:** When both `instance` param and Env are set, param wins silently (Env ignored for that call).
- **D-12:** Unknown `instance` name → structured error + recovery hint to `instance.list` — no silent fallback.
- **D-13:** Partial Env (only URL or only TOKEN) → hard error (both or neither). Never mix Env URL with registry token.

### Default model
- **D-14:** Persist field `default` in `instances.json` (not session `active`).
- **D-15:** First `add` into empty registry auto-sets `default`.
- **D-16:** `set-default` on unknown name → hard error + hint `instance.list`.
- **D-17:** `instance.list` returns registry entries; when Env override is active, include `_meta.envOverride: true` (no synthetic `__env__` row).

### Bootstrap & process config
- **D-18:** Soft-start without Env and without registry/default: server starts; `instance.*` + `meta.version` work; other tools return `COOLIFY_NO_INSTANCE` with recovery hints (`instance.add` / set Env / `set-default`).
- **D-19:** `verifySsl` is per-instance; `COOLIFY_MCP_LOG` stays process-global from Env.
- **D-20:** Missing credentials at tool call → `COOLIFY_NO_INSTANCE` (not legacy Zod env-parse failure).

### Locked by roadmap / requirements (not re-discussed)
- Path `~/.coolify-mcp/instances.json`; dir `0o700`, file `0o600`; tokens redacted unless `reveal: true` (CTX-08).
- Atomic writes: temp file + rename (CTX-09).
- Cross-instance fan-out is out of scope.

### Claude's Discretion
- Exact error code string for unknown instance (suggest `COOLIFY_INSTANCE_NOT_FOUND` or reuse `COOLIFY_404` with domain hint) — keep structured envelope + recovery hints.
- Client factory caching vs always-new `createCoolifyClient` per request — must remain request-scoped credentials (no global mutable active client); caching keyed by resolved instance is OK if safe.
- Exact verify endpoint/path for optional `add` verify — prefer existing health/version call pattern in codebase.

### Reviewed Todos
Todos matched by keyword were reviewed and **not folded** (see Deferred).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 15 goal, success criteria, requirement IDs CTX-04..06/08/09
- `.planning/REQUIREMENTS.md` — CTX-04, CTX-05, CTX-06, CTX-08, CTX-09; Out of Scope (fan-out)
- `.planning/PROJECT.md` — v3.0 Platform Foundation milestone context

### Architecture & pitfalls research
- `.planning/research/ARCHITECTURE.md` — InstanceManager, dynamic per-request config, proposed `instance` tool layout
- `.planning/research/PITFALLS.md` — Pitfalls 1–3 (global state leakage, atomic writes, insecure perms) mapped to Phase 15

### Existing code integration
- `src/config/env.ts` — current hard-required `COOLIFY_URL`/`COOLIFY_TOKEN` load (must soften for soft-start)
- `src/api/client.ts` — `createCoolifyClient(url, token, …)` already credential-agnostic / reusable
- `src/mcp/server.ts` — tool registration; today injects static `EnvConfig` into handlers
- `src/mcp/tools/meta.ts` — keep thin (`version` only); registry is separate tool
- `src/utils/errors.ts` — structured error + recovery hint patterns to extend with `COOLIFY_NO_INSTANCE`

### Spike findings
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — stdio multi-instance via config file; action-based schema; no stub tools

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createCoolifyClient` — already takes URL/token per call; ideal for per-request routing.
- Redact / `reveal: true` patterns on other tools — reuse for `instance.list`/`get` token masking.
- Confirm-gate pattern (`confirm: true`) — reuse for `instance.delete`.
- Zod discriminatedUnion action schemas — mirror for `instance` tool.

### Established Patterns
- Action-based domain tools (14 tools) — add one more tool, not 6 granular tools.
- Handlers receive `env: EnvConfig` today — must refactor to resolve credentials per call (param/Env/default).
- Startup currently fails if Env missing — Soft-start (D-18) requires changing `loadEnv` / server boot path.

### Integration Points
- Every tool handler that calls Coolify API must go through a shared resolver (e.g. `resolveInstanceConfig(args, processEnv, registry)`).
- `registerTool` input schemas for the 14 tools need optional `instance` (slug) field.
- New file likely: `src/mcp/tools/instance.ts` + `src/utils/instance-registry.ts` (names at planner discretion).

</code_context>

<specifics>
## Specific Ideas

- Discussion followed research recommendation: dedicated `InstanceTool`, not expanding `meta`.
- User consistently chose recommended options (agent-clarity + no silent wrong-instance).
- German discuss session; decisions above are normative for downstream agents (English).

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE — v3.1
- Lokale Projekt-Manifest-Datei — Phase 17
- MCP Server für Coolify Cloud erweitern — Phase 16
- Standard-Setup Tool — v3.1
- Integrate official Coolify OpenAPI specs — docs/foundation, not registry

### Scope belonging to later phases
- Coolify Cloud connection quirks & recovery hints — Phase 16
- `.coolify/manifest.json` — Phase 17
- Live UAT covering multi-instance routing — Phase 18
- Session-level `switch` / sticky `active` — explicitly rejected for v1 of this phase

</deferred>

---

*Phase: 15-Multi-Instance Registry & Routing*
*Context gathered: 2026-07-21*
