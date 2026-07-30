# Phase 28: Instance Intelligence - Research

**Researched:** 2026-07-30
**Domain:** Composite MCP intelligence (scorecard, dependency graph, impact analysis, resource janitor) on Coolify 4.1.x REST — no new endpoints
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Tool surface packaging
- **D-01:** Ship a **new domain MCP tool `intelligence`** (action-based) — do **not** fold scorecard/graph/janitor into `diagnose`, `resource`, or `instance`. Composite v3.3 intelligence is its own catalog surface; `diagnose` stays triage (`app`/`server`/`scan`/`logs`). — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Actions on `intelligence`: **`scorecard`** · **`graph`** · **`impact`** · **`janitor`** (list/suggest, read-only) · **`cleanup`** (mutations only). Optional shared `instance` routing param on all live actions (Phase 15 parity). — **Reversibility:** costly — published action names.
- **D-03:** Do **not** add scorecard as `diagnose.scorecard` or graph as `resource.graph` — keeps diagnose/resource catalogs stable and avoids mixed read/destructive surfaces on `resource`.

#### Scorecard (INTEL-01 / INTEL-02)
- **D-04:** `intelligence.scorecard` is a **composite read** over existing Coolify 4.1.x data — no new REST. Factor set (minimum): **deployments** (recent failures / stuck), **backups** (where database backup status is already available via existing tools/client), **exited / stopped resources**, and **`diagnose.scan` summary** (reuse scan issue buckets). Researcher may add adjacent cheap factors only if already fetchable without new endpoints. — **Reversibility:** costly — agent-facing factor names.
- **D-05:** Response includes an overall severity rollup plus **per-factor breakdown** and a **findings[]** list with severity tags (`critical` | `high` | `info` parity with `diagnose.scan` buckets) and **structured recovery hints** (same envelope style as diagnose / `RECOVERY_HINTS` / follow-up hint objects — not free-text only). — **Reversibility:** costly — envelope contract.
- **D-06:** Scoring is **rule-based / deterministic** — no ML, no statistical anomaly detection (REQUIREMENTS Out of Scope). Exact numeric weights/thresholds → Claude's discretion within research bounds; prefer transparent named factors over opaque single scores.

#### Dependency graph & impact (GRAPH-01 / GRAPH-02)
- **D-07:** `intelligence.graph` builds edges from **live Coolify resource fields** that already express links — prefer explicit relations such as `database_uuid` parent links (already used in `database` delete dependents), service composition links where present, and other OpenAPI-backed UUID refs research confirms. — **Reversibility:** costly — graph semantics agents rely on.
- **D-08:** **Do not** invent primary edges via fuzzy name matching or env-var string heuristics as the main graph source (false positives). Optional secondary “hint” edges only if research finds a high-confidence, documented Coolify field; otherwise omit. — **Reversibility:** reversible for secondary hints; primary-edge rule is costly if flipped later.
- **D-09:** `intelligence.impact` answers “what breaks if resource X goes down” for **delete or restart** intent. Return **direct dependents first**, then **transitive** dependents within the same environment/project scope with a **depth cap** (default depth left to research/planner; must be finite). Restart impact may be a documented subset of delete impact when shared volumes/config differ — research clarifies. — **Reversibility:** costly — impact contract.
- **D-10:** Impact is **advisory** — it does not itself perform delete/restart. Callers still use existing domain tools (`application`/`service`/`database`/…) for mutations; impact is the preflight query.

