# Phase 11: Service & Database CRUD - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can deploy multi-container stacks as custom/one-click services and provision managed databases across 8 engines — with transparent base64 compose encoding, public access toggles, and safe delete defaults. Scope: SVC-06–10, DB-01–04 on the existing `service` and `database` MCP tools (extend with create/update/delete/delete_preview). No env-var CRUD (Phase 12). No database backup schedules (Phase 13). No service/DB logs (SVC-04 / v1.1). No application Docker Compose create (already routed to `service` in Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Service create surface
- **D-01:** Single `create` action with discriminator: one-click `type` XOR compose input (`compose` / `compose_file`) — maps to Coolify `POST /services`.
- **D-02:** Optional `urls[]` of `{ name, url }` on create (OpenAPI-shaped); domains also settable later via update. Not required for compose create.
- **D-03:** Create scoping mirrors Phase 10 applications: `server_uuid` required; `project_uuid` XOR `project_name`; `environment_name` or environment UUID; no silent `production` default — missing → `COOLIFY_VALIDATION_ERROR` with ask-human hint.

### Compose I/O (SVC-07)
- **D-04:** Compose input accepts **either** inline YAML (`compose` string) **or** local `compose_file` path — XOR, exactly one when creating/updating via compose path.
- **D-05:** MCP field name is `compose` (YAML). Coolify `docker_compose_raw` is internal only after base64 encode; agent never sees or supplies base64.
- **D-06:** `service.get` / create/update responses always return **decoded YAML** in `compose` (or equivalent projection field) — never base64.
- **D-07:** Light validation before API: non-empty + parseable YAML; invalid → `COOLIFY_VALIDATION_ERROR`. No full Compose schema enforcement.

### Database create surface
- **D-08:** Single `create` action with `engine` discriminator: `postgresql` | `mysql` | `mariadb` | `mongodb` | `redis` | `clickhouse` | `dragonfly` | `keydb` — maps internally to the eight Coolify POST routes.
- **D-09:** Credentials/passwords are **caller-supplied only** — MCP does not generate secrets. Responses mask passwords/connection strings unless `reveal: true` (SAF-04).
- **D-10:** Database create scoping same as services/apps (D-03). Connection strings and secrets always masked by default on get/create/update unless `reveal: true`.

### Instant deploy & public access
- **D-11:** `instant_deploy` defaults to **`true`** for service and database create (intentional product override vs Phase 10 apps default `false`). Wait model remains **fire-and-forget** — return UUID + start/deploy queued status + follow-up hints; no wait/poll until running. Agent uses existing `start`/`restart`/`deploy` for follow-up.
- **D-12:** Enabling public access on **database create** (`is_public: true` and related port fields) requires `confirm: true`; default remains private. Missing confirm → `COOLIFY_CONFIRM_REQUIRED`. (Exception to delete-only confirm pattern — security-sensitive exposure.)
- **D-13:** Partial failure (create OK, instant start/deploy fails to queue): soft success — `ok: true`, UUID returned, `deploy`/`start: { status: 'failed_to_queue', ... }` + recovery hints; **no auto-rollback/delete**.

