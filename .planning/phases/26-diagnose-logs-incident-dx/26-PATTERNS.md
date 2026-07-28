# Phase 26: Diagnose Logs & Incident DX - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/diagnose.ts` | route/handler | composite request-response | `src/mcp/tools/deployment.ts` (`logs` action) + `handleDiagnoseApp` in same file | exact |
| `src/mcp/tools/diagnose.test.ts` | test | composite request-response | `src/mcp/tools/deployment.test.ts` (`deployment logs`) + existing `diagnose.test.ts` | exact |
| `src/utils/log-helpers.ts` | utility | transform | runtime slice/cap block in `src/mcp/tools/application.ts:1663-1679` | exact |
| `src/mcp/tools/application.ts` | route/handler | request-response | self (`handleApplicationLogs` — refactor to call extracted helper) | exact |
| `src/mcp/capabilities.ts` | config | request-response | `application_logs_follow` entry in same file | exact |
| `src/mcp/tools/system.test.ts` | test | request-response | existing `capabilities` describe (Phase 25 five-key pattern) | exact |
| `src/mcp/prompts.ts` | MCP prompt layer | — | `incident` prompt block + deploy prompt `deployment.logs` cite | exact |
| `tests/mcp/prompts.test.ts` | test | — | `incident prompt mentions diagnose...` test + deploy prompt assertions | exact |
| `skills/coolify-setup/SKILL.md` | IDE skill docs | — | existing `## Example calls` tail + Related skills header | role-match |
| `docs/coverage-map.yaml` | config | — | `deployment.logs` / `diagnose.app` rows | exact |
| `docs/COVERAGE.md` | config | — | regenerated from map (Phase 24 pattern) | exact |
| `README.md` | config | — | capability callout ~L732 | exact |
| `README.de.md` | config | — | capability callout ~L732 | exact |
| `src/skills/skills-manifest.test.ts` | test | — | `coolify-setup documents set_env...` assertion | role-match (optional) |

## Pattern Assignments

### `src/mcp/tools/diagnose.ts` (route/handler, composite request-response)

**Analog (schema):** `src/mcp/tools/deployment.ts` (`deployment.logs` action)
**Analog (handler):** `handleDiagnoseApp` (same file) + `handleApplicationLogs` build/runtime paths in `application.ts`

**Actions catalog pattern** (lines 37-38 in deployment.ts — extend diagnose catalog similarly):

```typescript
export const deploymentActionsCatalog =
  'Actions: list(...) · get(...) · cancel(...) · watch(...) · logs(deployment_uuid|application_uuid, lines?, offset?, include_hidden?, type?, format?, max_chars?, instance?)';
```

Update `diagnoseActionsCatalog` (lines 70-71) to append `logs(query|uuid|name|domain, mode?, deployment_uuid?, lines?, offset?, ...)`.

**Schema: add action to `createFlatActionSchema`** (deployment.ts lines 113-210):

```typescript
export const diagnoseToolSchema = createFlatActionSchema(
  ['app', 'server', 'scan', 'logs'],
  {
    // existing app/server/scan fields...
    mode: z.enum(['full', 'logs-only']).optional().default('full'),
    deployment_uuid: z.string().optional(),
    offset: z.number().int().min(0).optional(),
    ...sharedLogParamsFlatShape,
    ...sharedReadParamsFlatShape,
  },
  {
    logs: [
      'query', 'uuid', 'name', 'domain',
      'mode', 'deployment_uuid',
      'lines', 'offset', 'include_hidden', 'type',
      ...diagnoseReadParamKeys,
    ],
    // app/server/scan unchanged
  },
  undefined,
  (data, ctx) => {
  // existing app/server refines...
  if (data.action === 'logs') {
    if (!hasAtLeastOneIdentifier(data, APP_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At least one identifier (query|uuid|name|domain) required for action logs',
        params: { code: 'COOLIFY_422' },
      });
    }
    if (data.deployment_uuid && hasAtLeastOneIdentifier(data, APP_IDENTIFIER_FIELDS)) {
      // XOR: deployment_uuid → build logs only; reject follow:* if passed
    }
    if (data.format === 'table') {
      ctx.addIssue({
        code: 'custom',
        message: 'format table is not supported for logs — use pretty or json',
        params: { code: 'COOLIFY_VALIDATION_ERROR' },
      });
    }
  }
},
{
  mode: 'full',
  lines: 100,
  offset: 0,
  include_hidden: false,
  type: 'all',
  format: 'pretty',
  max_chars: 20000,
});
```