#### Janitor (JANI-01 / JANI-02)
- **D-11:** `intelligence.janitor` is **read-only**: list orphaned, stopped, and long-exited candidates with **safe cleanup suggestions** (what to do + why + which tool/action). Default includes a clear “preview / no mutation” posture in the response. — **Reversibility:** costly — action semantics.
- **D-12:** Orphan / long-exited criteria (minimum): resource **stopped or exited**, and/or **no inbound dependents** in the graph, and/or **exited longer than a threshold**. Default threshold **7 days** exited/stopped unless research finds a better Coolify status clock; expose optional override param. Exact status field mapping → research. — **Reversibility:** reversible for threshold default.
- **D-13:** `intelligence.cleanup` performs destructive cleanup **only** with **`confirm: true`**. Without confirm → `COOLIFY_CONFIRM_REQUIRED` + recovery hints (SAF-01 / Phase 10 D-18 parity). Prefer **delete_preview / dry suggestion via `janitor` first**; cleanup mutates only listed UUIDs passed by the caller (no “clean everything” without explicit target list). — **Reversibility:** one-way for confirm gate contract (published safety).
- **D-14:** Safe delete defaults on cleanup mutations: **`delete_volumes=false`**, **`delete_configurations=false`** (SAF-02) unless caller explicitly opts in with confirmed flags. Cleanup should **reuse existing delete paths** on application/service/database tools (or shared helpers) — no parallel delete client. — **Reversibility:** costly — safety defaults agents expect.
- **D-15:** No auto-execute of destructive cleanup from scorecard/graph/janitor reads. Scorecard/janitor may **suggest** cleanup; only `cleanup` + confirm mutates.

#### Cross-cutting
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

### Deferred Ideas (OUT OF SCOPE)
- Manifest audit / env promote / drift fix hints → Phase 29
- Deploy preflight risk score / rollback → Phase 30
- Log Brain patterns, ops playbooks, smart recipes → Phase 31
- Service/DB log tails → v3.4 (Coolify 4.2+)
- Cross-instance fan-out queries → CTX-10
- ML/statistical anomaly detection → out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTEL-01 | Per-instance health scorecard with factor breakdown (deployments, backups, exited resources, diagnose.scan summary) | Composite `scorecard` action over `fetchResources` + `fetchServers` + per-app `fetchAppDeployments` + per-db `fetchDatabaseBackups` + `classifyIssues()` — see Standard Stack & Architecture Patterns |
| INTEL-02 | Severity-tagged findings with structured recovery hints | Reuse `classifyIssues` + `generateHints` / `FollowUpHint` envelope from `issue-classifier.ts` and `diagnose-hints.ts`; factor-level `findings[]` with `critical`/`high`/`info` |
| GRAPH-01 | Live dependency graph (application ↔ database ↔ service links) | Edges from `database_uuid`, `application_uuid` on flat `/resources`; service→child via `fetchService` nested `applications`/`databases` — see Graph Edge Inventory |
| GRAPH-02 | Impact analysis before delete or restart | Reverse adjacency from graph; `impact` action with `intent` param; advisory only — callers use domain delete/restart tools |
| JANI-01 | List orphaned, stopped, long-exited resources with safe cleanup suggestions | `janitor` read-only; criteria from graph in-degree + `status` + `updated_at` threshold |
| JANI-02 | Cleanup mutations require explicit confirm gate (SAF) | `cleanup` action with `confirm: true`; reuse `validateDeleteConfirm` pattern; SAF-02 defaults on delete flags |
</phase_requirements>

## Summary

Phase 28 adds a new **`intelligence` MCP domain tool** with five actions (`scorecard`, `graph`, `impact`, `janitor`, `cleanup`) that compose existing Coolify 4.1.x client calls and in-repo classification helpers. No new npm dependencies and no new Coolify REST endpoints are required.

The highest-risk design area is **dependency graph correctness**. Coolify exposes parent-child links inconsistently across endpoints: flat `GET /resources` carries `database_uuid` and `application_uuid` on child records, but **service composition is only available via `GET /services/{uuid}`** nested arrays — not on the flat resource list. The graph builder must use these verified fields only; fuzzy/env heuristics are explicitly forbidden (D-08).

Scorecard is a **multi-source composite read** with soft partial failure per factor (D-17), mirroring `diagnose.logs` soft partials. Deployment and backup factors require **N+1 API calls** (no global deployments list exists in 4.1.x [VERIFIED: spike-findings SKILL.md]). Planner must cap concurrency and document omitted coverage when fleets are large.

