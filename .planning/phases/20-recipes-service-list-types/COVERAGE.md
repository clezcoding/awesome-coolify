# API Coverage — Phase 20 Recipes & Service List-Types

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 20 introduces a **new MCP tool** `recipe` with three actions
(`create-git-app`, `create-app-db`, `create-one-click`) and a **new action**
`service.list-types` on the existing `service` tool. It integrates two
external surfaces:

1. **Coolify REST API** (v4.1.x) — application/database/service create, env
   bulk-update, database fetch (for `internal_db_url`), version fetch, deploy
   triggers.
2. **service-templates.json CDN** — jsDelivr (primary) + GitHub Raw (fallback)
   for dynamic one-click service type discovery.

The API-Coverage gate fires on MCP + API wiring terms in phase docs, so this
matrix records the integrate/opt-out decisions for the Phase 20 surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| `service.list-types` action (slim { id, label }[] from CDN) | INTEGRATE | RECIPE-01; D-01, D-04 |
| `fetchServiceTemplates(env)` helper (CDN + GitHub Raw fallback) | INTEGRATE | D-01, D-02, D-03 |
| Version pinning via `fetchVersion` (Coolify API) | INTEGRATE | D-02; src/api/client.ts:96 |
| Hard error `COOLIFY_FETCH_TEMPLATES_FAILED` on double fetch failure | INTEGRATE | D-03; no static fallback |
| Hard error on empty `{}` CDN response | INTEGRATE | D-03; specless empty-input resolution |
| Stable sort of type IDs by id | INTEGRATE | specless ordering resolution |
| `recipe` MCP tool (new registerTool) | INTEGRATE | D-05, D-08 |
| `recipe.create-git-app` action (build_pack detection + app create) | INTEGRATE | RECIPE-02; D-09–D-12 |
| `recipe.create-app-db` action (DB + app + env wiring) | INTEGRATE | RECIPE-03; D-13–D-16 |
| `recipe.create-one-click` action (type validation + service.create) | INTEGRATE | RECIPE-04; D-07 |
| `detectBuildPack(repoPath)` local heuristic (Dockerfile → dockerfile, else nixpacks) | INTEGRATE | D-09, D-10 |
| `build_pack=dockercompose` reject on create-git-app with hint to service.create | INTEGRATE | D-12 |
| Engine-dispatched DB create (8 engines via create&lt;Engine&gt;Database) | INTEGRATE | RECIPE-03; src/api/client.ts:404-474 |
| `internal_db_url` read from GET /databases/{uuid} | INTEGRATE | D-14; src/api/client.ts:354 |
| Engine-specific fallback URL construction when internal_db_url absent | INTEGRATE | D-14; RESEARCH Pitfall 2 |
| `bulkUpdateEnvs('application', ...)` for DATABASE_URL wiring | INTEGRATE | D-13; src/api/client.ts bulkUpdateEnvs |
| `sanitizeFullProjection` masks connection_string unless reveal:true | INTEGRATE | D-19, T-20-01 |
| `COOLIFY_RECIPE_PARTIAL_FAILURE` with created UUIDs in error.data | INTEGRATE | D-15; no auto-rollback |
| `instant_deploy` defaults true on all recipe creates | INTEGRATE | D-16 |
| No confirm gate on recipe creates | INTEGRATE | D-17 |
| No dry-run / preview action | INTEGRATE | D-18 |
| Soft instance routing (optional instance param) | INTEGRATE | D-20 |
| `recipeActionsCatalog` + `recipeSafetyFooter` co-located in recipe.ts | INTEGRATE | D-05, D-08; Phase 19 flat-schema pattern |
| `withInstanceRoutingSchema(recipeActionSchema)` at MCP boundary | INTEGRATE | Phase 19 D-01/D-02 |
| README documentation (EN + DE if parity convention) | INTEGRATE | DX; Phase 19 parity convention |
| Coolify REST: POST /applications (createPublicApplication) | INTEGRATE | RECIPE-02, RECIPE-03; src/api/client.ts:258 |
| Coolify REST: POST /databases/{engine} (8 engine posters) | INTEGRATE | RECIPE-03; src/api/client.ts:404-474 |
| Coolify REST: GET /databases/{uuid} (fetchDatabase for internal_db_url) | INTEGRATE | D-14; src/api/client.ts:354 |
| Coolify REST: POST /applications/{uuid}/deploy (triggerDeploy) | INTEGRATE | D-16; instant_deploy path |
| Coolify REST: POST /databases/{uuid}/start (triggerDatabaseStart) | INTEGRATE | D-16; instant_deploy path |
| Coolify REST: POST /services (createService for one-click) | INTEGRATE | RECIPE-04; D-07; src/api/client.ts:364 |
| Coolify REST: GET /version (fetchVersion for CDN pin) | INTEGRATE | D-02; src/api/client.ts:96 |
| Coolify REST: env bulk-update (bulkUpdateEnvs) | INTEGRATE | D-13; src/api/client.ts |
| CDN: jsDelivr service-templates.json (primary) | INTEGRATE | D-01; cdn.jsdelivr.net/gh/coollabsio/coolify@<version>/templates/service-templates.json |
| CDN: GitHub Raw service-templates.json (fallback) | INTEGRATE | D-01; raw.githubusercontent.com/coollabsio/coolify/<version>/templates/service-templates.json |
| Bundled/static service-templates.json in package | OPT-OUT | D-03; REQUIREMENTS out-of-scope "Own YAML/stack template catalog" — forks drift |
| User-supplied template URL accepted | OPT-OUT | D-01, T-20-02; SSRF mitigation — hardcoded CDN/GitHub hosts only |
| Auto-rollback on partial failure | OPT-OUT | D-15; returns created UUIDs + recoveryHints instead |
| Confirm gate on recipe creates | OPT-OUT | D-17; create is intentional, confirm stays for destructive ops only |
| Dry-run / preview action on recipe | OPT-OUT | D-18; not in Phase 20 scope |
| Richer list-types metadata (categories/tags) | OPT-OUT | D-04; deferred post-v3.1 per CONTEXT.md |
| Hard manifest requirement for recipes | OPT-OUT | D-20; soft instance routing only — wizard owns hard manifest in Phase 22 |
| `deployment.watch` implementation | OPT-OUT | deferred to Phase 21 per ROADMAP |
| Setup wizard / IDE skill packs | OPT-OUT | deferred to Phase 22 per ROADMAP |
| OpenAPI coverage map | OPT-OUT | deferred to Phase 23 per ROADMAP |
| Live Coolify REST changes for create-app-db env wiring | OPT-OUT | uses existing bulkUpdateEnvs + fetchDatabase — no new endpoints |
| New npm packages | OPT-OUT | all dependencies (ofetch, zod, @modelcontextprotocol/server) already pinned per RESEARCH Package Legitimacy Audit |

---

*Authored: 2026-07-24 — Phase 20 plan-phase API coverage checkpoint*
