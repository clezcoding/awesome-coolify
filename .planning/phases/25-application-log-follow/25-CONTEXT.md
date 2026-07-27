# Phase 25: Application Log Follow - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent follows application **runtime** logs with bounded watch-style polling via `application.logs` + `follow:true`, until timeout or idle. Existing one-shot runtime and build `application.logs` paths stay behaviorally unchanged (OBS-03). No service/DB logs. No `diagnose.logs`. No `incident` prompt rewrite (Phase 26). Coolify exposes only snapshot `GET /applications/{uuid}/logs` — follow is MCP-side polling, not upstream SSE.

</domain>

<decisions>
## Implementation Decisions

### Follow surface (`application.logs`)
- **D-01:** Expose follow as **`follow:true` on existing `application.logs`** (not a separate action). — **Reversibility:** costly — agent-facing schema + catalog habits.
- **D-02:** `follow:true` + `deployment_uuid` → **`COOLIFY_422`** reject. Follow only with app runtime identity (`uuid` / `name` / `fqdn`). — **Reversibility:** costly — error contract.
- **D-03:** Without `follow` (absent/false): **exact current one-shot behavior** — no default/regression changes (OBS-03). — **Reversibility:** one-way if broken — OBS-03 success criterion.
- **D-04:** Document follow in actions catalog + tool description **and** via capability flag (D-16..D-18). Short catalog note that agents should check `system.version` capabilities.

### Stop / terminal conditions
- **D-05:** Stop on **`timeout` OR idle** (no new lines for idle window). Do **not** poll app lifecycle status as a stop signal in this phase. — **Reversibility:** reversible — status-based stop can be added later.
- **D-06:** Default **`idle_timeout` = 60 seconds**. Agent may override via param. — **Reversibility:** costly — default is agent-visible behavior.
- **D-07:** On Coolify API errors during follow: **hard stop**, structured error, include **partial log aggregate so far**. — **Reversibility:** costly — error contract.
- **D-08:** Pattern-match / `until` / regex stop — **out of scope** Phase 25. — **Reversibility:** n/a (deferred).

### Delta & response contract
- **D-09:** Return a **single aggregate** of new lines since follow start (dedupe across polls). No chunked MCP streaming. — **Reversibility:** costly — response shape agents depend on.
- **D-10:** On **timeout**: soft body (partial aggregate) **+** error flag / clear `stopped_reason: timeout` (Phase 21 dual-signal parity). — **Reversibility:** costly — agent contract.
- **D-11:** On **idle**: soft **success** + `stopped_reason: idle` (no error flag). — **Reversibility:** costly — distinguishes happy idle end from budget exhaustion.
- **D-12:** One **`max_chars` cap over the full aggregate** (`truncated: true` when hit). Not per-poll-only caps as the follow contract. — **Reversibility:** costly — token-safety contract.

### Poll defaults & params
- **D-13:** Default **`timeout` = 120 seconds** when `follow:true` and agent omits timeout (shorter than `deployment.watch` 300s; idle often ends earlier). — **Reversibility:** costly — default agent-visible.
- **D-14:** Agent-visible params when following: **`timeout?`**, **`min_interval?`**, **`max_interval?`**, **`idle_timeout?`** (plus existing logs params as applicable). — **Reversibility:** costly — schema surface.
- **D-15:** Default intervals match watch parity: **min 3s**, **max 30s**, exponential backoff + jitter (reuse or sibling of watch poll helper). — **Reversibility:** reversible — math can tune later if defaults stay documented.
- **D-16:** **`lines`** still applies **per Coolify poll** (default 100); dedupe builds the aggregate. — **Reversibility:** costly — param semantics.

### Capability flag
- **D-17:** Add new capability key **`application_logs_follow`** alongside existing `application_logs`. — **Reversibility:** costly — published capability map.
- **D-18:** `supported: true` for Coolify **4.1.2** target — follow is an **MCP** feature on the same logs API (not gated on nonexistent OpenAPI stream). — **Reversibility:** reversible — table entry.
- **D-19:** Soft guidance only (Phase 24 D-04 parity) — tools stay callable; no Zod hard-block on missing capability. — **Reversibility:** costly — hard-block later would change error surface.

### Docs / coverage (Phase 25 scope)
- **D-20:** Update **actions catalog + tool description + short README EN/DE** note. — **Reversibility:** reversible.
- **D-21:** Leave **`incident` prompt untouched** — Phase 26 (PROMPT-01). — **Reversibility:** n/a.
- **D-22:** Update **coverage map / COVERAGE** for follow / OBS-02 row. — **Reversibility:** reversible.