Janitor and cleanup split read vs mutate surfaces (D-11/D-13). Cleanup routes through existing `application`/`service`/`database` delete handlers — never a parallel HTTP delete path.

**Primary recommendation:** Implement `src/mcp/tools/intelligence.ts` + `src/utils/resource-graph.ts` (shared dependents/graph builder extracted from existing `delete_preview` patterns), register in `server.ts`, add co-located Vitest coverage and capability keys in `capabilities.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Health scorecard aggregation | API / Backend (MCP tool) | Coolify REST | MCP composes multiple Coolify reads; no client-side scoring |
| Dependency graph construction | API / Backend (MCP tool) | Coolify REST | Graph built from live API fields in tool layer |
| Impact analysis (advisory) | API / Backend (MCP tool) | — | Pure graph traversal; no mutation |
| Janitor candidate detection | API / Backend (MCP tool) | Coolify REST | Status + graph in-degree from live inventory |
| Destructive cleanup | API / Backend (MCP tool) | Existing domain delete handlers | Reuse confirm-gated delete paths (SAF-01/02) |
| Severity / recovery hints | API / Backend (shared utils) | — | `issue-classifier.ts`, `diagnose-hints.ts` already own hint generation |

## Project Constraints (from .cursor/rules/)

| Rule | Directive for Phase 28 |
|------|------------------------|
| spike-findings-awesome-coolify | **No stub tools** — omit factors/actions when Coolify 4.1.x has no endpoint |
| ponytail / honey | Minimum diff; reuse existing helpers; extract `resource-graph.ts` only if shared by graph+impact+janitor |
| gsd-ship-labels | N/A at research — applies at ship |
| graphify | Disabled in project config — do not depend on graphify for this phase |
| wigolo / context7 | Use for external doc verification only; implementation truth is repo + OpenAPI fixture |
| caveman | User-facing docs only; RESEARCH.md stays English |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | Phase is internal MCP tool code | All primitives exist in repo: `zod/v4`, Vitest, existing API client |

**Existing modules to compose (do not replace):**

| Module | Role |
|--------|------|
| `src/api/client.ts` | `fetchResources`, `fetchServers`, `fetchService`, `fetchAppDeployments`, `fetchDatabaseBackups`, `fetchBackupExecutions` |
| `src/utils/issue-classifier.ts` | `classifyIssues()` — scan buckets for scorecard + exited factor |
| `src/utils/diagnose-hints.ts` | `generateHints()` — structured `FollowUpHint` objects |
| `src/utils/errors.ts` | `COOLIFY_CONFIRM_REQUIRED`, `RECOVERY_HINTS`, `wrapMcpError` |
| `src/mcp/tools/shared-read-params.ts` | `createFlatActionSchema`, `parseWithInstanceRouting` |
| `src/mcp/tools/application.ts` / `service.ts` / `database.ts` | Delete + `delete_preview` patterns to reuse for cleanup |

### Supporting

| Module | When to Use |
|--------|-------------|
| `src/utils/resource-graph.ts` (new, recommended) | Shared graph build + reverse dependents for `graph`, `impact`, `janitor` |
| `src/mcp/capabilities.ts` | Add `intelligence_*` capability keys for `system.version` |
| `tests/fixtures/coolify-mixed-health.ts` | Scorecard/janitor unit test seed data |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `intelligence` tool | Extend `diagnose` / `resource` | **Rejected (D-01/D-03)** — mixes composite intelligence with triage/inventory catalogs |
| Inline graph in `intelligence.ts` | `src/utils/resource-graph.ts` | Inline OK for MVP; extract recommended — three actions share same adjacency logic |
| Call `handleDiagnoseAction({action:'scan'})` internally | Direct `classifyIssues()` | **Prefer direct call** — avoids double fetch + handler overhead |

**Installation:** None — no new packages.

**Version verification:** N/A (no new external packages).

## Package Legitimacy Audit

> Phase installs **no new external packages**. Audit skipped.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| — | — | N/A |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Graph Edge Inventory (Coolify 4.1.x)

Verified link sources for `intelligence.graph` primary edges:

| Edge type | Source field / endpoint | Direction | Confidence |
|-----------|------------------------|-----------|------------|
| Resource → Database | `database_uuid` on flat `/resources` items | child → parent DB | HIGH [VERIFIED: `database.ts:1481-1488`, `database.test.ts:1004-1027`] |
| Resource → Application | `application_uuid` on flat `/resources` items | child → parent app | HIGH [VERIFIED: `application.ts:2101-2108`] |
| Service → Applications/Databases | `GET /services/{uuid}` → `applications[]`, `databases[]` | parent service → children | HIGH [VERIFIED: `service.ts:1399-1417`] |
| Service ← child (flat list) | `service_uuid` on `/resources` | — | **ABSENT** [VERIFIED: `service.ts:1400` comment] |

OpenAPI `Application` / `Service` component schemas document `status`, `environment_id`, etc., but **do not document `database_uuid` / `application_uuid`** on the aggregated resources list — those fields are runtime shapes confirmed by existing delete_preview code, not OpenAPI-schema-backed [VERIFIED: grep `coolify_openapi.json` — no `database_uuid` in schemas].

**Recommendation:** Primary edges only from the three rows above. No secondary hint edges in v1 — no other high-confidence documented UUID link fields found.

## Architecture Patterns

### System Architecture Diagram

```
Agent MCP call (intelligence.*)
        │
        ▼
