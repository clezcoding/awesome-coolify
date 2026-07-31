# Phase 28: Instance Intelligence - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 9 new/modified targets
**Analogs found:** 8 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/intelligence.ts` | controller (MCP handler) | request-response + composite read + batch mutate | `src/mcp/tools/manifest.ts` + `src/mcp/tools/diagnose.ts` | exact (tool shell) |
| `src/mcp/tools/intelligence.test.ts` | test | — | `src/mcp/tools/diagnose.test.ts` + `src/mcp/tools/database.test.ts` | role-match |
| `src/utils/resource-graph.ts` | utility | transform (graph build + traversal) | `src/mcp/tools/database.ts` (`delete_preview`) + `src/mcp/tools/service.ts` | partial (inline today, no utils analog) |
| `src/mcp/server.ts` | config (registration) | — | `src/mcp/server.ts` (`manifest` / `diagnose` blocks) | exact |
| `src/mcp/capabilities.ts` | config | — | `src/mcp/capabilities.ts` (`diagnose_logs`) | exact |
| `src/mcp/tools/system.test.ts` | test | — | `src/mcp/tools/system.test.ts` (`CAPABILITY_KEYS`) | exact |
| `docs/coverage-map.yaml` | config | — | `docs/coverage-map.yaml` (`diagnose.logs` row) | exact |
| `README.md` · `README.de.md` | docs | — | `README.md` capability table + `diagnose.logs` blockquote | role-match |
| `tests/openapi-coverage.test.ts` | test | — | (no change if `assertCoverageFresh` only) | partial |

## Pattern Assignments

### `src/mcp/tools/intelligence.ts` (controller, request-response + composite + batch mutate)

**Analog (tool shell):** `src/mcp/tools/manifest.ts`
**Analog (composite read / soft partial):** `src/mcp/tools/diagnose.ts`
**Analog (batch confirm + per-item results):** `src/mcp/tools/emergency.ts`
**Analog (cleanup delete reuse):** `src/mcp/tools/application.ts` · `service.ts` · `database.ts`

**Imports pattern** (`manifest.ts` lines 1-24):

```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import { fetchResources, fetchServers, fetchService, fetchAppDeployments, fetchDatabaseBackups } from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import { classifyIssues } from '../../utils/issue-classifier.js';
import { generateHints } from '../../utils/diagnose-hints.js';
import { createFlatActionSchema, parseWithInstanceRouting, resolveRoutingEnv, sharedReadParamsFlatShape } from './shared-read-params.js';
import { buildGraph, findDependents, findJanitorCandidates } from '../../utils/resource-graph.js';
import { handleApplicationAction, handleServiceAction, handleDatabaseAction } from './application.js'; // cleanup reuse — or inline delete helpers
```

**Actions catalog + schema** (`manifest.ts` lines 28-70; extend per RESEARCH Pattern 1):

```typescript
export const intelligenceActionsCatalog =
  'Actions: scorecard(format?, max_chars?, instance?) · graph(format?, max_chars?, instance?) · ' +
  'impact(uuid, type, intent?, max_depth?, instance?) · janitor(stopped_days?, format?, instance?) · ' +
  'cleanup(targets, confirm, delete_volumes?, delete_configurations?, instance?)';

export const intelligenceSafetyFooter =
  'Safety: cleanup requires confirm:true · delete_volumes/configurations default false · advisory impact only';

