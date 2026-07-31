# Phase 31: Agent Playbooks - Research

**Researched:** 2026-07-31
**Domain:** Rule-based log pattern analysis, MCP playbook prompts, and live-catalog stack recommendations on Coolify 4.1.x — composite MCP actions only, no new REST
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Tool surface packaging — Log Brain
- **D-01:** Extend existing domain tool **`diagnose`** with action **`analyze`** — do **not** create a new top-level `log-brain` / `brain` MCP tool and do **not** fold log analysis into `intelligence` (fleet scorecard) or `deployment`. Log Brain is triage-adjacent to `diagnose.logs` / `diagnose.scan`. — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Keep **`diagnose.logs`** as the raw/bounded log fetch path. **`diagnose.analyze`** consumes the same runtime log source (reuse fetch + `buildRuntimeLogPayload` / log-helpers) then applies rule patterns and returns structured findings — do not redefine `logs` as analyze. — **Reversibility:** costly — two agent-facing contracts.

#### Log Brain analysis (BRAIN-01 / BRAIN-02)
- **D-03:** Analysis targets **application runtime logs** on Coolify 4.1.x via existing application log fetch used by `diagnose.logs`. Optional: when `deployment_uuid` is provided, also scan **build logs** for overlapping patterns. **No service/DB log analysis** this phase (endpoints absent — v3.4). — **Reversibility:** costly — scope agents rely on.
- **D-04:** Pattern set (minimum, named): **OOM**, **5xx spike**, **crash loop**, **connection refused**. Matching is **rule-based / deterministic** (regex / line heuristics) — no ML, no statistical anomaly detection. Exact regexes and spike-window heuristics → Claude's discretion within research bounds. — **Reversibility:** reversible for individual pattern strings; named set is costly if removed.
- **D-05:** Response includes **matched_patterns[]** (or equivalent) with **severity** tags (`critical` | `high` | `info` parity with `diagnose.scan` / Phase 28 scorecard) and **structured next-action hints** linking to diagnose flows and playbook prompts (e.g. `diagnose.app`, `diagnose.logs`, prompt `incident` / `rollback`) — same envelope spirit as `FollowUpHint` / `RECOVERY_HINTS`, not free-text-only. — **Reversibility:** costly — envelope contract.
- **D-06:** Analyze is **read-only / advisory**. It never restarts, redeploys, or rolls back. Soft partials when log fetch fails — return structured error + recovery hints (Phase 26/28 spirit). Empty logs → hint (reuse `EMPTY_RUNTIME_LOGS_HINT` spirit), not a fake pattern match. — **Reversibility:** one-way for advisory-only contract (published safety).

#### Ops Playbooks (PLAY-01 / PLAY-02)
- **D-07:** Ship playbooks as **parameterized MCP prompts** in `src/mcp/prompts.ts` — **not** a new mutating “playbook runner” tool that auto-executes multi-step mutations. Prompts guide the agent to call existing atomic tools. — **Reversibility:** costly — prompt catalog contract.
- **D-08:** Prompt set for this phase: **upgrade existing `incident`** (wire Log Brain `diagnose.analyze` + Phase 30 preflight/rollback awareness) + **add `rollback`** + **add `maintenance-window`**. Do **not** duplicate a second incident prompt under a new name. Keep existing `deploy` / `diagnose` / `new-project` prompts; update them only if a one-line cross-link to analyze/rollback is needed. — **Reversibility:** costly — published prompt names.
- **D-09:** **`rollback` prompt** composes `deployment.preflight` (advisory) → `deployment.rollback` with **`confirm: true`** only after explicit human approval (SAF-01 / Phase 30). Document `COOLIFY_ROLLBACK_UNAVAILABLE` / unavailable cases from Phase 30 research. — **Reversibility:** one-way for confirm gate in playbook text.
- **D-10:** **`maintenance-window` prompt** guides stop → work → start/restart (and optional deploy) via existing `application`/`service`/`database` lifecycle actions; no new lifecycle APIs. Emphasize confirm on destructive ops and single-instance scope. — **Reversibility:** reversible for step wording.
- **D-11:** **PLAY-02:** Playbooks **compose existing atomic tools only** — no duplicate API client implementations inside prompts or new parallel clients. Prompts reference tool/action names already shipped (diagnose, application, deployment, emergency, recipe, intelligence as needed). — **Reversibility:** costly — composition rule.