**XOR refine analog** — mirror `application.ts` logs superRefine (lines 222-238):

```typescript
if (hasRuntimeId && data.deployment_uuid) {
  ctx.addIssue({
    code: 'custom',
    message:
      'Cannot provide both uuid/name/domain/query and deployment_uuid — choose runtime OR build logs',
    params: { code: 'COOLIFY_422' },
  });
}
```

Note: diagnose uses `domain` not `fqdn` (D-04). Reject `follow`, `timeout`, etc. on `logs` action.

**Handler switch extension** (lines 503-526):

```typescript
switch (parsed.action) {
  case 'app':
    return await handleDiagnoseApp(parsed, routingEnv);
  case 'server':
    return await handleDiagnoseServer(parsed, routingEnv);
  case 'scan':
    return await handleDiagnoseScan(parsed, routingEnv);
  case 'logs':
    return await handleDiagnoseLogs(parsed, routingEnv);
  default: {
    const _exhaustive: never = parsed;
    throw new Error(`Unknown diagnose action: ${String(_exhaustive)}`);
  }
}
```

**Composite handler pattern** — compose diagnose.app core + log fetch (research Pattern 2):

```typescript
async function handleDiagnoseLogs(parsed: DiagnoseLogsAction, env: EnvConfig) {
  const resolution = await resolveAppUuid(parsed, env);
  // zero/multi → same buildReadResponse match envelope as handleDiagnoseApp (lines 298-309)

  let diagnose: /* projectAppDiagnose shape */ | undefined;
  let diagnose_failed: { code: string; message: string } | undefined;

  if (parsed.mode !== 'logs-only') {
    try {
      // Extract diagnose.app fetch+project path from handleDiagnoseApp (lines 315-375)
      diagnose = /* runDiagnoseAppCore result */;
    } catch (err) {
      const envelope =
        err instanceof CoolifyApiError ? err.envelope : toStructuredError(err);
      diagnose_failed = { code: envelope.code, message: envelope.message };
    }
  }

  const logs = parsed.deployment_uuid
    ? /* fetchDeployment + processDeploymentBuildLogs — application.ts:1629-1652 */
    : /* fetchApplicationLogs + buildRuntimeLogPayload — log-helpers */;

  if (!logs.logs_lines.length && !parsed.deployment_uuid) {
    logs.hint = EMPTY_RUNTIME_LOGS_HINT; // D-08
  }

  return buildReadResponse(
    {
      ...(diagnose ? { diagnose } : {}),
      ...(diagnose_failed ? { diagnose_failed } : {}),
      logs,
    },
    { format: parsed.format, max_chars: parsed.max_chars },
  );
}
```

Import `fetchApplicationLogs`, `fetchDeployment` from `../../api/client.js`; `processDeploymentBuildLogs`, `buildRuntimeLogPayload` from `../../utils/log-helpers.js`; `toStructuredError` from `../../utils/errors.js`.

**Diagnose half reuse** — do not call `handleDiagnoseApp` wholesale (returns early on zero/multi inside handler); share `resolveAppUuid` + projection block from lines 289-375.

---

### `src/utils/log-helpers.ts` (utility, transform)

**Analog:** inline runtime payload in `src/mcp/tools/application.ts` (lines 1663-1679)

**Extract verbatim** (OBS-03 guard):

```typescript
export function buildRuntimeLogPayload(
  uuid: string,
  logsStr: string,
  params: { lines: number; offset: number; max_chars: number },
) {
  const allLines = sliceLogBlob(logsStr, params.lines, params.offset);
  const capped = capLogOutput(allLines.join('\n'), params.max_chars);
  const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);
  return {
    uuid,
    logs_lines: cappedLines,
    logs_truncated: capped.truncated,
    total_lines: allLines.length,
  };
}
```

**Empty runtime hint** (new for diagnose.logs D-08 — build empty pattern at lines 36-37, 101-112):

```typescript
export const EMPTY_RUNTIME_LOGS_HINT =
  'Application exists but runtime logs are empty — container may be idle or logs not yet available.';
```

**Build log path** — reuse existing `processDeploymentBuildLogs` unchanged (lines 85-157).

---

### `src/mcp/tools/application.ts` (route/handler, request-response)

