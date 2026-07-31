# Phase 28: Instance Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 28-Instance Intelligence
**Mode:** `--batch --auto` (batch overlay no-op; auto selected recommended options)
**Areas discussed:** Tool surface packaging, Scorecard factors & envelope, Dependency edge inference, Impact analysis depth, Janitor criteria & cleanup confirm

---

## Tool surface packaging

| Option | Description | Selected |
|--------|-------------|----------|
| New `intelligence` tool with scorecard/graph/impact/janitor/cleanup | Composite v3.3 domain; diagnose stays triage | ✓ |
| Extend `diagnose` + `resource` + new `janitor` | Split across existing tools | |
| Everything under `resource.*` | Mix read graph with inventory tool | |

**User's choice:** [auto] New `intelligence` tool (recommended — manifest-style new domain)
**Notes:** Matches Phase 17 “new tool when composite/distinct”; avoids bloating diagnose/resource catalogs.

---

## Scorecard factors & envelope

| Option | Description | Selected |
|--------|-------------|----------|
| Compose deployments + backups + exited + diagnose.scan; severity + recovery hints | Deterministic factors, scan bucket parity | ✓ |
| Single opaque health number only | Harder for agents to act | |
| ML / anomaly scoring | Out of scope per REQUIREMENTS | |

**User's choice:** [auto] Composite factors + findings with recovery hints
**Notes:** D-04..D-06; no ML.

---

## Dependency edge inference

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Coolify UUID link fields (`database_uuid`, etc.) | High confidence; reuse database dependents pattern | ✓ |
| Fuzzy name / env-string heuristics as primary | False positives | |
| Manifest-only edges | Stale vs live GRAPH-01 | |

**User's choice:** [auto] Live explicit relations only as primary edges
**Notes:** Secondary fuzzy edges rejected as primary source.

---

## Impact analysis depth

| Option | Description | Selected |
|--------|-------------|----------|
| Direct + transitive within env/project, finite depth cap; advisory only | Covers “what breaks” without mutating | ✓ |
| Direct dependents only | Weaker GRAPH-02 | |
| Impact performs delete/restart | Scope creep / unsafe | |

**User's choice:** [auto] Advisory impact with transitive depth cap
**Notes:** Mutations stay on existing domain tools.

---

## Janitor criteria & cleanup confirm

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only `janitor` + `cleanup` with confirm:true, SAF-02 defaults, reuse delete paths | JANI-01/02 + SAF parity | ✓ |
| Auto-cleanup from scorecard without confirm | Forbidden by REQUIREMENTS | |
| Janitor mutations without target UUID list | Too broad | |

**User's choice:** [auto] Preview via janitor; cleanup requires confirm + explicit targets
**Notes:** Default long-exited threshold 7 days (discretion on exact status fields).

---

## Claude's Discretion

- Zod field names, score weights, impact depth default, batch cleanup shape, shared dependents helper extraction, capability key strings, tool description wording.

## Deferred Ideas

- Phase 29 Drift & Heal, Phase 30 Deploy Guard, Phase 31 Playbooks/Log Brain/Recipes, v3.4 service/DB logs, CTX-10 fan-out, ML anomaly detection.
