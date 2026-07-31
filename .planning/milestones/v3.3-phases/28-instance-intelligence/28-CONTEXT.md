# Phase 28: Instance Intelligence - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** `--batch --auto` (batch overlay no-op under auto; single-pass auto decisions)

<domain>
## Phase Boundary

Agent can assess **instance health** (scorecard + severity-tagged findings with recovery hints), build a **live dependency graph** and **impact analysis** before delete/restart, and list **orphaned / stopped / long-exited** resources with **safe cleanup suggestions** whose destructive mutations require an explicit SAF confirm gate.

In scope: INTEL-01, INTEL-02, GRAPH-01, GRAPH-02, JANI-01, JANI-02.

Out of scope this phase: Drift & Heal (Phase 29), Deploy Guard (Phase 30), Log Brain / Playbooks / Smart Recipes (Phase 31), service/DB log tails (v3.4), ML anomaly detection, cross-instance fan-out (CTX-10), new Coolify REST endpoints / stubs for absent APIs.

</domain>

<decisions>
## Implementation Decisions

### Tool surface packaging
- **D-01:** Ship a **new domain MCP tool `intelligence`** (action-based) — do **not** fold scorecard/graph/janitor into `diagnose`, `resource`, or `instance`. Composite v3.3 intelligence is its own catalog surface; `diagnose` stays triage (`app`/`server`/`scan`/`logs`). — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Actions on `intelligence`: **`scorecard`** · **`graph`** · **`impact`** · **`janitor`** (list/suggest, read-only) · **`cleanup`** (mutations only). Optional shared `instance` routing param on all live actions (Phase 15 parity). — **Reversibility:** costly — published action names.
- **D-03:** Do **not** add scorecard as `diagnose.scorecard` or graph as `resource.graph` — keeps diagnose/resource catalogs stable and avoids mixed read/destructive surfaces on `resource`.

### Scorecard (INTEL-01 / INTEL-02)
- **D-04:** `intelligence.scorecard` is a **composite read** over existing Coolify 4.1.x data — no new REST. Factor set (minimum): **deployments** (recent failures / stuck), **backups** (where database backup status is already available via existing tools/client), **exited / stopped resources**, and **`diagnose.scan` summary** (reuse scan issue buckets). Researcher may add adjacent cheap factors only if already fetchable without new endpoints. — **Reversibility:** costly — agent-facing factor names.
- **D-05:** Response includes an overall severity rollup plus **per-factor breakdown** and a **findings[]** list with severity tags (`critical` | `high` | `info` parity with `diagnose.scan` buckets) and **structured recovery hints** (same envelope style as diagnose / `RECOVERY_HINTS` / follow-up hint objects — not free-text only). — **Reversibility:** costly — envelope contract.
- **D-06:** Scoring is **rule-based / deterministic** — no ML, no statistical anomaly detection (REQUIREMENTS Out of Scope). Exact numeric weights/thresholds → Claude's discretion within research bounds; prefer transparent named factors over opaque single scores.

### Dependency graph & impact (GRAPH-01 / GRAPH-02)
- **D-07:** `intelligence.graph` builds edges from **live Coolify resource fields** that already express links — prefer explicit relations such as `database_uuid` parent links (already used in `database` delete dependents), service composition links where present, and other OpenAPI-backed UUID refs research confirms. — **Reversibility:** costly — graph semantics agents rely on.
- **D-08:** **Do not** invent primary edges via fuzzy name matching or env-var string heuristics as the main graph source (false positives). Optional secondary “hint” edges only if research finds a high-confidence, documented Coolify field; otherwise omit. — **Reversibility:** reversible for secondary hints; primary-edge rule is costly if flipped later.
- **D-09:** `intelligence.impact` answers “what breaks if resource X goes down” for **delete or restart** intent. Return **direct dependents first**, then **transitive** dependents within the same environment/project scope with a **depth cap** (default depth left to research/planner; must be finite). Restart impact may be a documented subset of delete impact when shared volumes/config differ — research clarifies. — **Reversibility:** costly — impact contract.
- **D-10:** Impact is **advisory** — it does not itself perform delete/restart. Callers still use existing domain tools (`application`/`service`/`database`/…) for mutations; impact is the preflight query.

### Janitor (JANI-01 / JANI-02)
- **D-11:** `intelligence.janitor` is **read-only**: list orphaned, stopped, and long-exited candidates with **safe cleanup suggestions** (what to do + why + which tool/action). Default includes a clear “preview / no mutation” posture in the response. — **Reversibility:** costly — action semantics.
- **D-12:** Orphan / long-exited criteria (minimum): resource **stopped or exited**, and/or **no inbound dependents** in the graph, and/or **exited longer than a threshold**. Default threshold **7 days** exited/stopped unless research finds a better Coolify status clock; expose optional override param. Exact status field mapping → research. — **Reversibility:** reversible for threshold default.
- **D-13:** `intelligence.cleanup` performs destructive cleanup **only** with **`confirm: true`**. Without confirm → `COOLIFY_CONFIRM_REQUIRED` + recovery hints (SAF-01 / Phase 10 D-18 parity). Prefer **delete_preview / dry suggestion via `janitor` first**; cleanup mutates only listed UUIDs passed by the caller (no “clean everything” without explicit target list). — **Reversibility:** one-way for confirm gate contract (published safety).
- **D-14:** Safe delete defaults on cleanup mutations: **`delete_volumes=false`**, **`delete_configurations=false`** (SAF-02) unless caller explicitly opts in with confirmed flags. Cleanup should **reuse existing delete paths** on application/service/database tools (or shared helpers) — no parallel delete client. — **Reversibility:** costly — safety defaults agents expect.
- **D-15:** No auto-execute of destructive cleanup from scorecard/graph/janitor reads. Scorecard/janitor may **suggest** cleanup; only `cleanup` + confirm mutates.

