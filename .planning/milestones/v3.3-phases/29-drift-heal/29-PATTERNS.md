# Phase 29: Drift & Heal - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 10
**Analogs found:** 9 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/manifest.ts` | controller | request-response + file-I/O | `src/mcp/tools/manifest.ts` (`diff` case) | exact |
| `src/utils/manifest-audit.ts` | utility | transform | `src/mcp/tools/intelligence.ts` (findings builders) + `src/mcp/tools/manifest.ts` (index helpers) | role-match |
| `src/utils/manifest.ts` | utility | file-I/O | `src/utils/manifest.ts` (`ManifestManager.load`) | exact |
| `src/mcp/tools/application.ts` | controller | CRUD + request-response | `src/mcp/tools/application.ts` (`envs:sync`) | exact |
| `src/mcp/capabilities.ts` | config | — | `src/mcp/capabilities.ts` (`intelligence_scorecard`) | exact |
| `src/mcp/tools/manifest.test.ts` | test | — | `src/mcp/tools/manifest.test.ts` (`diff`/`sync` blocks) | exact |
| `src/mcp/tools/application.test.ts` | test | — | `src/mcp/tools/application.test.ts` (`envs:sync` describe) | exact |
| `src/mcp/tools/system.test.ts` | test | — | `src/mcp/tools/system.test.ts` (`capabilities` describe) | exact |
| `docs/coverage-map.yaml` | config | — | `docs/coverage-map.yaml` (`manifest.diff`, `application.envs:sync`) | exact |
| `src/utils/manifest.test.ts` | test | file-I/O | — | no analog |

## Pattern Assignments

### `src/mcp/tools/manifest.ts` (controller, request-response + file-I/O)

**Analog:** same file — `diff` handler + `fetchRemoteManifest` / `buildReconciliationReport`

**Imports pattern** (lines 1-24):

```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import {
  fetchProjects,
  fetchProject,
  fetchResources,
  fetchServers,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  ManifestManager,
  manifestResourceSchema,
  manifestSchema,
  type Manifest,
  type ManifestResource,
} from '../../utils/manifest.js';
import { InstanceManager } from '../../utils/instance-registry.js';
import { createFlatActionSchema, optionalInstanceParam } from './shared-read-params.js';
```

**Action catalog + schema extension** (lines 28-63) — add `audit` alongside `diff`:

```typescript
export const manifestActionsCatalog =
  'Actions: get() · upsert(...) · ... · sync(...) · diff() · audit()';

export const manifestActionSchema = createFlatActionSchema(
  ['get', 'upsert', 'set', 'remove', 'clear', 'sync', 'diff', 'audit'],
  {
    // ...existing fields...
    instance: optionalInstanceParam.instance,
  },
  {
    // ...
    diff: ['instance'],
    audit: ['instance'],
  },
  { /* required fields unchanged */ },
);
```

**Credential resolution + COOLIFY_NO_INSTANCE** (lines 115-120, 515-527) — reuse for `audit`:

```typescript
function resolveSyncCredentials(
  env: EnvConfig | undefined,
  instance?: string,
): { url: string; token: string; verifySsl: boolean } {
  return InstanceManager.resolveCredentials(instance, resolveEnvRecord(env));
}