#### Smart Recipes (SREC-01 / SREC-02)
- **D-12:** Extend existing domain tool **`recipe`** with action **`recommend`** — do **not** create a new top-level `smart-recipe` tool and do **not** ship recommend as prompt-only (agents need a structured plan payload). — **Reversibility:** costly — published action name.
- **D-13:** `recipe.recommend` accepts a **stack description** (free-text and/or structured hints, e.g. "Next.js + Postgres") and returns a **one-click service + env + deploy plan** derived from the **live `service.list-types` catalog** (same client path `create-one-click` already uses). **No hardcoded YAML templates** as the catalog source of truth (SREC-02). — **Reversibility:** costly — recommend semantics.
- **D-14:** Recommend is **advisory by default** — returns plan steps naming follow-up recipe actions (`create-one-click`, `create-app-db`, `create-git-app`) and suggested env keys. It does **not** mutate Coolify state; caller runs create actions separately (with their existing confirms/validation). Unknown / unmappable stacks → structured error + hint to call `service.list-types`. — **Reversibility:** one-way for advisory-only default.
- **D-15:** Prefer **exact / high-confidence catalog ID matches** over fuzzy name guessing when mapping stack phrases to one-click types. Fuzzy ranking allowed only as ranked suggestions with confidence; never invent a type ID not present in live catalog. — **Reversibility:** costly — false-positive risk if flipped to aggressive fuzzy.

#### Cross-cutting (carry-forward, not re-opened)
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

### Deferred Ideas (OUT OF SCOPE)

- Service/DB bounded log tails → v3.4 (SVC-04/05; Coolify 4.2+)
- Cross-instance fan-out queries → CTX-10
- ML/statistical anomaly detection → out of scope
- Auto-execute multi-step playbooks without confirm → out of scope (SAF-01)
- Hardcoded offline YAML stack catalogs as SoT → rejected by SREC-02
- New Coolify REST for “native rollback” / log anomaly APIs → not in OpenAPI; compose existing only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRAIN-01 | Agent can analyze existing application runtime logs for known patterns (OOM, 5xx spike, crash loop, connection refused) | `diagnose.analyze` on `GET /applications/{uuid}/logs` via `fetchApplicationLogs` + `src/utils/log-patterns.ts` deterministic matchers |
| BRAIN-02 | Analysis returns severity, matched patterns, and suggested next actions (links to diagnose/playbook flows) | `matched_patterns[]` with `severity` + `hint: FollowUpHint`; playbook prompt names in labels |
| PLAY-01 | Parameterized MCP prompts exist for incident response, rollback, and maintenance-window flows | Upgrade `incident`; add `rollback` + `maintenance-window` in `prompts.ts`; extend `prompts.test.ts` |
| PLAY-02 | Playbooks compose existing atomic tools — no duplicate API client implementations | Prompt bodies cite only `diagnose.*`, `deployment.*`, `application.*`, `service.*`, `database.*`, `emergency.*`, `recipe.*` |
| SREC-01 | Agent can request a stack recommendation and receive one-click service + env + deploy plan | `recipe.recommend` returns `plan_steps[]` with `recipe_action`, `suggested_params`, `env_keys` |
| SREC-02 | Recommendations use live `service.list-types` catalog data, not hardcoded YAML templates | `fetchServiceTemplates(env)` — same path as `service.list-types` and `create-one-click` validation |
</phase_requirements>

## Summary

Phase 31 completes v3.3 Agent Intelligence with three composite surfaces on **existing MCP tools** — no 19th top-level tool, no new Coolify REST, no ML. **`diagnose.analyze`** (BRAIN-01/02) fetches bounded application runtime logs the same way as `diagnose.logs` [VERIFIED: `src/mcp/tools/diagnose.ts:591-608`, `src/api/client.ts:247-255`, `docs/coolify_openapi.json` `/applications/{uuid}/logs`], runs four named rule matchers, and returns `matched_patterns[]` with severity buckets aligned to `classifyIssues` / Phase 28 scorecard (`critical` | `high` | `info`) plus `FollowUpHint` next actions. Optional `deployment_uuid` adds build-log scan via `processDeploymentBuildLogs` [VERIFIED: `diagnose.ts:566-580`]. **`recipe.recommend`** (SREC-01/02) maps a stack phrase to advisory plan steps using live `fetchServiceTemplates` [VERIFIED: `src/utils/service-templates.ts`] — never offline YAML SoT. **Ops playbooks** (PLAY-01/02) are MCP prompts only: upgrade `incident` with `diagnose.analyze` + `deployment.preflight`; add `rollback` (preflight → preview → `confirm:true` rollback per Phase 30 [VERIFIED: `30-RESEARCH.md`, `deploy-preflight.ts:executeDeploymentRollback`]); add `maintenance-window` (stop → work → start/restart with confirm gates).