┌───────────────────────────────────────┐
│  intelligence.ts handler              │
│  parseWithInstanceRouting + switch    │
└───────────────┬───────────────────────┘
                │
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
 scorecard     graph      impact        janitor
 (composite)  (read)     (read)        (read)
    │           │           │              │
    │           └─────┬─────┘              │
    │                 ▼                    │
    │         resource-graph.ts            │
    │         (adjacency + dependents)     │
    │                 │                    │
    ▼                 ▼                    ▼
 fetchServers    fetchResources      fetchService (per service)
 fetchResources  (+ service detail)   (for service subgraph)
 fetchAppDeployments (per app, bounded)
 fetchDatabaseBackups (per db, bounded)
 classifyIssues()
 generateHints()
                │
                ▼ (cleanup only, confirm:true)
    application.delete / service.delete / database.delete
    (existing handlers, SAF-02 defaults)
```

### Recommended Project Structure

```
src/
├── mcp/
│   ├── tools/
│   │   ├── intelligence.ts        # schema, handlers, actionsCatalog
│   │   └── intelligence.test.ts   # co-located Vitest
│   ├── capabilities.ts            # + intelligence_* keys
│   └── server.ts                  # registerTool('intelligence', ...)
└── utils/
    └── resource-graph.ts          # buildGraph, findDependents, findOrphans
```

### Pattern 1: New domain tool (manifest / diagnose precedent)

**What:** `createFlatActionSchema` + `actionsCatalog` + `safetyFooter` + `handleIntelligenceAction` + `server.registerTool`.
**When:** Composite capability distinct from existing tools (D-01).
**Example:**

```typescript
// Pattern from src/mcp/tools/manifest.ts + src/mcp/server.ts
export const intelligenceActionsCatalog =
  'Actions: scorecard(format?, max_chars?, instance?) · graph(format?, max_chars?, instance?) · ' +
  'impact(uuid, type, intent?, max_depth?, instance?) · janitor(stopped_days?, format?, instance?) · ' +
  'cleanup(targets, confirm, delete_volumes?, delete_configurations?, instance?)';

