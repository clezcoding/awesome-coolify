# Phase 12: Environment Variables & Smart Sync - Context

**Gathered:** 2026-07-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can manage runtime configuration on applications, services, and databases — individual env-var CRUD, bulk patch, and (applications only) a local `.env` diff-sync engine — with full flag support, confirm gates on destructive/batch mutations, and no secret leakage. Scope: ENV-01–06 + SAF-04 continuity. No database backup schedules (Phase 13). No new top-level MCP tool. No cascade delete of parent resources.

</domain>

<decisions>
## Implementation Decisions

### Tool surface & action names
- **D-01:** Extend existing `application`, `service`, and `database` tools — no dedicated `env` MCP tool.
- **D-02:** Action namespace uses colon-prefix `envs:*`: `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, and (application only) `envs:sync`.
- **D-03:** Mutation/read identity: primary `env_uuid`; optional `key` lookup scoped to the parent resource; multi-match → `COOLIFY_AMBIGUOUS_MATCH` (no mutation).
- **D-04:** Read actions `envs:list` + `envs:get` on all three tools (values masked per D-14/D-15).

### Smart Sync UX (application only)
- **D-05:** Sync input is XOR: `env_file` (local path) **or** `env_content` (inline string) — exactly one (mirror Phase 11 compose XOR).
- **D-06:** `dry_run: true` on `envs:sync` returns diff `{ added, updated, unchanged, removed, conflicts? }` with **no** API writes; default `false` = apply path.
- **D-07:** Default sync never deletes remote keys missing locally. Optional `prune: true` only with `confirm: true`; missing confirm → `COOLIFY_CONFIRM_REQUIRED`. Diff always reports `removed` as would-remove even when prune is off.
- **D-08:** Value conflicts (local ≠ remote): **no auto-overwrite**. Diff includes `conflicts[]` (key + remote masked + local present). Apply without `conflict_policy` → `COOLIFY_CONFIRM_REQUIRED` / ask-human recovery hint. After human decision, agent retries with `conflict_policy: 'overwrite' | 'keep_remote' | 'abort'`.
- **D-09:** `envs:sync` is exposed **only** on `application` (ENV-05). Service/database get CRUD + bulk only.

### Bulk scope & confirm gates
- **D-10:** `envs:bulk-update` on **all three** tools (application, service, database) — OpenAPI supports bulk on each; ENV-04 is the minimum, not a hard cap.
- **D-11:** `envs:bulk-update` always requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED`. No separate `envs:bulk-preview` action.
- **D-12:** Sync apply (`dry_run: false`) always requires `confirm: true`. `dry_run: true` does not require confirm.
- **D-13:** `envs:delete` requires `confirm: true`. `envs:create` / `envs:update` do **not** require confirm (usable single-key edits; batch/destructive paths remain gated).

### Masking, reveal & flags
- **D-14:** Values always masked (`***`) in list/get/create/update/bulk/sync responses unless `reveal: true` on that call (SAF-04 / `sanitizeFullProjection`). Keys, UUIDs, and flags remain visible. Sync/bulk responses and logs never include plaintext values; reuse `redactSecrets` for stderr/error paths.
- **D-15:** Product policy: agent must **ask the human** whether they want masked or revealed values before using `reveal: true`. Never auto-set `reveal: true`. If reveal is attempted without human preference, surface an ask-human / `ask_human_reveal` recovery hint. Technical default remains masked.
- **D-16:** Flag defaults on create and sync-created keys: `is_preview`, `is_literal`, `is_multiline`, `is_shown_once` all default `false`. Sync does not infer flags from `.env` content; caller may set flags explicitly on create/bulk entries (ENV-06 round-trip).

### Carry-forward (not re-discussed)
- **D-17:** Zod validates payloads before any API call (SAF-03).
- **D-18:** Parent resource identity reuses existing mutation resolvers (`uuid` | `name` / app patterns) from Phases 4/10/11.
- **D-19:** No stub tools; omit endpoints that do not exist on the target Coolify version.

