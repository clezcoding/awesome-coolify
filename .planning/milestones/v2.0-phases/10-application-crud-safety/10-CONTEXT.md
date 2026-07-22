# Phase 10: Application CRUD & Safety - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can create all five application source types, update configuration, and delete safely — with cross-cutting safety (confirm gates, safe delete defaults, Zod validation, secret masking) as the canonical reference for later CRUD phases. Scope: APP-12–21, SAF-01–04 on the existing `application` MCP tool (extend with create/update/delete/delete_preview). No env-var CRUD (Phase 12). No application Docker Compose create (route to `service` / Phase 11). No GitHub App CRUD (V2-GH). Area “Delete preview / running-app policy” was not discussed — inherit Phase 8 server delete pattern unless research finds a hard API constraint.

</domain>

<decisions>
## Implementation Decisions

### Create source-type surface
- **D-01:** Single `create` action with `source_type` discriminator: `public_git` | `private_deploy_key` | `private_github_app` | `dockerfile` | `dockerimage` — maps internally to the five Coolify POST routes.
- **D-02:** Project + environment both required on create: `project_uuid` XOR `project_name`, plus `environment_name` or environment UUID. Missing → `COOLIFY_VALIDATION_ERROR` with ask-human recovery hint. No silent `production` default.
- **D-03:** Private git refs: `private_key_uuid` / `github_app_uuid` are UUID-only in Phase 10 — no name lookup.
- **D-04:** Curated create payload (required + common optionals). `build_pack: dockercompose` → `COOLIFY_VALIDATION_ERROR` with hint to use `service.create` (Phase 11).

### instant_deploy wait model
- **D-05:** `instant_deploy` defaults to `false`.
- **D-06:** When `instant_deploy: true`, fire-and-forget — return app UUID + deploy queued status; no wait/poll on create. Agent uses existing `deployment.get` / `application.deploy` with `wait: true` to follow.
- **D-07:** On instant deploy, include follow-up hints: `logs_available`-style when `deployment_uuid` known, plus hints for `deployment.get` / `application.deploy` `wait: true`.
- **D-08:** Partial failure (create OK, instant deploy fails to queue): soft success — `ok: true`, app UUID returned, `deploy: { status: 'failed_to_queue', ... }` + recovery hints; **no auto-rollback/delete**.

### Domain conflict / force_domain_override
- **D-09:** No MCP domain preflight — map Coolify HTTP 409 to structured `COOLIFY_409` with `data.conflicts` and recovery hint to retry with `force_domain_override: true`.
- **D-10:** `force_domain_override` on both `create` and `update`; default `false`.
- **D-11:** Override gate is the flag alone — no extra `confirm: true` (`confirm` remains delete-only / SAF-01).
- **D-12:** Keep error code `COOLIFY_409`; domain path uses domain-specific `recoveryHints` + `data.conflicts` passthrough. Distinguish from dependency 409 via `conflicts` vs `dependent_uuids`.

### Update + HTTP basic-auth
- **D-13:** Curated update field set (roadmap: FQDN, build commands, healthcheck, labels + neighbors: name, domains, ports, git fields where relevant) — not near-full OpenAPI passthrough. Researcher sharpens exact allowlist from OpenAPI.
- **D-14:** HTTP basic auth is part of `update` (`is_http_basic_auth_enabled`, `http_basic_auth_username`, `http_basic_auth_password`) — no dedicated `basic_auth` action.
- **D-15:** Credentials caller-supplied only — MCP does not generate passwords.
- **D-16:** Secrets (incl. basic-auth password) always masked in create/update/get responses unless `reveal: true` on that call (SAF-04 / `sanitizeFullProjection`). Username may remain visible.