export const intelligenceActionSchema = createFlatActionSchema(
  ['scorecard', 'graph', 'impact', 'janitor', 'cleanup'],
  { /* action fields */ instance: optionalInstanceParam.instance, /* ... */ },
  { scorecard: [...], graph: [...], impact: [...], janitor: [...], cleanup: [...] },
  { impact: ['uuid', 'type'], cleanup: ['targets', 'confirm'] },
);
```

### Pattern 2: Scorecard composite with soft partials

**What:** Each factor fetched via `Promise.allSettled`; failed factor → `factors.<name>.failed: { code, message }` while siblings succeed (D-17, diagnose.logs D-07).
**Factors (minimum per D-04):**

| Factor | Data source | Severity rules (deterministic) |
|--------|-------------|-------------------------------|
| `deployments` | `fetchResources` → apps → `fetchAppDeployments` per app (cap 50 apps, concurrency 5) | `high` if any app has latest deployment `failed` or stuck `in_progress` >24h; `info` if failures in last 7d but not latest |
| `backups` | `fetchResources` → databases → `fetchDatabaseBackups` per db (cap 50, concurrency 5) | `high` if production DB has zero enabled schedules; `info` if schedule disabled |
| `exited_resources` | `fetchResources` status filter | Count `exited*` / `stopped*` — map to `info` (same as scan) |
| `diagnose_scan` | `classifyIssues(fetchServers, fetchResources)` | Roll up bucket counts + top-N issues as findings |

**Overall severity:** `max(factor severities)` using order `critical > high > info > ok`.

**Overall score (discretionary):** Transparent deductive formula, e.g. start 100, −30 per critical finding, −15 per high, −5 per info (floor 0). Expose `score` + `score_breakdown` object — not a black box.

### Pattern 3: Resource graph builder

**What:** Single pass over flat resources + optional service detail enrichment.

```typescript
// Source: patterns from database.ts, application.ts, service.ts delete_preview
type GraphEdge = {
  from_uuid: string;
  from_type: string;
  to_uuid: string;
  to_type: string;
  relation: 'database_uuid' | 'application_uuid' | 'service_child';
};

function edgesFromFlatResources(resources: Record<string, unknown>[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const r of resources) {
    const childUuid = String(r.uuid ?? '');
    const childType = String(r.type ?? '');
    if (r.database_uuid) {
      edges.push({ from_uuid: childUuid, from_type: childType, to_uuid: String(r.database_uuid), to_type: 'database', relation: 'database_uuid' });
    }
    if (r.application_uuid) {
      edges.push({ from_uuid: childUuid, from_type: childType, to_uuid: String(r.application_uuid), to_type: 'application', relation: 'application_uuid' });
    }
  }
  return edges;
}

