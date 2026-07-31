# Phase 30: Deploy Guard - Research

**Researched:** 2026-07-31
**Domain:** Deploy preflight risk scoring + rollback on Coolify 4.1.x — composite MCP actions, no new REST endpoints
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUARD-01 | Agent can run deploy preflight before mutation (instance health, env completeness, recent deployment failures, DNS readiness) | `application.preflight` composite read over `fetchApplication`, `fetchApplicationEnvs`, `fetchAppDeployments`, `fetchServer`/`fetchServerDomains`, scoped `classifyIssues` — four named factors with soft partials |
| GUARD-02 | Preflight returns a deploy risk score with named factor breakdown | Reuse `computeScoreBreakdown` pattern from `intelligence.scorecard` — `risk_score` 0–100 + `factors{}` + `findings[]` with severity + `FollowUpHint` |
| GUARD-03 | Agent can roll back an application to its last successful deployment | `application.rollback` orchestration: `fetchAppDeployments` → newest `status === 'finished'` → `updateApplication` (`git_commit_sha` or image tag) → `triggerDeploy` → optional `pollDeploymentUntilTerminal` / `deployment.watch` |
</phase_requirements>

## Summary

Phase 30 adds **deploy guard** capabilities as two new actions on the existing **`application`** domain tool — matching Phase 29’s pattern (extend domain tool, no new MCP surface, no new npm packages). `application.preflight` is a **read-only composite** that scores deploy risk for one target application across four factors required by GUARD-01/02. `application.rollback` is a **mutation** that recovers from a failed deploy by redeploying the last green deployment record.

Coolify 4.1.x OpenAPI documents **no dedicated rollback endpoint** — only `GET /deployments/applications/{uuid}`, `GET /deployments/{uuid}`, `POST /deploy?uuid=…`, and `PATCH /applications/{uuid}` [CITED: `docs/coolify_openapi.yaml` `/deploy`, `/deployments/applications/{uuid}`]. The `rollback: boolean` field on `ApplicationDeploymentQueue` is a **deployment record attribute**, not an API operation [CITED: `docs/coolify_openapi.yaml` ApplicationDeploymentQueue schema]. Rollback is therefore **MCP orchestration**: locate last `finished` deployment, pin commit/tag via PATCH, trigger deploy.