### Carry-forward (not re-discussed)
- **D-14:** Extend existing `service` and `database` tools — no new MCP tools.
- **D-15:** Delete requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED`; optional `delete_preview` (Phase 8/9/10 parity).
- **D-16:** Safe delete defaults: `delete_volumes=false`, `delete_configurations=false`, `docker_cleanup=false` (SAF-02).
- **D-17:** Zod validates create/update before any API call (SAF-03).
- **D-18:** Mutation identity reuse: `uuid` | `name` with `COOLIFY_AMBIGUOUS_MATCH` on multi-match.
- **D-19:** Domain conflict on service create/update: map Coolify HTTP 409 → structured `COOLIFY_409` with `data.conflicts` + recovery hint to retry with `force_domain_override: true` (SVC-10 / Phase 10 APP-21 parity). Override gate is the flag alone — no extra confirm (`confirm` remains delete + D-12 public-create).
- **D-20:** Service `update` may change compose/configuration using the same compose I/O rules (D-04–D-07); curated non-compose fields left to research within Phase 10 update spirit.

### Claude's Discretion
- One-click `type` constraint: free string + examples vs curated Zod enum — researcher verifies Coolify/OpenAPI type list and planner picks maintainable path (prefer free string if list is large/unstable).
- Exact curated field allowlists for service update and per-engine database create/update — researcher builds from OpenAPI; keep curated (not near-full passthrough) unless API forces otherwise.
- Whether enabling `is_public: true` on **database update** needs `confirm: true` (mirror D-12) or flag-alone (like `force_domain_override`) — planner chooses; document in plan.
- Shared helper extraction for base64 compose encode/decode, confirm/safe-delete, domain-409 vs copy from Phase 10 — planner chooses for reuse.
- Whether databases expose `instant_deploy` under that exact Coolify field name or map to start-after-create — researcher verifies API per engine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 11 goal + success criteria 1–6 (one-click + compose create, transparent base64, update/delete, 8 engines, public access, domain 409)
- `.planning/REQUIREMENTS.md` — SVC-06–10, DB-01–04; SAF-01–04 continuity
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; no stub tools
- `.planning/STATE.md` — accumulated decisions (action schema, confirm, masking, soft success)
- `.planning/phases/10-application-crud-safety/10-CONTEXT.md` — create discriminator, scoping, domain 409, soft success, curated payloads (apps default `instant_deploy: false` — Phase 11 overrides per D-11)
- `.planning/phases/09-project-environment-crud/09-CONTEXT.md` — project/env scoping, validation-before-API
- `.planning/phases/08-keys-server-crud/08-CONTEXT.md` — delete_preview, confirm, PEM/`key_file` XOR pattern (mirror for `compose`/`compose_file`)

### Spike / API knowledge
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — verified Coolify/MCP patterns entry
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — API surface notes
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint classification
- `docs/coolify_openapi.yaml` — `POST /services` (`type`, `docker_compose_raw`, `urls`, `force_domain_override`, `instant_deploy`); `PATCH/GET/DELETE /services/{uuid}`; `POST /databases/{engine}` ×8; `is_public` / `public_port`; database PATCH/DELETE

### Existing implementation patterns to reuse
- `src/mcp/tools/service.ts` — existing get/start/stop/restart/deploy; extend with create/update/delete/delete_preview
- `src/mcp/tools/database.ts` — existing get/start/stop/restart; extend with create/update/delete/delete_preview
- `src/mcp/tools/application.ts` — create discriminator, domain 409, soft success, curated update, confirm/safe-delete
- `src/mcp/tools/private_key.ts` — XOR file-path vs inline content pattern for `compose_file`
- `src/api/client.ts` — extend with service/database CRUD client methods
- `src/utils/errors.ts` — `COOLIFY_409`, `COOLIFY_CONFIRM_REQUIRED`, `mapApiError`
- `src/utils/projections.ts` — `sanitizeFullProjection` + `reveal` for SAF-04
- `src/mcp/server.ts` — tools already registered; schemas expand

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `service.ts` / `database.ts` action `discriminatedUnion` — add create/update/delete/delete_preview alongside lifecycle actions
- Application create dispatcher by `source_type` — template for service `type` XOR compose and database `engine`
- Phase 8 `key_file` XOR inline — template for `compose_file` XOR `compose`
- `sanitizeFullProjection(raw, reveal)` — mask DB passwords/connection strings
- Phase 10 domain-409 + `force_domain_override` wiring — reuse for SVC-10
- `validateDeleteConfirm` / `delete_preview` patterns from app/server/project

### Established Patterns
- Action-based Zod schemas; `.strict()` where force/confirm flags must not leak onto wrong actions
- Confirm gate primarily on destructive delete; Phase 11 adds confirm for public DB create (D-12)
- Soft success when resource created but side-effect (start/deploy) fails — keep UUID
- Transparent transforms at MCP boundary (base64 compose) — agent sees friendly shape only
- No stub tools; absent endpoints omitted

### Integration Points
- One `POST /services` for both one-click and custom compose; eight `POST /databases/{engine}` routes
- Encode/decode helper for `docker_compose_raw` ↔ YAML `compose`
- Tool descriptions / README action lists must gain create/update/delete
- Tests: extend `service.test.ts` / `database.test.ts` (+ client tests) Wave-0 style like Phases 8–10
- Lightweight YAML parse dependency or existing util — researcher/planner picks (may add small dependency if none exists)

</code_context>

<specifics>
## Specific Ideas

- User wants recommendations marked on every discuss question; discussion language German; decisions recorded in English for downstream agents (this file).
- Intentional product overrides vs Phase 10 apps: **`instant_deploy` default `true`** for services/DBs; **`confirm: true` required to create a publicly exposed database**.
- Todos matching Phase 11 keyword search were reviewed and explicitly not folded (`none`).

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- MCP Server für Coolify Cloud erweitern — api/cloud; out of Phase 11
- Custom Skills pro IDE für Coolify — docs; out of scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume service/DB create later)
- Integrate official Coolify OpenAPI specs — docs; out of scope

- Env var CRUD / `.env` sync — Phase 12
- Database backup schedules — Phase 13
- Service/DB bounded logs (SVC-04) — v1.1
- Application Docker Compose create — already out of scope (use service)

</deferred>

---

*Phase: 11-Service & Database CRUD*
*Context gathered: 2026-07-19*
