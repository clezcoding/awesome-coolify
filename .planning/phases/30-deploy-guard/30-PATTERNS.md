# Phase 30: Deploy Guard - Pattern Map

**Note:** RESEARCH A1 selects `deployment.ts` extension over PATTERNS.md `deploy-guard.ts` top-level tool sketch — plans follow RESEARCH.

**Files analyzed:** 11 (inferred from GUARD-01..03 + ROADMAP; no CONTEXT.md/RESEARCH.md yet)
**Analogs found:** 10 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/deploy-guard.ts` | controller | request-response + composite read + confirm mutate | `src/mcp/tools/intelligence.ts` + `src/mcp/tools/manifest.ts` | exact (tool shell) |
| `src/utils/deploy-preflight.ts` | utility | transform + batch read | `src/utils/manifest-audit.ts` + `src/mcp/tools/intelligence.ts` (scorecard factors) | role-match |
| `src/mcp/tools/application.ts` | controller | confirm-gated mutate | `src/mcp/tools/application.ts` (`envs:promote` / `delete`) | exact (same file) |
| `src/mcp/tools/deploy-guard.test.ts` | test | — | `src/mcp/tools/intelligence.test.ts` + `src/mcp/tools/manifest.test.ts` | role-match |
| `src/mcp/tools/application.test.ts` | test | — | `src/mcp/tools/application.test.ts` (`envs:promote` confirm blocks) | exact |
| `src/mcp/capabilities.ts` | config | — | `src/mcp/capabilities.ts` (`manifest_audit`, `intelligence_scorecard`) | exact |
| `src/mcp/server.ts` | config | registration | `src/mcp/server.ts` (`intelligence` block) | exact |
| `src/mcp/tools/system.test.ts` | test | — | `src/mcp/tools/system.test.ts` (`CAPABILITY_KEYS`) | exact |
| `docs/coverage-map.yaml` | config | — | `docs/coverage-map.yaml` (`manifest.audit` row) | exact |
| `README.md` · `README.de.md` | docs | — | Phase 29 README drift/guard sections | role-match |
| `src/api/client.ts` | service | request-response | — | no analog (rollback likely composite over existing `triggerDeploy` + list/get) |

## Pattern Assignments

### `src/mcp/tools/deploy-guard.ts` (controller, composite read + confirm mutate)

**Analog (tool shell):** `src/mcp/tools/intelligence.ts`
**Analog (per-app scoped read):** `src/mcp/tools/manifest.ts` (`audit` case)
**Analog (confirm mutate):** `src/mcp/tools/emergency.ts` (`redeploy_project`)

**Imports pattern** (`intelligence.ts` lines 1-40):

```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import {
  fetchAppDeployments,
  fetchEnvs,
  fetchResources,
  fetchServers,
  triggerDeploy,
  fetchDeployment,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import { validateConfirmGate } from './emergency.js';
import {
  createFlatActionSchema,
  parseWithInstanceRouting,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
import {
  buildDeployPreflightReport,
  rollupPreflightSeverity,
  type DeployPreflightFinding,
} from '../../utils/deploy-preflight.js';
import { projectDeploymentSummary } from '../../utils/projections.js';
import { resolveAppMutationUuid } from './application.js'; // or inline same resolve pattern
```

**Actions catalog + schema** (`intelligence.ts` lines 539-578; per-app params like `impact`):

```typescript
export const deployGuardActionsCatalog =
  'Actions: preflight(uuid|name|fqdn, format?, max_chars?, instance?) · ' +
  'rollback(uuid|name|fqdn, confirm, force?, wait?, timeout?, format?, max_chars?, instance?)';

export const deployGuardSafetyFooter =
  'Safety: preflight is read-only · rollback and application.deploy require confirm:true · advisory risk score only';

export const deployGuardActionSchema = createFlatActionSchema(
  ['preflight', 'rollback'],
  {
    uuid: z.string().uuid().optional(),
    name: z.string().optional(),
    fqdn: z.string().optional(),
    confirm: z.boolean().optional(),
    force: z.boolean().optional(),
    wait: z.boolean().optional(),
    timeout: z.number().int().min(10).max(1800).optional(),
    ...sharedReadParamsFlatShape,
  },
  {
    preflight: ['uuid', 'name', 'fqdn', 'format', 'max_chars', 'reveal'],
    rollback: ['uuid', 'name', 'fqdn', 'confirm', 'force', 'wait', 'timeout', 'format', 'max_chars'],
  },
  {
    preflight: ['uuid'], // or uuid|name|fqdn — mirror application deploy identifiers
    rollback: ['confirm'],
  },
);
```

**Handler switch + routing** (`intelligence.ts` lines 932-967):

```typescript
export async function handleDeployGuardAction(
  args: unknown,
  env: EnvConfig,
): Promise<DeployGuardActionResult> {
  try {
    const parsed = parseWithInstanceRouting(deployGuardActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'preflight':
        return await handleDeployGuardPreflight(parsed, routingEnv);
      case 'rollback':
        return await handleDeployGuardRollback(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown deploy-guard action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

**Preflight composite read envelope** — merge `intelligence.scorecard` + `manifest.audit`:

From `intelligence.ts` scorecard response (lines 524-536):

```typescript
return buildReadResponse(
  {
    severity: overall,
    score,
    score_breakdown,
    factors,
    findings,
  },
  { format: parsed.format, max_chars: parsed.max_chars },
);
```

From `manifest.ts` audit case (lines 662-673):

```typescript
return buildReadResponse({
  severity: rollupAuditSeverity(findings),
  findings,
  summary: { /* per-factor counts */ },
  ...(partial ? { partial } : {}),
});
```

**Preflight case pattern** — per-app scoped, read-only, `deploy_guard.preflight` composite:

```typescript
case 'preflight': {
  const appUuid = await resolveAppMutationUuid(parsed, routingEnv);
  const report = await buildDeployPreflightReport(appUuid, routingEnv);
  return buildReadResponse(
    {
      application_uuid: appUuid,
      severity: rollupPreflightSeverity(report.findings),
      risk_score: report.score,
      risk_breakdown: report.score_breakdown,
      factors: report.factors,
      findings: report.findings,
      summary: report.summary,
      ...(report.partial ? { partial: report.partial } : {}),
      hint: {
        tool: 'application',
        action: 'deploy',
        args: { uuid: appUuid, confirm: true },
        label: 'Deploy after human approval — preflight is advisory only',
      },
    },
    { format: parsed.format, max_chars: parsed.max_chars },
  );
}
```

**Rollback confirm gate + deploy loop** (`emergency.ts` lines 347-435):

```typescript
case 'rollback': {
  const appUuid = await resolveAppMutationUuid(parsed, routingEnv);
  await validateConfirmGate('rollback', parsed.confirm ?? false, [
    { uuid: appUuid, name: parsed.name ?? appUuid },
  ]);

  const green = await findLastSuccessfulDeployment(appUuid, routingEnv); // uses fetchAppDeployments pattern
  if (!green) {
    throw new CoolifyApiError({
      code: 'COOLIFY_NO_DEPLOYMENTS',
      message: 'No successful deployment found to roll back to.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_NO_DEPLOYMENTS,
      data: { application_uuid: appUuid },
    });
  }

  const deployRaw = await triggerDeploy(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    appUuid,
    parsed.force ?? false,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  // Optional: redeploy specific commit from green deployment record — composite over list/get, not new REST
  // ... wait/poll via pollDeploymentUntilTerminal when parsed.wait — mirror handleApplicationDeploy
}
```

---

### `src/utils/deploy-preflight.ts` (utility, transform + batch read)

**Analog:** `src/utils/manifest-audit.ts` (findings builder) + `src/mcp/tools/intelligence.ts` (factor collectors + `computeScoreBreakdown`)

**Finding type + rollup** (`manifest-audit.ts` lines 4-13, 96-104):

```typescript
export type DeployPreflightFinding = {
  severity: 'critical' | 'high' | 'info';
  factor: string; // instance_health | env_completeness | recent_failures | dns_readiness
  issue: string;
  uuid?: string;
  name?: string;
  hint: FollowUpHint;
};

export function rollupPreflightSeverity(
  findings: DeployPreflightFinding[],
): 'critical' | 'high' | 'info' | 'ok' {
  // same maxSeverity loop as rollupAuditSeverity
}
```

**Score breakdown** (`intelligence.ts` lines 440-471) — reuse D-06 weights (100 / −30 / −15 / −5):

```typescript
function computePreflightScore(findings: DeployPreflightFinding[]): {
  score: number;
  score_breakdown: {
    start: number;
    critical: number;
    high: number;
    info: number;
    deductions: { critical: number; high: number; info: number };
  };
} {
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  const info = findings.filter((f) => f.severity === 'info').length;
  const deductions = { critical: critical * 30, high: high * 15, info: info * 5 };
  const score = Math.max(0, 100 - deductions.critical - deductions.high - deductions.info);
  return { score, score_breakdown: { start: 100, critical, high, info, deductions } };
}
```

**Instance health factor** — reuse `classifyIssues` (`intelligence.ts` lines 400-437):

```typescript
const classified = classifyIssues(servers, resources);
// Map ScanIssue → DeployPreflightFinding with factor: 'instance_health'
```

**Recent deployment failures factor** — per-app not instance-wide (`intelligence.ts` lines 176-271):

```typescript
const deployments = await fetchAppDeployments(url, token, appUuid, verifySsl);
const sorted = sortDeploymentsNewestFirst(deployments);
// latest failed → high; stuck in_progress >24h → high; recent older fail → info
```

**Env completeness factor** — mirror `envs:promote` fetch (`application.ts` lines 3251-3258):

```typescript
const envs = await fetchEnvs('application', url, token, appUuid, verifySsl);
// Flag missing required keys (app-specific heuristics / empty critical vars) — no new API
```

**DNS readiness factor** — app FQDN from `fetchResources` + `projectResourceSummary` domains field; no live DNS probe in repo today — check domains non-empty + SSL hint via `generateHints` / docs tool pointers (new logic, partial analog: `manifest-audit.ts` domain mismatch findings).

**Soft partial per factor** (`intelligence.ts` lines 491-514):

```typescript
const [healthSettled, envSettled, deploySettled, dnsSettled] = await Promise.allSettled([
  collectInstanceHealthFactor(env),
  collectEnvCompletenessFactor(env, appUuid),
  collectRecentFailuresFactor(env, appUuid),
  collectDnsReadinessFactor(env, appUuid),
]);
// absorb fulfilled → factors[key]; rejected → factors[key] = { failed: toFactorError(reason) }
```

---

### `src/mcp/tools/application.ts` — `deploy` confirm gate (controller, confirm-gated mutate)

**Analog:** `envs:promote` schema refine (`application.ts` lines 611-616) + `validateDeleteConfirm` (lines 1243-1256)

**Schema: add `confirm` to deploy action fields** (extend lines 795-807):

```typescript
deploy: [
  'uuid', 'name', 'fqdn', 'uuids', 'tags', 'tag',
  'force', 'wait', 'timeout', 'confirm',
  'format', 'max_chars',
],
```

**Schema refine** (`application.ts` lines 611-616 pattern):

```typescript
if (data.action === 'deploy' && data.confirm !== true) {
  ctx.addIssue({
    code: 'custom',
    message: "Action 'deploy' requires confirm:true — run deploy_guard.preflight first.",
    params: { code: 'COOLIFY_CONFIRM_REQUIRED' },
  });
}
```

**Handler guard** (`application.ts` lines 1243-1256):

```typescript
async function handleApplicationDeploy(parsed: DeployAction, env: EnvConfig) {
  const uuid = await resolveAppMutationUuid(parsed, env);
  if (parsed.confirm !== true) {
    throw new CoolifyApiError({
      code: 'COOLIFY_CONFIRM_REQUIRED',
      message: `Action 'deploy' on application '${uuid}' requires explicit confirmation.`,
      recoveryHints: [
        'Run deploy_guard.preflight(uuid) to assess risk before deploying.',
        ...RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
      ],
      data: {
        action: 'deploy',
        uuid,
        preflight: { tool: 'deploy_guard', action: 'preflight', args: { uuid } },
      },
    });
  }
  // existing triggerDeploy + wait path unchanged (lines 1620-1677)
}
```

**Preview-without-confirm alternative** — if planner wants deploy preview separate from rollback: use `envs:promote` dry_run default (`application.ts` lines 3248-3207) — preflight lives on `deploy_guard`, not `application.deploy`.

---

### `deployment.list` / `deployment.get` (existing — reuse, do not duplicate)

**Analog:** `src/mcp/tools/deployment.ts`

**List** (lines 288-313) — preflight + rollback scan deployment history:

```typescript
const raw = await fetchAppDeployments(
  env.COOLIFY_URL,
  env.COOLIFY_TOKEN,
  parsed.application_uuid,
  env.COOLIFY_VERIFY_SSL,
);
const items = Array.isArray(raw)
  ? raw.filter(isRecord).map(projectDeploymentSummary)
  : [];
const paginated = paginateArray(items, page, perPage);
return buildReadResponse(paginated, { format, max_chars, page, per_page, total: items.length });
```

**Get** (lines 315-338) — verify rollback target / poll after rollback deploy:

```typescript
const raw = await fetchDeployment(
  env.COOLIFY_URL,
  env.COOLIFY_TOKEN,
  parsed.deployment_uuid,
  env.COOLIFY_VERIFY_SSL,
);
const data =
  projection === 'full'
    ? projectDeploymentFull(rawRecord, parsed.max_chars, parsed.reveal)
    : projectDeploymentSummary(rawRecord);
return buildReadResponse(data, { format: parsed.format, max_chars: parsed.max_chars });
```

**Last-green selection** (`deployment.ts` lines 254-286 + intelligence sort):

```typescript
function findLastSuccessfulDeployment(deployments: unknown[]): Record<string, unknown> | undefined {
  return sortDeploymentsNewestFirst(deployments).find(
    (dep) => String(dep.status ?? '').toLowerCase() === 'finished',
  );
}
```

**Routing** (`deployment.ts` lines 541-547) — deploy-guard utils call client directly; agents may still use `deployment.list` / `deployment.get` / `deployment.watch` for follow-up per prompts.ts deploy flow.

---

### `src/mcp/tools/deploy-guard.test.ts` (test)

**Analog:** `src/mcp/tools/intelligence.test.ts` (`scorecard` describe) + `src/mcp/tools/manifest.test.ts` (`manifest.audit` describe)

**Scorecard-style preflight test** (`intelligence.test.ts` lines 130-209 pattern):

```typescript
describe('preflight (GUARD-01, GUARD-02)', () => {
  it('returns risk_score and factor breakdown for scoped application', async () => {
    const result = await handleDeployGuardAction({ action: 'preflight', uuid: APP_UUID }, testEnv);
    expect(result.structuredContent.data.risk_score).toBeTypeOf('number');
    expect(result.structuredContent.data.factors).toBeDefined();
    expect(result.structuredContent.data.findings).toBeInstanceOf(Array);
  });
});
```

**Confirm gate test** (`application.test.ts` COOLIFY_CONFIRM_REQUIRED blocks):

```typescript
it('rollback without confirm returns COOLIFY_CONFIRM_REQUIRED', async () => {
  const result = await handleDeployGuardAction({ action: 'rollback', uuid: APP_UUID }, testEnv);
  expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
});
```

**Advisory-only preflight** (`manifest.test.ts` audit spy pattern):

```typescript
it('preflight never calls triggerDeploy', async () => {
  await handleDeployGuardAction({ action: 'preflight', uuid: APP_UUID }, testEnv);
  expect(triggerDeploy).not.toHaveBeenCalled();
});
```

---

### `src/mcp/capabilities.ts` (config)

**Analog:** `manifest_audit` + `intelligence_scorecard` (lines 32-66):

```typescript
deploy_guard_preflight: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'MCP composite per-app deploy preflight on Coolify 4.1.x reads (not a Coolify REST endpoint)',
},
deploy_guard_rollback: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'MCP composite rollback via deployment history + triggerDeploy (not a dedicated Coolify rollback REST endpoint)',
},
```

---

### `src/mcp/server.ts` (registration)

**Analog:** `intelligence` tool block (lines 332-339):

```typescript
{
  name: 'deploy_guard',
  description: buildToolDescription(
    'Deploy preflight risk assessment and rollback to last successful deployment.',
    deployGuardActionsCatalog,
    deployGuardSafetyFooter,
  ),
  inputSchema: withInstanceRoutingSchema(deployGuardActionSchema),
},
// handler:
const result = await handleDeployGuardAction(args, env);
```

---

## Shared Patterns

### Composite read (scorecard / audit / preflight)
**Source:** `src/mcp/tools/intelligence.ts` (`handleIntelligenceScorecard`) + `src/mcp/tools/manifest.ts` (`audit`)
**Apply to:** `deploy_guard.preflight`

```typescript
// Promise.allSettled per factor; findings[] + factors{} + severity rollup + optional partial
// score + score_breakdown from finding severities (D-06 weights)
return buildReadResponse({ severity, score, score_breakdown, factors, findings, summary, partial? });
```

### Confirm-gated mutation
**Source:** `src/mcp/tools/emergency.ts` (`validateConfirmGate`) + `application.ts` (`envs:promote`)
**Apply to:** `deploy_guard.rollback`, `application.deploy`

```typescript
await validateConfirmGate(action, confirm === true, [{ uuid, name }]);
// OR throw CoolifyApiError { code: 'COOLIFY_CONFIRM_REQUIRED', recoveryHints, data: { preflight hint } }
```

### Deployment history reads
**Source:** `src/mcp/tools/deployment.ts` (`handleDeploymentList`, `handleDeploymentGet`)
**Apply to:** preflight recent-failures factor, rollback last-green selection, post-rollback poll

```typescript
fetchAppDeployments → sortDeploymentsNewestFirst → filter status === 'finished'
fetchDeployment → projectDeploymentSummary / projectDeploymentFull
```

### Instance routing
**Source:** `src/mcp/tools/shared-read-params.ts` (`parseWithInstanceRouting`, `resolveRoutingEnv`)
**Apply to:** all deploy-guard actions

### Error envelope
**Source:** `src/utils/errors.ts` (`wrapMcpError`, `RECOVERY_HINTS`)
**Apply to:** all handlers — include `deploy_guard.preflight` in deploy confirm recoveryHints

### FollowUpHint remediation
**Source:** `src/utils/diagnose-hints.ts` + `src/utils/manifest-audit.ts`
**Apply to:** every `findings[].hint` — e.g. `diagnose.logs` on failed deploy, `application.envs:list` on env gaps

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/api/client.ts` (new rollback endpoint) | service | request-response | No Coolify rollback REST op in client; GUARD-03 = composite over `fetchAppDeployments` + `triggerDeploy` (+ commit from last `finished` record if needed) |
| DNS live probe | utility | request-response | No existing DNS/SSL probe util — use app domain fields + heuristic findings; optional docs pointer |

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/utils/`, `src/api/client.ts`, `docs/coverage-map.yaml`, `.planning/phases/28-*`, `.planning/phases/29-*`
**Files scanned:** ~45
**Pattern extraction date:** 2026-07-31
**Note:** Phase 30 CONTEXT.md / RESEARCH.md not present — file list inferred from ROADMAP GUARD-01..03 and Phase 28–29 composite patterns.