**Analog:** self — refactor `handleApplicationLogs` runtime branch only

**Replace inline slice/cap** (lines 1665-1675) with:

```typescript
const logsStr =
  isRecord(raw) && typeof raw.logs === 'string' ? raw.logs : '';
const logPayload = buildRuntimeLogPayload(uuid, logsStr, {
  lines,
  offset,
  max_chars: parsed.max_chars,
});
return buildReadResponse(logPayload, {
  format: parsed.format,
  max_chars: parsed.max_chars,
});
```

Do not change follow path, build path, or schema. Golden tests in `application.test.ts` must stay green (OBS-03).

---

### `src/mcp/tools/diagnose.test.ts` (test, composite request-response)

**Analog:** `src/mcp/tools/deployment.test.ts` (`describe('deployment logs')` lines 615-754) + existing `describe('diagnoseToolSchema')` (lines 194+)

**Mock setup** — extend `vi.mock('../../api/client.js')` with `fetchApplicationLogs`, `fetchDeployment`:

```typescript
vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationEnvs: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchApplicationLogs: vi.fn(),
  fetchDeployment: vi.fn(),
  fetchResources: vi.fn(),
  // ...existing server mocks
}));
```

**Schema tests** — follow `diagnoseToolSchema` describe pattern (lines 194-269):

```typescript
it('parses logs action with uuid and defaults mode full', () => {
  const result = diagnoseToolSchema.safeParse({ action: 'logs', uuid: 'app-1' });
  expect(result.success).toBe(true);
  if (!result.success) return;
  if (result.data.action === 'logs') {
    expect(result.data.mode).toBe('full');
    expect(result.data.lines).toBe(100);
    expect(result.data.max_chars).toBe(20000);
  }
});

it('rejects logs action without identifier', () => {
  expect(diagnoseToolSchema.safeParse({ action: 'logs' }).success).toBe(false);
});
```

**Handler tests** — mirror deployment empty-logs soft OK (deployment.test.ts lines 736-754):

```typescript
it('empty runtime logs returns soft OK with hint', async () => {
  vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: '' });
    // mock diagnose fetches for mode:full...
  const result = await handleDiagnoseAction(
    { action: 'logs', uuid: 'app-uuid-1' },
    testEnv,
  );
  expect(isDiagnoseErrorResult(result)).toBe(false);
  const data = result.data as Record<string, unknown>;
  const logs = data.logs as Record<string, unknown>;
  expect(logs.logs_lines).toEqual([]);
  expect(logs.hint ?? result._meta?.hint).toBeTruthy();
});
```

**Soft partial test** (new pattern — no exact analog):

```typescript
it('mode full returns diagnose_failed but still includes logs when diagnose throws', async () => {
  vi.mocked(fetchApplication).mockRejectedValue(new CoolifyApiError({...}));
  vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: 'err line\n' });
  const result = await handleDiagnoseAction({ action: 'logs', uuid: 'app-1' }, testEnv);
  expect(isDiagnoseErrorResult(result)).toBe(false);
  const data = result.data as Record<string, unknown>;
  expect(data.diagnose_failed).toMatchObject({ code: expect.any(String) });
  expect((data.logs as { logs_lines: string[] }).logs_lines.length).toBeGreaterThan(0);
});
```

---

### `src/mcp/capabilities.ts` (config, request-response)

**Analog:** `application_logs_follow` entry (lines 22-26)

```typescript
diagnose_logs: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'One-shot app diagnose + bounded log tail via diagnose.logs (MCP composite; not a Coolify REST endpoint)',
},
```

Soft guidance only — no Zod hard-block on tool call (Phase 24 D-04).

---

### `src/mcp/tools/system.test.ts` (test, request-response)

**Analog:** Phase 25 five-key `CAPABILITY_KEYS` block (lines 139-156)

```typescript
const CAPABILITY_KEYS = [
  'application_logs',
  'application_logs_follow',
  'deployment_logs',
  'deployment_watch',
  'deploy_watch',
  'diagnose_logs',
] as const;

it('system.version capabilities has exactly six keys including diagnose_logs', async () => {
  // same Object.keys sort assertion
});
```

Update test title from "five" → "six".

---

### `src/mcp/prompts.ts` (MCP prompt layer)

**Analog:** current `incident` prompt (lines 154-200) + deploy prompt `deployment.logs` cite pattern