### Cross-cutting (carry-forward, not re-opened)
- **D-16:** Single-instance scope per call via optional `instance` routing — **no cross-instance fan-out** (CTX-10 deferred).
- **D-17:** Structured errors + recovery hints; soft partials for composite reads when one factor fails (diagnose.logs D-07 spirit) — overall call can still return other factors with failure flags.
- **D-18:** No stub tools / no fake Coolify endpoints (spike mandate). If a desired factor has no API, omit the factor and document in coverage — do not invent data.
- **D-19:** Capability / catalog / README EN+DE updates follow Phase 24–26 parity when actions ship (actions catalog + short docs note). Exact capability key names → Claude's discretion (e.g. `intelligence_scorecard`).

### Claude's Discretion
- Exact Zod field names for scorecard factors, impact `intent` (`delete` | `restart`), janitor threshold param, cleanup target list shape.
- Numeric score formula / weights within D-06.
- Depth-cap default for transitive impact.
- Whether cleanup supports batch UUIDs in one confirm call vs one UUID per call (prefer batch with per-item results if existing delete helpers allow safely).
- Whether to extract shared “dependents of UUID” helper from `database.ts` into `src/utils/` for graph/impact reuse.
- Exact MCP tool description / safety footer wording.
- Placement of capability flags in `capabilities.ts` / `system.version`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 28 goal, success criteria 1–5; Phases 29–31 boundaries
- `.planning/REQUIREMENTS.md` — INTEL-01/02, GRAPH-01/02, JANI-01/02; Out of Scope (confirm mandatory, no ML, no fan-out)
- `.planning/PROJECT.md` — v3.3 Agent Intelligence; composite on Coolify 4.1.x
- `.planning/STATE.md` — current position Phase 28

### Prior phase context (patterns to reuse)
- `.planning/milestones/v2.0-phases/10-application-crud-safety/10-CONTEXT.md` — SAF-01 confirm, SAF-02 safe delete defaults, structured errors
- `.planning/milestones/v3.2-phases/26-diagnose-logs-incident-dx/26-CONTEXT.md` — diagnose action extension patterns, soft partials, scan/severityity, recovery hints
- `.planning/milestones/v3.0-phases/17-local-manifest-sync/17-CONTEXT.md` — new domain tool when composite capability is distinct; confirm on destructive ops
- `.planning/milestones/v3.0-phases/15-multi-instance-registry-routing/15-CONTEXT.md` — `instance` routing, soft-start / `COOLIFY_NO_INSTANCE`

### Implementation sources
- `src/mcp/tools/diagnose.ts` — `scan` issue buckets (`critical`/`high`/`info`); compose into scorecard
- `src/mcp/tools/resource.ts` — live resource list/find for graph/janitor inventory
- `src/mcp/tools/database.ts` — dependents via `database_uuid` (graph/impact seed)
- `src/mcp/tools/application.ts` · `src/mcp/tools/service.ts` — delete/confirm paths to reuse for cleanup
- `src/utils/issue-classifier.ts` · `src/utils/diagnose-hints.ts` — severity + hint generation
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `RECOVERY_HINTS`
- `src/mcp/server.ts` — tool registration
- `src/mcp/capabilities.ts` · `src/mcp/tools/system.ts` — capability surface parity

### Conventions / spikes / maps
- `.planning/codebase/CONVENTIONS.md` — action Zod schemas, ESM `.js` imports
- `.planning/codebase/TESTING.md` — Vitest co-located `*.test.ts`
- `.planning/codebase/CONCERNS.md` — known repo concerns (read if touching CI/docs)
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; 4.1.x endpoint truth
- `docs/coolify_openapi.json` — verify link/dependent fields before inventing edges

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `diagnose.scan` → scorecard factor + findings seed
- `handleResourceAction` list/find → inventory for graph/janitor
- Database dependents filter on `database_uuid` → GRAPH edge/impact seed
- Confirm helpers (`validateDeleteConfirm` / `COOLIFY_CONFIRM_REQUIRED`) across CRUD tools → JANI-02
- `generateHints` / issue-classifier → INTEL-02 recovery hints
- `createFlatActionSchema` pattern for new `intelligence` tool

### Established Patterns
- Action-based domain tools; new tool when domain is composite/distinct (manifest precedent)
- Destructive ops: `confirm: true` or structured confirm error
- Soft partial success for multi-source composites
- No tools without working Coolify endpoints
- Optional `instance` routing on live API actions

### Integration Points
- Register `intelligence` in `src/mcp/server.ts`
- Actions catalog + README EN/DE short note
- Capability flags via `system.version`
- Co-located `intelligence.test.ts`; optional integration coverage for confirm gate
- Downstream Phase 29–30 will consume scorecard/impact concepts — keep envelopes agent-stable

</code_context>

<specifics>
## Specific Ideas

Auto mode (`--auto`): recommended defaults chosen to match prior SAF + diagnose + manifest precedents. No user free-text references beyond roadmap/requirements.

</specifics>

<deferred>
## Deferred Ideas

- Manifest audit / env promote / drift fix hints → Phase 29
- Deploy preflight risk score / rollback → Phase 30
- Log Brain patterns, ops playbooks, smart recipes → Phase 31
- Service/DB log tails → v3.4 (Coolify 4.2+)
- Cross-instance fan-out queries → CTX-10
- ML/statistical anomaly detection → out of scope

None — discussion stayed within phase scope for actionable decisions.

</deferred>

---

*Phase: 28-Instance Intelligence*
*Context gathered: 2026-07-30*
*Auto: all gray areas resolved in single pass*
