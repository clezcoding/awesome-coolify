# Phase 31: Agent Playbooks - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning
**Mode:** `--batch --auto` (batch overlay no-op under auto; single-pass auto decisions)

<domain>
## Phase Boundary

Agent can **analyze application runtime logs** via rule-based pattern matching (OOM, 5xx spike, crash loop, connection refused) with severity + suggested next actions, follow **parameterized MCP playbook prompts** (incident response, rollback, maintenance-window) that compose existing atomic tools, and request a **smart stack recommendation** that returns a one-click service + env + deploy plan from the live `service.list-types` catalog.

In scope: BRAIN-01, BRAIN-02, PLAY-01, PLAY-02, SREC-01, SREC-02.

Out of scope this phase: ML/statistical anomaly detection (REQUIREMENTS Out of Scope), service/DB log tails (v3.4 SVC-04/05), cross-instance fan-out (CTX-10), new Coolify REST endpoints / stubs for absent APIs, auto-execute destructive playbook steps without confirm (SAF-01), replacing Phase 28–30 intelligence/drift/deploy-guard surfaces, hardcoded YAML stack templates.

</domain>

<decisions>
## Implementation Decisions

### Tool surface packaging — Log Brain
- **D-01:** Extend existing domain tool **`diagnose`** with action **`analyze`** — do **not** create a new top-level `log-brain` / `brain` MCP tool and do **not** fold log analysis into `intelligence` (fleet scorecard) or `deployment`. Log Brain is triage-adjacent to `diagnose.logs` / `diagnose.scan`. — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Keep **`diagnose.logs`** as the raw/bounded log fetch path. **`diagnose.analyze`** consumes the same runtime log source (reuse fetch + `buildRuntimeLogPayload` / log-helpers) then applies rule patterns and returns structured findings — do not redefine `logs` as analyze. — **Reversibility:** costly — two agent-facing contracts.

### Log Brain analysis (BRAIN-01 / BRAIN-02)
- **D-03:** Analysis targets **application runtime logs** on Coolify 4.1.x via existing application log fetch used by `diagnose.logs`. Optional: when `deployment_uuid` is provided, also scan **build logs** for overlapping patterns. **No service/DB log analysis** this phase (endpoints absent — v3.4). — **Reversibility:** costly — scope agents rely on.
- **D-04:** Pattern set (minimum, named): **OOM**, **5xx spike**, **crash loop**, **connection refused**. Matching is **rule-based / deterministic** (regex / line heuristics) — no ML, no statistical anomaly detection. Exact regexes and spike-window heuristics → Claude's discretion within research bounds. — **Reversibility:** reversible for individual pattern strings; named set is costly if removed.
- **D-05:** Response includes **matched_patterns[]** (or equivalent) with **severity** tags (`critical` | `high` | `info` parity with `diagnose.scan` / Phase 28 scorecard) and **structured next-action hints** linking to diagnose flows and playbook prompts (e.g. `diagnose.app`, `diagnose.logs`, prompt `incident` / `rollback`) — same envelope spirit as `FollowUpHint` / `RECOVERY_HINTS`, not free-text-only. — **Reversibility:** costly — envelope contract.
- **D-06:** Analyze is **read-only / advisory**. It never restarts, redeploys, or rolls back. Soft partials when log fetch fails — return structured error + recovery hints (Phase 26/28 spirit). Empty logs → hint (reuse `EMPTY_RUNTIME_LOGS_HINT` spirit), not a fake pattern match. — **Reversibility:** one-way for advisory-only contract (published safety).

### Ops Playbooks (PLAY-01 / PLAY-02)
- **D-07:** Ship playbooks as **parameterized MCP prompts** in `src/mcp/prompts.ts` — **not** a new mutating “playbook runner” tool that auto-executes multi-step mutations. Prompts guide the agent to call existing atomic tools. — **Reversibility:** costly — prompt catalog contract.
- **D-08:** Prompt set for this phase: **upgrade existing `incident`** (wire Log Brain `diagnose.analyze` + Phase 30 preflight/rollback awareness) + **add `rollback`** + **add `maintenance-window`**. Do **not** duplicate a second incident prompt under a new name. Keep existing `deploy` / `diagnose` / `new-project` prompts; update them only if a one-line cross-link to analyze/rollback is needed. — **Reversibility:** costly — published prompt names.
- **D-09:** **`rollback` prompt** composes `deployment.preflight` (advisory) → `deployment.rollback` with **`confirm: true`** only after explicit human approval (SAF-01 / Phase 30). Document `COOLIFY_ROLLBACK_UNAVAILABLE` / unavailable cases from Phase 30 research. — **Reversibility:** one-way for confirm gate in playbook text.
- **D-10:** **`maintenance-window` prompt** guides stop → work → start/restart (and optional deploy) via existing `application`/`service`/`database` lifecycle actions; no new lifecycle APIs. Emphasize confirm on destructive ops and single-instance scope. — **Reversibility:** reversible for step wording.
- **D-11:** **PLAY-02:** Playbooks **compose existing atomic tools only** — no duplicate API client implementations inside prompts or new parallel clients. Prompts reference tool/action names already shipped (diagnose, application, deployment, emergency, recipe, intelligence as needed). — **Reversibility:** costly — composition rule.