export const intelligenceActionSchema = createFlatActionSchema(
  ['scorecard', 'graph', 'impact', 'janitor', 'cleanup'],
  {
  instance: optionalInstanceParam.instance,
  uuid: z.string().uuid().optional(),
  type: z.enum(['application', 'service', 'database']).optional(),
  intent: z.enum(['delete', 'restart']).optional(),
  max_depth: z.number().int().positive().optional(),
  stopped_days: z.number().int().positive().optional(),
  targets: z.array(z.object({ type: z.enum(['application', 'service', 'database']), uuid: z.string().uuid() })).optional(),
  confirm: z.boolean().optional(),
  delete_volumes: z.boolean().optional(),
  delete_configurations: z.boolean().optional(),
  ...sharedReadParamsFlatShape,
  },
  { scorecard: [...], graph: [...], impact: [...], janitor: [...], cleanup: [...] },
  { impact: ['uuid', 'type'], cleanup: ['targets', 'confirm'] },
);
```

**Handler switch + routing** (`diagnose.ts` lines 746-771):

```typescript
export async function handleIntelligenceAction(
  args: unknown,
  env: EnvConfig,
): Promise<IntelligenceActionResult> {
  try {
    const parsed = parseWithInstanceRouting(intelligenceActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'scorecard':
        return await handleIntelligenceScorecard(parsed, routingEnv);
      case 'graph':
        return await handleIntelligenceGraph(parsed, routingEnv);
      case 'impact':
        return await handleIntelligenceImpact(parsed, routingEnv);
      case 'janitor':
        return await handleIntelligenceJanitor(parsed, routingEnv);
      case 'cleanup':
        return await handleIntelligenceCleanup(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown intelligence action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isIntelligenceErrorResult(
  result: IntelligenceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
```

**Scorecard soft partial per factor** (`diagnose.ts` lines 546-559 + RESEARCH Pattern 2):

```typescript
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
// repeat for backups; diagnose_scan uses classifyIssues directly (not handleDiagnoseAction)
```

**Scan factor seed** (`diagnose.ts` lines 710-743):

```typescript
const classified = classifyIssues(servers, resources);
const projectBucket = (issues: ScanIssue[]) => issues.map(projectScanIssue);
const critical = projectBucket(classified.critical);
const high = projectBucket(classified.high);
const info = projectBucket(classified.info);
```

**Confirm gate (single UUID)** (`application.ts` lines 1180-1194):

```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on application '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: { action: 'delete', uuid },
  });
}
```

**SAF-02 delete defaults on cleanup** (`application.ts` lines 2049-2054):

```typescript
validateDeleteConfirm(parsed.confirm, uuid);

const deleteVolumes = parsed.delete_volumes ?? false;
const deleteConfigurations = parsed.delete_configurations ?? false;
```

**Batch confirm + per-item loop** (`emergency.ts` lines 181-196, 291-306):

```typescript
export async function validateConfirmGate(
  action: string,
  confirm: boolean,
  apps: Array<{ uuid: string; name: string }>,
): Promise<void> {
  if (confirm === true) return;

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action '${action}' is a destructive bulk operation and requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      would_affect: apps.length,
      sample_uuids: apps.slice(0, 5).map((app) => app.uuid),
      action,
    },
  });
}

// cleanup: await validateConfirmGate('cleanup', parsed.confirm ?? false, targets);
// for (const target of targets) { try { await handleXAction({ action:'delete', ... }); } catch ... }
```

**Cleanup reuse:** call exported `handleApplicationAction` / `handleServiceAction` / `handleDatabaseAction` with `{ action: 'delete', uuid, confirm: true, delete_volumes, delete_configurations }` — do not duplicate HTTP delete client (D-14).

---

### `src/utils/resource-graph.ts` (utility, transform)

**Analog (flat parent links):** `src/mcp/tools/database.ts` lines 1481-1488 · `application.ts` lines 2101-2108
**Analog (service nested children):** `src/mcp/tools/service.ts` lines 1399-1417 · `mapNestedChildResources` lines 1378-1388

**Edge extraction from flat resources** (`database.ts` lines 1481-1488):

```typescript
const childResources = rawResources
  .filter(isRecord)
  .filter((resource) => String(resource.database_uuid ?? '') === uuid)
  .map((resource) => ({
    uuid: String(resource.uuid ?? ''),
    name: resource.name != null ? String(resource.name) : undefined,
    type: resource.type != null ? String(resource.type) : undefined,
  }));
```

**Service enrichment** (`service.ts` lines 1399-1417):

```typescript
// Coolify GET /services/{uuid} loads nested applications + databases
// (ServiceApplication / ServiceDatabase). Flat /resources has no service_uuid.
const raw = await fetchService(
  env.COOLIFY_URL,
  env.COOLIFY_TOKEN,
  uuid,
  env.COOLIFY_VERIFY_SSL,
);
const record = isRecord(raw) ? raw : {};
const childResources = [
  ...mapNestedChildResources(
    Array.isArray(record.applications) ? record.applications : [],
    'service-application',
  ),
  ...mapNestedChildResources(
    Array.isArray(record.databases) ? record.databases : [],
    'service-database',
  ),
];
```

**Recommended exports:** `buildGraph(resources, serviceEdges)`, `findDependents(graph, targetUuid, maxDepth)`, `findOrphans(graph)`, `edgesFromFlatResources` — generalize filter direction (child→parent edges) then reverse adjacency for impact.

**Janitor status helpers** (`issue-classifier.ts` lines 99-117):

```typescript
} else if (
  statusStartsWith(status, 'exited') ||
  statusStartsWith(status, 'stopped')
) {
  const hints = generateHints(
    resourceType as HintResourceType,
    uuid,
    status,
    health,
  );
  info.push({ resource_type: resourceType, uuid, name, status, issue: `${resourceType} stopped`, hint: hints[0] });
}
```

**Suggestion envelope** (`diagnose-hints.ts` lines 1-8):

```typescript
export interface FollowUpHint {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  label: string;
  available_in_phase: number;
}
```

---

### `src/mcp/tools/intelligence.test.ts` (test)

**Analog:** `src/mcp/tools/diagnose.test.ts` (mock client + `handleXAction` + `isXErrorResult`)

**Test harness** (`diagnose.test.ts` lines 1-43):

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  intelligenceActionSchema,
  handleIntelligenceAction,
  isIntelligenceErrorResult,
} from './intelligence.js';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchServers: vi.fn(),
  fetchService: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchDatabaseBackups: vi.fn(),
}));
```

