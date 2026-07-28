# Phase 26: Diagnose Logs & Incident DX - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent gets a one-shot `diagnose.logs` shortcut (app diagnose triage + bounded log tail), an updated `incident` MCP prompt that documents `deployment.logs`, application log follow, and `diagnose.logs` (application-only), and `coolify-setup` skill updates for app log troubleshooting + capability discovery via `system.version` + links to incident/deploy/diagnose skills. No service/DB logs. No branding/docs-stale work (Phase 27). No embedded follow inside `diagnose.logs`.

</domain>

<decisions>
## Implementation Decisions

### `diagnose.logs` surface
- **D-01:** Implement as new action **`logs` on the existing `diagnose` MCP tool** (same pattern as `deployment.logs`) — not a top-level tool, not docs-only alias. — **Reversibility:** costly — action catalog + agent habits.
- **D-02:** Default log source is a bounded **runtime** one-shot tail via existing `application.logs` path (`lines` / `max_chars`). Do **not** embed `follow:true`. — **Reversibility:** costly — agent-facing semantics.
- **D-03:** Agent-selectable **`mode`**: `full` | `logs-only`. Default when omitted: **`full`**. — **Reversibility:** costly — schema + prompt defaults.
- **D-04:** App identifiers match `diagnose.app` (`query` | `uuid` | `name` | `domain`, at least one) plus log params and shared read/routing params as applicable. — **Reversibility:** costly — schema parity contract.
- **D-05:** Optional **`deployment_uuid`**: **XOR** with runtime — when set, fetch **build logs only** for that deployment (no runtime tail); parity with `application.logs` runtime-vs-build split. — **Reversibility:** costly — identity/log-source contract.

### Response envelope & errors
- **D-06:** Nested response **`{ diagnose?, logs }`** — omit `diagnose` when `mode:logs-only`. — **Reversibility:** costly — agent-facing envelope.
- **D-07:** When `mode:full` and diagnose half fails: **soft partial** + clear error flag; include `logs` if the log fetch still succeeds. — **Reversibility:** costly — error contract (differs from hard-fail-all).
- **D-08:** Empty / missing log content when app exists: **soft OK** + empty tail + hint (Phase 24 D-16 parity). — **Reversibility:** reversible.
- **D-09:** Cap / default numerics: **reuse `application.logs` defaults** for `lines` and `max_chars` — no diagnose-specific magic numbers. — **Reversibility:** reversible.

### `incident` prompt
- **D-10:** Primary triage step uses **`diagnose.logs` with `mode:full`** instead of separate `diagnose.app` + `application.logs`. — **Reversibility:** costly — prompt contract agents follow.
- **D-11:** Document **`deployment.logs`** as an explicit step only on build/deploy suspicion or after failed `deployment.watch` — not always. — **Reversibility:** reversible.
- **D-12:** Document application log **follow** after one-shot/`diagnose.logs` when a live symptom needs watch; agents should check capability **`application_logs_follow`**. — **Reversibility:** reversible.
- **D-13:** Explicit **app-only guardrail** in the prompt — no service/DB log steps; steer elsewhere for service/DB. — **Reversibility:** reversible.

### Capability + `coolify-setup` skill + docs
- **D-14:** Add capability key **`diagnose_logs`** to the static Coolify 4.1.2 table (`supported: true`, soft guidance only — Phase 24 D-04 parity). — **Reversibility:** costly — published capability map.
- **D-15:** `coolify-setup` gets a **short** “App log troubleshooting” section: capability check via `system.version` → `diagnose.logs` → follow / `deployment.logs` → links to `coolify-incident` / `coolify-deploy` / `coolify-diagnose`. Not a full incident runbook duplicate. — **Reversibility:** reversible.
- **D-16:** Place that section as its **own skill section** after setup/wire — do not mix into the setup wizard flow. — **Reversibility:** reversible.
- **D-17:** Also update **actions catalog** + short **README EN/DE** note (Phase 24/25 parity); coverage map row if research finds one needed. — **Reversibility:** reversible.

### Claude's Discretion
- Exact Zod param name for mode (`mode` vs `diagnose_mode`) — prefer `mode` if unambiguous in flat schema.
- Exact nested field shapes inside `diagnose` / `logs` (reuse existing diagnose.app and application.logs result shapes where practical).
- Exact soft-partial error code / flag field names for D-07.
- Exact `coolify_min_version` / `note` strings on `diagnose_logs`.
- Whether `diagnose` prompt also gets a one-line pointer to `diagnose.logs` (default: yes, brief — not a full rewrite of diagnose prompt).
- Coverage-map / COVERAGE.md row wording for DIAG-01.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 26 goal, success criteria; DIAG/PROMPT/SKILL mapping
- `.planning/REQUIREMENTS.md` — DIAG-01, PROMPT-01, SKILL-01; out-of-scope service/DB `diagnose.logs`
- `.planning/PROJECT.md` — v3.2 Observability & DX
- `.planning/STATE.md` — current position Phase 26