// In handler:
try {
  creds = resolveSyncCredentials(env, parsed.instance);
} catch (error) {
  if (
    error instanceof CoolifyApiError &&
    error.envelope.code === 'COOLIFY_NO_INSTANCE'
  ) {
    return wrapMcpError(error);
  }
  throw error;
}
```

**Core `diff` pattern** (lines 515-537) — audit builds on same fetch/compare; do not mutate:

```typescript
case 'diff': {
  // ...resolve creds...
  const remote = await fetchRemoteManifest(creds);
  const local = ManifestManager.load();
  const mergeResult = mergeManifests(local, remote, { prune: false });
  const report = buildReconciliationReport(local, remote, mergeResult);

  return buildReadResponse({
    diff: report,
    destructive: false,
  });
}
```

**New `audit` case pattern** — read-only, findings envelope, optional `diff_support`:

```typescript
case 'audit': {
  if (!ManifestManager.exists()) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Local manifest not found at .coolify/manifest.json',
      recoveryHints: [
        'Run manifest.sync to populate the local manifest cache from live Coolify state.',
        'Or manifest.upsert to add resources manually.',
      ],
    });
  }
  const { manifest: remote, partial } = await fetchLiveManifestSnapshot(creds, { softPartial: true });
  const local = ManifestManager.load();
  const findings = buildManifestAuditFindings(local, remote);
  const report = buildReconciliationReport(local, remote, mergeManifests(local, remote, { prune: false }));
  return buildReadResponse({
    severity: rollupAuditSeverity(findings),
    findings,
    summary: { /* counts from report */ },
    ...(partial ? { partial } : {}),
    diff_support: report, // supporting detail only — never sole payload
  });
}
```

**Error handling** (lines 545-547):

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

**Refactor target:** extract `fetchLiveManifestSnapshot()` from `fetchRemoteManifest` — strict `Promise.all` for diff/sync; `Promise.allSettled` + `partial` meta for audit only (D-06).

---

### `src/utils/manifest-audit.ts` (utility, transform)

**Analog:** `src/mcp/tools/intelligence.ts` (`ScorecardFinding` + hint builders) + `src/mcp/tools/manifest.ts` (`collectResourceUuids`, `domainsFromApiResource`)

**Imports pattern:**

```typescript
import type { Manifest, ManifestResource } from './manifest.js';
import type { FollowUpHint } from './diagnose-hints.js';
```

**Finding type** — mirror `ScorecardFinding` (intelligence.ts lines 61-69):

```typescript
export type ManifestAuditFinding = {
  severity: 'critical' | 'high' | 'info';
  kind: string;
  uuid: string;
  resource_type?: 'application' | 'service' | 'database';
  issue: string;
  local?: Record<string, unknown>;
  live?: Record<string, unknown>;
  hint: FollowUpHint;
};
```

**Hint builder pattern** (intelligence.ts lines 147-164):

```typescript
function syncHint(instance?: string): FollowUpHint {
  return {
    tool: 'manifest',
    action: 'sync',
    args: { dry_run: true, ...(instance ? { instance } : {}) },
    label: 'Preview manifest sync to reconcile cache',
    available_in_phase: 17,
  };
}
```

**Index helper** — lift/adapt from manifest.ts lines 237-247:

```typescript
function indexManifestResources(manifest: Manifest): Map<string, { resource: ManifestResource; project_uuid: string; environment_uuid: string }> {
  const index = new Map();
  for (const project of manifest.projects) {
    for (const environment of project.environments) {
      for (const resource of environment.resources) {
        index.set(resource.uuid, {
          resource,
          project_uuid: project.uuid,
          environment_uuid: environment.uuid,
        });
      }
    }
  }
  return index;
}
```

**Domain compare** — reuse `domainsFromApiResource` normalization; sort-copy before equality (manifest.ts lines 129-137).

**Severity rollup** — copy `rollupSeverity` / `SEVERITY_RANK` from intelligence.ts lines 46-54, 90-96.

---

### `src/utils/manifest.ts` (utility, file-I/O)

**Analog:** `ManifestManager.load()` (lines 100-104)

**Core exists() pattern** — sibling to load guard:

```typescript
static exists(): boolean {
  return existsSync(manifestFilePath());
}