**Confirm gate test** (`application.test.ts` lines 2563-2594):

```typescript
it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per SAF-01', async () => {
  const result = await handleApplicationAction(
    { action: 'delete', uuid: 'app-uuid-1', confirm: false },
    testEnv,
  );
  expect(isApplicationErrorResult(result)).toBe(true);
  expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
  expect(deleteApplication).not.toHaveBeenCalled();
});

it('passes all four safe-delete flags false by default per SAF-02', async () => {
  await handleApplicationAction({ action: 'delete', uuid: 'app-uuid-1', confirm: true }, testEnv);
  expect(deleteApplication).toHaveBeenCalledWith(
    testEnv.COOLIFY_URL,
    testEnv.COOLIFY_TOKEN,
    'app-uuid-1',
    { delete_volumes: false, delete_configurations: false, docker_cleanup: false, delete_connected_networks: false },
    testEnv.COOLIFY_VERIFY_SSL,
  );
});
```

**delete_preview / graph edge test** (`database.test.ts` lines 1004-1027):

```typescript
it('includes resources with database_uuid parent link and warning', async () => {
  vi.mocked(fetchResources).mockResolvedValue([
    { uuid: 'child-1', name: 'linked-app', type: 'application', database_uuid: 'db-uuid-1' },
    { uuid: 'other', name: 'unrelated', type: 'application' },
  ]);
  const data = result.data as Record<string, unknown>;
  expect(data.child_resources).toEqual([
    { uuid: 'child-1', name: 'linked-app', type: 'application' },
  ]);
});
```

**Soft partial test** (`diagnose.test.ts` lines 1209-1233):

```typescript
it('mode full returns diagnose_failed but still includes logs when diagnose throws', async () => {
  expect(data.diagnose_failed).toMatchObject({ code: expect.any(String) });
  expect((data.logs as { logs_lines: string[] }).logs_lines.length).toBeGreaterThan(0);
});
```

**Fixture seed:** `tests/fixtures/coolify-mixed-health.ts` for scorecard/janitor status shapes.

---

### `src/mcp/server.ts` (config, registration)

**Analog:** `manifest` + `diagnose` registration (`server.ts` lines 290-322, 564-596)

**Import block** (after `diagnose.js` import ~line 106):

```typescript
import {
  handleIntelligenceAction,
  isIntelligenceErrorResult,
  intelligenceActionSchema,
  intelligenceActionsCatalog,
  intelligenceSafetyFooter,
} from './tools/intelligence.js';
```

**registerTool block** (mirror `diagnose`):

```typescript
server.registerTool(
  'intelligence',
  {
    description: composeToolDescription(
      'Instance health scorecard, dependency graph, impact analysis, and janitor cleanup.',
      intelligenceActionsCatalog,
      intelligenceSafetyFooter,
    ),
    inputSchema: withInstanceRoutingSchema(intelligenceActionSchema),
    outputSchema: toolOutputSchema,
    annotations: { openWorldHint: true },
  },
  async (args) => {
    const result = await handleIntelligenceAction(args, env);
    if (isIntelligenceErrorResult(result)) {
      return {
        ...result,
        structuredContent: { ok: false, error: result.structuredContent.error },
      };
    }
    return {
      content: [{ type: 'text', text: result._formattedText }],
      structuredContent: { ok: true, data: result.data, _meta: result._meta },
    };
  },
);
```

---

### `src/mcp/capabilities.ts` (config)

**Analog:** `diagnose_logs` entry (lines 27-31)

