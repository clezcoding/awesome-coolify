# Phase 30: Deploy Guard - Research

**Researched:** 2026-07-31
**Domain:** Per-application deploy preflight, deterministic risk scoring, and rollback via Coolify 4.1.x composite MCP actions — no new REST endpoints
**Confidence:** HIGH

> **No `30-CONTEXT.md`** — `/gsd-discuss-phase` not run. Recommendations below are research defaults for the planner; lock via discuss-phase before execution if user wants explicit decisions.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUARD-01 | Agent can run deploy preflight before mutation (instance health, env completeness, recent deployment failures, DNS readiness) | `deployment.preflight` composite over `fetchApplication`, `fetchApplicationEnvs`, `fetchAppDeployments`, `fetchServers`, `fetchResources`, `classifyIssues()` — scoped to target app |
| GUARD-02 | Preflight returns deploy risk score with named factor breakdown | Reuse `computeScoreBreakdown` pattern from `intelligence.ts` (100 − severity deductions); `factors{}` + `risk_score` + `risk_level` |
| GUARD-03 | Agent can roll back an application to its last successful deployment | `deployment.rollback` with `confirm:true`; orchestrate `fetchAppDeployments` → pick last `finished` → `updateApplication` + `triggerDeploy` (git) or `triggerDeploy` with `docker_tag` (dockerimage) — no dedicated rollback REST |
</phase_requirements>

## Summary

Phase 30 adds **composite deploy-safety actions** on the existing **`deployment` MCP tool** (Phase 4 continuity) — not a 19th top-level tool and not folded into `intelligence` (fleet scorecard) or `application.deploy` (mutation without pre-check). Two new actions: **`preflight`** (read-only, GUARD-01/02) and **`rollback`** (confirm-gated mutation, GUARD-03).