### Smart Recipes (SREC-01 / SREC-02)
- **D-12:** Extend existing domain tool **`recipe`** with action **`recommend`** — do **not** create a new top-level `smart-recipe` tool and do **not** ship recommend as prompt-only (agents need a structured plan payload). — **Reversibility:** costly — published action name.
- **D-13:** `recipe.recommend` accepts a **stack description** (free-text and/or structured hints, e.g. "Next.js + Postgres") and returns a **one-click service + env + deploy plan** derived from the **live `service.list-types` catalog** (same client path `create-one-click` already uses). **No hardcoded YAML templates** as the catalog source of truth (SREC-02). — **Reversibility:** costly — recommend semantics.
- **D-14:** Recommend is **advisory by default** — returns plan steps naming follow-up recipe actions (`create-one-click`, `create-app-db`, `create-git-app`) and suggested env keys. It does **not** mutate Coolify state; caller runs create actions separately (with their existing confirms/validation). Unknown / unmappable stacks → structured error + hint to call `service.list-types`. — **Reversibility:** one-way for advisory-only default.
- **D-15:** Prefer **exact / high-confidence catalog ID matches** over fuzzy name guessing when mapping stack phrases to one-click types. Fuzzy ranking allowed only as ranked suggestions with confidence; never invent a type ID not present in live catalog. — **Reversibility:** costly — false-positive risk if flipped to aggressive fuzzy.

### Cross-cutting (carry-forward, not re-opened)
- **D-16:** Single-instance scope per call via optional `instance` — **no cross-instance fan-out** (CTX-10 deferred).
- **D-17:** Structured errors + recovery hints; soft partials for composite reads when one source fails.
- **D-18:** No stub tools / no fake Coolify endpoints (spike mandate). Absent log surfaces → omit, document in coverage.
- **D-19:** Capability / catalog / README EN+DE updates follow Phase 24–26 parity when actions/prompts ship. Exact capability key names → Claude's discretion (e.g. `diagnose_analyze`, `recipe_recommend`).
- **D-20:** Destructive mutations remain on existing confirm-gated actions — playbooks and analyze/recommend never bypass SAF-01.

### Claude's Discretion
- Exact Zod field names for analyze findings, pattern IDs, recommend input shape (free-text vs structured tags).
- Regex / heuristic bodies for the four named patterns and any spike-window thresholds.
- Whether `analyze` reuses `diagnose.logs` param subset (`lines`, `offset`, `max_chars`, `mode`) vs a thinner schema.
- Exact MCP prompt arg schemas for `rollback` and `maintenance-window`.
- NL → catalog matching algorithm for `recipe.recommend` (keyword map vs simple scoring) within D-15.
- Placement of capability flags in `capabilities.ts` / `system.version`.
- Exact MCP tool description / safety footer wording for new actions.
- Whether to extract shared `src/utils/log-patterns.ts` (or similar) vs inline in diagnose handler.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 31 goal, success criteria 1–4; Phase 30 dependency
- `.planning/REQUIREMENTS.md` — BRAIN-01, BRAIN-02, PLAY-01, PLAY-02, SREC-01, SREC-02; Out of Scope (no ML, confirm mandatory, no fan-out)
- `.planning/PROJECT.md` — v3.3 Agent Intelligence; Log Brain / Ops Playbooks / Smart Recipes
- `.planning/STATE.md` — current position Phase 31

### Prior phase context (patterns to reuse)
- `.planning/phases/29-drift-heal/29-CONTEXT.md` — extend existing tool when capability belongs there; advisory + confirm; soft partials; no stubs
- `.planning/phases/28-instance-intelligence/28-CONTEXT.md` — findings + recovery hint envelopes; rule-based scoring; severity buckets
- `.planning/phases/30-deploy-guard/30-RESEARCH.md` — `deployment.preflight` / `deployment.rollback` composition for rollback playbook (no 30-CONTEXT.md shipped)
- `.planning/milestones/v3.2-phases/26-diagnose-logs-incident-dx/26-CONTEXT.md` — diagnose.logs, soft partials, incident prompt precedent
- `.planning/milestones/v2.0-phases/10-application-crud-safety/10-CONTEXT.md` — SAF-01 confirm, structured errors
- `.planning/milestones/v3.0-phases/15-multi-instance-registry-routing/15-CONTEXT.md` — `instance` routing, `COOLIFY_NO_INSTANCE`