static load(): Manifest {
  const filePath = manifestFilePath();
  if (!existsSync(filePath)) {
    return emptyManifest(); // audit must NOT rely on this — call exists() first
  }
  // ...
}
```

**Error handling for parse failures** (lines 111-130) — reuse `CoolifyApiError` + custom `recoveryHints` for malformed manifest (audit should surface these via `wrapMcpError`).

---

### `src/mcp/tools/application.ts` (controller, CRUD + request-response)

**Analog:** `envs:sync` handler + schema (`handleApplicationEnvsSync`, `validateSyncConflictPolicy`)

**Catalog extension** (lines 358-364):

```typescript
export const applicationActionsCatalog =
  '... envs:bulk-update(uuid, entries, confirm) · ' +
  'envs:sync(uuid, env_file?, env_content?, dry_run?, confirm?, conflict_policy?) · ' +
  'envs:promote(source_uuid, target_uuid, dry_run?, confirm?, conflict_policy?, reveal?)';
```

**Schema: add action + refine** (lines 572-592, 598-617, 929-942):

```typescript
// applicationExtraRefine — add envs:promote block:
if (data.action === 'envs:promote') {
  if (!data.source_uuid || !data.target_uuid) {
    ctx.addIssue({
      code: 'custom',
      message: 'envs:promote requires source_uuid and target_uuid',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
  if (data.dry_run === false && data.confirm !== true) {
    ctx.addIssue({
      code: 'custom',
      message: "Action 'envs:promote' requires confirm:true when applying (dry_run:false)",
      params: { code: 'COOLIFY_CONFIRM_REQUIRED' },
    });
  }
}

// buildApplicationActionSchema actions array:
['get', /* ... */, 'envs:sync', 'envs:promote'],

// per-action keys:
'envs:promote': [
  'source_uuid', 'target_uuid', 'dry_run', 'confirm', 'conflict_policy',
  'reveal', 'instance', 'format', 'max_chars',
],
```

**Confirm gate** (env-shared.ts lines 97-116):

```typescript
import { validateEnvMutationConfirm, maskEnvRecord } from './env-shared.js';
import { diffEnvs, type ConflictPolicy } from '../../utils/env-parser.js';

if (!parsed.dry_run) {
  validateEnvMutationConfirm(parsed.confirm, 'envs:promote', targetUuid, 'application');
}
```

**Conflict policy** (application.ts lines 2621-2643) — reuse for promote apply:

```typescript
function validateSyncConflictPolicy(
  conflicts: Conflict[],
  conflictPolicy: ConflictPolicy | undefined,
  uuid: string,
): void {
  if (conflicts.length === 0 || conflictPolicy !== undefined) return;
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'envs:sync' on application '${uuid}' has value conflicts — set conflict_policy to overwrite, keep_remote, or abort after asking the human.`,
    recoveryHints: [ASK_HUMAN_CONFLICT_POLICY_HINT, ...RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED],
    data: {
      action: 'envs:sync',
      uuid,
      conflicts,
      conflict_policy_options: ['overwrite', 'keep_remote', 'abort'],
    },
  });
}
```

**Core compare pattern** (env-parser.ts lines 144-168 + envs:sync dry_run):

```typescript
const [sourceEnvs, targetEnvs] = await Promise.all([
  fetchEnvs('application', env.COOLIFY_URL, env.COOLIFY_TOKEN, sourceUuid, env.COOLIFY_VERIFY_SSL),
  fetchEnvs('application', env.COOLIFY_URL, env.COOLIFY_TOKEN, targetUuid, env.COOLIFY_VERIFY_SSL),
]);
const sourceParsed = sourceEnvs.map((e) => ({ key: e.key, value: e.value }));
const diff = diffEnvs(sourceParsed, targetEnvs);
// only_in_source ← diff.added; only_in_target ← diff.removed; value_mismatches ← diff.updated
// mask via maskEnvRecord(entry, parsed.reveal ?? false)
```

**Apply path** — mirror envs:sync: `bulkUpdateEnvs` for updates, `createEnv` for new keys; default `conflict_policy: 'keep_remote'`; never delete `only_in_target` keys.

**Switch case** (line 3081 area):

```typescript
case 'envs:promote':
  return await handleApplicationEnvsPromote(parsed, env);
```

---

### `src/mcp/capabilities.ts` (config)

**Analog:** `intelligence_scorecard` entry (lines 32-36)

```typescript
manifest_audit: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'MCP composite manifest drift audit on Coolify 4.1.x reads (not a Coolify REST endpoint)',
},
envs_promote: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'MCP cross-environment env promotion preview/apply via existing env CRUD (not a Coolify REST endpoint)',
},
```

Register in `COOLIFY_412_CAPABILITIES` `as const satisfies` block — same shape as existing keys.

---

### `src/mcp/tools/manifest.test.ts` (test)

**Analog:** `diff` test block (lines 579-620) + workspace isolation (lines 1-60)

**Test harness pattern** (lines 1-60):

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
// ...
beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-manifest-tool-'));
  process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  vi.clearAllMocks();
});
```

**Diff non-destructive assertion** (lines 579-620):

```typescript
it("handleManifestAction({action:'diff', instance:'prod'}) returns always non-destructive report", async () => {
  // seed instance + manifest, mock fetch*...
  const result = await handleManifestAction({ action: 'diff', instance: 'prod' }, testEnv);
  expect(isManifestErrorResult(result)).toBe(false);
  expect(result.data).toMatchObject({ destructive: false, diff: expect.any(Object) });
});
```

**Audit test scaffolds to add:**
- `audit` returns `findings[]` with `severity` + `hint.tool/action`
- missing manifest → `COOLIFY_VALIDATION_ERROR` + recovery hints (no file seeded)
- partial fetch → `partial` key present when one `fetch*` rejects
- `ManifestManager.exists()` unit case

Use `it.fails` Wave 0 scaffolds per RESEARCH.md Validation Architecture.

---

### `src/mcp/tools/application.test.ts` (test)

**Analog:** `describe('application envs:sync')` (lines 3046-3159)

**Mock setup** (lines 3047-3065):

```typescript
describe('application envs:promote', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvs).mockReset();
    vi.mocked(bulkUpdateEnvs).mockReset();
    vi.mocked(createEnv).mockReset();
    vi.mocked(fetchEnvs).mockResolvedValue(mockEnvList);
  });