Preflight composes four named factors required by GUARD-01: **instance_health** (server reachability + app/service health via `classifyIssues()` scoped to the app's server), **env_completeness** (`fetchApplicationEnvs` empty-value scan + optional manifest key hints), **recent_deployment_failures** (reuse `intelligence.ts` deployment factor logic for a single app), and **dns_readiness** (configured `fqdn`/domains from `fetchApplication` + optional `fetchServerDomains` — **no live DNS probe**, Coolify has no DNS-check REST endpoint [VERIFIED: `docs/coolify_openapi.json` grep — no DNS readiness op]).

Risk scoring is **rule-based / deterministic** (same spirit as Phase 28 D-06): transparent factor severities, `risk_score` 0–100, `risk_level` band, `findings[]` with `FollowUpHint` recovery objects. Soft partials per factor when a fetch fails (Phase 28 D-17 spirit).

Rollback is the **highest-risk area**: OpenAPI documents **no dedicated rollback endpoint** [VERIFIED: `docs/coolify_openapi.json` — `rollback` exists only as a boolean field on `ApplicationDeploymentQueue`, not as `/deploy` query param]. Coolify docs state rollback works **only for locally available Docker images** [CITED: coolify-docs `applications/index.mdx` Rollbacks section via Context7]. Git-based apps require **PATCH `git_commit_sha` from last `finished` deployment + `triggerDeploy`** [CITED: GitHub discussion #2924 pattern; `updateApplication` + `triggerDeploy` already in client]. Planner must document build-pack branching and `COOLIFY_ROLLBACK_UNAVAILABLE` when no `finished` deployment exists.

**Primary recommendation:** Extend `src/mcp/tools/deployment.ts` with `preflight` + `rollback`; extract shared helpers to `src/utils/deploy-preflight.ts` (+ move `sortDeploymentsNewestFirst` from `intelligence.ts` to shared util); capability keys `deployment_preflight`, `deployment_rollback`; 4-wave plan mirroring Phase 28/29.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deploy preflight (read) | API / Backend (MCP `deployment.preflight`) | Coolify REST reads | Composes multi-fetch health/env/deploy/DNS signals; no client-side mutation |
| Risk score + factor breakdown | API / Backend (MCP handler + shared util) | — | Deterministic scoring in tool layer; mirrors `intelligence.scorecard` |
| Rollback orchestration | API / Backend (MCP `deployment.rollback`) | `updateApplication`, `triggerDeploy` | No rollback REST — MCP sequences existing deploy APIs |
| Confirm gate on rollback | API / Backend (MCP handler) | `COOLIFY_CONFIRM_REQUIRED` / SAF-01 | Destructive-ish mutation; preflight stays advisory |
| Instance routing | API / Backend (`InstanceManager`) | — | Optional `instance` param (Phase 15 parity) |
| Post-rollback poll | API / Backend | `pollDeploymentUntilTerminal` | Optional `wait:true` — same as `application.deploy` Phase 4 |

## Project Constraints (from .cursor/rules/)

| Rule | Directive for Phase 30 |
|------|------------------------|
| spike-findings-awesome-coolify | **No stub tools / no fake Coolify endpoints** — omit factors with no API; rollback uses only `fetchAppDeployments`, `updateApplication`, `triggerDeploy` |
| ponytail / honey | Extend `deployment.ts`; extract `deploy-preflight.ts` only if shared; reuse `classifyIssues`, `generateHints`, deploy poll helpers |
| gsd-ship-labels | N/A at research — applies at ship |
| graphify | Disabled in project config — do not depend on graphify |
| caveman | User-facing docs DE; RESEARCH.md English |
| context7 / wigolo | External doc verification for rollback semantics; implementation truth is repo + OpenAPI fixture |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | Phase is internal MCP tool code | All primitives exist: `zod/v4`, Vitest ^4.1.10, existing API client |

**Existing modules to compose (do not replace):**

| Module | Role in Phase 30 |
|--------|-------------------|
| `src/mcp/tools/deployment.ts` | Add `preflight` + `rollback` actions; extend catalog + schema |
| `src/api/client.ts` | `fetchApplication`, `fetchApplicationEnvs`, `fetchAppDeployments`, `fetchServers`, `fetchResources`, `fetchServerDomains`, `updateApplication`, `triggerDeploy`, `fetchDeployment` |
| `src/mcp/tools/intelligence.ts` | `collectDeploymentsFactor` / `sortDeploymentsNewestFirst` / `computeScoreBreakdown` patterns — **extract shared**, do not call `handleIntelligenceAction` internally |
| `src/utils/issue-classifier.ts` | `classifyIssues()` for instance_health factor |
| `src/utils/diagnose-hints.ts` | `FollowUpHint` + `generateHints()` |
| `src/utils/deploy-poll.ts` | `pollDeploymentUntilTerminal`, `TERMINAL_DEPLOYMENT_STATES` |
| `src/utils/errors.ts` | `COOLIFY_CONFIRM_REQUIRED`, `RECOVERY_HINTS`, structured errors |
| `src/mcp/tools/application.ts` | `resolveAppMutationUuid` for uuid/name/fqdn resolution parity |
| `src/mcp/tools/shared-read-params.ts` | `createFlatActionSchema`, `parseWithInstanceRouting` |
| `src/mcp/capabilities.ts` | Add `deployment_preflight`, `deployment_rollback` |

### Supporting

| Module | When to Use |
|--------|-------------|
| `src/utils/deploy-preflight.ts` (new, recommended) | Factor collectors, `computeDeployRiskScore()`, `findLastSuccessfulDeployment()`, shared sort helpers |
| `src/utils/manifest.ts` | Optional env_completeness cross-check when `.coolify/manifest.json` exists (Phase 29 soft hint only — not required) |
| `docs/coverage-map.yaml` | Add `deployment.preflight` + `deployment.rollback` rows before `npm run openapi:coverage` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend `deployment` tool | New `guard` MCP tool | **Recommended: extend `deployment`** — Phase 4 lifecycle home; avoids 19th tool; `application.deploy` stays thin trigger |
| Extend `deployment` tool | `application.deploy:preflight` | Splits deploy catalog across tools; agents already use `deployment.*` for history |
| Call `intelligence.scorecard` internally | Dedicated per-app preflight | Fleet scorecard is N+1 sampled; preflight must be app-scoped and synchronous |
| Live DNS HTTP probe | Coolify-configured domain fields only | Hand-roll external dependency; no Coolify API backing; false confidence |

**Installation:** None — no new packages.

**Version verification:** Vitest `^4.1.10` [VERIFIED: `package.json`]; Node `>=24` [VERIFIED: `package.json` engines].

## Package Legitimacy Audit

> Phase installs **no new external packages**. Audit skipped.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| — | — | N/A |

**Packages removed due to SLOP verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Composite MCP Actions (no new REST)

### `deployment.preflight` (read-only — GUARD-01/02)

**Input (minimum):** `application_uuid` **or** `uuid`/`name`/`fqdn` (reuse `resolveAppMutationUuid`); optional `instance`, `format`, `max_chars`.

**Composite fetch plan (parallel, soft partial per factor):**

```
fetchApplication(appUuid)
fetchApplicationEnvs(appUuid)
fetchAppDeployments(appUuid)
fetchServers() + fetchResources()  → classifyIssues scoped to app's server_id
optional: fetchServerDomains(serverUuid) when server uuid resolvable from app raw
```

**Response envelope:**

```typescript
{
  application_uuid: string;
  risk_score: number;           // 0–100, higher = safer (mirror intelligence score)
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  blocking: boolean;            // true when any critical factor or score below threshold
  factors: {
    instance_health: FactorResult;
    env_completeness: FactorResult;
    recent_deployment_failures: FactorResult;
    dns_readiness: FactorResult;
  };
  findings: PreflightFinding[]; // severity + factor + hint: FollowUpHint
  recommended_actions: FollowUpHint[]; // e.g. diagnose.app, manifest.audit, envs:promote
  advisory: true;
}
```

### `deployment.rollback` (mutation — GUARD-03)

**Input:** `application_uuid` or uuid/name/fqdn; **`confirm: true` required**; optional `wait`, `timeout`, `force` (default false), `instance`.

**Without `confirm:true`:** return preview envelope (target app, `last_successful_deployment` summary, `would_redeploy_commit` / `would_redeploy_tag`) + `COOLIFY_CONFIRM_REQUIRED` — mirror `emergency.validateConfirmGate` / `intelligence.cleanup` pattern [VERIFIED: `src/mcp/tools/intelligence.ts` cleanup gate].

**Orchestration (existing APIs only):**

1. `fetchAppDeployments(appUuid)` → `findLastSuccessfulDeployment()` — newest with `status === 'finished'` (skip `failed`, `in_progress`, `queued`, `cancelled-by-user`)
2. Branch on `build_pack` from `fetchApplication`:
   - **Git / nixpacks / railpack / dockerfile:** `updateApplication(appUuid, { git_commit_sha: target.commit })` then `triggerDeploy(appUuid, force:false)`
   - **dockerimage:** `triggerDeploy` with `docker_tag` query param from target `docker_registry_image_tag` [CITED: OpenAPI `/deploy` `docker_tag` param — requires verifying client passes it; extend `triggerDeploy` if needed]
3. Optional `wait:true` → `pollDeploymentUntilTerminal` (Phase 4 APP-06 parity)
4. Return `{ deployment_uuid, rollback_target: { deployment_uuid, commit, finished_at }, status }` + `logs_available` hint

**Do not** invent `POST /rollback` or stub Coolify rollback UI endpoints.

## Preflight Factors (GUARD-01 detail)

| Factor | Data source | Severity rules (deterministic) | Recovery hint targets |
|--------|-------------|-------------------------------|------------------------|
| **instance_health** | `fetchServers` + `fetchResources` + `classifyIssues()` filtered to app's `server_id` / resource uuid | `critical`: server `is_reachable === false`; `high`: app `unhealthy` or `exited`; `info`: sibling resources unhealthy on same server | `diagnose.scan`, `server.get`, `application.restart` |
| **env_completeness** | `fetchApplicationEnvs` — flag runtime vars with empty/null `value` (exclude `is_preview:true`) | `high`: any required-looking empty runtime key; `info`: zero env vars when git app (possible misconfig) | `application.envs:list`, `application.envs:sync`, `manifest.audit` |
| **recent_deployment_failures** | `fetchAppDeployments` — reuse intelligence thresholds: latest `failed` → high; stuck in_progress >24h → high; older fail within 7d → info [VERIFIED: `intelligence.ts:176-263`] | Same as Phase 28 deployments factor, single-app (no SAMPLE_CAP) | `deployment.logs`, `deployment.get`, `diagnose.logs` |
| **dns_readiness** | `fetchApplication` → `fqdn`, raw `domains`; optional `fetchServerDomains(server_uuid)` | `high`: public-facing app (has `git_repository` or expose flag) with empty/missing `fqdn`; `info`: fqdn present but server has no wildcard/custom domain config | `application.update` (domains), `docs` fqdn query, `server` domains |

**Explicitly out of scope for dns_readiness:** live DNS A-record lookup, TLS handshake probe — no Coolify 4.1.x endpoint [VERIFIED: OpenAPI + `docs/COVERAGE.md`].

## Risk Scoring (GUARD-02)

Reuse Phase 28 scoring mechanics [VERIFIED: `intelligence.ts:440-471`]:

| Severity | Score deduction |
|----------|-----------------|
| `critical` | −30 each |
| `high` | −15 each |
| `info` | −5 each |

- `risk_score = max(0, 100 − sum(deductions))`
- `risk_level`: `critical` if any critical finding OR score < 40; `high` if score < 70; `medium` if score < 85; else `low`
- `blocking: true` when `risk_level === 'critical'` OR latest deployment `in_progress` (deploy collision)
- `score_breakdown` object mirrors intelligence for agent transparency

**Do not** use ML, statistical anomaly detection, or opaque single-number without factor names (REQUIREMENTS out of scope).

## Rollback via Existing Deploy APIs

| Step | Existing client fn | REST | OpenAPI documented? |
|------|-------------------|------|---------------------|
| List history | `fetchAppDeployments` | `GET /deployments/applications/{uuid}` | Yes (schema mismatch — see gaps) |
| Read target deploy | `fetchDeployment` | `GET /deployments/{uuid}` | Yes |
| Pin git commit | `updateApplication` | `PATCH /applications/{uuid}` `{ git_commit_sha }` | Yes [VERIFIED: Application schema `git_commit_sha`] |
| Trigger redeploy | `triggerDeploy` | `POST /deploy?uuid=&force=` | Yes (GET also accepted) |
| Docker tag redeploy | extend `triggerDeploy` | `POST /deploy?uuid=&docker_tag=` | Yes param; **not yet in client** [VERIFIED: `client.ts:1050-1058` only uuid+force] |

**Last successful selection algorithm:**

```typescript
// Source: intelligence.ts sortDeploymentsNewestFirst + status filter
const sorted = sortDeploymentsNewestFirst(deployments);
const target = sorted.find(d => String(d.status).toLowerCase() === 'finished');
if (!target) throw COOLIFY_ROLLBACK_UNAVAILABLE; // new code or reuse COOLIFY_422
```

Skip deployments where `rollback: true` on record is not required for selection — field is metadata on past deploys [CITED: ApplicationDeploymentQueue schema].

## Confirm Gates

| Action | Gate | Pattern |
|--------|------|---------|
| `deployment.preflight` | None | Read-only advisory (like `intelligence.impact`) |
| `deployment.rollback` | `confirm: true` required | SAF-01 / Phase 10 parity; preview when `confirm` absent or false |
| `application.deploy` (unchanged) | None | Intentional deploy trigger — agent should call `preflight` first (document in catalog footer) |

Reuse `COOLIFY_CONFIRM_REQUIRED` + `RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED` [VERIFIED: `src/utils/errors.ts`]. Preview payload should include `rollback_target` so human/agent can verify commit/tag before confirming.

## OpenAPI Gaps

| Gap | Impact on Phase 30 | Mitigation |
|-----|---------------------|------------|
| **No rollback REST operation** | Cannot call single rollback endpoint | Orchestrate PATCH + deploy; document limitation in capability note |
| **`GET /deployments/applications/{uuid}` response schema says `Application[]`** but runtime returns `ApplicationDeploymentQueue` envelope/array [VERIFIED: Phase 04 verification + `client.ts:760-770` unwrap] | Type/docs drift only — client already handles | Keep envelope unwrap; don't trust OpenAPI item schema |
| **`rollback` boolean on deployment record only** | Cannot filter API-side | Client-side selection by `status === 'finished'` |
| **`triggerDeploy` missing `docker_tag`, `pr` params** | Docker-image rollback may need client extension | Add optional params to `triggerDeploy` — still same `/deploy` REST |
| **No DNS/SSL readiness endpoint** | dns_readiness factor is config-based only | Document in factor `coverage_note`; no stub probe |
| **`GET /deployments` (global running) unmapped** [VERIFIED: `docs/COVERAGE.md` gap row] | Optional future factor "concurrent fleet deploys" | **Out of scope** unless planner adds cheap client fn — not required by GUARD-01 |
| **Rollback docs: local Docker images only** [CITED: coolify-docs applications Rollbacks] | Git rollback via commit pin may fail if image pruned | Return `limitations[]` in rollback response; hint manual UI rollback |

## Architecture Patterns

### System Architecture Diagram

```
Agent MCP call (deployment.preflight | deployment.rollback)
        │
        ▼
┌───────────────────────────────────────┐
│  deployment.ts handler                │
│  parseWithInstanceRouting + switch    │
└───────────────┬───────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
 preflight (read)      rollback (mutate)
     │                     │
     ▼                     ├─ confirm gate
 deploy-preflight.ts      ├─ findLastSuccessfulDeployment()
 (factor collectors)      ├─ updateApplication (git pin)
     │                     └─ triggerDeploy (+ optional poll)
     ├─ fetchApplication
     ├─ fetchApplicationEnvs
     ├─ fetchAppDeployments
     ├─ fetchServers + classifyIssues
     └─ fetchServerDomains (optional)
                │
                ▼
         Coolify 4.1.x REST (existing paths only)
```

### Recommended Project Structure

```
src/
├── mcp/tools/
│   ├── deployment.ts          # ADD preflight + rollback actions
│   └── deployment.test.ts     # Wave 0 it.fails → green
├── utils/
│   ├── deploy-preflight.ts    # NEW: factors + risk score + last-success helper
│   └── deploy-preflight.test.ts
└── api/client.ts              # OPTIONAL: extend triggerDeploy(docker_tag?)
```

### Pattern 1: Per-app composite preflight (mirror intelligence scorecard)

**What:** Single-app `Promise.allSettled` factor collectors with soft partial failure.  
**When to use:** `deployment.preflight` only — not fleet-wide.  
**Example:**

```typescript
// Source: intelligence.ts handleIntelligenceScorecard pattern
const [health, env, deploys, dns] = await Promise.allSettled([
  collectInstanceHealthFactor(env, appUuid, appRaw),
  collectEnvCompletenessFactor(env, appUuid),
  collectDeploymentFailuresFactor(env, appUuid),
  collectDnsReadinessFactor(env, appRaw),
]);
```

### Pattern 2: Confirm-gated rollback preview

**What:** Return `would_affect` + target deployment summary before mutation.  
**When to use:** `rollback` when `confirm !== true`.  
**Example:**

```typescript
// Source: intelligence.cleanup + emergency.validateConfirmGate
if (parsed.confirm !== true) {
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: 'deployment.rollback requires confirm:true',
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: { rollback_target: preview, application_uuid: uuid },
  });
}
```

### Anti-Patterns to Avoid

- **Calling `application.deploy` from preflight** — preflight must stay read-only
- **New REST stub for rollback** — violates spike mandate
- **Fleet-wide preflight on `deployment.preflight`** — GUARD-01 is per deploy target; use `intelligence.scorecard` for fleet
- **Auto-rollback after failed deploy** — out of scope (Phase 10 D-08 soft success without auto-rollback)
- **Live DNS/TLS probes** — no API backing; hand-roll external dependency

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deployment history | Custom deploy store | `fetchAppDeployments` | Coolify is source of truth |
| Health classification | Custom status rules | `classifyIssues()` | Consistent with diagnose.scan |
| Risk score formula | ML / opaque model | `computeScoreBreakdown` pattern | Phase 28 deterministic contract |
| Rollback HTTP | `POST /rollback` stub | `updateApplication` + `triggerDeploy` | Only documented compose path |
| UUID resolution | Duplicate matcher | `resolveAppMutationUuid` | D-16/D-18 parity |
| Deploy poll loop | New interval logic | `pollDeploymentUntilTerminal` | Phase 4 tested |

**Key insight:** Deploy Guard is **orchestration + scoring** over existing Phase 4/10/28 primitives — not new Coolify surface area.

## Common Pitfalls

### Pitfall 1: Rollback on git app redeploys latest HEAD instead of target commit

**What goes wrong:** `triggerDeploy` alone deploys current branch HEAD — GUARD-03 fails silently.  
**Why it happens:** Coolify issue #1976 class of bugs; missing `git_commit_sha` pin [CITED: GitHub coollabsio/coolify#1976].  
**How to avoid:** Always `updateApplication` with target `commit` before `triggerDeploy`; verify `commit` non-empty on target deployment.  
**Warning signs:** Rollback response shows new deployment with different commit than `rollback_target`.

### Pitfall 2: Docker-image rollback without `docker_tag` param

**What goes wrong:** Redeploy pulls latest tag, not last successful image.  
**Why it happens:** `triggerDeploy` only passes `uuid`+`force` today.  
**How to avoid:** Extend client to pass `docker_tag` from `docker_registry_image_tag` on target deployment record.  
**Warning signs:** `build_pack === 'dockerimage'` path ignores tag.

### Pitfall 3: Preflight N+1 on fleet

**What goes wrong:** Accidentally calling preflight without app uuid triggers fleet fetches.  
**Why it happens:** Copy-paste from `intelligence.scorecard`.  
**How to avoid:** Require resolved `application_uuid` before any deploy-history fetch; single-app only.  
**Warning signs:** Handler calls `fetchResources` without scoping.

### Pitfall 4: `force=false` string coercion on Coolify

**What goes wrong:** Coolify treats query string `"false"` as truthy — force rebuild on rollback [CITED: GitHub #5381, #8104].  
**Why it happens:** PHP/query boolean parsing.  
**How to avoid:** Omit `force` param entirely when false (client already default); add test asserting query omits force.  
**Warning signs:** Rollback build logs show cache bust when not intended.

## Code Examples

### Find last successful deployment

```typescript
// Source: intelligence.ts:197-205 + deploy-poll TERMINAL states
function findLastSuccessfulDeployment(deployments: unknown[]): Record<string, unknown> | null {
  const sorted = sortDeploymentsNewestFirst(deployments.filter(isRecord));
  return sorted.find((d) => String(d.status ?? '').toLowerCase() === 'finished') ?? null;
}
```

### Git rollback sequence

```typescript
// Source: client.ts updateApplication + triggerDeploy; GitHub discussion #2924
await updateApplication(url, token, appUuid, { git_commit_sha: target.commit }, verifySsl);
const raw = await triggerDeploy(url, token, appUuid, false, verifySsl);
```

### Factor severity rollup

```typescript
// Source: intelligence.ts:440-471
const { score, score_breakdown } = computeDeployRiskScore(findings);
const risk_level =
  findings.some((f) => f.severity === 'critical') || score < 40 ? 'critical'
  : score < 70 ? 'high'
  : score < 85 ? 'medium'
  : 'low';
```

## Wave Plan Recommendation

Mirror Phase 28/29 four-plan structure:

| Plan | Wave | Scope | Requirements |
|------|------|-------|--------------|
| **30-00-PLAN** | 0 | `deploy-preflight.ts` shell; `deployment.test.ts` `it.fails` scaffolds for preflight + rollback; optional `triggerDeploy` docker_tag extension tests | Setup |
| **30-01-PLAN** | 1 | `deployment.preflight` + factor collectors + risk score envelope; register schema/catalog; flip preflight tests GREEN | GUARD-01, GUARD-02 |
| **30-02-PLAN** | 2 | `deployment.rollback` + confirm preview + git/docker branches + optional wait; flip rollback tests GREEN | GUARD-03 |
| **30-03-PLAN** | 3 | `capabilities.ts`, `coverage-map.yaml`, `system.version` tests, README/catalog footer ("call preflight before deploy"), docs-parity literals | CAP parity |

**Dependency order:** 30-00 → 30-01 → 30-02 → 30-03 (rollback can start after 30-00 but benefits from shared `findLastSuccessfulDeployment` in 30-00).

**Discuss-phase candidates to lock:** tool surface (`deployment` vs new `guard`), `blocking` threshold, dockerimage rollback scope, whether manifest env cross-check is in v1.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deploy without pre-check | `deployment.preflight` composite | Phase 30 | Agents get named risk factors before `application.deploy` |
| Manual UI rollback only | `deployment.rollback` via PATCH+deploy | Phase 30 | API-automatable when commit/tag preserved |
| Fleet scorecard only | Per-app preflight + `intelligence.scorecard` | Phase 28 + 30 | Right granularity per use case |

**Deprecated/outdated:**
- Assuming OpenAPI documents rollback endpoint — it does not
- Using `intelligence.scorecard` as deploy preflight — fleet-sampled, not app-scoped

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extend `deployment` tool (not new `guard` tool) | Summary | Catalog churn if user wanted separate tool |
| A2 | Git rollback = PATCH `git_commit_sha` + `triggerDeploy` | Rollback | Coolify may ignore pin on some build packs — needs live UAT |
| A3 | `docker_tag` on `/deploy` works for dockerimage rollback | Rollback | Param may require `pull_request_id` per OpenAPI — docker path needs UAT |
| A4 | Env completeness = empty runtime var values only | Preflight factors | User may expect required-key list from manifest — discuss-phase |
| A5 | DNS readiness = configured fqdn only (no probe) | Preflight factors | GUARD-01 "DNS readiness" may be interpreted as live check — clarify in discuss |

## Open Questions

1. **Separate `guard` tool vs `deployment` extension?**
   - What we know: Phase 4 owns deployment catalog; Phase 28 chose new tool for fleet intelligence
   - What's unclear: User marketing name "Deploy Guard" vs tool naming
   - Recommendation: **`deployment.preflight` / `deployment.rollback`** unless discuss-phase locks `guard` tool

2. **Should preflight auto-block `application.deploy`?**
   - What we know: MCP cannot intercept other actions
   - Recommendation: Document + catalog footer only; return `blocking: true` hint — no middleware

3. **Live UAT for rollback on nixpacks vs dockerimage?**
   - What we know: Coolify docs limit rollback to local images
   - Recommendation: Phase verification includes one git + one dockerimage rollback on live harness if available (Phase 18 UAT)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | v26.5.0 | — |
| npm/pnpm | Test runner | ✓ | npm 11.17.0 | — |
| Coolify 4.1.x instance | Live UAT rollback | ? | — | Mock-only unit tests; flag UAT gap |
| Vitest | Unit tests | ✓ | ^4.1.10 | — |

**Missing dependencies with no fallback:**
- Live Coolify instance for rollback UAT (planner: mock tests required; UAT optional human-verify)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/deployment.test.ts -t preflight -x` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUARD-01 | preflight returns 4 named factors | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t preflight -x` | ❌ Wave 0 |
| GUARD-02 | risk_score + factor breakdown + findings hints | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t risk -x` | ❌ Wave 0 |
| GUARD-03 | rollback picks last finished + confirm gate | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t rollback -x` | ❌ Wave 0 |
| GUARD-03 | rollback calls updateApplication before triggerDeploy (git) | unit | same, mock order assertion | ❌ Wave 0 |
| SAF-01 | rollback without confirm → COOLIFY_CONFIRM_REQUIRED | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t confirm -x` | ❌ Wave 0 |
| D-17 spirit | preflight soft partial when one factor rejects | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t partial -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/mcp/tools/deployment.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/utils/deploy-preflight.ts` — factor collectors + `findLastSuccessfulDeployment`
- [ ] `src/mcp/tools/deployment.test.ts` — preflight/rollback/confirm `it.fails` scaffolds
- [ ] `src/api/client.ts` — optional `triggerDeploy` `docker_tag` param + test in `client.test.ts`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Bearer token already required by Coolify |
| V3 Session Management | no | — |
| V4 Access Control | yes | Rollback is destructive-ish — confirm gate |
| V5 Input Validation | yes | Zod schema on `deployment` actions; `resolveAppMutationUuid` ambiguity guard |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rollback without explicit confirm | Elevation | `confirm: true` gate (SAF-01) |
| Ambiguous app name deploys wrong app | Spoofing | `COOLIFY_AMBIGUOUS_MATCH` via `resolveAppMutationUuid` |
| Git commit injection on rollback pin | Tampering | Validate commit SHA format (hex/alphanumeric) before PATCH — mirror Coolify `validateGitRef` spirit [CITED: coolify PR #8893] |
| Leaked env values in preflight | Info disclosure | Reuse `maskEnvRecord` / never `reveal` on preflight |

## Sources

### Primary (HIGH confidence)

- `src/mcp/tools/intelligence.ts` — scorecard factor pattern, deployment failure thresholds, `computeScoreBreakdown`
- `src/mcp/tools/deployment.ts` — Phase 4 deployment tool baseline
- `src/api/client.ts` — `fetchAppDeployments`, `triggerDeploy`, `updateApplication`
- `docs/coolify_openapi.json` — `/deploy`, `/deployments/*`, Application schema
- Phase 04 `04-VERIFICATION.md` — deploy lifecycle requirements APP-04..APP-09, DEP-01..03

### Secondary (MEDIUM confidence)

- Context7 `/coollabsio/coolify-docs` — rollback local-images limitation, `/deploy` params, ApplicationDeploymentQueue.rollback field
- GitHub coollabsio/coolify#1976, #5381, #8104 — rollback commit pin and force=false coercion risks

### Tertiary (LOW confidence — validate in UAT)

- Git rollback via PATCH `git_commit_sha` + deploy — community pattern, not OpenAPI rollback op

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives exist in repo
- Architecture: HIGH — mirrors Phase 28/29 composite pattern
- Pitfalls: MEDIUM — rollback paths need live UAT per build pack
- Rollback API compose path: MEDIUM — no first-class rollback endpoint; orchestration is research recommendation

**Research date:** 2026-07-31  
**Valid until:** 2026-08-28 (30 days — stable domain; revisit if Coolify ships rollback REST)