**Incident rewrite** — replace steps 2-3 (lines 183-187) with composite + conditional follow/deploy:

```typescript
content: `Incident response workflow:

1. Resolve application UUID${uuid ? ` (${uuid})` : ''} from args, \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Triage + logs in one call — \`diagnose.logs\` with \`mode: "full"\`:
   diagnose({ action: "logs", mode: "full", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })
   Check \`capabilities.diagnose_logs\` via \`system({ action: "version" })\` when unsure.

3. If a live symptom persists, follow runtime logs (check \`capabilities.application_logs_follow\`):
   application({ action: "logs", uuid: "${uuid ?? '<uuid>'}", follow: true${instanceSuffix} })

4. On build/deploy suspicion or after failed \`deployment.watch\`, fetch build logs:
   deployment({ action: "logs", deployment_uuid: "<deployment-uuid>"${instanceSuffix} })
   App-only: do not attempt service/DB log tools — unavailable on Coolify 4.1.2.

5. Attempt non-destructive recovery — \`application\` restart:
   application({ action: "restart", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

6. If restart is insufficient, ask the human before destructive actions...
7. Report incident status...`,
```

**Optional diagnose prompt pointer** (lines 90-97) — add one line after app path:

```typescript
For app triage + bounded log tail in one call, prefer \`diagnose.logs\` with \`mode: "full"\`.
```

---

### `tests/mcp/prompts.test.ts` (test)

**Analog:** `incident prompt mentions diagnose...` (lines 104-116) + deploy `deployment.logs` assertion (lines 57-59)

```typescript
it('incident prompt mentions diagnose.logs, deployment.logs, follow, and app-only guardrail', async () => {
  const content = assistantContent(await getRegisteredPrompts(server).incident.handler({
    uuid: 'app-123',
    project_uuid: 'proj-1',
  }));
  expect(content).toContain('diagnose({ action: "logs"');
  expect(content).toContain('mode: "full"');
  expect(content).toContain('deployment({ action: "logs"');
  expect(content).toMatch(/follow:\s*true/);
  expect(content).toMatch(/application_logs_follow/);
  expect(content).toMatch(/service|database|DB/i);
  expect(content).toContain('application({ action: "restart"');
  expect(content).toContain('emergency({ action: "redeploy_project"');
  // Remove or invert old separate-step assertions:
  expect(content).not.toMatch(/diagnose\(\{ action: "app".*application\(\{ action: "logs"/s);
});
```

---

### `skills/coolify-setup/SKILL.md` (IDE skill docs)

**Analog:** header Related skills (lines 16) + `## Example calls` section (lines 94+)

**Placement (D-16):** new `## App log troubleshooting` section **after** `## Example calls`, not inside `## Workflow`.

```markdown
## App log troubleshooting

After setup/wire, use MCP tools for application log triage (not part of the setup wizard):

1. **Capability check** — `system({ action: "version" })` → `capabilities.diagnose_logs`, `capabilities.application_logs_follow`
2. **One-shot triage + tail** — `diagnose({ action: "logs", mode: "full", uuid: "<uuid>" })`
3. **Live symptom** — `application({ action: "logs", uuid: "<uuid>", follow: true })` when `application_logs_follow` is supported
4. **Build/deploy logs** — `deployment({ action: "logs", deployment_uuid: "<uuid>" })` on deploy suspicion

Deeper runbooks: [coolify-incident](../coolify-incident/SKILL.md) · [coolify-deploy](../coolify-deploy/SKILL.md) · [coolify-diagnose](../coolify-diagnose/SKILL.md)
```

---

### `docs/coverage-map.yaml` (config)

**Analog:** `deployment.logs` row (lines 127-129) + `diagnose.app` row (lines 130-132)

```yaml
  - action: diagnose.logs
    client: [fetchApplication, fetchApplicationEnvs, fetchAppDeployments, fetchApplicationLogs, fetchDeployment]
    openapi: ["GET /applications/{uuid}", "GET /applications/{uuid}/envs", "GET /deployments/applications/{uuid}", "GET /applications/{uuid}/logs", "GET /deployments/{uuid}"]
```

Regenerate `docs/COVERAGE.md` via `npm run openapi:coverage` (Phase 24 pattern).

---

### `README.md` / `README.de.md` (config)

**Analog:** capability callout block (README.md lines 730-732)

Extend the existing blockquote — do not add a new chapter:

