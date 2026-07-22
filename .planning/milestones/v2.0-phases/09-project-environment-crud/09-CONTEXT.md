# Phase 9: Project & Environment CRUD - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can create the organizational boundaries (projects + environments) that scope every app, service, and database in later phases. Scope is PROJ-01–05 only: new MCP tools `project` and `environment` (CRUD where API supports), plus `resource.list` extensions for `type=project|environment`. No application/service/database CRUD (Phases 10–11). No env-var sync (Phase 12). No multi-instance. No cascade/force delete of non-empty projects or environments. No environment update (API has create/list/get/delete only — omit update, do not stub).

</domain>

<decisions>
## Implementation Decisions

### Tool surface & discovery
- **D-01:** Two separate MCP tools: `project` and `environment` — not nested environment actions under `project`.
- **D-02:** `project.list` lives on the domain tool (org containers, like `private_key.list` in Phase 8).
- **D-03:** `environment.list` (scoped by project) + `environment.get` on the domain tool.
- **D-04:** Extend `resource.list` `type` enum with `'project' | 'environment'` so Success Criteria #4 holds after create.

### Delete & dependency UX
- **D-05:** Two-stage model: optional `delete_preview`, then `delete` with `confirm: true` (Phase 8 parity). Missing confirm → `COOLIFY_CONFIRM_REQUIRED`.
- **D-06:** Non-empty environment: hard-block with `COOLIFY_409` listing child resource UUIDs; `delete_preview` shows blockers; no force/cascade in Phase 9 (PROJ-05 / Success Criteria #5).
- **D-07:** Project with any remaining environments: hard-block with `COOLIFY_409`; `delete_preview` lists environment UUIDs; agent must delete environments first. “Empty project” = zero environments.
- **D-08:** `delete_preview` is optional/recommended — not session-gated; `confirm: true` is the only hard gate.

### Default environment on project create
- **D-09:** Never silently assume a default environment. If the human has not chosen, the agent must ask: default `production` vs a custom name.
- **D-10:** `project.create` requires `initial_environment` (string: `"production"` or custom name). Missing → `COOLIFY_VALIDATION_ERROR` with recovery hint to ask the user. After create, MCP ensures that environment exists (create via API if Coolify did not auto-create it).
- **D-11:** Create response returns project + initial environment (`{ project, environment, environments? }`) so Phase 10 has an env UUID immediately.

### Scoping / name resolution
- **D-12:** Environment actions accept `project_uuid` XOR `project_name`; name multi-match → `COOLIFY_AMBIGUOUS_MATCH`, no mutation (Phase 5 pattern).
- **D-13:** Environment get/delete accept `uuid` | `name` within the parent project scope; parent always required.
- **D-14:** Project get/update/delete/delete_preview accept `uuid` XOR `name`; multi-match → `COOLIFY_AMBIGUOUS_MATCH`.
- **D-15:** Duplicate environment name on create → `COOLIFY_409` with recovery hint (existing UUID if known); no auto-overwrite / idempotent create-as-get.

### Claude's Discretion
- **API auto-env after project create:** Researcher must verify live Coolify 4.1.x behavior (does create always spawn `production`?). Planner picks the safe sync path. Hard constraint from discussion: never auto-delete unsolicited environments — only ensure `initial_environment` exists; surface extras in `environments[]` + notice if needed.
- Exact Zod field names / XOR superRefine shape for identifiers — follow existing mutation resolver patterns.
- Whether MCP pre-checks emptiness client-side vs mapping Coolify errors — either OK if D-06/D-07 semantics hold.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 9 goal + success criteria 1–5 (`project` / `environment` tools, confirm, 409 on non-empty env)
- `.planning/REQUIREMENTS.md` — PROJ-01–05
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; single-env auth; no stub tools
- `.planning/STATE.md` — accumulated decisions (action schema, confirm gates, 409, ambiguity)
- `.planning/phases/08-keys-server-crud/08-CONTEXT.md` — Phase 8 delete_preview / list patterns to mirror

### Spike / API knowledge
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — entry point for verified Coolify/MCP patterns
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — API surface notes
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint EXISTS/ABSENT classification
- `docs/coolify_openapi.yaml` — `/projects`, `/projects/{uuid}`, `/projects/{uuid}/environments`, environment get/delete by name_or_uuid (no environment PATCH)

### Existing implementation patterns to reuse
- `src/api/client.ts` — `fetchProjects` / `fetchProject` (extend with project/env CRUD)
- `src/mcp/tools/private_key.ts` / `src/mcp/tools/server.ts` — domain CRUD + `delete_preview` + confirm gates
- `src/mcp/tools/resource.ts` — extend list `type` enum; `buildProjectEnvironmentIndex` already used
- `src/utils/project-lookup.ts` — project/environment index for projections
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `COOLIFY_409`, `COOLIFY_AMBIGUOUS_MATCH`, validation errors
- `src/mcp/server.ts` — tool registration for new `project` / `environment` tools

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchProjects` / `fetchProject` in `src/api/client.ts` — add create/update/delete + environment list/create/delete/get
- `private_key` / `server` handlers — copy action discriminatedUnion, confirm, delete_preview patterns
- `buildProjectEnvironmentIndex` / `projectResourceSummary` — discovery already project-aware
- `buildReadResponse` + shared read params — list/get envelopes
- `COOLIFY_409` + dependency listing from Phase 8 key/server delete

### Established Patterns
- Action-based `discriminatedUnion` Zod schemas per tool
- Confirm gate → `COOLIFY_CONFIRM_REQUIRED`
- Mutation identity: uuid|name with `COOLIFY_AMBIGUOUS_MATCH` (no mutation on multi-match)
- Domain `.list` for org/security objects; `resource.list` for discoverable types
- No stub tools for missing API endpoints (no `environment.update`)

### Integration Points
- Register `project` and `environment` in `registerCoolifyTools` (`src/mcp/server.ts`)
- Extend `resourceActionSchema` list `type` enum with `'project' | 'environment'`
- Wire emptiness checks / 409 envelopes consistently with Phase 8
- Tests beside handlers (`project.test.ts`, `environment.test.ts`)

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants the agent to **ask the human** when no environment preference is given: default `production` vs custom name — enforced via required `initial_environment` on `project.create` (not soft docs-only).
- Prefer recommendations on each discuss question; one intentional product override vs silent API defaults: ask-user for initial environment.
- Phase 12 “environment variables” is a different tool/domain — naming `environment` for Coolify environments is intentional and OK.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify — docs; out of Phase 9 scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- MCP Server für Coolify Cloud erweitern — api/cloud; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume Phase 9 tools later)

- Force/cascade delete of non-empty project or environment — explicitly out of Phase 9
- Environment update action — no Coolify API PATCH; omit (not stub)
- Application/service/database CRUD — Phases 10–11
- Env var CRUD / `.env` sync — Phase 12
- Multi-instance / `instances.json` — later v2.x

</deferred>

---

*Phase: 9-Project & Environment CRUD*
*Context gathered: 2026-07-17*