```

**Dry-run preview** (lines 3151-3159):

```typescript
it('dry_run:true returns diff without writing per D-06', async () => {
  const result = await handleApplicationAction({
    action: 'envs:sync', uuid: 'app-uuid-1', env_content: '...', dry_run: true,
  }, testEnv);
  expect(isApplicationErrorResult(result)).toBe(false);
  expect(result.data).toMatchObject({ dry_run: true });
  expect(bulkUpdateEnvs).not.toHaveBeenCalled();
});
```

**Promote test scaffolds:**
- preview buckets `only_in_source` / `only_in_target` / `value_mismatches` with masked values
- apply without `confirm:true` → `COOLIFY_CONFIRM_REQUIRED`
- `conflict_policy: 'keep_remote'` skips mismatch keys on apply
- two distinct `fetchEnvs` calls for source_uuid + target_uuid

---

### `src/mcp/tools/system.test.ts` (test)

**Analog:** `describe('capabilities')` (lines 139-197)

```typescript
const CAPABILITY_KEYS = [
  // ...existing 11 keys...
  'manifest_audit',
  'envs_promote',
] as const;

it('system.version capabilities has exactly thirteen keys including manifest_audit and envs_promote', async () => {
  const result = await handleSystemAction({ action: 'version' }, testEnv);
  expect(Object.keys(result.capabilities ?? {}).sort()).toEqual([...CAPABILITY_KEYS].sort());
  expect(caps.manifest_audit).toMatchObject({
    supported: true,
    coolify_min_version: '4.1.2',
    note: expect.any(String),
  });
});
```

---

### `docs/coverage-map.yaml` (config)

**Analog:** `manifest.diff` (lines 227-229) + `application.envs:sync` (lines 52+)

```yaml
  - action: manifest.audit
    client: [fetchResources, fetchProjects, fetchServers, fetchProject]
    openapi: ["GET /resources", "GET /projects", "GET /servers", "GET /projects/{uuid}"]
  - action: application.envs:promote
    client: [fetchApplicationEnvs, bulkUpdateEnvs, createEnv]
    openapi: ["GET /applications/{uuid}/envs", "PATCH /applications/{uuid}/envs/bulk", "POST /applications/{uuid}/envs"]