DNS readiness follows Phase 10 locked decision: **no hand-rolled DNS/HTTP preflight** — infer readiness from Coolify state (`fqdn`/`domains`, server wildcard domains via `fetchServerDomains`, `health_check_status`) [CITED: `.planning/milestones/v2.0-phases/10-application-crud-safety/10-RESEARCH.md` Don't Hand-Roll table]. Env completeness reuses `fetchApplicationEnvs` + empty-value detection; optional cross-check when local manifest exists via `manifest.audit` findings scoped to target UUID (Phase 29).

**Primary recommendation:** Add `preflight` + `rollback` to `application.ts`; extract `src/utils/deploy-guard.ts` for factor collectors + `findLastSuccessfulDeployment()`; register capability keys `deploy_preflight` and `deploy_rollback`; Wave 0 `it.fails` scaffolds in `application.test.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deploy preflight (read) | API / Backend (MCP `application.preflight`) | Coolify REST reads | Composes per-app + server signals; never mutates |
| Deploy risk scoring | API / Backend (`deploy-guard.ts`) | — | Rule-based deductions mirroring scorecard (D-06 spirit) |
| Env completeness signals | API / Backend (MCP handler) | `fetchApplicationEnvs` | Live env list only; manifest has no env keys |
| DNS readiness signals | API / Backend (MCP handler) | `fetchServerDomains`, app fields | Coolify-native domain state; no external DNS |
| Instance health (scoped) | API / Backend (MCP handler) | `fetchServer`, `classifyIssues` | Server reachability + scan issues for target app/server |
| Rollback orchestration | API / Backend (MCP `application.rollback`) | `updateApplication`, `triggerDeploy`, poll helpers | No rollback REST — composite write path |
| Deployment polling | API / Backend (shared utils) | `pollDeploymentUntilTerminal`, `deployment.watch` | Reuse Phase 21 patterns |

## Project Constraints (from .cursor/rules/)

| Rule | Directive for Phase 30 |
|------|------------------------|
| spike-findings-awesome-coolify | **No stub tools** — rollback uses only verified OpenAPI paths in `docs/coolify_openapi.yaml` |
| ponytail / honey | Minimum diff; extend `application.ts`; extract `deploy-guard.ts` only if shared by preflight + rollback |
| gsd-ship-labels | N/A at research — applies at ship |
| graphify | Disabled in project config — do not depend on graphify |
| caveman | User-facing docs DE; RESEARCH.md English |
| context7 / wigolo | External doc lookup only; implementation truth is repo + OpenAPI fixture |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | Phase is internal MCP tool code | All primitives exist: `zod/v4`, Vitest ^4.1.10, existing API client |

**Existing modules to compose (do not replace):**

| Module | Role in Phase 30 |
|--------|-------------------|
| `src/mcp/tools/application.ts` | Add `preflight` + `rollback` actions, schemas, handlers |
| `src/mcp/tools/intelligence.ts` | `ScorecardFinding`, `computeScoreBreakdown`, `sortDeploymentsNewestFirst`, deployment factor thresholds (`STUCK_DEPLOY_MS`, `RECENT_FAIL_MS`) — **extract or import shared helpers** |
| `src/mcp/tools/deployment.ts` | `resolveLatestDeploymentUuid`, `deployment.watch` for rollback wait path |
| `src/mcp/tools/diagnose.ts` | `projectAppDiagnose` pattern; `fetchServerDomains` usage reference |
| `src/utils/manifest-audit.ts` | Optional `config_drift` factor via scoped audit findings (Phase 29) |
| `src/utils/diagnose-hints.ts` | `FollowUpHint` envelope for findings |
| `src/utils/issue-classifier.ts` | `classifyIssues()` — filter to target app/server UUID |
| `src/utils/deploy-poll.ts` | `pollDeploymentUntilTerminal` for rollback `wait:true` |
| `src/utils/deploy-watch-poll.ts` | `pollDeploymentWithBackoff` if rollback delegates to watch semantics |
| `src/utils/projections.ts` | `projectDeploymentSummary` — `commit`, `status`, `finished_at` |
| `src/api/client.ts` | `fetchApplication`, `fetchApplicationEnvs`, `fetchAppDeployments`, `fetchDeployment`, `fetchServer`, `fetchServerDomains`, `updateApplication`, `triggerDeploy` |
| `src/mcp/capabilities.ts` | Add `deploy_preflight`, `deploy_rollback` keys |

### Supporting

| Module | When to Use |
|--------|-------------|
| `src/utils/deploy-guard.ts` (new, recommended) | `collectPreflightFactors()`, `findLastSuccessfulDeployment()`, `collectDnsReadinessFactor()`, `buildDeployRiskResponse()` — keeps `application.ts` handler thin |
| `docs/coverage-map.yaml` | Add `application.preflight` + `application.rollback` rows before `npm run openapi:coverage` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `deploy_guard` MCP tool | `application.preflight` / `application.rollback` | **Rejected** — Phase 29 pattern extends domain tool; deploy lifecycle already on `application` |
| `deployment.preflight` | `application.preflight` | **Rejected** — preflight needs app env + server context; `deployment` tool is deployment-UUID-centric reads |
| Full `intelligence.scorecard` call | Scoped per-app factor collectors | **Rejected** — scorecard samples up to 50 apps (N+1); preflight must be single-app fast |
| Dedicated rollback REST | PATCH + POST `/deploy` composite | **Required** — no rollback endpoint in 4.1.x OpenAPI |
| `node:dns` / HTTP HEAD to FQDN | Coolify field signals | **Rejected (Phase 10)** — hand-rolled DNS preflight |

**Installation:** None — no new packages.

**Version verification:** Vitest `4.1.10` [VERIFIED: `package.json` devDependencies]; Node `>=24` [VERIFIED: `package.json` engines].

## Package Legitimacy Audit

> Phase installs **no new external packages**. Audit skipped.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| — | — | N/A |

**Packages removed due to SLOP verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Agent MCP call
        │
        ├─────────────────────────────┐
        ▼                             ▼
 application.preflight          application.rollback
 (read-only)                    (mutation)
        │                             │
        ▼                             ▼
 resolveAppMutationUuid        resolveAppMutationUuid
        │                             │
        ├─ fetchApplication           ├─ fetchAppDeployments
        ├─ fetchApplicationEnvs       ├─ findLastSuccessfulDeployment()
        ├─ fetchAppDeployments        ├─ fetchDeployment (full, optional)
        ├─ fetchServer + domains      ├─ updateApplication (commit/tag pin)
        └─ classifyIssues (scoped)    ├─ triggerDeploy(force?)
        │                             └─ pollDeploymentUntilTerminal (wait?)
        ▼
 Promise.allSettled per factor
 (soft partial on factor failure)
        │
        ▼
 buildDeployRiskResponse
 { risk_score, risk_level, factors, findings }
```

### Recommended Project Structure

```
src/
├── mcp/tools/
│   ├── application.ts           # + preflight, rollback actions
│   └── application.test.ts      # + GUARD-* it.fails → it() cases
├── utils/
│   └── deploy-guard.ts          # (new) factor collectors + rollback helper
└── mcp/capabilities.ts          # + deploy_preflight, deploy_rollback
```

### Pattern 1: Deploy preflight factors (GUARD-01 / GUARD-02)

**What:** Four named factors, each returning `FactorResult` (same shape as scorecard) with `severity`, `findings[]`, optional `partial`.

| Factor key | GUARD-01 axis | Data sources | Finding examples |
|------------|---------------|--------------|------------------|
| `instance_health` | Instance health | `fetchApplication` → server UUID → `fetchServer`; `classifyIssues` filtered to app UUID | Server unreachable; app `unhealthy` status |
| `env_completeness` | Env completeness | `fetchApplicationEnvs` | Runtime key with empty value; zero envs when app type expects config |
| `deployment_history` | Recent deployment failures | `fetchAppDeployments` (single app) | Latest `failed`; stuck `in_progress` >24h; failed within 7d [VERIFIED: `intelligence.ts` `collectDeploymentsFactor`] |
| `dns_readiness` | DNS readiness | App `fqdn`/`domains`; `fetchServerDomains` for wildcard coverage; `health_check_status` | Missing FQDN; custom domain not matching server wildcard; health check failing |

**Risk score:** Reuse scorecard deduction formula [VERIFIED: `intelligence.ts:440-471`]:

```typescript
// Source: src/mcp/tools/intelligence.ts (extract to deploy-guard.ts or shared util)
const deductions = { critical: 30, high: 15, info: 5 };
const risk_score = Math.max(0, 100 - critical * 30 - high * 15 - info * 5);
```

**Response envelope:**

```typescript
type DeployPreflightFinding = {
  severity: 'critical' | 'high' | 'info';
  factor: 'instance_health' | 'env_completeness' | 'deployment_history' | 'dns_readiness';
  issue: string;
  hint: FollowUpHint;
};

// buildReadResponse data:
{
  application_uuid: string;
  risk_level: 'critical' | 'high' | 'info' | 'ok';  // rollup from findings
  risk_score: number;           // 0–100, higher = safer
  factors: Record<string, FactorResult | { failed: { code: string; message: string } }>;
  findings: DeployPreflightFinding[];
  partial?: Record<string, { code: string; message: string }>;
}
```

**Soft partials:** `Promise.allSettled` per factor (Phase 28 D-17) — one failed fetch must not blank entire preflight.

**Optional fifth factor (discretion):** `config_drift` — if `ManifestManager.exists()`, run `buildManifestAuditFindings()` filtered to target UUID only; severity `info`/`high` from audit kinds. Not required for GUARD-01 minimum.

### Pattern 2: DNS readiness without hand-rolling (Phase 10 parity)

**What:** Infer DNS **configuration readiness** from Coolify state — not external resolution.

**Do:**
- Parse `fqdn` / `domains` from `fetchApplication` or `/resources` projection [VERIFIED: `projections.ts:390`]
- Load server wildcard domains via `GET /servers/{uuid}/domains` (`fetchServerDomains`) — same path as `diagnose.server` [VERIFIED: `diagnose.ts:660-665`]
- Compare hostname suffix: custom domain covered by server wildcard → `ok`; bare hostname without wildcard → `info` finding + `docs` fqdn hint
- Surface `health_check_status` / `status` unhealthy as `dns_readiness` or `instance_health` finding

**Don't:**
- `node:dns` lookup, `dig`, or HTTP probes to FQDN [CITED: Phase 10 RESEARCH — Domain Preflight Checks row]
- Pre-create domain conflict checks (Coolify 409 on PATCH remains mutation-time guard)

**Example hint:**

```typescript
{
  tool: 'docs',
  action: 'lookup',
  args: { query: 'fqdn' },
  label: 'Review FQDN and DNS setup steps',
  available_in_phase: 19,
}
```

### Pattern 3: Env completeness (Phase 29 adjacency)

**What:** Live env audit for deploy safety — **not** cross-env promote (that's `envs:promote`).

**Checks:**
1. `fetchApplicationEnvs(application_uuid)`
2. Flag runtime envs (`is_runtime !== false`) with empty/missing `value` → `high` finding
3. Flag `env_count === 0` when `build_pack` implies config (heuristic: not static/dockerimage-only) → `info`
4. Values **redacted** in response unless `reveal:true` (existing env policy)

**Remediation hints:** `application.envs:create` / `envs:update` / `envs:sync` — same `FollowUpHint` style as Phase 29.

**Manifest:** `.coolify/manifest.json` does **not** store env keys [VERIFIED: `manifest.ts` schema] — do not invent manifest-env comparison unless schema extended (out of scope).

### Pattern 4: Rollback to last successful deployment (GUARD-03)

**What:** Composite rollback — no Coolify-native rollback API in 4.1.x.

**Algorithm:**

```typescript
// Source: docs/coolify_openapi.yaml + src/utils/projections.ts:328-337
async function rollbackApplication(env, appUuid, options) {
  const deployments = await fetchAppDeployments(url, token, appUuid, verifySsl);
  const target = findLastSuccessfulDeployment(deployments);
  // findLastSuccessfulDeployment: newest-first sort, first status === 'finished'
  if (!target) throw COOLIFY_NO_ROLLBACK_TARGET;

  const commit = String(target.git_commit_sha ?? target.commit ?? '');
  const imageTag = target.docker_registry_image_tag; // from full GET if needed

  if (commit) {
    await updateApplication(url, token, appUuid, { git_commit_sha: commit }, verifySsl);
  } else if (imageTag) {
    await updateApplication(url, token, appUuid, { docker_registry_image_tag: imageTag }, verifySsl);
  }
  // else: COOLIFY_ROLLBACK_UNSUPPORTED_SOURCE

  const deployRaw = await triggerDeploy(url, token, appUuid, options.force ?? false, verifySsl);
  const deploymentUuid = extractDeploymentUuid(deployRaw); // existing application.ts helper

  if (options.wait) {
    await pollDeploymentUntilTerminal(/* same as application.deploy wait */);
  }
  return { rolled_back_to: projectDeploymentSummary(target), deployment_uuid, status };
}
```

**Terminal success status:** `finished` [VERIFIED: `deployment.test.ts`, `application.test.ts` wait tests]

**Idempotency:** If latest deployment is already `finished` and matches pinned commit → return `already_at_last_successful: true` (soft success, no redeploy) — avoids deploy storm.

**Confirm gate:** **Not required** — mirrors `application.deploy` (intentional mutation, not delete). Planner may add `dry_run:true` preview showing target deployment UUID/commit before apply (discretion).

**Unsupported app types:** Dockerfile-only / compose without pinned commit in deployment record → structured `COOLIFY_ROLLBACK_UNSUPPORTED` + hint to manual `application.deploy` with `force:true`.

### Anti-Patterns to Avoid

- **Calling full `intelligence.scorecard` inside preflight:** Fleet-wide N+1 deployment fetches; use single-app `fetchAppDeployments` only.
- **External DNS probes:** Violates Phase 10; flaky in CI; not Coolify's contract.
- **Inventing `POST /deployments/{uuid}/rollback`:** Not in OpenAPI fixture — stub forbidden.
- **Auto-rollback on deploy failure:** Out of scope (Phase 10 D-08 soft-success posture); rollback is explicit agent action.
- **Rollback without pinning commit/tag:** `triggerDeploy` alone redeploys **latest git HEAD**, not previous green — must PATCH first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DNS / domain resolution checks | `node:dns`, HTTP HEAD probes | App `fqdn`/`domains` + `fetchServerDomains` + health fields | Phase 10; Coolify owns conflict detection |
| Rollback API client | Fake `/rollback` endpoint | `fetchAppDeployments` + `updateApplication` + `triggerDeploy` | Only documented 4.1.x paths |
| Risk score ML | Statistical anomaly detection | Rule-based deductions (scorecard formula) | REQUIREMENTS out of scope |
| Deployment polling | Custom sleep loops | `pollDeploymentUntilTerminal`, `deployment.watch` | Phase 21 hardened backoff + 429 handling |
| Env value masking | New redaction | `maskEnvRecord` from `env-shared.ts` | Existing reveal policy |
| Instance fleet health | Full scorecard | Scoped server + single-app deployment history | Preflight is per deploy target |

**Key insight:** Deploy guard is **orchestration over existing reads/writes** — same v3.3 composite pattern as Phases 28–29. The only new behavior is **rollback commit pinning**, which Coolify UI likely does internally but exposes only via deployment records + PATCH + deploy.

## Common Pitfalls

### Pitfall 1: Rollback redeploys latest git, not last green

**What goes wrong:** Agent calls `triggerDeploy` without PATCH — broken app stays broken or gets newer broken commit.

**Why it happens:** `/deploy` has no `deployment_uuid` or `rollback` query param in OpenAPI [VERIFIED: `docs/coolify_openapi.yaml` `/deploy` parameters].

**How to avoid:** Always `findLastSuccessfulDeployment` → PATCH `git_commit_sha` / image tag → then `triggerDeploy`.

**Warning signs:** Rollback returns new deployment but commit SHA unchanged from failed deploy.

### Pitfall 2: No successful deployment to roll back to

**What goes wrong:** Empty deployments list or all `failed` / `cancelled-by-user`.

**Why it happens:** New app never deployed successfully.

**How to avoid:** Return `COOLIFY_NO_ROLLBACK_TARGET` (new code) with hints: `application.deploy`, `deployment.list`.

**Warning signs:** `fetchAppDeployments` returns `[]` or no `finished` status.

### Pitfall 3: DNS false confidence from external lookups

**What goes wrong:** MCP reports DNS "ready" but Coolify SSL/proxy not configured.

**Why it happens:** Hand-rolled DNS resolves but Coolify proxy labels missing.

**How to avoid:** Stick to Coolify fields; document that preflight checks **configuration readiness**, not global DNS propagation.

**Warning signs:** Adding `dns.promises.resolve` or `fetch(fqdn)` in handler.

### Pitfall 4: Preflight blocks on one failed factor

**What goes wrong:** Server domains fetch 403 → entire preflight errors.

**Why it happens:** `Promise.all` instead of `allSettled` per factor.

**How to avoid:** Scorecard soft-partial pattern [VERIFIED: `intelligence.ts:491-519`].

**Warning signs:** Single API error with no `factors` partial payload.

### Pitfall 5: Env completeness leaks secrets

**What goes wrong:** Preflight returns raw env values in findings.

**Why it happens:** Bypassing `maskEnvRecord`.

**How to avoid:** Reuse `env-shared.ts`; only key names in findings unless `reveal:true`.

**Warning signs:** `value` fields in preflight response without masking.

## Code Examples

### Find last successful deployment

```typescript
// Source: src/mcp/tools/intelligence.ts sortDeploymentsNewestFirst + deployment.test.ts status fixtures
function findLastSuccessfulDeployment(
  deployments: unknown[],
): Record<string, unknown> | null {
  const sorted = sortDeploymentsNewestFirst(deployments);
  for (const dep of sorted) {
    if (String(dep.status ?? '').toLowerCase() === 'finished') return dep;
  }
  return null;
}
```

### Trigger deploy after pin (existing client)

```typescript
// Source: src/api/client.ts:1050-1058
export async function triggerDeploy(
  url: string,
  token: string,
  uuid: string,
  force = false,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/deploy', { method: 'POST', query: { uuid, force } });
}
```

### Deployment summary projection (commit field)

```typescript
// Source: src/utils/projections.ts:328-337
export function projectDeploymentSummary(raw: Record<string, unknown>): DeploymentSummary {
  return {
    deployment_uuid: String(raw.deployment_uuid ?? raw.id ?? ''),
    commit: String(raw.git_commit_sha ?? raw.commit ?? ''),
    status: String(raw.status ?? 'unknown'),
    created_at: String(raw.created_at ?? ''),
    finished_at: String(raw.finished_at ?? raw.updated_at ?? ''),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agent manually chains `deployment.list` + `deploy` | `application.preflight` single call | Phase 30 | Risk score before mutation |
| Hope latest deploy works | `application.rollback` pins last `finished` | Phase 30 | Recovery from failed deploy |
| External DNS scripts | Coolify field-based dns_readiness | Phase 10 locked | No hand-rolled preflight |

**Deprecated/outdated:**
- Hand-rolled domain preflight before create/update — use Coolify 409 mapping on mutations (Phase 10); read-time DNS uses field signals only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `finished` is the sole terminal success status for rollback targeting | Pattern 4 | Miss `success`/`completed` aliases — mitigate with `['finished','success'].includes(status)` if live API differs |
| A2 | Pinning `git_commit_sha` via PATCH before deploy reproduces UI rollback for git apps | Pattern 4 | Docker/image-only apps need tag-based path; non-git may need `COOLIFY_ROLLBACK_UNSUPPORTED` |
| A3 | `application` tool is correct surface (not new `deploy_guard` tool) | Summary | Planner discuss-phase may override — costly catalog change |
| A4 | Rollback does not require `confirm:true` | Pattern 4 | Product may want confirm for production — add in discuss-phase if needed |
| A5 | DNS readiness = configuration signals only, not live resolution | Pattern 2 | User may expect real DNS probe — document limitation in README |

## Open Questions

1. **Rollback confirm gate**
   - What we know: `application.deploy` has no confirm; delete/update do.
   - What's unclear: Whether rollback to production needs SAF confirm.
   - Recommendation: Default **no confirm** (parity with deploy); optional `confirm:true` if discuss-phase locks it.

2. **Non-git rollback path**
   - What we know: Deployment records carry `docker_registry_image_tag`; OpenAPI PATCH supports image fields.
   - What's unclear: Whether all `finished` deployments include pin-able metadata per build pack.
   - Recommendation: Support git SHA + docker tag; return `COOLIFY_ROLLBACK_UNSUPPORTED` with hints for other types.

3. **Optional `config_drift` factor**
   - What we know: Phase 29 `manifest.audit` shipped; Phase 29 summary says Phase 30 may consume audit signals.
   - What's unclear: Whether GUARD-01 requires manifest drift in preflight.
   - Recommendation: Optional factor (not minimum); keeps preflight fast when no local manifest.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | MCP server runtime | ✓ | >=24 (project engines) | — |
| Vitest | Unit tests | ✓ | 4.1.10 | — |
| Coolify 4.1.x API | All GUARD actions | ✓ (mocked in tests) | 4.1.2 min (capabilities) | Tests use vi.mock client |
| Local `.coolify/manifest.json` | Optional config_drift factor | optional | — | Skip factor when absent |

**Missing dependencies with no fallback:** none (phase is code + mocked tests)

**Missing dependencies with fallback:**
- Local manifest → omit `config_drift` factor

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- src/mcp/tools/application.test.ts -x` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUARD-01 | preflight returns four factor keys with findings | unit | `pnpm test -- src/mcp/tools/application.test.ts -t preflight -x` | ❌ Wave 0 |
| GUARD-01 | preflight soft-partial when server domains fetch fails | unit | same | ❌ Wave 0 |
| GUARD-02 | risk_score + named factor breakdown | unit | `pnpm test -- src/mcp/tools/application.test.ts -t "risk_score" -x` | ❌ Wave 0 |
| GUARD-03 | rollback pins commit from last finished deployment then triggerDeploy | unit | `pnpm test -- src/mcp/tools/application.test.ts -t rollback -x` | ❌ Wave 0 |
| GUARD-03 | rollback COOLIFY_NO_ROLLBACK_TARGET when no finished deployment | unit | same | ❌ Wave 0 |
| GUARD-03 | rollback already_at_last_successful when latest is finished | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- src/mcp/tools/application.test.ts -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `application.test.ts` — `describe('preflight (GUARD-01/02)')` with `it.fails` scaffolds
- [ ] `application.test.ts` — `describe('rollback (GUARD-03)')` with `it.fails` scaffolds
- [ ] `src/utils/deploy-guard.ts` — factor collectors (or inline in application.ts for minimal diff)
- [ ] `src/mcp/capabilities.ts` — `deploy_preflight`, `deploy_rollback` keys
- [ ] `docs/coverage-map.yaml` — composite rows mapping to existing OpenAPI paths

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Coolify bearer token unchanged |
| V3 Session Management | no | — |
| V4 Access Control | yes | Instance routing via `parseWithInstanceRouting`; rollback only target app UUID |
| V5 Input Validation | yes | `createFlatActionSchema` + `resolveAppMutationUuid` |
| V6 Cryptography | no | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rollback to wrong app | Elevation | `resolveAppMutationUuid` single-hit; explicit uuid param |
| Env secret leakage in preflight | Information disclosure | `maskEnvRecord`; `reveal` opt-in |
| SSRF via DNS probe | Tampering | **Do not implement** external DNS/HTTP checks |
| Unauthorized rollback deploy | Spoofing | Coolify token scope; no MCP-side bypass |

## Sources

### Primary (HIGH confidence)

- `docs/coolify_openapi.yaml` — `/deploy`, `/deployments/applications/{uuid}`, `/deployments/{uuid}`, `ApplicationDeploymentQueue.rollback` field
- `src/mcp/tools/intelligence.ts` — scorecard factors, `computeScoreBreakdown`, deployment thresholds
- `src/mcp/tools/deployment.ts` — list/get/watch patterns
- `src/mcp/tools/application.ts` — deploy lifecycle, `extractDeploymentUuid`, env handlers
- `src/utils/projections.ts` — `projectDeploymentSummary` commit mapping

### Secondary (MEDIUM confidence)

- `.planning/milestones/v2.0-phases/10-application-crud-safety/10-RESEARCH.md` — no hand-rolled DNS preflight
- `.planning/phases/29-drift-heal/29-RESEARCH.md` — composite MCP pattern, `FollowUpHint` envelope
- `.planning/phases/28-instance-intelligence/28-RESEARCH.md` — scorecard architecture, soft partials

### Tertiary (LOW confidence)

- Coolify UI rollback behavior (commit pin + deploy) — inferred from deployment model fields; no dedicated rollback API doc found in 4.1.x OpenAPI [ASSUMED: A2]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all modules exist in repo
- Architecture: HIGH — follows Phases 28–29 composite patterns; OpenAPI verified for rollback gap
- Pitfalls: HIGH — deployment status values verified in test fixtures; Phase 10 DNS rule explicit

**Research date:** 2026-07-31
**Valid until:** 2026-08-30 (stable 4.1.x API surface)