### Carry-forward (not re-discussed)
- **D-17:** Extend existing `application` tool — no new MCP tool.
- **D-18:** Delete requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED`; optional `delete_preview` (Phase 8/9 parity).
- **D-19:** Safe delete defaults: `delete_volumes=false`, `delete_configurations=false` (SAF-02).
- **D-20:** Zod validates create/update before any API call (SAF-03).
- **D-21:** Mutation identity reuse: `uuid` | `name` | `fqdn` with `COOLIFY_AMBIGUOUS_MATCH` on multi-match (Phase 4).
- **D-22:** `server_uuid` required on create per Coolify API (UUID; resolution details left to research within D-03 spirit for non-app refs).

### Claude's Discretion
- Exact curated field allowlists for create/update (within D-04 / D-13).
- Whether create accepts `server_uuid` only vs `server_uuid` XOR `server_name` with ambiguity errors.
- Delete / `delete_preview` behavior for running apps or dependents — default to Phase 8 server pattern (preview warns, confirm still allowed) unless API forces otherwise.
- How to extract `deployment_uuid` from Coolify create+instant_deploy responses when shape varies.
- Shared helper extraction for confirm/safe-delete/domain-409 vs copy-paste from Phase 8/9 — planner chooses for SAF canonical reuse.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 10 goal + success criteria 1–6 (five source types, update, delete/confirm/safe defaults, domain 409 + force, basic auth + reveal, Zod)
- `.planning/REQUIREMENTS.md` — APP-12–21, SAF-01–04
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; no stub tools
- `.planning/STATE.md` — accumulated decisions (action schema, confirm, masking, ambiguity)
- `.planning/phases/08-keys-server-crud/08-CONTEXT.md` — delete_preview, confirm, soft-success after create, safe delete defaults
- `.planning/phases/09-project-environment-crud/09-CONTEXT.md` — project/env scoping, validation-before-API, 409 patterns

### Spike / API knowledge
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — verified Coolify/MCP patterns entry
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — API surface notes
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint classification
- `docs/coolify_openapi.yaml` — `/applications/public`, `private-github-app`, `private-deploy-key`, `dockerfile`, `dockerimage`; PATCH `/applications/{uuid}`; `force_domain_override`; `instant_deploy`; basic-auth fields; 409 `conflicts`

### Existing implementation patterns to reuse
- `src/mcp/tools/application.ts` — existing get/lifecycle/logs; extend with create/update/delete
- `src/mcp/tools/project.ts` / `src/mcp/tools/server.ts` — create + delete_preview + confirm gates
- `src/api/client.ts` — extend with application CRUD client methods
- `src/utils/deploy-poll.ts` — keep as deploy wait path (not on create)
- `src/utils/diagnose-hints.ts` — `logsAvailableHint` / FollowUpHint pattern for instant_deploy
- `src/utils/errors.ts` — `COOLIFY_409`, `COOLIFY_CONFIRM_REQUIRED`, `mapApiError`, domain-hint override
- `src/utils/projections.ts` — `sanitizeFullProjection` + `reveal` for SAF-04
- `src/mcp/server.ts` — tool registration (application already registered; schema expands)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `application.ts` action `discriminatedUnion` — add create/update/delete/delete_preview branches alongside get/deploy/logs
- `resolveAppMutationUuid` — reuse for update/delete identity
- `pollDeploymentUntilTerminal` / deploy `wait` — agent follow-up path after instant_deploy; do not call from create
- `sanitizeFullProjection(raw, reveal)` — mask basic-auth password and other secrets
- Phase 8/9 `validateDeleteConfirm` + `delete_preview` patterns — copy for SAF-01/02 canonical app delete
- `mapApiError` HTTP 409 → enrich with `conflicts` + domain recoveryHints for APP-21

### Established Patterns
- Action-based Zod schemas; `.strict()` where force flags must not leak onto wrong actions
- Confirm gate only on destructive delete
- Soft success when resource created but side-effect (validate/deploy) fails — keep UUID
- No stub tools; reject unsupported `dockercompose` build_pack at Zod layer

### Integration Points
- Five create POSTs in API client; one MCP `create` dispatcher by `source_type`
- Update PATCH `/applications/{uuid}` with curated body + `force_domain_override`
- Tool description / README action list must gain create/update/delete (docs parity later or in-phase if DIST tests require)
- Tests: extend `application.test.ts` (and client tests) Wave-0 style like Phase 8/9

</code_context>

<specifics>
## Specific Ideas

- User wants recommendations marked on every discuss question; accepted all recommendations for selected areas (1–4).
- Discussion language: German UI; decisions recorded in English for downstream agents (this file).
- `^` on masking question = accept recommendation (always mask unless `reveal: true`).

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- MCP Server für Coolify Cloud erweitern — api/cloud; out of Phase 10
- Custom Skills pro IDE für Coolify — docs; out of scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume app create later)
- Integrate official Coolify OpenAPI specs — docs; out of scope

- Env var CRUD / `.env` sync — Phase 12
- Service/database create — Phase 11
- GitHub App CRUD — V2-GH
- Application Docker Compose create — explicitly out of scope (use service)
- Delete running-app hard-block policy — not discussed; discretionary unless promoted later

</deferred>

---

*Phase: 10-Application CRUD & Safety*
*Context gathered: 2026-07-19*