**Primary recommendation:** 4-wave plan mirroring Phase 28–30 — Wave 0 `it.fails` scaffolds; Wave 1 `log-patterns.ts` + `diagnose.analyze`; Wave 2 prompts; Wave 3 `recipe.recommend`; Wave 4 capabilities + README EN/DE + coverage. Extract `src/utils/log-patterns.ts` for testable matchers (ponytail: one file earns its keep at 4 patterns + fixtures).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Log fetch + slice/cap | API / Backend (MCP `diagnose.analyze`) | Coolify `GET /applications/{uuid}/logs` | Same transport as `diagnose.logs`; no client-side log store |
| Rule pattern matching | API / Backend (`log-patterns.ts`) | — | Deterministic heuristics in MCP layer; not browser/ML |
| Findings + recovery hints | API / Backend (handler) | `FollowUpHint` envelope | Agents consume structured tool/action args |
| Playbook orchestration | MCP prompt layer (`prompts.ts`) | Atomic MCP tools | Prompts guide; no playbook-runner mutations |
| Stack NL → catalog mapping | API / Backend (`recipe.recommend`) | CDN/GitHub `service-templates.json` | Live catalog via existing `fetchServiceTemplates` |
| Rollback / lifecycle in playbooks | MCP prompt → atomic tools | `deployment.rollback`, `application`/`service`/`database` lifecycle | SAF-01 confirm stays on tool handlers |
| Instance routing | API / Backend (`parseWithInstanceRouting`) | `InstanceManager` | D-16 single-instance; no fan-out |

## Project Constraints (from .cursor/rules/)

| Rule | Directive for Phase 31 |
|------|------------------------|
| spike-findings-awesome-coolify | **No stub tools** — app runtime + deployment build logs only; omit service/DB logs |
| ponytail / honey | Extend `diagnose.ts` + `recipe.ts`; extract `log-patterns.ts` only if matchers need isolated tests; reuse `fetchServiceTemplates`, `buildRuntimeLogPayload`, `FollowUpHint` |
| gsd-ship-labels | Run `./scripts/gsd-ship-post.sh` after PR create |
| graphify | Disabled in project — do not depend on graph |
| caveman / response_language | User-facing README/docs DE; RESEARCH.md English |
| context7 / wigolo | External verification optional; implementation truth = repo + OpenAPI |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | Phase is internal MCP composite code | Primitives exist: `zod/v4`, Vitest, `fetchServiceTemplates`, log-helpers |

**Existing modules to compose (do not replace):**

| Module | Role in Phase 31 |
|--------|------------------|
| `src/mcp/tools/diagnose.ts` | Add `analyze` action; extend catalog + schema + handler |
| `src/utils/log-patterns.ts` (new) | `matchLogPatterns(lines)` — four named rules + severities |
| `src/utils/log-helpers.ts` | `buildRuntimeLogPayload`, `processDeploymentBuildLogs`, `EMPTY_RUNTIME_LOGS_HINT` |
| `src/utils/diagnose-hints.ts` | `FollowUpHint` shape for `matched_patterns[].hint` |
| `src/utils/issue-classifier.ts` | Severity bucket precedent (`critical` / `high` / `info`) |
| `src/mcp/prompts.ts` | Upgrade `incident`; add `rollback`, `maintenance-window` |
| `src/mcp/tools/recipe.ts` | Add `recommend`; reuse `fetchServiceTemplates` validation path |
| `src/utils/service-templates.ts` | Live catalog fetch (SREC-02) |
| `src/mcp/tools/deployment.ts` | Playbook cites `preflight` / `rollback` (Phase 30) |
| `src/utils/deploy-preflight.ts` | `COOLIFY_ROLLBACK_UNAVAILABLE`, rollback preview semantics |
| `src/mcp/capabilities.ts` | Add `diagnose_analyze`, `recipe_recommend` |
| `src/mcp/tools/shared-read-params.ts` | `createFlatActionSchema`, `parseWithInstanceRouting` |

### Supporting