### Prior phase context
- `.planning/phases/25-application-log-follow/25-CONTEXT.md` — follow surface, `application_logs_follow`, incident deferred to Phase 26
- `.planning/phases/24-capabilities-deployment-logs/24-CONTEXT.md` — capability shape, soft flags, `deployment.logs`, empty-log soft OK
- `.planning/milestones/v3.1-phases/21-deploy-watch/21-CONTEXT.md` — deployment tool action pattern / watch dual-signal reference
- `.planning/milestones/v3.1-phases/19-dx-schemas-mcp-prompts/19-CONTEXT.md` — MCP prompt patterns (if still relevant)

### Implementation sources
- `src/mcp/tools/diagnose.ts` — extend actions (`logs`), schema, handler
- `src/mcp/tools/diagnose.test.ts` — co-located tests
- `src/mcp/tools/application.ts` — runtime/build logs + follow (compose/reuse; do not regress OBS-03)
- `src/mcp/tools/deployment.ts` — `deployment.logs` reference for prompt/docs
- `src/mcp/capabilities.ts` — add `diagnose_logs`
- `src/mcp/tools/system.ts` — `system.version` capabilities surface
- `src/mcp/prompts.ts` — rewrite `incident` prompt (D-10..D-13); optional brief `diagnose` pointer
- `src/utils/log-helpers.ts` — slice/cap helpers
- `skills/coolify-setup/SKILL.md` — D-15/D-16 section
- `skills/coolify-incident/SKILL.md` · `skills/coolify-deploy/SKILL.md` · `skills/coolify-diagnose/SKILL.md` — link targets from setup skill

### Conventions / spikes
- `.planning/codebase/CONVENTIONS.md` — Zod/action naming, ESM
- `.planning/codebase/TESTING.md` — Vitest co-located expectations
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; service/DB logs absent on 4.1.2

### Coverage / OpenAPI
- `docs/coolify_openapi.json` — app logs + diagnose-related paths
- `docs/coverage-map.yaml` / `docs/COVERAGE.md` / `docs/coverage-overrides.yaml` — DIAG-01 row if added (D-17)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleDiagnoseAction` / `diagnoseToolSchema` / `diagnoseActionsCatalog` — add `logs` action beside `app`/`server`/`scan`
- `diagnose.app` handler path — reuse for `mode:full` triage half
- `handleApplicationLogs` / log helpers — runtime one-shot and build-via-`deployment_uuid` paths for the logs half
- `COOLIFY_412_CAPABILITIES` — add `diagnose_logs`
- `incident` prompt in `prompts.ts` — currently still documents separate `diagnose.app` + `application.logs` only
- `skills/coolify-setup/SKILL.md` — already links related skills; needs troubleshooting section

### Established Patterns
- New behavior as action on existing domain tool (Phases 21/24/25)
- Soft capability flags — tools stay callable; no Zod hard-block (Phase 24 D-04)
- Empty logs soft OK + hint (Phase 24 D-16)
- Runtime vs build XOR via `deployment_uuid` (application.logs parity)
- Follow stays on `application.logs` + `follow:true` — not inside diagnose

### Integration Points
- MCP tool registration for `diagnose`
- `incident` (+ optional brief `diagnose`) prompts
- `system.version` capability map growth
- Actions catalog + README EN/DE
- Skill packs: `coolify-setup` (+ link integrity to incident/deploy/diagnose)
- Coverage map for DIAG-01 when implementing

</code_context>

<specifics>
## Specific Ideas

- German discuss UI + ★ recommendations; user accepted most ★ picks.
- User chose **soft partial** on diagnose failure (2b) over hard-fail-all — keep logs when fetchable.
- Caps: user asked for “smartest” option → locked reuse of `application.logs` defaults (D-09).
- Mode `full` vs `logs-only` was user override vs initial ★ “always full diagnose” — default remains `full`.

</specifics>

<deferred>
## Deferred Ideas

- `diagnose.logs` for service/database — requires SVC-04/05; Coolify 4.2.0+ (REQUIREMENTS out of scope)
- Embedding follow inside `diagnose.logs` — rejected for Phase 26; use `application.logs` follow separately
- Full docs-site troubleshooting page — deferred (Phase 27 / docs milestone if needed)
- Branding / npm docs stale fix — Phase 27

</deferred>

---

*Phase: 26-Diagnose Logs & Incident DX*
*Context gathered: 2026-07-28*
