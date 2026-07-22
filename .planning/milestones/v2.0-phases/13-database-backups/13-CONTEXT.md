# Phase 13: Database Backups - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can configure, list, update, delete, and trigger database backup schedules — and inspect execution history — for any database created in Phase 11. Scope: BAK-01–06 + SAF-04 continuity on the existing `database` MCP tool (extend with `backup:*` actions). No env-var CRUD (Phase 12). No backup execution delete, restore/import, or S3 storage destination CRUD (v2.x+). No service/application backups. No new top-level MCP tool.

</domain>

<decisions>
## Implementation Decisions

### Tool surface & action names
- **D-01:** Extend existing `database` tool — no dedicated `backup` MCP tool.
- **D-02:** Action namespace uses colon-prefix `backup:*` mirroring Phase 12 `envs:*`: `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history` (ROADMAP success criteria 1–5 / BAK-01–06).
- **D-03:** Parent database identity reuses Phase 11 resolver: `uuid` | `name` with `COOLIFY_AMBIGUOUS_MATCH` on multi-match. Backup schedule ops require `scheduled_backup_uuid` (Coolify path param). No fuzzy backup-name lookup in v1 of this phase.

### Schedule create & update payload
- **D-04:** `frequency` accepts OpenAPI named presets (`every_minute`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`) **or** a cron expression string — pass through to Coolify as-is after Zod validation.
- **D-05:** `enabled` defaults `true` on create. Retention fields (`database_backup_retention_*` local and S3) are optional; schema documents OpenAPI semantics; no MCP-invented defaults beyond what Zod requires for create (`frequency` required per OpenAPI).
- **D-06:** S3 is optional: `save_s3` (default `false`) + `s3_storage_uuid` required when `save_s3: true`. Expose curated OpenAPI retention/S3 fields on create/update — not a blind passthrough of the entire backup object.
- **D-07:** Optional `backup_now: true` on `backup:create` is supported (OpenAPI field) in addition to the dedicated `backup:now` action — agent can create-and-run in one call when desired.

### Confirm gates & destructive defaults
- **D-08:** `backup:delete` requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED` (BAK-04 / SAF-01).
- **D-09:** `delete_s3` query param on delete defaults **`false`**. When caller sets `delete_s3: true`, deletion still requires `confirm: true` — purging S3 artifacts is treated as destructive (safe default: config-only delete).
- **D-10:** `backup:create`, `backup:update`, `backup:now`, `backup:list`, `backup:history` do **not** require confirm (read + schedule config + on-demand trigger).
- **D-11:** Backup **execution** delete (`DELETE .../executions/{execution_uuid}`) is **out of scope** — not in BAK-01..06; defer to v2.x+ (mcp_features §15 lists it for parity but this phase stops at history list).

### Trigger & history semantics
- **D-12:** `backup:now` maps to Coolify `PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}` with `{ backup_now: true }` — there is no separate “trigger backup” endpoint in OpenAPI.
- **D-13:** `backup:now` requires parent database identity (`uuid`|`name`) **and** `scheduled_backup_uuid`; response surfaces job/execution reference fields returned by the API (BAK-05).
- **D-14:** `backup:history` calls `GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions`; projection includes per-run `status`, timestamps, and `size` (and other non-secret fields from API) per BAK-06.

### Masking, reveal & logging
- **D-15:** S3-related secrets and credential-like fields in backup configuration responses are masked (`***`) unless `reveal: true` on that call (SAF-04 / ROADMAP criterion 6). Keys, UUIDs, frequency, retention counts, and execution metadata remain visible.
- **D-16:** Product policy (carry-forward Phase 12 D-15): agent must **ask the human** before using `reveal: true`; surface `ask_human_reveal` recovery hint — never auto-set reveal.
- **D-17:** Stderr, error payloads, and structured logs never include plaintext S3 secrets — reuse `redactSecrets` (Phase 12 continuity).

### Carry-forward (not re-discussed)
- **D-18:** Zod validates payloads before any API call (SAF-03).
- **D-19:** No stub tools for endpoints absent on target Coolify version (PROJECT.md).
- **D-20:** Restore / import-from-backup is **out of scope** — UI/docs mention restoration but BAK reqs stop at schedule + execution history.

### Claude's Discretion
- Exact projection shape for `backup:list` GET response — OpenAPI stub says “Content is very complex”; researcher must verify live 4.1.x JSON and planner defines stable agent-facing fields.
- Curated allowlist for `backup:update` PATCH body vs minimal frequency/retention-only — prefer curated OpenAPI fields like Phase 10/11 updates.
- Explicit backup-config mask helper vs extending `sanitizeFullProjection` — planner picks; must cover S3 credential fields even if generic sanitizer misses them.
- Shared `src/api/client.ts` backup CRUD methods + optional `backup-shared.ts` helper (mirror `env-shared.ts`) vs inline handlers — planner chooses for reuse.
- Pagination on execution history if API returns large arrays — default unpaginated unless research shows need; cap via existing `max_chars` / projection trim if required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 13 goal + success criteria 1–6 (backup CRUD, now, history, S3 masking)
- `.planning/REQUIREMENTS.md` — BAK-01–06; SAF-04 continuity
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; secret masking; no stub tools
- `.planning/STATE.md` — accumulated decisions (action schema, confirm, masking, ask-human patterns)
- `.planning/phases/11-service-database-crud/11-CONTEXT.md` — database tool extension, uuid|name resolver, confirm/safe-delete, instant_deploy soft success
- `.planning/phases/12-environment-variables-smart-sync/12-CONTEXT.md` — colon action namespace (`envs:*`), masking, ask_human_reveal, confirm on destructive ops
- `.planning/phases/10-application-crud-safety/10-CONTEXT.md` — SAF-01–04, curated update payloads, reveal policy

### API knowledge
- `docs/coolify_openapi.yaml` — `GET/POST /databases/{uuid}/backups`; `PATCH/DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}`; `GET .../executions`; fields `frequency`, `save_s3`, `s3_storage_uuid`, retention_*, `backup_now`, `delete_s3`
- `mcp_features.md` §15 — parity checklist vs CLI / coolify-backup-mcp (executions delete deferred)
- `src/mcp/tools/docs.ts` — static backup UX blurb for agent discovery (not API contract)

### Existing implementation patterns to reuse
- `src/mcp/tools/database.ts` — extend with `backup:*` actions alongside lifecycle + `envs:*`
- `src/mcp/tools/env-shared.ts` — confirm/mask/reveal helper patterns (adapt for backup config)
- `src/api/client.ts` — add backup schedule + execution client methods
- `src/utils/projections.ts` — `sanitizeFullProjection` + `reveal`
- `src/utils/redact.ts` — `redactSecrets`
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `COOLIFY_AMBIGUOUS_MATCH`, `COOLIFY_VALIDATION_ERROR`, ask-human recovery hints
- `src/mcp/server.ts` — tool descriptions must gain `backup:*` action literals

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `database.ts` action `discriminatedUnion` — add `backup:*` branches next to `envs:*` and lifecycle actions
- `resolveDatabaseMutationUuid` — parent DB lookup for all backup actions
- `validateDeleteConfirm` / confirm patterns from delete handlers — template for `backup:delete` + `delete_s3`
- `maskEnvRecord` / `withRevealRecoveryHints` — template for backup config secret masking
- `sanitizeFullProjection(raw, reveal)` — baseline SAF-04 masking on responses

### Established Patterns
- Colon-namespaced actions on domain tools (`envs:*` → `backup:*`)
- Confirm gate on destructive delete; safe defaults on destructive query flags (`delete_s3` default false)
- Ask-human before `reveal: true` on secrets
- Zod `.strict()` action schemas; no confirm/reveal leaking onto read actions
- Wave-0 `it.fails` RED scaffolds in `database.test.ts` + client tests

### Integration Points
- Coolify routes under `/databases/{uuid}/backups` and nested `scheduled_backup_uuid` paths
- `backup:now` implemented via PATCH `backup_now: true` (no standalone trigger route)
- Tool descriptions / README EN+DE parity must list six `backup:*` actions
- Tests: extend `database.test.ts` + `client` tests — masking, confirm gates, frequency validation, history projection

</code_context>

<specifics>
## Specific Ideas

- `--auto --all` discuss: all gray areas auto-selected; Claude chose recommended defaults (first/recommended option per area).
- Discussion language German in workflow; decisions recorded in English for downstream agents (this file).
- Carry-forward strong product preference: **human in the loop** for revealing S3/backup secrets (`reveal: true`) — not silent automation.
- Intentional scope cut: execution delete + restore + S3 destination CRUD deferred — Phase 13 delivers BAK-01..06 only.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify — docs; out of scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- MCP Server für Coolify Cloud erweitern — api/cloud; out of scope
- Integrate official Coolify OpenAPI specs — docs; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume backup actions later)

- Backup execution delete — v2.x+ (OpenAPI exists; not in BAK reqs)
- Restore / import from backup — v2.x+ / UI-only today
- S3 storage destination CRUD — v2.x+ (only `s3_storage_uuid` reference on schedules)
- Service/application backup schedules — out of scope (database-only phase)

</deferred>

---

*Phase: 13-Database Backups*
*Context gathered: 2026-07-21*