| Module | When to Use |
|--------|-------------|
| `tests/mcp/prompts.test.ts` | PLAY-01 registration + composition assertions |
| `docs/coverage-map.yaml` | Row for `diagnose.analyze` (composite, no REST) |
| `README.md` / `README.de.md` | Capability callouts + playbook prompt list (Phase 24–26 parity) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `diagnose.analyze` | Fold into `diagnose.logs` with `mode: analyze` | **Rejected by D-02** — breaks raw log contract |
| New `log-brain` tool | Extend `diagnose` | **Rejected by D-01** — catalog sprawl |
| Playbook runner tool | MCP prompts only | **Rejected by D-07** — auto-execution risk |
| Hardcoded stack YAML | `fetchServiceTemplates` | **Rejected by SREC-02** |
| ML anomaly detection | Rule matchers | **Out of scope** per REQUIREMENTS |

**Installation:** None — no new packages.

**Version verification:** Vitest `^4.1.10` [VERIFIED: `package.json`]; Node `>=24` [VERIFIED: `package.json` engines]; registry latest Vitest `4.1.10` [VERIFIED: npm registry].

## Package Legitimacy Audit

> Phase installs **no new external packages**. Audit skipped.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| — | N/A | N/A |

**Packages removed due to SLOP verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Agent
  │
  ├─ diagnose({ action: "analyze", uuid, lines?, deployment_uuid? })
  │     ├─ resolveAppUuid (same as logs)
  │     ├─ fetchApplicationLogs → buildRuntimeLogPayload
  │     ├─ [optional] fetchDeployment → processDeploymentBuildLogs
  │     ├─ matchLogPatterns(logs_lines)  ← log-patterns.ts
  │     └─ { matched_patterns[], logs_meta, advisory: true, hints[] }
  │
  ├─ recipe({ action: "recommend", stack: "Next.js + Postgres" })
  │     ├─ fetchServiceTemplates(env)  ← live catalog (CDN/GitHub)
  │     ├─ parseStackPhrase + rankCatalogMatches
  │     └─ { plan_steps[], catalog_matches[], advisory: true, follow_up_hints[] }
  │
  └─ MCP prompts: incident | rollback | maintenance-window
        └─ guide agent → atomic tools (no embedded API client)
              ├─ diagnose.analyze / diagnose.logs / diagnose.app
              ├─ deployment.preflight / deployment.rollback (confirm gate)
              └─ application|service|database start/stop/restart/deploy
```

### Recommended Project Structure

```
src/
├── utils/
│   ├── log-patterns.ts          # NEW: matchers + matchLogPatterns()
│   └── log-patterns.test.ts     # fixture snippets per pattern
├── mcp/
│   ├── tools/
│   │   ├── diagnose.ts          # ADD analyze
│   │   ├── diagnose.test.ts     # Wave 0 it.fails → green
│   │   ├── recipe.ts            # ADD recommend
│   │   └── recipe.test.ts
│   ├── prompts.ts               # incident upgrade + rollback + maintenance-window
│   └── capabilities.ts          # diagnose_analyze, recipe_recommend
tests/mcp/
└── prompts.test.ts              # extend registration + composition tests
```

### Pattern 1: `diagnose.analyze` composite (mirror `diagnose.logs`)

**What:** Reuse log fetch path from `handleDiagnoseLogs`; add pattern pass; **do not** embed `runDiagnoseAppCore` unless `include_diagnose: true` opt-in (recommend default **logs-only analyze** to keep analyze distinct from `mode: full` logs — planner discretion). Minimum: same identifier resolution + runtime log fetch.

**When to use:** BRAIN-01/02 only.

**Input (recommended):** `uuid|name|domain|query`; optional `deployment_uuid` (adds build log scan); `lines`, `offset`, `max_chars` (reuse logs defaults); optional `instance`.

**Response envelope:**

```typescript
{
  application_uuid?: string;
  deployment_uuid?: string;
  logs_meta: { total_lines: number; logs_truncated: boolean; hint?: string };
  matched_patterns: Array<{
    id: 'oom' | 'http_5xx_spike' | 'crash_loop' | 'connection_refused';
    name: string;           // human label e.g. "OOM"
    severity: 'critical' | 'high' | 'info';
    evidence: string[];     // capped sample lines (max 3)
    count?: number;         // for spike patterns
    hint: FollowUpHint;     // primary next action
  }>;
  recommended_actions: FollowUpHint[]; // deduped union of pattern hints + diagnose.logs
  advisory: true;
  analyze_failed?: { code: string; message: string }; // soft partial when fetch fails
}
```

**Empty logs:** `matched_patterns: []`, `logs_meta.hint` = `EMPTY_RUNTIME_LOGS_HINT` spirit — **no fabricated matches** [D-06].

### Pattern 2: Rule matchers (`log-patterns.ts`)

**What:** Pure functions over `string[]` log lines — no I/O.

**Recommended matchers** (thresholds = Claude's discretion; bodies test-backed):

| Pattern ID | Severity | Detection rule | Evidence |
|------------|----------|----------------|----------|
| `oom` | `critical` | Line matches `/Out of memory|OOMKilled|Cannot allocate memory|Java heap space|exit code 137|Killed process/i` | [ASSUMED] common runtime signatures |
| `http_5xx_spike` | `high` | Count lines matching `/\b5\d{2}\b/` or `/HTTP\/1\.[01]" 5\d{2}/` ≥ **5** in analyzed window OR ≥ **20%** of status-like lines | [ASSUMED] threshold |
| `crash_loop` | `high` | ≥ **3** lines matching `/Back-off restarting|Restarting container|exit(ed)? code [1-9]|panic:|FATAL/i` OR same error line repeated ≥ **3** times | [ASSUMED] heuristic |
| `connection_refused` | `high` | Line matches `/ECONNREFUSED|connection refused|connect ECONNREFUSED/i` | [ASSUMED] common errno text |