```

Run `npm run openapi:coverage` after edit to regen `docs/COVERAGE.md`.

---

## Shared Patterns

### FollowUpHint remediation envelope
**Source:** `src/utils/diagnose-hints.ts` (lines 1-7)
**Apply to:** `manifest-audit.ts` findings, `envs:promote` promotion_suggestions

```typescript
export interface FollowUpHint {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  label: string;
  available_in_phase: number;
}
```

### Severity taxonomy
**Source:** `src/mcp/tools/intelligence.ts` (lines 46-47, 61-69) + `src/mcp/tools/diagnose.ts` (lines 281-284)
**Apply to:** `manifest.audit` findings rollup

```typescript
type FindingSeverity = 'critical' | 'high' | 'info';
// diagnose.scan buckets: { critical, high, info }
// intelligence ScorecardFinding: { severity, issue, hint: FollowUpHint }
```

### Soft partials on composite reads
**Source:** `src/mcp/tools/intelligence.ts` (lines 491-514)
**Apply to:** `manifest.audit` live fetch only

```typescript
const [deploySettled, backupSettled, ...] = await Promise.allSettled([...]);
const absorb = (key: string, settled: PromiseSettledResult<FactorResult>): void => {
  if (settled.status === 'fulfilled') { /* merge findings */ return; }
  factors[key] = { failed: toFactorError(settled.reason) };
};
```

### Instance routing + COOLIFY_NO_INSTANCE
**Source:** `src/mcp/tools/manifest.ts` (lines 115-120, 417-427)
**Apply to:** `manifest.audit`, `envs:promote` (when `instance` param added)

```typescript
creds = InstanceManager.resolveCredentials(instance, resolveEnvRecord(env));
// catch COOLIFY_NO_INSTANCE → return wrapMcpError(error)
```

Recovery hints: `src/utils/errors.ts` lines 105-109 (`RECOVERY_HINTS.COOLIFY_NO_INSTANCE`).

### Env value masking (SAF-04)
**Source:** `src/mcp/tools/env-shared.ts` (lines 9-23)
**Apply to:** `envs:promote` preview response

```typescript
export function maskEnvRecord(env: Env, reveal: boolean): Record<string, unknown> {
  const projected = sanitizeFullProjection(env, reveal) as Record<string, unknown>;
  if (!reveal && typeof projected.value === 'string') {
    projected.value = '***';
  }
  return projected;
}
```

### Confirm gates (SAF-01)
**Source:** `src/mcp/tools/env-shared.ts` (lines 97-116)
**Apply to:** `envs:promote` apply path

```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_CONFIRM_REQUIRED',
  message: `Action '${action}' on ${resourceLabel} '${uuid}' requires explicit confirmation.`,
  recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
  data: { action, uuid },
});
```

### Action schema conventions
**Source:** `src/mcp/tools/shared-read-params.ts` — `createFlatActionSchema`, `optionalInstanceParam`
**Apply to:** both new actions

### Handler error wrapper
**Source:** all domain tools — `wrapMcpError` in catch block
**Apply to:** manifest + application handlers (unchanged)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/manifest.test.ts` | test | file-I/O | No co-located util test for `ManifestManager`; use `manifest.test.ts` for `exists()` or add minimal describe in that file |

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/utils/`, `src/mcp/capabilities.ts`, `docs/coverage-map.yaml`
**Files scanned:** ~15 primary + grep across handlers/tests
**Pattern extraction date:** 2026-07-30
