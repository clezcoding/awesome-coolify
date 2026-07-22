# Phase 8: Keys & Server CRUD - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can register SSH private keys and stand up target servers with auto-validation — the prerequisites for every subsequent deployment target. Scope is KEY-01–05 and SRV-01–05 only: new MCP tools `private_key` and `server` (CRUD + validate), plus a small `resource.list` extension for `type=server`. No application/project/env CRUD (Phases 9–10). No multi-instance. No force-delete of keys still in use.

</domain>

<decisions>
## Implementation Decisions

### PEM input & masking
- **D-01:** Create accepts **either** inline PEM (`private_key` string) **or** local `key_file` path — XOR, exactly one required.
- **D-02:** Never return PEM material via MCP responses — not on get, list, create, or update; **no `reveal: true` path for private keys** (stricter than app env/basic-auth SAF-04).
- **D-03:** Create response returns `{ uuid, name, fingerprint? }` when fingerprint is available from API or safely derivable; never invent fingerprint; never include PEM.
- **D-04:** List/get summary fields: uuid, name, fingerprint, description; `projection: full` may add more **metadata only**, still no PEM.

### Validate after server create
- **D-05:** After `server.create`, auto-run validate with a **timeout**; return validation result or `{ status: 'pending' }` + retry hint if still unsettled (not infinite block; not pure fire-and-forget).
- **D-06:** Opt-out via `validate` boolean on create, **default `true`** (prefer positive flag over `skip_validate`).
- **D-07:** If server is created but SSH is unreachable: **soft success** (`ok: true`) with `validation.reachable: false` + recovery hints; **no auto-rollback**. Mapping of Roadmap `COOLIFY_SSH_UNREACHABLE` (structured hint vs error code) left to research.
- **D-08:** On-demand `server.validate` uses the **same wait/timeout model** as create. Diagnose tool keeps D-10 non-blocking `trigger_validate` separately.

### List / discover surface
- **D-09:** Private keys listed via **`private_key.list`** on the domain tool — **not** required in `resource.list` (security objects ≠ deploy resources).
- **D-10:** No `server.list`. Servers discovered via existing `resource.find` + extend **`resource.list` with `type: 'server'`**. `server` tool = get / create / update / delete / delete_preview / validate.
- **D-11:** `private_key.list` uses shared read params **without `reveal`**; if `reveal` is passed → `COOLIFY_422`.
- **D-12:** Dedicated **`server.get`** for config/metadata (IP, port, user, private_key_uuid, build-server flag, reachable). No validate side-effect on get. Diagnose remains separate synthesis tool.

### Delete & dependency UX
- **D-13:** Explicit **`delete_preview`** action on both `private_key` and `server` (two-stage model — user overrode emergency-style inline preview).
- **D-14:** `delete_preview` is **optional/recommended**, not mandatory. `delete` only requires `confirm: true` (no session tracking of prior preview).
- **D-15:** Key still referenced by servers: `delete_preview` shows blockers; `delete` with confirm fails with **`COOLIFY_409`** listing dependent server UUIDs when deps > 0. **No `force` in Phase 8.**
- **D-16:** Server delete: `delete_volumes` defaults **`false`**. `delete_preview` lists/counts child resources as **warning**; delete with confirm still allowed (no hard-block on children).

### Claude's Discretion
- **private_key.update scope:** Prefer metadata + PEM rotation (write-only) if Coolify API supports it; else metadata-only (name/description). Researcher must verify API capability and planner must pick the supported path.
- **Validate timeout duration:** Concrete seconds / poll strategy left to research against live Coolify 4.1.x validate endpoint behavior.
- **`COOLIFY_SSH_UNREACHABLE` / `COOLIFY_409` wiring:** New error codes may need adding to `src/utils/errors.ts`; exact envelope shape for soft-unreachable vs hard 409 is researcher/planner discretion within D-07 and D-15.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 8 goal + success criteria 1–5 (tool names, confirm gates, validate chaining, 409 on key deps)
- `.planning/REQUIREMENTS.md` — KEY-01–05, SRV-01–05
- `.planning/PROJECT.md` — v2.0 Creation & CRUD constraints; single-env auth; no stub tools
- `.planning/STATE.md` — accumulated v1 decisions (action schema, confirm gates, masking, D-02/D-10)

### Spike / API knowledge
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — entry point for verified Coolify/MCP patterns
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — API surface notes
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-v412-endpoints.md` — endpoint EXISTS/ABSENT classification
- `.planning/research/SUMMARY.md` — v2.0 research basis (Context7 + Coolify 4.1.x feasibility)

### Existing implementation patterns to reuse
- `src/mcp/server.ts` — tool registration pattern for new `private_key` / `server` tools
- `src/mcp/tools/emergency.ts` — confirm-gate / preview payload patterns (adapt; Phase 8 uses explicit `delete_preview` instead of inline-only)
- `src/mcp/tools/resource.ts` — `projectServerSummary`, `resource.find` already includes servers; extend `list` type enum
- `src/mcp/tools/diagnose.ts` — D-10 non-blocking `trigger_validate` (do **not** conflate with `server.validate` wait model)
- `src/api/client.ts` — `fetchServers`, `fetchServer`, `triggerServerValidate` (extend with key/server CRUD endpoints)
- `src/utils/projections.ts` / sanitize — already masks `private_key` fields
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED` and structured error/hint pattern; may need `COOLIFY_409` / `COOLIFY_SSH_UNREACHABLE`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createCoolifyClient` / `withMappedErrors` in `src/api/client.ts` — add create/update/delete/list for security keys + servers
- `triggerServerValidate` — today fire-and-forget GET; Phase 8 wait/timeout wrapper needed for create + `server.validate`
- `projectServerSummary` / `resource.find` server branch — reuse for list extension
- `buildReadResponse` + `sharedReadParamsSchema` — list/get envelopes (strip `reveal` for private_key)
- `sanitizeFullProjection` — keep PEM out of any full projections
- Emergency confirm helpers — pattern reference for `confirm: true` on delete

### Established Patterns
- Action-based `discriminatedUnion` Zod schemas per tool
- Confirm gate → `COOLIFY_CONFIRM_REQUIRED` with recovery hint
- Domain tools historically get-oriented with list via `resource` — **exception:** `private_key.list`; servers stay on `resource`
- Diagnose server validate is non-blocking (D-10) — **must remain**; new wait semantics live only on `server` tool

### Integration Points
- Register `private_key` and `server` in `registerCoolifyTools` (`src/mcp/server.ts`)
- Extend `resourceActionSchema` list `type` enum with `'server'`
- Wire new error codes into `CoolifyErrorCode` + `RECOVERY_HINTS`
- Tests mirror existing tool test style (`*.test.ts` beside handlers)

</code_context>

<specifics>
## Specific Ideas

- User wants a recommendation on every discuss question (captured in DISCUSSION-LOG); one deliberate override: **two-stage `delete_preview`** instead of emergency-style inline preview.
- Soft-unreachable after create preferred over hard error so the agent keeps the server UUID for remediation.
- Keys treated stricter than other secrets: never PEM out, even with reveal.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify — docs; out of Phase 8 scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- MCP Server für Coolify Cloud erweitern — api/cloud; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope

- Force-delete of keys still referenced by servers — explicitly out of Phase 8
- Hard-blocking server delete when child apps/services exist — deferred (preview warn only)
- Multi-instance / `instances.json` — later v2.x

</deferred>

---

*Phase: 8-Keys & Server CRUD*
*Context gathered: 2026-07-16*