**Next-action hints (FollowUpHint targets):**

| Pattern | Primary hint | Secondary |
|---------|--------------|-----------|
| `oom` | `docs` search memory limits | `diagnose.logs` follow, `application.restart` |
| `http_5xx_spike` | `diagnose.app` | `deployment.logs`, prompt `incident` |
| `crash_loop` | `diagnose.logs` mode full | `deployment.preflight`, prompt `rollback` |
| `connection_refused` | `diagnose.app` | `intelligence.graph` impact (optional), `database.get` / `service.get` |

Use `available_in_phase` consistent with existing hints (e.g. `diagnose.logs` → 26, `deployment.preflight` → 30).

### Pattern 3: MCP playbook prompts (PLAY-01/02)

**`incident` upgrade (D-08):** Insert after step 1 (resolve UUID):

1. `diagnose.analyze` before or after `diagnose.logs` — analyze for patterns; logs for raw tail
2. `deployment.preflight` when deploy/rollback considered
3. Cross-link prompt `rollback` when patterns suggest `crash_loop` or failed deploy
4. Keep existing follow/restart/emergency flow [VERIFIED: `prompts.ts:180-202`]

**`rollback` (new prompt):**

```
Args: instance?, uuid?, name?, fqdn?
1. Resolve application UUID
2. deployment.preflight (advisory) — surface risk before rollback
3. deployment.rollback confirm:false — preview rollback_target
4. STOP — human approval required (SAF-01)
5. deployment.rollback confirm:true [, wait:true → deployment.watch]
6. On COOLIFY_ROLLBACK_UNAVAILABLE — explain no finished deployment / git-only path [VERIFIED: errors.ts COOLIFY_ROLLBACK_UNAVAILABLE]
```

**`maintenance-window` (new prompt):**

```
Args: instance?, resource_type ('application'|'service'|'database'), uuid?, name?
1. Confirm maintenance scope + instance with human
2. Optional deployment.preflight when deploy planned
3. Stop: application|service|database { action: "stop", uuid }
4. Work phase (env update, manifest.audit, recipe.recommend, etc.) — agent-guided
5. Start/restart: { action: "start"|"restart" }; application.deploy optional with watch
6. Destructive deletes — never without existing confirm gates
```

**Registration test update:** `prompts.test.ts` currently expects exactly 4 prompts [VERIFIED: `tests/mcp/prompts.test.ts:29-34`] — extend to 6: `deploy`, `diagnose`, `new-project`, `incident`, `rollback`, `maintenance-window`.

### Pattern 4: `recipe.recommend` (SREC-01/02)

**Input:** `stack` or `description` (string, required); optional `server_uuid`, `project_uuid`, `environment_name` for plan param prefills; `format`, `max_chars`, `instance`.

**Algorithm (deterministic, D-15):**

1. `const catalog = await fetchServiceTemplates(env)` [VERIFIED: `recipe.ts:756-767` same validation]
2. Tokenize stack phrase: split on `+`, `,`, ` with `, ` and ` (lowercase)
3. **Git-app keywords** (not in one-click catalog): `next.js`, `nextjs`, `react`, `vue`, `nuxt`, `remix`, `node`, `python`, `django`, `fastapi` → plan step `create-git-app` with `build_pack: 'nixpacks'` default
4. **DB keywords** → `create-app-db` with engine map: `postgres|postgresql` → `postgresql`, `mysql` → `mysql`, `mongo` → `mongodb`, `redis` (as DB) → `redis`
5. **One-click keywords** → score `catalog` keys + `details.name` via token overlap; emit only IDs where `Object.hasOwn(catalog, id)`; confidence `exact` (id or name equals token) | `high` (all tokens in label) | `suggested` (partial)
6. Never emit catalog `type` not in live `catalog` object