async function edgesFromServices(serviceUuids: string[], env: EnvConfig): Promise<GraphEdge[]> {
  // fetchService per uuid — required because flat /resources lacks service_uuid
}
```

**Graph response shape:** `{ nodes: [{uuid, type, name, status, project_uuid?, environment_id?}], edges: GraphEdge[], meta: { services_enriched: number } }`.

### Pattern 4: Impact analysis (advisory)

**What:** Reverse BFS from target UUID on dependency edges (child depends on parent → removing parent breaks children).

| `intent` | Dependents included |
|----------|---------------------|
| `delete` (default) | All transitive dependents up to `max_depth` |
| `restart` | Same dependents **except** resources whose only link is `database_uuid` to a restarting DB (document as advisory subset — apps may still fail until DB up) |

**Defaults (discretionary):** `max_depth: 3`, `intent: 'delete'`.

**Response:** `{ target: {uuid, type}, intent, direct_dependents: [...], transitive_dependents: [...], depth_cap: N, advisory: true, suggested_preflight: ['database.delete_preview', ...] }`.

### Pattern 5: Janitor (read-only) + cleanup (mutate)

**Janitor candidates** (union, deduped):

1. **Stopped/exited:** `status` starts with `exited` or `stopped` [VERIFIED: `issue-classifier.ts:99-117`, fixtures `exited:0`]
2. **Long-exited:** same status + `updated_at` older than `stopped_days` (default **7**)
3. **Orphan:** no inbound edges in graph (zero dependents referencing this UUID)

Each candidate includes:
```typescript
{
  uuid, type, name, status,
  reason: 'stopped' | 'long_exited' | 'orphan',
  suggestion: { tool: 'application', action: 'delete_preview', args: { uuid }, label: '...' },
  safe_to_delete: boolean, // false if has dependents
  preview_only: true
}
```

**Cleanup:** `targets: Array<{ type: 'application'|'service'|'database', uuid: string }>` + `confirm: true`. Without confirm → `COOLIFY_CONFIRM_REQUIRED`. Per target call existing delete handler with `delete_volumes ?? false`, `delete_configurations ?? false`. Return `{ results: [{ uuid, ok, deleted?, error? }] }` — batch in one confirm call (preferred per discretion).

### Anti-Patterns to Avoid

- **Folding into diagnose/resource** — violates D-01/D-03; breaks agent catalog stability.
- **Fuzzy graph edges from env var names** — violates D-08; high false-positive rate.
- **Auto-cleanup from scorecard/janitor reads** — violates D-15.
- **Parallel raw HTTP delete in intelligence.ts** — violates D-14; bypasses SAF defaults.
- **Stub deployment fleet endpoint** — global deployments list absent in 4.1.x; do not invent.
- **Using `service_uuid` on flat resources** — field absent; graph would be empty/wrong.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scan issue classification | Custom severity rules | `classifyIssues()` | Already maps status → critical/high/info + hints |
| Recovery hints | Free-text suggestions | `generateHints()` → `FollowUpHint` | Structured tool/action/args for agents |
| Confirm gate | Ad-hoc boolean checks | `validateDeleteConfirm` pattern from application/service/database | Published SAF-01 contract |
| Resource inventory | New list endpoint | `fetchResources` + `fetchServers` | Existing client + projections |
| Graph edge discovery | Name/env matching | UUID fields + `fetchService` nested arrays | Only verified Coolify link shapes |
| MCP action schema | Top-level discriminatedUnion | `createFlatActionSchema` | Phase 19 DX convention |

**Key insight:** This phase is **composition**, not new infrastructure. The value is correlating existing delete_preview adjacency logic into a graph and layering deterministic scoring on existing classifiers.

## Common Pitfalls

### Pitfall 1: Empty service subgraph

**What goes wrong:** Graph shows services as isolated nodes with no children.
**Why:** Flat `/resources` has no `service_uuid`; children only on `GET /services/{uuid}`.
**How to avoid:** For each `type === 'service'` in resources, call `fetchService` (bounded concurrency). Document `meta.services_enriched`.
**Warning signs:** Integration tests pass with mocked flat-only data but live graph misses app↔service links.

### Pitfall 2: Scorecard N+1 timeout on large fleets

**What goes wrong:** Scorecard exceeds MCP timeout when fleet has 200+ apps/databases.
**Why:** Per-resource deployment/backup fetches.
**How to avoid:** Cap sampled resources (e.g. 50 apps, 50 databases); set `factors.deployments.partial: true` with `sampled_count` when capped.
**Warning signs:** CI unit tests fast; live instance slow/hangs.

### Pitfall 3: Cleanup bypasses SAF-02

**What goes wrong:** `delete_volumes: true` becomes default on janitor cleanup.
**Why:** Copy-paste from caller args without `?? false` defaults.
**How to avoid:** Mirror `application.ts:2051-2052` defaults exactly.
**Warning signs:** Missing test for default false on cleanup without explicit flags.

### Pitfall 4: Restart impact over-reports

**What goes wrong:** Restart impact lists all DB dependents as "will break" identically to delete.
**Why:** Same graph traversal for both intents.
**How to avoid:** Document `intent: restart` as advisory subset; optionally tag dependents with `impact_level: 'outage' | 'degraded'`.
**Warning signs:** Agents avoid restarts due to delete-equivalent impact lists.

### Pitfall 5: Orphan false positives for databases

**What goes wrong:** Standalone databases flagged orphan when apps connect via env not UUID.
**Why:** D-08 forbids env heuristics — only UUID edges count.
**How to avoid:** Document limitation in janitor response `coverage_note`; do not add env parsing.
**Warning signs:** User reports "not orphan" — expected under UUID-only rule.

## Code Examples

### Scorecard factor soft partial

```typescript
// Source: diagnose.ts diagnose_failed pattern (lines 547-559)
const [deploySettled, backupSettled, scanSettled] = await Promise.allSettled([
  collectDeploymentFactor(env),
  collectBackupFactor(env),
  Promise.resolve(collectScanFactor(servers, resources)),
]);