### Implementation sources
- `src/mcp/tools/diagnose.ts` — extend with `analyze`; keep `logs`/`app`/`server`/`scan`
- `src/utils/log-helpers.ts` · `src/utils/log-follow-poll.ts` — runtime/build log payload helpers
- `src/utils/issue-classifier.ts` · `src/utils/diagnose-hints.ts` — severity + FollowUpHint patterns
- `src/mcp/prompts.ts` — upgrade `incident`; add `rollback` + `maintenance-window`
- `src/mcp/tools/recipe.ts` — extend with `recommend`; reuse list-types validation path from `create-one-click`
- `src/mcp/tools/service.ts` — `list-types` live catalog
- `src/mcp/tools/deployment.ts` — `preflight` / `rollback` for playbook composition
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `RECOVERY_HINTS`, structured errors
- `src/mcp/server.ts` · `src/mcp/capabilities.ts` · `src/mcp/tools/system.ts` — registration + capability parity
- `docs/COVERAGE.md` · `docs/coverage-map.yaml` — update if new actions map to REST / composites

### Conventions / spikes / maps
- `.planning/codebase/CONVENTIONS.md` — action Zod schemas, ESM `.js` imports
- `.planning/codebase/TESTING.md` — Vitest co-located `*.test.ts`
- `.planning/codebase/CONCERNS.md` — known repo concerns (read if touching CI/docs)
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; 4.1.x endpoint truth
- `docs/coolify_openapi.json` — verify log/deploy endpoints before inventing fetches

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `diagnose.logs` + `buildRuntimeLogPayload` / deployment build-log processing → input for `diagnose.analyze`
- `generateHints` / `FollowUpHint` / `classifyIssues` severity buckets → BRAIN-02 next-action envelope
- `registerCoolifyPrompts` (`deploy`, `diagnose`, `new-project`, `incident`) → PLAY-01 extension pattern
- `recipe` `create-one-click` list-types validation → SREC-02 live catalog path
- `deployment.preflight` / `deployment.rollback` → rollback playbook steps
- `createFlatActionSchema` + `optionalInstanceParam` → new actions
- `EMPTY_RUNTIME_LOGS_HINT` → empty-log advisory without false positives

### Established Patterns
- Action-based domain tools; extend existing tool when capability belongs there (`diagnose.analyze`, `recipe.recommend`)
- New top-level tool only when composite domain is distinct (`intelligence` precedent) — not warranted for Log Brain or Smart Recipes here
- Destructive / applying ops: `confirm: true` or structured confirm error; prompts never auto-confirm
- Soft partial success for multi-source composites
- No tools without working Coolify endpoints
- Optional `instance` routing on live API actions
- MCP prompts as guided workflows composing atomic tools (Phase 22/26)

### Integration Points
- Add `analyze` to diagnose action catalog + schema + handler in `diagnose.ts`
- Add `recommend` to recipe action catalog + schema + handler in `recipe.ts`
- Register/upgrade prompts in `prompts.ts`; ensure `server.ts` still calls `registerCoolifyPrompts`
- Capability flags + actions catalog + README EN/DE short note
- Co-located `diagnose.test.ts` / `recipe.test.ts` / prompts coverage; fixture log snippets for the four patterns

</code_context>

<specifics>
## Specific Ideas

Auto mode (`--auto`): recommended defaults chosen to match Phase 26 diagnose.logs + Phase 28/29 packaging + Phase 30 deploy-guard composition + existing `incident` prompt. ROADMAP success criteria name the four patterns and three playbook flows explicitly. No user free-text references beyond roadmap/requirements.

</specifics>

<deferred>
## Deferred Ideas

- Service/DB bounded log tails → v3.4 (SVC-04/05; Coolify 4.2+)
- Cross-instance fan-out queries → CTX-10
- ML/statistical anomaly detection → out of scope
- Auto-execute multi-step playbooks without confirm → out of scope (SAF-01)
- Hardcoded offline YAML stack catalogs as SoT → rejected by SREC-02
- New Coolify REST for “native rollback” / log anomaly APIs → not in OpenAPI; compose existing only

None — discussion stayed within phase scope for actionable decisions.

</deferred>

---

*Phase: 31-Agent Playbooks*
*Context gathered: 2026-07-31*
*Auto: all gray areas resolved in single pass*