**Response envelope:**

```typescript
{
  stack_description: string;
  advisory: true;
  catalog_source: 'live';  // SREC-02 explicit
  matches: Array<{
    kind: 'git_app' | 'database' | 'one_click';
    catalog_id?: string;      // one-click only
    label: string;
    confidence: 'exact' | 'high' | 'suggested';
  }>;
  plan_steps: Array<{
    order: number;
    recipe_action: 'create-git-app' | 'create-app-db' | 'create-one-click';
    summary: string;
    suggested_params: Record<string, unknown>; // server_uuid placeholders
    env_keys?: string[];  // e.g. DATABASE_URL after create-app-db
    follow_up_hint: FollowUpHint;
  }>;
  unmatched_tokens?: string[];
}
```

**Unknown stack:** `COOLIFY_VALIDATION_ERROR` + recovery hint `service({ action: "list-types" })` [mirror `create-one-click` unknown type message].

### Anti-Patterns to Avoid

- **ML / z-score anomaly detection** — out of scope; rule-only
- **Service/DB log analyze** — endpoints absent on 4.1.x
- **Playbook runner tool** — D-07 forbids auto multi-step mutations
- **Hardcoded `service-templates.json` in repo as SoT** — SREC-02; cache OK only inside `fetchServiceTemplates` call
- **Inventing one-click type IDs** — D-15; validate with `Object.hasOwn(templates, id)`
- **Auto `confirm:true` in rollback prompt text** — SAF-01
- **Merging analyze into logs response** — D-02 separate actions

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log tail slice/cap | Custom truncation | `buildRuntimeLogPayload` / `sliceLogBlob` | Phase 26 tested semantics |
| Build log parse | Custom JSON flatten | `processDeploymentBuildLogs` | Hidden-line + stderr filter |
| Recovery hint shape | Ad-hoc strings | `FollowUpHint` | MCP agent contract since Phase 3 |
| Catalog fetch | Offline YAML repo copy | `fetchServiceTemplates` | Version-pinned CDN + GitHub fallback |
| Rollback orchestration in playbook | Inline API calls in prompt | `deployment.rollback` tool | Phase 30 tested path |
| App UUID resolution | Duplicate matcher | Reuse `resolveAppUuid` from diagnose.ts | D-16 ambiguity parity |
| Confirm gates | Prompt-side bypass | `COOLIFY_CONFIRM_REQUIRED` on tools | SAF-01 |

**Key insight:** Phase 31 is **pattern matching + prompt catalog + NL plan generation** atop Phase 26 logs, Phase 20 recipes, and Phase 30 deploy guard — not new Coolify surface area.

## Common Pitfalls

### Pitfall 1: False-positive pattern matches on empty/noisy logs
**What goes wrong:** Single `connection refused` in build log flags production incident.  
**Why it happens:** Build logs contain expected connection retries.  
**How to avoid:** Prefer runtime logs; when `deployment_uuid` set, label `source: 'build'|'runtime'` per match; require minimum counts for spike/crash_loop.  
**Warning signs:** Tests pass on one-line fixtures only.

### Pitfall 2: `diagnose.analyze` duplicates `diagnose.logs mode:full`
**What goes wrong:** Agents confused which action to call.  
**Why it happens:** Both fetch logs.  
**How to avoid:** Tool descriptions: `logs` = raw tail; `analyze` = patterns + hints only; analyze returns capped `evidence` not full `logs_lines`.  
**Warning signs:** README lists only one of them.

### Pitfall 3: Fuzzy catalog match invents wrong one-click type
**What goes wrong:** "Postgres" maps to wrong service template.  
**Why it happens:** Aggressive fuzzy scoring.  
**How to avoid:** Route DB phrases to `create-app-db`; one-click only for explicit service names; `suggested` confidence must not auto-execute.  
**Warning signs:** recommend returns `type` not in live catalog keys.

### Pitfall 4: Rollback prompt skips preflight or confirm
**What goes wrong:** Destructive rollback without human gate.  
**Why it happens:** Prompt compression.  
**How to avoid:** Literal steps 3–4 STOP in prompt text; test asserts `confirm: true` only after "human approval".  
**Warning signs:** `prompts.test.ts` missing confirm language.