### Claude's Discretion
- Exact default numeric `max_chars` for follow aggregate (reuse existing shared log default unless research finds a better follow-specific cap).
- Exact response envelope field names beyond required `stopped_reason` and dual-signal timeout semantics (D-10/D-11).
- Dedup algorithm details (line equality vs hash vs sliding window) — prefer simplest correct approach.
- Whether to reuse `deploy-watch-poll` abstractions vs a dedicated log-follow poll helper (prefer reuse/sibling; do not break watch).
- Exact `coolify_min_version` / `note` strings on `application_logs_follow`.
- Schema placement of follow-only params (`follow` false/absent must keep one-shot path identical — D-03).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 25 goal, success criteria, OBS-02/OBS-03
- `.planning/REQUIREMENTS.md` — OBS-02, OBS-03; Phase 26 owns DIAG-01 / PROMPT-01 / SKILL-01
- `.planning/PROJECT.md` — v3.2 Observability & DX; app log follow listed
- `.planning/STATE.md` — current position Phase 25

### Prior phase context
- `.planning/phases/24-capabilities-deployment-logs/24-CONTEXT.md` — capabilities shape, soft flags, deferred follow
- `.planning/milestones/v3.1-phases/21-deploy-watch/21-CONTEXT.md` — watch timeout dual-signal, interval params, backoff pattern
- `.planning/milestones/v2.0-phases/05-logs-service-db-ops/` — original `application.logs` runtime/build split (if CONTEXT present under archive)

### OpenAPI / upstream
- `docs/coolify_openapi.json` — `GET /applications/{uuid}/logs` (snapshot `lines` only; no stream)
- `docs/coverage-map.yaml` / `docs/COVERAGE.md` / `docs/coverage-overrides.yaml` — OBS-02 coverage row (D-22)

### Implementation sources
- `src/mcp/tools/application.ts` — `applicationLogsSchema` (`.strict()`; follow currently rejected), `handleApplicationLogs`
- `src/mcp/capabilities.ts` — static Coolify 4.1.2 capability table (extend with `application_logs_follow`)
- `src/mcp/tools/system.ts` — `system.version` capabilities surface
- `src/utils/log-helpers.ts` — slice/cap helpers for log blobs
- `src/utils/deploy-watch-poll.ts` — backoff/jitter/timeout poll pattern to reuse or sibling
- `src/mcp/tools/deployment.ts` — watch param defaults reference (`timeout`/`min_interval`/`max_interval`)
- `src/api/client.ts` — `fetchApplicationLogs`

### Conventions
- `.planning/codebase/CONVENTIONS.md` — Zod/action naming, ESM
- `.planning/codebase/TESTING.md` — Vitest co-located expectations
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — project spike findings skill (consult if landmines touch logs/polling)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleApplicationLogs` + `fetchApplicationLogs` — one-shot runtime path; extend only when `follow:true`
- `applicationLogsSchema` — add optional `follow` + follow-only params; keep `.strict()` / XOR runtime vs build
- `capLogOutput` / `sliceLogBlob` in `log-helpers.ts` — aggregate capping (D-12)
- `deploy-watch-poll.ts` — timeout/backoff/jitter loop pattern (D-15); adapt for idle-stop + log fetch
- `COOLIFY_412_CAPABILITIES` in `capabilities.ts` — add `application_logs_follow` (D-17)

### Established Patterns
- Domain actions stay on existing tools (Phase 21/24) — follow as param on `logs`, not new top-level tool
- Dual-signal timeout: soft body + error (Phase 21 D-09) — mirror for follow timeout (D-10)
- Soft capability flags — no Zod gate (Phase 24 D-04 / D-19)
- Regression lock: tests already assert `follow` unrecognized — flip to accepted only when `follow:true` path ships; keep default path golden

### Integration Points
- `application` tool actionsCatalog + description (D-04, D-20)
- `system.version` capabilities map growth (D-17) — update tests that expect exactly four keys
- README.md + README.de.md short note (D-20)
- Coverage map row for OBS-02 (D-22)
- Do **not** edit `incident` prompt (D-21)

</code_context>

<specifics>
## Specific Ideas

- User selected **120s** follow timeout default (not watch’s 300s) and **60s** idle default.
- User confirmed German discuss UI + ★ recommendations; accepted most recommendations except timeout default (1b) and idle default (2b in stop area).
- Existing test `applicationLogsSchema rejects follow param with unrecognized_keys` must be rewritten when follow ships.

</specifics>

<deferred>
## Deferred Ideas

- App lifecycle status as follow stop condition — later phase if needed
- `until` / regex pattern stop — later / diagnose flows
- MCP chunked streaming for follow — rejected for Phase 25
- Full `incident` prompt + `diagnose.logs` documentation — Phase 26
- Service/DB log follow — v3.3 / Coolify 4.2.0+ (SVC-04+)

</deferred>

---

*Phase: 25-Application Log Follow*
*Context gathered: 2026-07-28*