```typescript
diagnose_logs: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'One-shot app diagnose + bounded log tail via diagnose.logs (MCP composite; not a Coolify REST endpoint)',
},
```

**Add five keys** (RESEARCH recommendation): `intelligence_scorecard`, `intelligence_graph`, `intelligence_impact`, `intelligence_janitor`, `intelligence_cleanup` — each `supported: true`, `coolify_min_version: '4.1.2'`, note "MCP composite".

---

### `src/mcp/tools/system.test.ts` (test)

**Analog:** `CAPABILITY_KEYS` array (lines 140-147)

Extend sorted key list from 6 → 11 entries; keep shape assertions (`supported`, `coolify_min_version`, `note`).

---

### `docs/coverage-map.yaml` (config)

**Analog:** `diagnose.logs` row (lines 130-132) — MCP composite lists client fetches, not single REST path

```yaml
  - action: diagnose.logs
    client: [fetchApplication, fetchApplicationEnvs, fetchAppDeployments, fetchApplicationLogs, fetchDeployment]
    openapi: ["GET /applications/{uuid}", ...]
```

**Add rows** for `intelligence.scorecard`, `graph`, `impact`, `janitor`, `cleanup` with composed `client:` arrays (`fetchResources`, `fetchServers`, `fetchService`, `fetchAppDeployments`, `fetchDatabaseBackups`, plus delete client fns for cleanup). Regenerate via `npm run openapi:coverage`.

---

### `README.md` · `README.de.md` (docs)

**Analog:** Capability table row + blockquote (`README.md` lines 731-749)

Add table row: Instance intelligence (`intelligence.scorecard`, `graph`, `impact`, `janitor`, `cleanup`) | ✅ Shipped

Extend capability discovery blockquote with `intelligence.*` actions and `capabilities.intelligence_scorecard` (etc.) via `system.version` — mirror EN/DE structure used for `diagnose.logs`.

---

## Shared Patterns

### Instance routing
**Source:** `src/mcp/tools/diagnose.ts` lines 751-752
**Apply to:** All `intelligence` actions

```typescript
const parsed = parseWithInstanceRouting(intelligenceActionSchema, args);
const routingEnv = resolveRoutingEnv(env, parsed.instance);
```

### Error envelope
**Source:** `src/mcp/tools/diagnose.ts` lines 768-770
**Apply to:** `handleIntelligenceAction` outer catch

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

### Structured recovery hints
**Source:** `src/utils/diagnose-hints.ts` + `src/utils/issue-classifier.ts`
**Apply to:** scorecard `findings[]`, janitor `suggestion` fields

Use `generateHints()` → `FollowUpHint` objects; scan buckets `critical` | `high` | `info`.

### Confirm gate (SAF-01)
**Source:** `src/mcp/tools/application.ts` lines 1180-1194 · `emergency.ts` lines 181-196
**Apply to:** `intelligence.cleanup` only

Single UUID: `validateDeleteConfirm`; batch: `validateConfirmGate('cleanup', confirm, targets)`.

### Safe delete defaults (SAF-02)
**Source:** `src/mcp/tools/application.ts` lines 2051-2052
**Apply to:** cleanup mutations

```typescript
const deleteVolumes = parsed.delete_volumes ?? false;
const deleteConfigurations = parsed.delete_configurations ?? false;
```

### Flat action schema DX
**Source:** `src/mcp/tools/shared-read-params.ts` lines 17-80
**Apply to:** `intelligenceActionSchema`

Use `createFlatActionSchema` with `actionAllowedFields` + `actionRequiredFields` — not top-level discriminatedUnion.

### MCP server registration
**Source:** `src/mcp/server.ts` lines 290-321
**Apply to:** `intelligence` tool

`withInstanceRoutingSchema`, `isIntelligenceErrorResult`, `composeToolDescription`, `toolOutputSchema`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/resource-graph.ts` | utility | transform | No existing `src/utils/*` graph module — extract from inline `delete_preview` filters in domain tools; closest logic is duplicated across `database.ts` / `application.ts` / `service.ts` |

Planner: implement `resource-graph.ts` by generalizing those three `delete_preview` blocks + service nested fetch; no separate utils precedent.

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/mcp/server.ts`, `src/mcp/capabilities.ts`, `src/utils/issue-classifier.ts`, `src/utils/diagnose-hints.ts`, `docs/coverage-map.yaml`, `README.md`
**Files scanned:** ~25
**Pattern extraction date:** 2026-07-30