### Pitfall 5: Capability key drift breaks `system.test.ts`
**What goes wrong:** Fifteen-key test fails when adding two keys.  
**Why it happens:** Phase 30 bumped count to 15 [VERIFIED: `system.test.ts:140-165`].  
**How to avoid:** Wave 4 updates `CAPABILITY_KEYS` to 17 with `it.fails` scaffold in Wave 0.  
**Warning signs:** Pre-commit red on system.test.ts.

## Code Examples

### `matchLogPatterns` (pure util)

```typescript
// Source: Phase 31 research — implement in src/utils/log-patterns.ts
export type LogPatternId =
  | 'oom'
  | 'http_5xx_spike'
  | 'crash_loop'
  | 'connection_refused';

export function matchLogPatterns(
  lines: string[],
): Array<{ id: LogPatternId; severity: 'critical' | 'high'; evidence: string[]; count: number }> {
  const findings = [];
  const oomRe = /Out of memory|OOMKilled|Cannot allocate memory|exit code 137/i;
  for (const line of lines) {
    if (oomRe.test(line)) {
      findings.push({ id: 'oom', severity: 'critical', evidence: [line], count: 1 });
      break;
    }
  }
  // ... 5xx spike, crash_loop, connection_refused
  return findings;
}
```

### `diagnose.analyze` handler sketch

```typescript
// Source: diagnose.ts handleDiagnoseLogs pattern
const logsStr = await fetchApplicationLogs(...);
const payload = buildRuntimeLogPayload(appUuid, logsStr, { lines, offset, max_chars });
if (!payload.logs_lines.length) {
  return buildReadResponse({
    application_uuid: appUuid,
    logs_meta: { ...payload, hint: EMPTY_RUNTIME_LOGS_HINT },
    matched_patterns: [],
    recommended_actions: [],
    advisory: true,
  });
}
const matched_patterns = enrichWithHints(matchLogPatterns(payload.logs_lines), appUuid);
return buildReadResponse({ application_uuid: appUuid, logs_meta: payload, matched_patterns, advisory: true });
```

### `recipe.recommend` catalog guard

```typescript
// Source: recipe.ts handleCreateOneClick — same guard
const templates = await fetchServiceTemplates(env);
if (candidateId && !Object.hasOwn(templates, candidateId)) {
  // demote to suggested or omit — never emit invalid id
}
```

### Rollback prompt excerpt

```typescript
// Source: Phase 30 deploy-preflight + prompts.ts pattern
`3. Preview rollback (no mutation):
   deployment({ action: "rollback", uuid: "${uuidValue}", confirm: false${instanceSuffix} })