const factors: Record<string, unknown> = {};
if (deploySettled.status === 'fulfilled') {
  factors.deployments = deploySettled.value;
} else {
  factors.deployments = { failed: toFactorError(deploySettled.reason) };
}
```

### Dependents filter (existing pattern to extract)

```typescript
// Source: database.ts handleDatabaseDeletePreview (lines 1481-1488)
const childResources = rawResources
  .filter(isRecord)
  .filter((resource) => String(resource.database_uuid ?? '') === uuid)
  .map((resource) => ({
    uuid: String(resource.uuid ?? ''),
    name: resource.name != null ? String(resource.name) : undefined,
    type: resource.type != null ? String(resource.type) : undefined,
  }));
```

### Confirm gate (existing pattern)

```typescript
// Source: application.ts validateDeleteConfirm pattern
function validateDeleteConfirm(confirm: boolean | undefined, uuid: string): void {
  if (confirm !== true) {
    throw new CoolifyApiError({
      code: 'COOLIFY_CONFIRM_REQUIRED',
      message: `Action requires confirm:true for uuid ${uuid}`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    });
  }
}
```

### Status detection for janitor

```typescript
// Source: issue-classifier.ts (lines 99-117)
const isStopped = (status: string) =>
  status.startsWith('exited') || status.startsWith('stopped');

const isLongExited = (status: string, updatedAt: string, days: number) =>
  isStopped(status) &&
  Date.now() - Date.parse(updatedAt) > days * 24 * 60 * 60 * 1000;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-tool delete_preview only | Fleet-level graph + impact | Phase 28 | Agents get preflight without per-domain delete_preview calls |
| diagnose.scan only | Scorecard with deployment/backup factors | Phase 28 | Richer health view; scan becomes one factor |
| Manual orphan hunting | intelligence.janitor | Phase 28 | Structured suggestions with confirm-gated cleanup |

**Deprecated/outdated:**
- Extending `diagnose` with scorecard — rejected in D-01/D-03.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `updated_at` is best proxy for long-exited duration (no `exited_at` in API) | Janitor | Threshold inaccurate; may need status_detail parsing |
| A2 | Deployment factor can sample first 50 apps without missing critical fleet failures | Scorecard | Large fleets may hide failures outside sample |
| A3 | `intent: restart` impact can share graph with delete minus DB-link tagging | Impact | Over/under-reporting restart blast radius |
| A4 | Batch cleanup via sequential delete handler calls is acceptable | Cleanup | Partial batch failure needs per-item error envelope |
| A5 | No additional UUID link fields beyond database_uuid, application_uuid, service nested | Graph | Missing edges if Coolify adds new link fields |

## Open Questions

1. **Capability key granularity**
   - What we know: D-19 leaves naming to discretion; Phase 24 used per-feature keys (`diagnose_logs`).
   - Recommendation: Five keys — `intelligence_scorecard`, `intelligence_graph`, `intelligence_impact`, `intelligence_janitor`, `intelligence_cleanup` — all `supported: true`, `coolify_min_version: '4.1.2'`, note "MCP composite".

2. **OpenAPI coverage row for intelligence actions**
   - What we know: D-19 requires catalog + README; openapi-coverage tests exist (Phase 23).
   - Recommendation: Add intelligence actions to coverage map as MCP-only composite (like `diagnose_logs`), not Coolify REST paths.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | (project engines) | — |
