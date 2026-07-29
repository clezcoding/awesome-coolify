# Phase 24: Capabilities & Deployment Logs - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 18
**Analogs found:** 16 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/capabilities.ts` | config | transform | `src/utils/errors.ts` (`RECOVERY_HINTS`) | role-match |
| `src/utils/package-version.ts` | utility | file-I/O | `src/utils/instance-registry.ts` | role-match |
| `src/mcp/tools/system.ts` | controller | request-response | `src/mcp/tools/system.ts` (`verify` case) | exact |
| `src/mcp/tools/meta.ts` | controller | request-response | `src/mcp/tools/meta.ts` (existing) | exact |
| `src/mcp/tools/deployment.ts` | controller | request-response + streaming | `src/mcp/tools/deployment.ts` (`watch`) | exact |
| `src/utils/log-helpers.ts` | utility | transform | `src/mcp/tools/application.ts` (build path) | data-flow-match |
| `src/mcp/tools/application.ts` | controller | request-response | `src/mcp/tools/application.ts` (`handleApplicationLogs`) | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (`COOLIFY_DEPLOYMENT_FAILED`) | exact |
| `src/mcp/prompts.ts` | config | — | `src/mcp/prompts.ts` (`deploy` prompt) | exact |
| `src/mcp/tools/system.test.ts` | test | — | `src/mcp/tools/system.test.ts` (`verify`) | exact |
| `src/mcp/tools/meta.test.ts` | test | — | `src/mcp/tools/meta.test.ts` | exact |
| `src/mcp/tools/deployment.test.ts` | test | — | `src/mcp/tools/deployment.test.ts` (`watch`) | exact |
| `src/mcp/tools/application.test.ts` | test | — | `src/mcp/tools/application.test.ts` (build logs) | exact |
| `src/utils/log-helpers.test.ts` | test | — | `src/utils/log-helpers.test.ts` | exact |
| `src/utils/errors.test.ts` | test | — | `src/utils/errors.test.ts` (`COOLIFY_WATCH_TIMEOUT`) | exact |
| `docs/coverage-map.yaml` | config | — | `docs/coverage-map.yaml` (`deployment.watch`) | exact |
| `docs/COVERAGE.md` | config | — | generated from coverage-map | exact |
| `README.md` / `README.de.md` | config | — | existing README structure | partial |

## Pattern Assignments

### `src/mcp/capabilities.ts` (config, transform)

**Analog:** `src/utils/errors.ts` — static typed map pattern

**Static map pattern** (lines 4-29, 49-153):

```typescript
export type CoolifyErrorCode =
  | 'COOLIFY_401'
  // ...
  | 'COOLIFY_DEPLOYMENT_FAILED'
  | 'COOLIFY_DEPLOYMENT_CANCELLED';

