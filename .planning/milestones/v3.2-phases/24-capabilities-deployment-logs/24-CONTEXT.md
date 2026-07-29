# Phase 24: Capabilities & Deployment Logs - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent discovers Coolify 4.1.2 capabilities via extended `system.version` (Coolify version + MCP package version + capability flags) and fetches deployment build logs via a dedicated `deployment.logs` action on the existing `deployment` tool. Foundation for Phase 25 follow and Phase 26 diagnose/incident. No service/DB logs. No application log follow. No `incident` prompt (Phase 26). No OpenAPI multi-version archive.

</domain>

<decisions>
## Implementation Decisions

### Capability flags (`system.version`)
- **D-01:** Capability payload is a flat map of keys to objects `{ supported: boolean, coolify_min_version: string, note?: string }` — not nested by domain, not bool-only. — **Reversibility:** costly — published agent contract for capability discovery.
- **D-02:** Flags come from a **static table** curated for Coolify **4.1.2** (no runtime OpenAPI diff, no semver-only gating as sole source). — **Reversibility:** reversible — table can grow when target Coolify version rises.
- **D-03:** Phase 24 required keys only: `application_logs`, `deployment_logs`, `deployment_watch`, `deploy_watch`. Do **not** include `diagnose` / `diagnose_logs` in this set. — **Reversibility:** reversible — keys can be added in later phases.
- **D-04:** `supported: false` is **soft guidance** — agents should skip the call; tools stay registered; no schema hard-block / capability gate inside Zod. — **Reversibility:** costly — hard-block later would change agent error surface.
- **D-05:** Package / milestone **target remains Coolify 4.1.2** (band `4.1.x`). Do **not** lower advertised min support to 4.0.0 without live UAT. Per-flag `coolify_min_version` may note API availability (e.g. app logs since 4.0.0) without changing the support claim. — **Reversibility:** reversible — docs/claim only until UAT exists.

### Version response merge
- **D-06:** Extend `system.version` to return Coolify + MCP package + capabilities. Keep `meta.version` for backward compatibility (same package identity fields). — **Reversibility:** costly — dual surfaces until meta is retired later.
- **D-07:** Response field names: `{ coolifyVersion, mcpVersion, serverName, capabilities }` — rename away from bare `{ version }`. — **Reversibility:** one-way — breaks callers of `system.version` that expect `{ version }` (acceptable on 1.0.x with catalog/docs note).
- **D-08:** `mcpVersion` is read from `package.json` `version` (single source of truth). Fix stale `MCP_VERSION = '0.1.0'` in `meta.ts` via the same source. — **Reversibility:** reversible — source path can change.
- **D-09:** Document the `version` → `coolifyVersion` rename in actions catalog / tool descriptions (and short README note). No dual-field alias (`version` + `coolifyVersion`). — **Reversibility:** one-way — alias would soften break but was explicitly rejected.

### `deployment.logs` surface
- **D-10:** Implement `deployment.logs` as a **new action on the existing `deployment` MCP tool** (same pattern as `watch`) — not a new top-level tool, not a mere alias. — **Reversibility:** costly — action catalog + agent habits.
- **D-11:** Keep `application.logs` + `deployment_uuid` build-log path for **backward compatibility**. Docs/catalog steer agents to `deployment.logs`. No soft-deprecate warning payload and no hard removal in this phase. — **Reversibility:** reversible — deprecate later if desired.
- **D-12:** `deployment.logs` is on-demand fetch; `deployment.watch` `include_logs` stays a capped snapshot — **separate** concerns. Do not route watch through logs; do not deprecate `include_logs` here. — **Reversibility:** reversible.
- **D-13:** Accept **either** `deployment_uuid` **or** `application_uuid` (mutually exclusive). When only `application_uuid`: resolve **newest deployment by timestamp regardless of status** (running/failed/finished). — **Reversibility:** costly — resolution policy becomes agent-visible behavior.
- **D-14:** If `application_uuid` is given and **no deployments exist**: return a **structured error** with recovery hints (deploy first / list deployments) — not a soft empty log body. — **Reversibility:** costly — error contract.

### Log output contract
- **D-15:** Param parity with `application.logs` build path: `lines`, offset/skip, `include_hidden`, `type`, `format` (pretty|json; no table), `max_chars`, plus shared read/routing params as applicable. — **Reversibility:** costly — agent-facing schema.
- **D-16:** Empty / missing log content (when deployment exists): **soft OK** + empty list/string + hint — not an error. — **Reversibility:** reversible.
- **D-17:** Implementation reuse vs new helpers, and exact response envelope shape: **Claude's discretion at research** — prefer reusing `log-helpers` + parity with existing `application.logs` build path unless research finds a concrete reason not to.

### Docs / prompts (Phase 24 scope)
- **D-18:** Update actions catalog + tool descriptions + a **short README note**. Touch `deploy` MCP prompt **only if needed** so agents discover `deployment.logs`. **`incident` prompt stays Phase 26.** No full incident/diagnose docs in this phase. — **Reversibility:** reversible.