4. Require explicit human approval before:
   deployment({ action: "rollback", uuid: "${uuidValue}", confirm: true${instanceSuffix} })`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw log tail only | `diagnose.logs` composite triage + logs | Phase 26 | Baseline for analyze input |
| Incident prompt without patterns | `diagnose.analyze` + preflight awareness | Phase 31 | PLAY-01 |
| Manual stack picking | `recipe.recommend` from live catalog | Phase 31 | SREC-01/02 |
| No rollback MCP path | `deployment.rollback` composite | Phase 30 | Rollback prompt composes this |

**Deprecated/outdated:**
- Prompt-only stack recommendation — rejected by D-12
- Statistical log anomaly — out of scope per REQUIREMENTS

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 5xx spike threshold ≥5 lines or ≥20% of status lines | Pattern 2 | Too noisy or too quiet alerts |
| A2 | Crash loop ≥3 restart/fatal lines | Pattern 2 | Miss slow crash loops |
| A3 | OOM regex covers Node/Java/Docker OOM text | Pattern 2 | Miss platform-specific OOM |
| A4 | Git-app keyword list covers common "Next.js + Postgres" stacks | Pattern 4 | recommend returns incomplete plan |
| A5 | `analyze` default omits `runDiagnoseAppCore` (logs-only) | Pattern 1 | Overlap with `diagnose.logs mode:full` |

## Open Questions

1. **Should `analyze` include optional `include_diagnose: true`?**
   - What we know: `diagnose.logs mode:full` already bundles triage + logs.
   - What's unclear: Whether analyze should duplicate triage.
   - Recommendation: Default **false**; document `diagnose.app` + `analyze` sequence in incident prompt.

2. **Exact capability key names**
   - Recommendation: `diagnose_analyze`, `recipe_recommend` (D-19 discretion).

3. **maintenance-window resource_type default**
   - Recommendation: Required arg — no default; force agent to ask user application vs service vs database.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | v26.5.0 | engines `>=24` |
| Vitest | Unit tests | ✓ | ^4.1.10 | — |
| Coolify 4.1.x API | Log fetch, recipes | runtime | 4.1.2 target | — |
| service-templates CDN/GitHub | `fetchServiceTemplates` | network | version-pinned | GitHub raw fallback in util |
| New npm packages | — | — | — | None needed |

**Missing dependencies with no fallback:** none (phase is code-only composites).

**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/mcp/tools/diagnose.test.ts src/mcp/tools/recipe.test.ts tests/mcp/prompts.test.ts -x` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAIN-01 | Four patterns detected in fixtures | unit | `npx vitest run src/utils/log-patterns.test.ts -x` | ❌ Wave 0 |
| BRAIN-01 | analyze handler integration | unit | `npx vitest run src/mcp/tools/diagnose.test.ts -t analyze -x` | ❌ Wave 0 `it.fails` |
| BRAIN-02 | severity + FollowUpHint on matches | unit | same + hint shape assert | ❌ Wave 0 |
| PLAY-01 | rollback + maintenance-window registered | unit | `npx vitest run tests/mcp/prompts.test.ts -x` | ✅ extend |
| PLAY-02 | prompts cite atomic tools only | unit | `prompts.test.ts` content regex | ✅ extend |
| SREC-01 | recommend returns plan_steps | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t recommend -x` | ❌ Wave 0 |
| SREC-02 | uses fetchServiceTemplates not static YAML | unit | mock `fetchServiceTemplates` in recommend test | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched>.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/utils/log-patterns.test.ts` — fixture lines per pattern (OOM, 5xx, crash loop, ECONNREFUSED)
- [ ] `src/mcp/tools/diagnose.test.ts` — `describe('diagnose analyze')` with `it.fails` scaffolds
- [ ] `src/mcp/tools/recipe.test.ts` — `describe('recipe recommend')` with `it.fails` scaffolds
- [ ] `tests/mcp/prompts.test.ts` — update expected prompt count 4→6 with `it.fails` until Wave 2
- [ ] `src/mcp/tools/system.test.ts` — `it.fails` for 17 capability keys until Wave 4

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Coolify token already required |
| V3 Session Management | no | — |
| V4 Access Control | yes | `parseWithInstanceRouting`; single-instance D-16 |
| V5 Input Validation | yes | Zod `createFlatActionSchema` on analyze + recommend |
| V6 Cryptography | no | No new secrets |

### Known Threat Patterns for MCP composites

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Log injection misleading patterns | Tampering | Match on fetched Coolify logs only; cap evidence lines |
| Prompt social-engineering past confirm | Elevation | Rollback prompt explicit STOP; tools enforce `COOLIFY_CONFIRM_REQUIRED` |
| Catalog poisoning via CDN | Tampering | `fetchServiceTemplates` from official coollabsio paths; validate keys |
| ReDoS in regex matchers | DoS | Simple bounded regexes; line count capped by `lines`/`max_chars` |

## Sources

### Primary (HIGH confidence)
- `src/mcp/tools/diagnose.ts` — `handleDiagnoseLogs`, schema, `fetchApplicationLogs` path
- `src/mcp/tools/recipe.ts` — `fetchServiceTemplates` validation in `create-one-click`
- `src/utils/service-templates.ts` — live catalog fetch
- `src/mcp/prompts.ts` — incident prompt baseline
- `src/utils/deploy-preflight.ts` — rollback + `COOLIFY_ROLLBACK_UNAVAILABLE`
- `.planning/phases/30-deploy-guard/30-RESEARCH.md` — rollback playbook composition
- `docs/coolify_openapi.json` — `/applications/{uuid}/logs`

### Secondary (MEDIUM confidence)
- `.planning/milestones/v3.2-phases/26-diagnose-logs-incident-dx/26-PATTERNS.md` — Phase 26 extension patterns
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stubs mandate

### Tertiary (LOW confidence — planner confirm)
- OOM / 5xx / crash-loop regex bodies — Assumptions A1–A3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; patterns established in Phases 26/28/30
- Architecture: HIGH — CONTEXT locked; code paths verified
- Pitfalls: MEDIUM — regex thresholds need fixture tuning in implementation

**Research date:** 2026-07-31
**Valid until:** 2026-08-30 (stable MCP composites; catalog CDN may shift with Coolify releases)