### Claude's Discretion
- Exact `.env` parser edge cases (export prefix, quoted values, comments, blank lines) — researcher/planner pick a small robust parser; invalid file → `COOLIFY_VALIDATION_ERROR`.
- Whether bulk/sync internally use Coolify bulk PATCH vs fan-out individual calls when bulk fails — prefer single bulk call per ENV-04 spirit; document fallback if research finds API quirks.
- Precise shape of `conflicts[]` and per-key disposition fields in responses — keep agent-readable and redacted.
- Shared helper extraction (env CRUD client methods, confirm gates, sync engine) vs copy from application tool — planner chooses for reuse.
- Whether `is_preview` appears on service/database OpenAPI create bodies (apps have it; DBs may not) — researcher verifies; omit unsupported flags per resource type rather than stubbing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 12 goal + success criteria 1–6 (CRUD on app/service/db, bulk, sync diff, flags, no secret logging)
- `.planning/REQUIREMENTS.md` — ENV-01–06; SAF-04 continuity
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; secret masking; no stub tools
- `.planning/STATE.md` — accumulated decisions (action schema, confirm, masking, ask-human patterns)
- `.planning/phases/10-application-crud-safety/10-CONTEXT.md` — SAF-01–04, reveal, curated mutations
- `.planning/phases/11-service-database-crud/11-CONTEXT.md` — XOR file/inline pattern, confirm for sensitive ops, tool extension pattern
- `.planning/phases/09-project-environment-crud/09-CONTEXT.md` — ask-human when preference missing (parallel for reveal / conflict_policy)

### Spike / API knowledge
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — verified Coolify/MCP patterns entry
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — API surface notes
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint classification
- `docs/coolify_openapi.yaml` — `/applications|services|databases/{uuid}/envs`, `/envs/bulk`, `/envs/{env_uuid}`; flags `is_preview`, `is_literal`, `is_multiline`, `is_shown_once`

### Existing implementation patterns to reuse
- `src/mcp/tools/application.ts` — extend with `envs:*` actions (incl. sync + bulk)
- `src/mcp/tools/service.ts` / `src/mcp/tools/database.ts` — extend with `envs:*` (list/get/create/update/delete/bulk-update)
- `src/api/client.ts` — add env CRUD + bulk client methods
- `src/utils/projections.ts` — `sanitizeFullProjection` + `reveal`
- `src/utils/redact.ts` — `redactSecrets` for logs/errors
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `COOLIFY_AMBIGUOUS_MATCH`, `COOLIFY_VALIDATION_ERROR`, ask-human recovery hints
- `src/mcp/tools/private_key.ts` — XOR file-path vs inline content pattern for `env_file` / `env_content`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Action `discriminatedUnion` on application/service/database tools — add `envs:*` branches
- `sanitizeFullProjection(raw, reveal)` — mask env values in responses
- `redactSecrets` — ensure sync/bulk never log plaintext
- Phase 8/11 XOR file vs inline — template for `env_file` / `env_content`
- Confirm + `COOLIFY_CONFIRM_REQUIRED` helpers from delete/bulk-sensitive paths

### Established Patterns
- Action-based Zod schemas; `.strict()` so confirm/force/reveal do not leak onto wrong actions
- Confirm gate on destructive and security-sensitive batch ops; single-field updates usually ungated
- Ask-human recovery hints when preference missing (Phase 9 `initial_environment` spirit → reveal + conflict_policy)
- No stub tools for absent endpoints

### Integration Points
- Coolify env routes under each parent UUID; bulk PATCH where available
- MCP-side `.env` parse + diff engine for `envs:sync` (application only)
- Tool descriptions / README action lists must gain `envs:*`
- Tests: extend application/service/database (+ client) tests Wave-0 style; assert masking, confirm gates, dry_run, conflict_policy, prune

</code_context>

<specifics>
## Specific Ideas

- User wants recommendations marked on every discuss question; discussion language German; decisions recorded in English for downstream agents (this file).
- Strong product preference: **human in the loop** for bulk, sync apply, prune, delete, value conflicts, and whether to reveal secrets — not silent automation.
- Sync conflict policy explicitly rejects “local always wins”; agent must ask the human, then pass `conflict_policy`.
- Reveal is opt-in after human choice — not a silent default and not create-once plaintext in MCP responses.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

- Per-key `conflict_policy` map (vs single policy for the apply call) — not required for Phase 12; single enum is enough unless research shows need.
- Sync on service/database — explicitly out of ENV-05 / deferred unless a future phase expands scope.

</deferred>

---

*Phase: 12-Environment Variables & Smart Sync*
*Context gathered: 2026-07-20*
