# Phase 21: Deploy Watch - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent monitors a Coolify deployment to a terminal status via a new `deployment.watch` action with exponential backoff, jitter, bounded timeout, and clear timeout/failure recovery — without forever-blocking the MCP session or storming the Coolify API. Phase also updates the `deploy` MCP prompt and README (EN/DE) so agents know how to use watch. No setup wizard, no IDE skill packs (Phase 22), no OpenAPI coverage work (Phase 23). Synchronous watch without timeout remains out of scope.

</domain>

<decisions>
## Implementation Decisions

### Watch Surface
- **D-01:** Implement `deployment.watch` as an action on the existing `deployment` MCP tool only (not a new top-level tool; not on `application`).
- **D-02:** Keep `application.deploy wait:true` for backward compatibility. Docs and the `deploy` prompt steer agents to `watch` as the recommended path.
- **D-03:** Add a **new** backoff/jitter poll helper used only by `watch`. Leave the existing fixed-interval `pollDeploymentUntilTerminal` (3s) for `wait:true` unchanged.
- **D-04:** Optional `include_logs?` on `watch`, **default `false`**. When true, attach capped logs; otherwise status/summary only with hint to `deployment.get` if needed.

### Polling Policy
- **D-05:** Default timeout **300 seconds** when the agent omits `timeout`.
- **D-06:** Interval band: start **3s**, exponential backoff **+ jitter**, cap **30s**.
- **D-07:** Agent-visible params: `timeout?`, `min_interval?`, `max_interval?` (plus required `deployment_uuid` / routing fields per existing patterns). Backoff math otherwise internal.
- **D-08:** On HTTP **429**, honor `Retry-After` when present; otherwise continue the backoff schedule (no immediate hard abort solely because of 429).

### Timeout & Recovery Response
- **D-09:** On timeout: return a **soft body** (last known deployment snapshot) **and** an **error flag** (dual signal — not silent success).
- **D-10:** Resume guidance: re-call `deployment.watch` with the same `deployment_uuid` (optional adjusted `timeout`).
- **D-11:** Terminal `finished` → normal OK with summary projection. Terminal `failed` and `cancelled-by-user` → **clear error message + user-facing output** (not a quiet OK with buried `status`).
- **D-12:** Success payload uses the existing **summary** projection; logs only when `include_logs` is true.

### Documentation (WATCH-02)
- **D-13:** In this phase: sharpen MCP prompt `deploy` **and** add a short Watch section to README.md + README.de.md.
- **D-14:** Prompt depth: **2–4 concrete steps** — deploy → watch → on timeout re-watch → on fail surface clear error output (stay within Phase 19 short-prompt style; no long playbook).
- **D-15:** Document `wait:true` as legacy / back-compat; recommend `watch`.
- **D-16:** IDE skill packs deferred to Phase 22; those skills **must** document `deployment.watch` (timeout, non-blocking-forever rule, recovery) per SKILL-02.

### Claude's Discretion
- Exact backoff formula / jitter implementation details within D-06.
- Exact MCP error code / envelope fields for timeout dual-signal (D-09) and failed/cancelled user messaging (D-11), as long as both are unambiguous to agents.
- Exact README section placement and German/English wording.
- How Phase 22 skill packs structure watch docs (D-16 only requires that they cover it).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 21 goal, success criteria, deps on Phase 19
- `.planning/REQUIREMENTS.md` — WATCH-01, WATCH-02; out-of-scope: synchronous watch without timeout
- `.planning/PROJECT.md` — v3.1 milestone scope
- `.planning/STATE.md` — current milestone position

### Research (v3.1)
- `.planning/research/PITFALLS.md` — Pitfall 12 (Deploy Watch Polling Storms & Timeouts); 429 / Retry-After guidance
- `.planning/research/ARCHITECTURE.md` — Pattern 2 Progressive Stateless Polling; `deployment.ts` watch extension
- `.planning/research/SUMMARY.md` — Non-blocking deployment watcher rationale
- `.planning/research/STACK.md` — reuse/extend deploy-poll utility guidance

### Prior phase context
- `.planning/phases/19-dx-schemas-mcp-prompts/19-CONTEXT.md` — flat schemas, actionsCatalog, prompt `deploy` forward-ref to `deployment.watch` (D-11 there)
- `.planning/phases/20-recipes-service-list-types/20-CONTEXT.md` — soft instance routing, reveal/confirm patterns (carry forward)

### Spike findings
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — action-based tools; no stub tools; Coolify 4.1.x target
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — deploy returns deployment_uuid; poll until terminal

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Zod naming, file layout, commits
- `.planning/codebase/TESTING.md` — Vitest co-located + integration test expectations
- `.planning/codebase/CONCERNS.md` — known constraints relevant to polling/errors if referenced in planning

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/deploy-poll.ts` — `pollDeploymentUntilTerminal`, `TERMINAL_DEPLOYMENT_STATES`, fixed `DEFAULT_POLL_INTERVAL_MS = 3000` — **keep for `wait:true`**; do not overload for watch backoff (D-03)
- `src/mcp/tools/deployment.ts` — `list` / `get` / `cancel` + flat schema / actionsCatalog — add `watch` action here (D-01)
- `src/mcp/tools/application.ts` — `deploy` with `wait` / `timeout` (min 10, max 1800) using fixed poller — leave behavior; docs steer away (D-02, D-15)
- `src/mcp/prompts.ts` — `deploy` prompt already mentions `deployment.watch` + `deployment.get` fallback — update to real watch steps (D-13, D-14)
- Projection helpers used by `deployment.get` summary — reuse for watch success payload (D-12)

### Established Patterns
- Flat Zod object + per-action refine (Phase 19)
- Soft instance routing via `shared-read-params` / optional `instance`
- Structured errors via `wrapMcpError` / recoveryHints
- Terminal states: `finished`, `failed`, `cancelled-by-user` (+ synthetic `timeout` today on wait path)

### Integration Points
- Register `watch` in `deployment` actionsCatalog + handler switch
- New watch-only poll helper module (or sibling under `src/utils/`) consumed only by `deployment.watch`
- Update `tests/mcp/prompts.test.ts` expectations for deploy prompt watch steps
- README.md + README.de.md watch section; Phase 22 skills consume D-16 later

</code_context>

<specifics>
## Specific Ideas

- User chose dual-signal timeout (soft snapshot + error flag) over pure soft-success or pure hard error alone
- User insisted failed/cancelled produce a **clear error message shown to the user**, not a quiet success with status buried in JSON
- Agent-tunable `min_interval?` / `max_interval?` kept despite smaller-surface recommendation — planner must validate against D-06 band defaults
- Claude discretion on skills: defer packs to Phase 22 but require watch coverage there

</specifics>

<deferred>
## Deferred Ideas

- Full IDE skill packs (Cursor / Claude Code / Codex) documenting watch — Phase 22 (SKILL-01/SKILL-02)
- Upgrading `application.deploy wait:true` to share the backoff helper — explicitly rejected for this phase (D-03); revisit only if a future phase wants policy unification
- Incremental log streaming always-on during watch — rejected; optional `include_logs` only (D-04)

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify → Phase 22 (SKILL-*)
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten → already covered in v3.0 / Phase 17
- Standard-Setup Tool für neue Coolify-Projekte → Phase 22 (SETUP-*)
- Integrate official Coolify OpenAPI specs → Phase 23 (OAPI-*)

</deferred>

---

*Phase: 21-Deploy Watch*
*Context gathered: 2026-07-25*