export const RECOVERY_HINTS: Record<CoolifyErrorCode, string[]> = {
  COOLIFY_DEPLOYMENT_FAILED: [
    'Surface the deployment failure to the user with the status and any available summary fields.',
    'Fetch build logs via deployment.get with projection: full (include_logs on watch only applies to finished success).',
  ],
  // ...
};
```

**Apply:** Export `COOLIFY_412_CAPABILITIES` as flat `Record<string, { supported: boolean; coolify_min_version: string; note?: string }>` with `as const satisfies Record<...>`. Four keys only: `application_logs`, `deployment_logs`, `deployment_watch`, `deploy_watch`. No runtime computation.

**Secondary analog:** `src/mcp/tools/backup-shared.ts` (lines 8-15) for `as const` preset arrays:

```typescript
export const BACKUP_FREQUENCY_PRESETS = [
  'every_minute',
  'hourly',
  // ...
] as const;
```

---

### `src/utils/package-version.ts` (utility, file-I/O)

**Analog:** `src/utils/instance-registry.ts` — `readFileSync` + `JSON.parse`

**File read pattern** (lines 84-91):

```typescript
static loadRegistry(): Registry {
  const filePath = registryFilePath();
  if (!existsSync(filePath)) {
    return { instances: [] };
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Registry;
```

**Apply:** Module-level cache + `readFileSync`/`JSON.parse` for `package.json` version. Use `import.meta.url` path resolution per RESEARCH (no existing `fileURLToPath` in repo — new but standard Node ESM). Path: `resolve(dirname(fileURLToPath(import.meta.url)), '../package.json')` from `src/utils/`.

**npm tarball guard:** `tests/npm-pack-allowlist.test.ts` asserts `package.json` ships in tarball — required for `npx` installs.

---

### `src/mcp/tools/system.ts` (controller, request-response)

**Analog:** `verify` case in same file — already uses `coolifyVersion` field name

**Version extraction** (lines 158-171 — current, to replace):

```typescript
case 'version': {
  logger.httpDebug('/api/v1/version', 0);
  const versionData = await fetchVersion(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  const version =
    typeof versionData === 'object' &&
    versionData !== null &&
    'version' in versionData
      ? String((versionData as { version: unknown }).version)
      : String(versionData);
  return { version };
}
```

**Target shape analog** — `verify` case (lines 173-190):

```typescript
case 'verify': {
    // ... same fetchVersion call ...
    const coolifyVersion =
      typeof versionData === 'object' &&
      versionData !== null &&
      'version' in versionData
        ? String((versionData as { version: unknown }).version)
        : String(versionData);
    return {
      connected: true,
      host: hostnameFromUrl(routingEnv.COOLIFY_URL),
      coolifyVersion,
    };
}
```

**Apply:** Extend `SystemVersionResult` interface (lines 57-59). Return `{ coolifyVersion, mcpVersion: readPackageVersion(), serverName: MCP_SERVER_NAME, capabilities: COOLIFY_412_CAPABILITIES }`. Import `MCP_SERVER_NAME` from `meta.ts`. Extract shared version-string helper from duplicate `version`/`verify` logic (ponytail: inline once in `version` case if extraction costs a new file).

**Catalog string** (line 21-22): Update `systemActionsCatalog` to document new response fields.

---

### `src/mcp/tools/meta.ts` (controller, request-response)

**Analog:** self — keep shape, fix version source

**Current pattern** (lines 4-28):

```typescript
export const MCP_SERVER_NAME = 'awesome-coolify-mcp';
export const MCP_VERSION = '0.1.0';

export interface MetaVersionResult {
  mcpVersion: string;
  serverName: string;
}

export async function handleMetaAction(
  args: MetaAction,
): Promise<MetaVersionResult> {
  switch (args.action) {
    case 'version':
      return {
        mcpVersion: MCP_VERSION,
        serverName: MCP_SERVER_NAME,
      };
```

**Apply:** Replace `MCP_VERSION` constant with `readPackageVersion()`. Remove or deprecate exported `MCP_VERSION` — tests currently import it (`meta.test.ts:5`). Do **not** add `capabilities` to meta (D-06).

---

### `src/mcp/tools/deployment.ts` (controller, request-response)

**Analog:** `watch` action — Phase 21 pattern for new action on existing tool

**Schema registration** (lines 35-36, 61-62, 105-120):

```typescript
export const deploymentActionsCatalog =
  'Actions: list(...) · get(...) · cancel(...) · watch(deployment_uuid, timeout?, min_interval?, max_interval?, include_logs?, format?, max_chars?, instance?)';

export const deploymentToolSchema = createFlatActionSchema(
  ['list', 'get', 'cancel', 'watch'],
  {
    // ... deployment_uuid, timeout, include_logs, ...
    ...sharedReadParamsFlatShape,
  },
  {
  // ...
    watch: [
      'deployment_uuid',
      'timeout',
      'min_interval',
      'max_interval',
      'include_logs',
      'format',
      'max_chars',
    ],
  },
  {
    watch: ['deployment_uuid'],
  },
```

**Handler dispatch** (lines 385-410):

```typescript
export async function handleDeploymentAction(
  args: DeploymentAction,
  env: EnvConfig,
): Promise<DeploymentActionResult> {
  try {
    const parsed = parseWithInstanceRouting(deploymentToolSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list':
        return await handleDeploymentList(parsed, routingEnv);
      // ...
      case 'watch':
        return await handleDeploymentWatch(parsed, routingEnv);
```

**Apply for `logs` action:**
1. Add `'logs'` to actions array + catalog string: `logs(deployment_uuid|application_uuid, lines?, offset?, include_hidden?, type?, format?, max_chars?, instance?)`
2. Spread `sharedLogParamsFlatShape` + `offset` field (copy from `application.ts:178-185`)
3. `actionAllowedFields.logs`: log params + `format`, `max_chars`, `instance`
4. `actionRequiredFields`: omit both UUIDs from required — enforce XOR in `extraRefine` (mirror `applicationLogsSchema` superRefine at `application.ts:189-206`)
5. `zodDefaultFields`: log param defaults from `sharedLogParamsSchema` (lines 100, 231, 235, 239, 245)
6. New `handleDeploymentLogs` private handler + `case 'logs'` in switch
7. **Do not** route through `handleApplicationAction` or `deployment.watch`

**Latest-deployment resolution** — anti-pattern in `application.ts:1167-1177` (picks `deployments[0]` without sort):

```typescript
export function extractDeploymentUuid(raw: unknown): string {
  const deployments = Array.isArray(deployResp.deployments) ? deployResp.deployments : [];
  const first = deployments[0];
  // ...
}
```

**Correct pattern:** Explicit `created_at` desc sort in new `resolveLatestDeploymentUuid()`. Mock data in `deployment.test.ts:34-48` has `dep-3` newest at index 2 — list handler does NOT sort (`deployment.ts:200-205`), so logs handler must sort independently.

**No-deployments error** — mirror `handleDeploymentWatch` failure throws (lines 352-358):

```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_DEPLOYMENT_FAILED',
  message: `Deployment failed with status: ${status}.`,
  recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_FAILED,
  data: { deployment: summary },
});
```

Use new `COOLIFY_NO_DEPLOYMENTS` code instead (D-14).

**Fetch pattern** — `handleDeploymentGet` (lines 223-228):

```typescript
const raw = await fetchDeployment(
  env.COOLIFY_URL,
  env.COOLIFY_TOKEN,
  parsed.deployment_uuid,
  env.COOLIFY_VERIFY_SSL,
);
```

---

### `src/utils/log-helpers.ts` (utility, transform)

**Analog:** inline logic in `handleApplicationLogs` build path

**Source to extract** (`application.ts:1440-1510):

```typescript
if (parsed.deployment_uuid) {
  const raw = await fetchDeployment(/* ... */);
  const rec = isRecord(raw) ? raw : {};

  if (typeof rec.logs !== 'string') {
    throw new CoolifyApiError({
      code: 'COOLIFY_403_SENSITIVE_REQUIRED',
      message: 'Deployment build logs are not available — the API token lacks the api.sensitive ability...',
      recoveryHints: RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED,
    });
  }

  const { parsed: parsedOk, entries } = parseBuildLogEntries(rec.logs);
  // ... plain-string fallback via sliceLogBlob/capLogOutput ...
  // ... JSON path: filter hidden/type, flatten, slice, cap ...
  return buildReadResponse({ deployment_uuid, status, logs_lines, ... }, { format, max_chars });
}
```

**Existing helpers** (`log-helpers.ts:13-56`):

```typescript
export function sliceLogBlob(logs: string, lines: number, offset: number): string[] { /* ... */ }
export function capLogOutput(logs: string, max_chars: number): { text: string; truncated: boolean } { /* ... */ }
export function parseBuildLogEntries(logs: string): { parsed: boolean; entries: BuildLogEntry[] } { /* ... */ }
```

**Apply:** New `processDeploymentBuildLogs(deploymentUuid, rec, params)` returns envelope fields (no `buildReadResponse` — caller wraps). Add D-16 empty-string soft OK + hint. `application.ts` build path becomes thin: fetch + `processDeploymentBuildLogs` + `buildReadResponse`.

**Note:** `buildReadResponse` stays in handler layer (`formatters.ts`), not log-helpers — matches separation in existing code.

---

### `src/mcp/tools/application.ts` (controller, request-response)

**Analog:** self — `handleApplicationLogs` build path (keep for D-11 back-compat)

**XOR schema pattern** (lines 189-206):

```typescript
.superRefine((data, ctx) => {
  const hasRuntimeId = !!(data.uuid || data.name || data.fqdn);
  if (!hasRuntimeId && !data.deployment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message: 'Either uuid (runtime logs) or deployment_uuid (build logs) must be provided',
      params: { code: 'COOLIFY_422' },
    });
  }
  if (hasRuntimeId && data.deployment_uuid) {
    ctx.addIssue({ /* ... */ });
  }
});
```

**Apply:** Refactor build branch to call `processDeploymentBuildLogs`. No schema changes. No deprecation warnings (D-11).

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `COOLIFY_DEPLOYMENT_FAILED` addition pattern

**Error code union** (lines 4-29):

```typescript
export type CoolifyErrorCode =
  | 'COOLIFY_WATCH_TIMEOUT'
  | 'COOLIFY_DEPLOYMENT_FAILED'
  | 'COOLIFY_DEPLOYMENT_CANCELLED';
```

**Recovery hints entry** (lines 145-152):

```typescript
COOLIFY_DEPLOYMENT_FAILED: [
  'Surface the deployment failure to the user with the status and any available summary fields.',
  'Fetch build logs via deployment.get with projection: full (include_logs on watch only applies to finished success).',
],
```

**Apply:** Add `COOLIFY_NO_DEPLOYMENTS` to union + `RECOVERY_HINTS` with deploy-first / list-deployments hints. Throw from `handleDeploymentLogs` when `fetchAppDeployments` returns empty array.

---

### `src/mcp/prompts.ts` (config)

**Analog:** existing `deploy` prompt step 4 (lines 50-58)

```typescript
4. On watch timeout error: re-call \`deployment.watch\` with the same \`deployment_uuid\` (raise \`timeout\` if builds are slow). On \`failed\` or \`cancelled-by-user\`: surface the error and logs hint to the user — do not treat as success.
```

**Apply:** Add one line referencing `deployment.logs` on failure path (D-18). Do **not** touch `incident` prompt (Phase 26).

---

### `src/mcp/tools/system.test.ts` (test)

**Analog:** `verify` test — asserts `coolifyVersion` without token leak (lines 128-140)

```typescript
describe('handleSystemAction verify', () => {
  it('returns connected host and coolifyVersion without token', async () => {
    const result = await handleSystemAction({ action: 'verify' }, testEnv);
    // ...
    expect(result).toEqual({
      connected: true,
      host: 'coolify.example.com',
      coolifyVersion: '4.1.0',
    });
    expect(JSON.stringify(result)).not.toContain(testEnv.COOLIFY_TOKEN);
  });
});
```

**Current version test to replace** (lines 118-125):

```typescript
it('returns version string from API', async () => {
  const result = await handleSystemAction({ action: 'version' }, testEnv);
  expect(result).toEqual({ version: '4.1.0' });
});
```

**Apply:** Assert `{ coolifyVersion, mcpVersion, serverName, capabilities }`. New `describe('capabilities')` with `it.fails` Wave 0 scaffold. Assert capabilities has 4 keys with object shape. Assert no token in JSON (mirror health/verify pattern at lines 88-97).

---

### `src/mcp/tools/meta.test.ts` (test)

**Analog:** self (lines 15-28)

```typescript
it('returns mcpVersion matching package version', async () => {
  const result = await handleMetaAction({ action: 'version' });
  expect(result.mcpVersion).toBe(MCP_VERSION);
  expect(result.serverName).toBe('awesome-coolify-mcp');
});
```

**Apply:** Import `readPackageVersion` instead of `MCP_VERSION`. Assert `result.mcpVersion === readPackageVersion()`.

---

### `src/mcp/tools/deployment.test.ts` (test)

**Analog:** `describe('deployment watch')` (lines 383-415)

```typescript
describe('deployment watch', () => {
  it('schema accepts watch with deployment_uuid only', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
    });
    expect(result.success).toBe(true);
  });

  it('schema defaults timeout 300, min_interval 3, max_interval 30, include_logs false', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
    });
    expect(result.data).toMatchObject({
      timeout: 300,
      include_logs: false,
    });
  });
```

**Mock data for latest-resolution** (lines 34-48):

```typescript
const mockDeployments = [
  { deployment_uuid: 'dep-1', created_at: '2026-07-12T01:00:00.000Z', /* ... */ },
  { deployment_uuid: 'dep-2', created_at: '2026-07-12T02:00:00.000Z', /* ... */ },
  { deployment_uuid: 'dep-3', created_at: '2026-07-12T03:00:00.000Z', /* ... */ },
];
```

**Apply:** New `describe('deployment logs')` with `it.fails` scaffolds: schema XOR, fetch by uuid, `application_uuid` → `dep-3`, no-deployments error, empty logs hint, `COOLIFY_403_SENSITIVE_REQUIRED`. Reuse `mockDeployments` — assert logs picks `dep-3` not `dep-1`.

---

### `src/mcp/tools/application.test.ts` (test)

**Analog:** build logs tests (lines 1066-1114)

```typescript
it('build logs default include_hidden:false filters hidden entries', async () => {
  vi.mocked(fetchDeployment).mockResolvedValue({
    status: 'finished',
    logs: buildLogsFixture,
  });
  const result = await handleApplicationAction(
    { action: 'logs', deployment_uuid: 'dep-uuid-1' },
    testEnv,
  );
  const data = result.data as Record<string, unknown>;
  expect(data.logs_lines).toEqual(['a', 'c']);
  expect(data.entries_hidden).toBe(1);
});
```

**Apply:** Keep as regression after `processDeploymentBuildLogs` extraction — no test changes unless envelope fields shift.

---

### `src/utils/log-helpers.test.ts` (test)

**Analog:** self — `parseBuildLogEntries` tests (lines 37-40)

**Apply:** Add `describe('processDeploymentBuildLogs')` with `it.fails` scaffolds OR rely on deployment/application tests (RESEARCH allows either).

---

### `src/utils/errors.test.ts` (test)

**Analog:** `COOLIFY_WATCH_TIMEOUT` hints test (lines 385-391)

```typescript
it('RECOVERY_HINTS defines COOLIFY_WATCH_TIMEOUT with deployment.watch re-call hint', () => {
  const hints = RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT;
  expect(hints.some((h) => /deployment\.watch/i.test(h))).toBe(true);
});
```

**Apply:** Add `COOLIFY_NO_DEPLOYMENTS` hints test — mention `application.deploy` and `deployment.list`.

---

### `docs/coverage-map.yaml` (config)

**Analog:** `deployment.watch` row (lines 123-125)

```yaml
  - action: deployment.watch
    client: [fetchDeployment]
    openapi: ["GET /deployments/{uuid}"]
```

**Apply:** Insert after `deployment.watch`:

```yaml
  - action: deployment.logs
    client: [fetchDeployment, fetchAppDeployments]
    openapi: ["GET /deployments/{uuid}", "GET /deployments/applications/{uuid}"]
```

Regenerate `docs/COVERAGE.md`. Fix pre-existing openapi-coverage failures if unstaged OpenAPI edits present.

---

### `README.md` / `README.de.md` (config)

**Analog:** no `system.version` mention today — add short note per D-09/D-18

**Apply:** Brief section: `system.version` returns `coolifyVersion` (not `version`), `mcpVersion`, `capabilities`. Steer build logs to `deployment.logs`.

## Shared Patterns

### Flat action schema (`createFlatActionSchema`)

**Source:** `src/mcp/tools/shared-read-params.ts` (lines 22-89)
**Apply to:** `deployment.ts` logs action

```typescript
export function createFlatActionSchema<TAction extends string, TShape extends z.ZodRawShape>(
  actions: [TAction, ...TAction[]],
  shape: TShape,
  actionAllowedFields: Record<TAction, (keyof TShape | 'action')[]>,
  actionRequiredFields?: Partial<Record<TAction, (keyof TShape)[]>>,
  extraRefine?: (data, ctx) => void,
  zodDefaultFields?: Partial<Record<keyof TShape & string, unknown>>,
)
```

### Shared log params

**Source:** `src/mcp/tools/shared-read-params.ts` (lines 218-249, 334-361)
**Apply to:** `deployment.logs` schema + handler defaults

```typescript
export const sharedLogParamsSchema = {
  lines: z.number().int().min(1).max(1000).default(100).describe('Number of log lines to retrieve'),
  max_chars: z.number().int().min(1000).max(100000).default(20000).describe('...'),
  format: z.enum(['pretty', 'json']).default('pretty').describe('Output format style'),
  include_hidden: z.boolean().default(false).describe('...'),
  type: z.enum(['stdout', 'stderr', 'all']).default('all').describe('...'),
};
```

### Error handling wrapper

**Source:** `src/mcp/tools/deployment.ts` (lines 407-409)
**Apply to:** all deployment actions including `logs`

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

### Structured errors with recovery hints

**Source:** `src/mcp/tools/deployment.ts` (lines 338-348) + `src/utils/errors.ts`
**Apply to:** `COOLIFY_NO_DEPLOYMENTS`, `COOLIFY_403_SENSITIVE_REQUIRED`

```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_WATCH_TIMEOUT',
  message: `Deployment watch timed out after ${elapsedSeconds}s — ${statusNote}.`,
  recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
  data: { deployment: summary, timed_out: true },
});
```

### Read response envelope

**Source:** `src/utils/formatters.ts` via `buildReadResponse`
**Apply to:** `deployment.logs` success path (same as `application.logs` build path)

### Instance routing

**Source:** `deployment.ts` (lines 390-391)
**Apply to:** `deployment.logs`

```typescript
const parsed = parseWithInstanceRouting(deploymentToolSchema, args);
const routingEnv = resolveRoutingEnv(env, parsed.instance);
```

### Vitest Wave 0 scaffolds

**Source:** Phases 10–23 precedent per RESEARCH
**Apply to:** new tests use `it.fails` until implementation lands — keeps husky pre-commit green

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/package-version.ts` | utility | file-I/O | No `import.meta.url` + `package.json` reader exists; borrow `readFileSync`/`JSON.parse` from `instance-registry.ts`, path resolution is new |
| `src/mcp/capabilities.ts` | config | transform | No capability-flag table; closest is `RECOVERY_HINTS` static map pattern |

## Metadata

**Analog search scope:** `src/mcp/`, `src/utils/`, `docs/`, `tests/`
**Files scanned:** ~50
**Pattern extraction date:** 2026-07-27
