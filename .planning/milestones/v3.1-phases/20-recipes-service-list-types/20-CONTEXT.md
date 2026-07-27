# Phase 20: Recipes & Service List-Types - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent discovers Coolify one-click service types dynamically via `service.list-types` (no hand-maintained YAML catalog) and runs three recipes end-to-end through a dedicated `recipe` MCP tool: git-backed application create with build_pack detection (`create-git-app`), application + database with env wiring (`create-app-db`), and one-click service create from a listed type (`create-one-click`). No setup wizard, no IDE skills packs, no `deployment.watch` implementation.

</domain>

<decisions>
## Implementation Decisions

### list-types Data Source
- **D-01:** Primary source is the official Coolify `service-templates.json` fetched at runtime via `ofetch` (CDN/GitHub) — not Instance REST-first.
- **D-02:** Pin template fetch to the active instance Coolify version when known; fall back to latest if version unavailable.
- **D-03:** Offline / fetch failure → hard error with `recoveryHints` — no bundled/static catalog in the package.
- **D-04:** `list-types` response is slim: type IDs + short labels only (no full compose/template payload, no category/tag bloat in v3.1).

### Recipe Surface
- **D-05:** New MCP tool `recipe` (not prompts-only orchestration; not actions bolted onto `service`/`application`).
- **D-06:** Exact action names: `create-git-app`, `create-app-db`, `create-one-click` (longer names than REQUIREMENTS recipe labels; REQUIREMENTS labels remain product language).
- **D-07:** `create-one-click` is a thin wrapper: validate `type` against `list-types`, then call through to existing `service.create` path.
- **D-08:** Handlers live in `src/mcp/tools/recipe.ts`, registered like other domain tools (flat schema + co-located actionsCatalog per Phase 19).

### git-app Detection
- **D-09:** Detect `build_pack` locally with optional override param `build_pack?`.
- **D-10:** Minimal heuristics: `Dockerfile` / `Dockerfile.*` → `dockerfile`; otherwise default `nixpacks`.
- **D-11:** Detection uses local workspace path (`repo_path`); Git remote URL is for Coolify create params. If no local path → `build_pack` is required.
- **D-12:** `build_pack=dockercompose` on application path → reject with hint to `service.create` / `create-one-click` (same posture as existing application tool).

### app+db Wiring & Failure
- **D-13:** Default env key `DATABASE_URL`; optional override `env_key?`.
- **D-14:** Prefer reading connection string back from Coolify after DB create; if API does not expose it, construct from create params — researcher must verify Coolify 4.1.x behavior.
- **D-15:** Partial failure → no auto-rollback; return created UUIDs + structured error / recoveryHints (aligned with app-create soft-success posture).
- **D-16:** `instant_deploy?` on recipe creates; default `true` (matches existing `service.create`).

### Safety
- **D-17:** No `confirm` gate on recipe create actions — create is intentional; `confirm` stays for destructive ops only.
- **D-18:** No dry-run / preview action in Phase 20.
- **D-19:** Secrets (connection strings) masked by default; `reveal: true` to unmask (same as env tools).
- **D-20:** Soft instance routing: optional `instance?` + soft manifest hints in errors — no hard manifest requirement (wizard owns that in Phase 22).

### Claude's Discretion
- Exact CDN/URL strategy and version-tag mapping for `service-templates.json` (within D-01/D-02).
- Internal reuse vs duplicate of `service.create` / `application.create` / env bulk helpers (as long as D-07 and atomic tool contracts hold).
- Precise error codes / recoveryHints wording for fetch fail, missing `build_pack`, and partial app+db failure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 20 goal, success criteria, deps on Phase 19
- `.planning/REQUIREMENTS.md` — RECIPE-01–04; out-of-scope: own YAML/stack template catalog
- `.planning/PROJECT.md` — v3.1 recipes over template forks; `reveal` opt-in; no stub tools
- `.planning/STATE.md` — current milestone position

### Research (v3.1)
- `.planning/research/SUMMARY.md` — Recipes & list-types phase rationale; ofetch + service-templates.json
- `.planning/research/STACK.md` — `ofetch` + CDN path for `service-templates.json`
- `.planning/research/FEATURES.md` — Service Type Discovery; reject self-hosted compose catalog
- `.planning/research/PITFALLS.md` — Stale YAML Recipe Duplication; prefer dynamic catalog
- `.planning/research/ARCHITECTURE.md` — `service.list-types` on service tool (superseded for recipes by D-05/D-08 — new `recipe` tool; list-types may still extend `service`)

### Prior phase context
- `.planning/phases/19-dx-schemas-mcp-prompts/19-CONTEXT.md` — flat schemas, actionsCatalog, confirm/reveal footer, soft manifest (D-01–D-16 there)

### Spike findings
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; action-based tools; Coolify 4.1.x target
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint existence for service/app/db create

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Zod naming, file layout, conventional commits
- `.planning/codebase/TESTING.md` — test expectations for tool/schema changes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/mcp/tools/service.ts` — one-click `create` with `type` XOR compose; lifecycle; env CRUD — target for `list-types` action + `create-one-click` reuse
- `src/mcp/tools/application.ts` — git/public/dockerfile create + `build_pack` validation (incl. dockercompose reject)
- `src/mcp/tools/database.ts` — database create/lifecycle
- Env bulk-update / create paths on application (and service) — wiring `DATABASE_URL` for `create-app-db`
- `src/mcp/tools/shared-read-params.ts` — instance routing helpers for flat schemas
- `ofetch` already in dependencies — fetch `service-templates.json`

### Established Patterns
- Flat Zod object + per-action refine (Phase 19) — apply to `recipe` and any new `service.list-types`
- Action catalog strings co-located in tool file; safety footer (`confirm` / `instance` / `reveal`)
- Structured errors via `wrapMcpError` / `COOLIFY_VALIDATION_ERROR` + `recoveryHints`
- No hand-maintained compose YAML in repo

### Integration Points
- Register `recipe` in `registerCoolifyTools` alongside existing domain tools
- Add `list-types` action to `service` tool (RECIPE-01 surface) unless researcher finds better home — CONTEXT locks slim list response (D-04), not which file owns the action (prefer `service` for discoverability next to `create`)
- Phase 22 wizard/skills will call `list-types` + recipe actions

</code_context>

<specifics>
## Specific Ideas

- REQUIREMENTS recipe labels (`git-app`, `app+db`, `one-click`) stay as product language; MCP action names are the longer forms in D-06
- Research STACK CDN URL (`cdn.jsdelivr.net/gh/coollabsio/coolify@…/templates/service-templates.json`) is a starting point — pin by instance version per D-02
- Research SUMMARY mentioned local static fallback — **rejected** by D-03 in favor of hard fail
- FEATURES/PITFALLS “query instance REST” vs STACK “CDN ofetch” — discussion locked CDN primary (D-01); researcher may still note if a native list endpoint appears on newer Coolify

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify → Phase 22 (SKILL-*)
- Lokale Projekt-Manifest-Datei → already v3.0 / manifest tooling
- Standard-Setup Tool für neue Coolify-Projekte → Phase 22 (SETUP-*)
- Integrate official Coolify OpenAPI specs → Phase 23 (OAPI-*)

- Setup wizard / IDE skill packs → Phase 22
- `deployment.watch` implementation → Phase 21
- Richer list-types metadata (categories/tags) → post-v3.1 if needed
- Dry-run / recipe preview → not in Phase 20
- Hard manifest requirement for recipes → Phase 22 wizard

</deferred>

---

*Phase: 20-Recipes & Service List-Types*
*Context gathered: 2026-07-24*