```markdown
> **Capability discovery & build logs:** `system({ action: "version" })` returns `coolifyVersion` ... For **app triage + bounded runtime tail** in one call, use `diagnose({ action: "logs", mode: "full", uuid: "..." })` — check `capabilities.diagnose_logs`. For deployment **build** logs, prefer `deployment({ action: "logs", ... })` ...
```

Mirror verbatim structure in `README.de.md` (~L732).

---

### `src/skills/skills-manifest.test.ts` (test, optional)

**Analog:** `coolify-setup documents set_env...` (lines 57-65)

```typescript
it('coolify-setup documents app log troubleshooting and diagnose.logs', () => {
  const content = readFileSync(join('skills', 'coolify-setup', 'SKILL.md'), 'utf8');
  expect(content).toContain('App log troubleshooting');
  expect(content).toContain('diagnose.logs');
  expect(content).toMatch(/system\.version|action: "version"/);
  expect(content).toContain('coolify-incident');
});
```

---

## Shared Patterns

### Flat action schema on domain tool
**Source:** `src/mcp/tools/deployment.ts:113-211`
**Apply to:** `diagnose.ts` schema extension

```typescript
logs: ['deployment_uuid', 'application_uuid', 'lines', 'offset', ...],
// extraRefine for XOR + format table rejection + identifier requirements
```

### Log param defaults (OBS-03)
**Source:** `src/mcp/tools/shared-read-params.ts:218-232` + deployment schema defaults (lines 199-210)
**Apply to:** `diagnose.logs` schema defaults object — `lines: 100`, `max_chars: 20000`, no diagnose-specific numbers

```typescript
lines: z.number().int().min(1).max(1000).default(100),
max_chars: z.number().int().min(1000).max(100000).default(20000),
```

### Build log processing
**Source:** `src/utils/log-helpers.ts:85-157` via `handleDeploymentLogs` (deployment.ts:527-533)
**Apply to:** `diagnose.logs` when `deployment_uuid` set

```typescript
const logPayload = processDeploymentBuildLogs(deploymentUuid, rec, {
  lines: parsed.lines ?? 100,
  offset: parsed.offset ?? 0,
  include_hidden: parsed.include_hidden ?? false,
  type: parsed.type ?? 'all',
  max_chars: maxChars,
});
```

### Empty logs soft OK + hint
**Source:** `src/utils/log-helpers.ts:36-37,101-112` (build); new `EMPTY_RUNTIME_LOGS_HINT` for runtime (D-08)
**Apply to:** `diagnose.logs` response `logs` object — never hard-fail on empty tail when app exists

### MCP error wrapping (outer only)
**Source:** `src/mcp/tools/diagnose.ts:523-525`

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

**Apply to:** `handleDiagnoseAction` — inner diagnose half failures must **not** call `wrapMcpError`; populate `diagnose_failed` inside successful `buildReadResponse` (D-07).

### App UUID resolution
**Source:** `src/mcp/tools/diagnose.ts:182-230` (`resolveAppUuid`)
**Apply to:** `diagnose.logs` — use `domain` identifier set, not `fqdn` (application.logs uses fqdn)

### Capability discovery
**Source:** `src/mcp/capabilities.ts` + `src/mcp/tools/system.ts:188`
**Apply to:** README, setup skill, incident prompt — agents check `system.version` before follow/diagnose.logs

### Instance routing
**Source:** `parseWithInstanceRouting` + `resolveRoutingEnv` in all tool handlers (diagnose.ts:508-509)
**Apply to:** `handleDiagnoseLogs` via existing `handleDiagnoseAction` wrapper

## No Analog Found

| File / Pattern | Role | Data Flow | Reason |
|----------------|------|-----------|--------|
| `diagnose_failed` soft-partial envelope | handler response | composite | No existing composite action returns partial success with sibling error flag inside `buildReadResponse`; closest partial match is `deployment.cancel` already-finished soft return (deployment.ts:357-377) — different shape |
| `skills/coolify-incident/SKILL.md` sync | IDE skill docs | — | Not locked in CONTEXT (SKILL-01 scopes `coolify-setup` only); planner discretion |

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/mcp/`, `src/utils/`, `tests/mcp/`, `skills/coolify-setup/`, `docs/coverage-map.yaml`, `README*.md`
**Files scanned:** ~25
**Pattern extraction date:** 2026-07-28