| Vitest | Unit tests | ✓ | ^4.1.10 | — |
| Coolify 4.1.x API | All live actions | ✓ (CI mocks) | 4.1.2 target | Fixture-only unit tests |
| `COOLIFY_URL` + `COOLIFY_TOKEN` | Integration/manual | env-dependent | — | Mock in Vitest |

**Missing dependencies with no fallback:** none (phase is code + mocked tests).

**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/intelligence.test.ts -x` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTEL-01 | scorecard returns 4 factors + overall severity | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t scorecard -x` | ❌ Wave 0 |
| INTEL-02 | findings include severity + FollowUpHint shape | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t findings -x` | ❌ Wave 0 |
| GRAPH-01 | graph edges from database_uuid + service nested | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t graph -x` | ❌ Wave 0 |
| GRAPH-02 | impact returns direct then transitive dependents | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t impact -x` | ❌ Wave 0 |
| JANI-01 | janitor lists stopped/orphan with suggestions | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t janitor -x` | ❌ Wave 0 |
| JANI-02 | cleanup without confirm → COOLIFY_CONFIRM_REQUIRED | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t cleanup -x` | ❌ Wave 0 |
| SAF-02 | cleanup defaults delete_volumes/configurations false | unit | same as JANI-02 | ❌ Wave 0 |
| D-17 | scorecard soft partial when one factor rejects | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t partial -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/mcp/tools/intelligence.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/mcp/tools/intelligence.ts` — tool implementation
- [ ] `src/mcp/tools/intelligence.test.ts` — all REQ coverage above
- [ ] `src/utils/resource-graph.ts` — graph + dependents helper (recommended)
- [ ] `src/mcp/server.ts` — register `intelligence` tool
- [ ] `src/mcp/capabilities.ts` — intelligence capability keys
- [ ] `tests/openapi-coverage.test.ts` — add intelligence catalog rows (if enforced)
- [ ] README EN/DE short note + actions catalog string (D-19)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Delegated to Coolify API token |
| V3 Session Management | no | Stateless MCP |
| V4 Access Control | yes | `confirm: true` gate on cleanup; no bypass |
| V5 Input Validation | yes | Zod `createFlatActionSchema` + UUID validation |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Destructive cleanup without confirmation | Tampering | `COOLIFY_CONFIRM_REQUIRED` + recovery hints (SAF-01) |
| Accidental volume wipe | Destruction | `delete_volumes ?? false`, `delete_configurations ?? false` (SAF-02) |
| Agent tricked into mass delete | Elevation | Explicit `targets[]` list required; no `clean_all` action |
| False dependency graph → wrong delete | Spoofing/Tampering | UUID-only edges (D-08); advisory impact label |
| Partial failure data leak | Info disclosure | `redactSecrets()` on error messages (existing pattern) |

## Sources

### Primary (HIGH confidence)

- `src/mcp/tools/database.ts` — `database_uuid` dependents filter
- `src/mcp/tools/application.ts` — `application_uuid` dependents filter
- `src/mcp/tools/service.ts` — `fetchService` nested children; flat list lacks `service_uuid`
- `src/utils/issue-classifier.ts` — scan buckets + status mapping
- `src/mcp/tools/diagnose.ts` — scan handler + soft partial pattern
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; 4.1.x endpoint truth
- `.planning/phases/28-instance-intelligence/28-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

- `docs/coolify_openapi.json` — Application/Service schemas (status fields); backup endpoints
- `tests/fixtures/coolify-mixed-health.ts` — `exited:0` status shape

### Tertiary (LOW confidence)

- None elevated to recommendations without codebase verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns exist in repo
- Architecture: HIGH — graph edge sources verified in delete_preview code
- Pitfalls: MEDIUM — N+1 performance and restart-impact semantics need execution tuning

**Research date:** 2026-07-30
**Valid until:** 2026-08-30 (stable MCP composition patterns; Coolify 4.1.x API stable)