### Claude's Discretion
- Exact helper extraction vs calling shared build-log parse path from `application` internals (`D-17`).
- Exact response envelope field names beyond required identity of resolved `deployment_uuid` when input was `application_uuid`.
- Exact static capability table `note` strings and precise `coolify_min_version` strings per key (must stay consistent with D-03 / D-05).
- Whether `meta.version` should also emit capabilities (default: **no** — capabilities live on `system.version` only unless research finds a strong compat need).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 24 goal, success criteria, CAP/OBS mapping; v3.2 Coolify 4.1.2-only milestone
- `.planning/REQUIREMENTS.md` — CAP-01, CAP-02, OBS-01
- `.planning/PROJECT.md` — v3.2 Observability & DX goals
- `.planning/STATE.md` — current position Phase 24

### Prior phase context
- `.planning/milestones/v3.1-phases/21-deploy-watch/21-CONTEXT.md` — `deployment.watch`, `include_logs` default false, deployment-tool action pattern
- `.planning/phases/23-openapi-coverage-npm-release/23-CONTEXT.md` — OpenAPI pin / coverage patterns (if present in tree; else milestone copy under `.planning/milestones/v3.1-phases/23-openapi-coverage-npm-release/`)

### OpenAPI / upstream
- `docs/coolify_openapi.json` — pinned Coolify OpenAPI (target 4.1.2)
- `docs/coolify_openapi.yaml` — pinned Coolify OpenAPI YAML
- `docs/COVERAGE.md` / `docs/coverage-map.yaml` / `docs/coverage-overrides.yaml` — coverage rows for logs/deploy watch
- https://github.com/coollabsio/coolify — upstream; `openapi.json` / `openapi.yaml` at repo root per release tag (research note for deferred archive idea)

### Implementation sources
- `src/mcp/tools/system.ts` — `system.version` / `verify` today
- `src/mcp/tools/meta.ts` — `meta.version` + stale `MCP_VERSION`
- `src/mcp/tools/deployment.ts` — `list` / `get` / `cancel` / `watch` (+ `include_logs`)
- `src/mcp/tools/application.ts` — `logs` runtime + build via `deployment_uuid`
- `src/utils/log-helpers.ts` — build-log parse, slice, cap
- `package.json` — canonical `mcpVersion` source

### Conventions
- `.planning/codebase/CONVENTIONS.md` — Zod/action naming, ESM imports
- `.planning/codebase/TESTING.md` — Vitest co-located expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleSystemAction` `version` — extend return shape; today returns `{ version }` from `fetchVersion`
- `handleMetaAction` `version` — keep; align version string to `package.json`
- `deployment` tool flat schema / actionsCatalog — add `logs` action beside `watch`
- `application.logs` build path — reference behavior + keep for back-compat (D-11)
- `src/utils/log-helpers.ts` — preferred reuse for parse/slice/cap (D-17 discretion)
- `fetchDeployment` / deployment list APIs in `src/api/client.ts` — resolve latest by timestamp for `application_uuid`

### Established Patterns
- Flat action schemas via `createFlatActionSchema` + actions catalog strings
- Soft instance routing / shared read params on deployment tool
- Phase 21: new behavior as action on existing domain tool, not new top-level tool
- No stub tools for unsupported Coolify APIs; capability flags tell agents to skip

### Integration Points
- MCP server tool registration for `system` / `deployment` / `meta`
- README EN/DE short note (D-18); optional `deploy` prompt tweak
- Coverage map row for `deployment.logs` when implementing OBS-01

</code_context>

<specifics>
## Specific Ideas

- User considered storing last N Coolify release OpenAPI files from GitHub + CI sync; researched as feasible (~3MB, real path growth 4.1.2→4.2.0) but **too heavy for Phase 24 capability flags** — deferred.
- Semver-only capability gating rejected as unreliable (patch releases often share identical OpenAPI; MCP flags like `deployment_watch` are not OpenAPI paths).
- Lowering package min Coolify version to 4.0.0 considered; OpenAPI paths nearly identical, but no 4.0.0 live UAT — **keep 4.1.2 target**.

</specifics>

<deferred>
## Deferred Ideas

- OpenAPI multi-version archive (last N Coolify tags) + CI sync from `coollabsio/coolify` root `openapi.json`/`openapi.yaml` — for coverage diffs / future version-aware tooling, not runtime CAP-02.
- `incident` MCP prompt + diagnose.logs documentation — Phase 26.
- Application log follow / watch-style polling — Phase 25.
- Service/DB log capabilities (`service_logs`, etc.) — when Coolify 4.2.0+ is the supported target (v3.3 / SVC-04).
- Hard capability enforcement inside tool handlers — explicitly out; soft flags only (D-04).
- Retiring `meta.version` — keep for now (D-06).

</deferred>

---

*Phase: 24-Capabilities & Deployment Logs*
*Context gathered: 2026-07-27*
