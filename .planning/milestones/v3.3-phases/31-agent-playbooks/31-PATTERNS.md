# Phase 31: Agent Playbooks - Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 13 new/modified files
**Analogs found:** 12 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/log-patterns.ts` | utility | transform | `src/utils/issue-classifier.ts` | exact |
| `src/utils/log-patterns.test.ts` | test | transform | `src/utils/issue-classifier.test.ts` + `src/utils/log-helpers.test.ts` | exact |
| `src/mcp/tools/diagnose.ts` | route/handler | composite request-response | `handleDiagnoseLogs` (same file) + `handleDiagnoseScan` (findings envelope) | exact |
| `src/mcp/tools/diagnose.test.ts` | test | composite request-response | `describe('diagnose logs')` in same file | exact |
| `src/mcp/tools/recipe.ts` | route/handler | composite request-response | `handleCreateOneClick` (same file) | exact |
| `src/mcp/tools/recipe.test.ts` | test | composite request-response | `describe('recipe create-one-click')` in same file | exact |
| `src/mcp/prompts.ts` | MCP prompt layer | — | `incident` prompt block (upgrade) + `deploy` prompt (composition cite) | exact |
| `tests/mcp/prompts.test.ts` | test | — | `incident prompt mentions diagnose.logs...` test | exact |
| `src/mcp/capabilities.ts` | config | request-response | `diagnose_logs` entry in same file | exact |
| `src/mcp/tools/system.test.ts` | test | request-response | existing `capabilities` describe (Phase 30 fifteen-key pattern) | exact |
| `docs/coverage-map.yaml` | config | — | `diagnose.logs` / `deployment.preflight` composite rows | exact |
| `README.md` | config | — | capability callout (Phase 26/30 parity) | exact |
| `README.de.md` | config | — | `README.md` DE mirror | exact |

## Pattern Assignments

### `src/utils/log-patterns.ts` (utility, transform)

**Analog:** `src/utils/issue-classifier.ts`

**Imports pattern** (issue-classifier.ts lines 1-6):

```typescript
import {
  generateHints,
  type FollowUpHint,
  type HintResourceType,
} from './diagnose-hints.js';
```

For log-patterns: import `FollowUpHint` from `diagnose-hints.js` only — pure functions, no API imports.

**Core classification pattern** (issue-classifier.ts lines 47-53):

```typescript
export function classifyIssues(
  servers: unknown[],
  resources: unknown[],
): ClassifiedIssues {
  const critical: ScanIssue[] = [];
  const high: ScanIssue[] = [];
  const info: ScanIssue[] = [];
```

Mirror with `matchLogPatterns(lines: string[])` returning array of `{ id, severity, evidence, count }` — severity buckets `critical` | `high` only (no `info` for log patterns per RESEARCH).

**Hint attachment pattern** (issue-classifier.ts lines 62-70):

```typescript
const hints = generateHints('server', uuid, 'unreachable');
critical.push({
  resource_type: 'server',
  uuid,
  name,
  status: 'unreachable',
  issue: 'Server unreachable',
  hint: hints[0],
});
```

For log-patterns: export `enrichPatternHints(findings, appUuid)` that maps pattern IDs → `FollowUpHint` objects (tool/action/args/label/available_in_phase). Keep hint generation separate from matching (testable pure matchers).

**Error handling:** None — pure util, no I/O.

---

### `src/utils/log-patterns.test.ts` (test, transform)

**Analog:** `src/utils/issue-classifier.test.ts` + `src/utils/log-helpers.test.ts`

**Test structure** (issue-classifier.test.ts lines 12-19):

```typescript
describe('classifyIssues', () => {
  it('returns empty buckets for empty input', () => {
    expect(classifyIssues([], [])).toEqual({
      critical: [],
      high: [],
      info: [],
    });
  });
```

**Fixture pattern** (log-helpers.test.ts lines 9-20):

```typescript
describe('sliceLogBlob', () => {
  it('returns last 2 lines with offset 0', () => {
    expect(sliceLogBlob('a\nb\nc\nd', 2, 0)).toEqual(['c', 'd']);
  });
```

Per-pattern fixtures: one `describe` block per pattern ID (`oom`, `http_5xx_spike`, `crash_loop`, `connection_refused`); inline string arrays, no API mocks.

**Hint shape assert** (issue-classifier.test.ts lines 69-79):

```typescript
it('attaches structured hint objects to each issue', () => {
  const hint = result.high[0].hint;
  expect(hint).toHaveProperty('tool');
  expect(hint).toHaveProperty('action');
  expect(hint).toHaveProperty('args');
  expect(hint).toHaveProperty('label');
  expect(hint).toHaveProperty('available_in_phase');
});
```

---

### `src/mcp/tools/diagnose.ts` (route/handler, composite request-response)

**Analog (handler):** `handleDiagnoseLogs` (lines 512-619)
**Analog (findings envelope):** `handleDiagnoseScan` (lines 710-744)

**Actions catalog extension** (lines 80-81):

```typescript
export const diagnoseActionsCatalog =
  'Actions: app(...) · server(...) · scan(...) · logs(...) · analyze(query?, uuid?, name?, domain?, deployment_uuid?, lines?, offset?, max_chars?, instance?)';
```

**Schema: add `analyze` to `createFlatActionSchema`** (lines 104-189 — mirror `logs` action keys minus `mode`/`include_hidden`/`type`):

```typescript
export const diagnoseToolSchema = createFlatActionSchema(
  ['app', 'server', 'scan', 'logs', 'analyze'],
  {
    // existing fields...
    // analyze reuses: query, uuid, name, domain, deployment_uuid, lines, offset, max_chars
    // omit mode (analyze is logs-only by default per D-06 / RESEARCH A5)
  },
  {
    analyze: [
      'query', 'uuid', 'name', 'domain',
      'deployment_uuid',
      'lines', 'offset',
      ...diagnoseLogsReadParamKeys,
    ],
    // logs/app/server/scan unchanged
  },
```

**Core handler pattern — reuse log fetch from `handleDiagnoseLogs`** (lines 524-608):

```typescript
async function handleDiagnoseLogs(
  parsed: DiagnoseLogsAction,
  env: EnvConfig,
): Promise<DiagnoseMatchResult | DiagnoseLogsResult> {
  const lines = parsed.lines ?? 100;
  const offset = parsed.offset ?? 0;
  // ... resolveAppUuid ...
  const raw = await fetchApplicationLogs(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    lines + offset,
    env.COOLIFY_VERIFY_SSL,
  );
  const logsStr =
    isRecord(raw) && typeof raw.logs === 'string' ? raw.logs : '';
  logs = buildRuntimeLogPayload(appUuid, logsStr, {
    lines,
    offset,
    max_chars: maxChars,
  });

  if (!logs.logs_lines.length) {
    logs = { ...logs, hint: EMPTY_RUNTIME_LOGS_HINT };
  }
```

`handleDiagnoseAnalyze`: same fetch path → `matchLogPatterns(payload.logs_lines)` → enrich hints → return `matched_patterns[]` + `logs_meta` (not full `logs_lines` — capped `evidence` only per D-02).

**Soft partial on fetch failure** (lines 546-559):

```typescript
let diagnose_failed: { code: string; message: string } | undefined;

if (mode !== 'logs-only' && appUuid) {
  try {
    diagnose = await runDiagnoseAppCore(appUuid, parsed, env);
  } catch (err) {
    const envelope =
      err instanceof CoolifyApiError ? err.envelope : toStructuredError(err);
    diagnose_failed = {
      code: envelope.code,
      message: redactSecrets(envelope.message),
    };
  }
}
```

For analyze: wrap `fetchApplicationLogs` in try/catch → `analyze_failed` key + empty `matched_patterns[]`, still return structured response (D-06/D-17).

**Empty logs advisory** (lines 606-608):

```typescript
if (!logs.logs_lines.length) {
  logs = { ...logs, hint: EMPTY_RUNTIME_LOGS_HINT };
}
```

Return `matched_patterns: []` — no fabricated matches (D-06).

**Switch dispatch** (lines 754-766):

```typescript
switch (parsed.action) {
  case 'app':
    return await handleDiagnoseApp(parsed, routingEnv);
  // ...
  case 'logs':
    return await handleDiagnoseLogs(parsed, routingEnv);
  case 'analyze':
    return await handleDiagnoseAnalyze(parsed, routingEnv);
  default: {
    const _exhaustive: never = parsed;
    throw new Error(`Unknown diagnose action: ${String(_exhaustive)}`);
  }
}
```

**Error handling wrapper** (lines 768-770):

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

---

### `src/mcp/tools/diagnose.test.ts` (test, composite request-response)

**Analog:** `describe('diagnose logs')` (lines 1080+)

**Schema parse test** (lines 1096-1100):

```typescript
it('schema parses logs action with uuid and defaults mode full, lines 100, max_chars 20000', () => {
  const result = diagnoseToolSchema.safeParse({ action: 'logs', uuid: 'app-1' });
  expect(result.success).toBe(true);
  if (result.data.action === 'logs') {
```

Add `describe('diagnose analyze')` with parallel tests: schema parse, empty logs hint, pattern detection via mocked `fetchApplicationLogs`, soft partial on fetch error.

**Empty runtime logs test** (lines 1236-1240):

```typescript
it('empty runtime logs returns soft OK with hint on logs object', async () => {
  vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: '' });
  const result = await handleDiagnoseAction(
    { action: 'logs', uuid: 'app-unhealthy' },
```

Mirror for analyze: assert `matched_patterns: []` + `logs_meta.hint` contains empty-log spirit.

**Mock setup** (lines 1092):

```typescript
vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: 'runtime line 1\nruntime line 2' });
```

Fixture log strings per pattern in analyze integration tests.

---

### `src/mcp/tools/recipe.ts` (route/handler, composite request-response)

**Analog:** `handleCreateOneClick` (lines 752-817)

**Schema extension** (lines 109-110):

```typescript
export const recipeActionSchema = createFlatActionSchema(
  ['create-git-app', 'create-app-db', 'create-one-click', 'recommend'],
```

Add `stack` or `description` string field + optional `server_uuid`, `project_uuid`, `environment_name`.

**Catalog validation guard** (lines 756-768):

```typescript
const templates = await fetchServiceTemplates(env);

if (!Object.hasOwn(templates, parsed.type)) {
  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: `Unknown one-click type '${parsed.type}'. Call service.list-types for valid IDs.`,
    recoveryHints: [
      'Run service action list-types to fetch valid one-click type IDs.',
      'Type must match a key in the official service-templates.json catalog.',
      MANIFEST_HINT,
    ],
  });
}
```

For recommend: same `fetchServiceTemplates(env)` call; never emit `catalog_id` not in `Object.hasOwn(templates, id)` (D-15/SREC-02).

**Advisory response envelope** (mirror intelligence impact, intelligence.ts lines 509-521):

```typescript
return buildReadResponse(
  {
    stack_description: parsed.stack,
    advisory: true,
    catalog_source: 'live',
    matches: [...],
    plan_steps: [...],
  },
  {
    format: parsed.format,
    max_chars: parsed.max_chars,
  },
);
```

**Switch dispatch** (recipe.ts handleRecipeAction — mirror diagnose pattern):

```typescript
case 'create-one-click':
  return await handleCreateOneClick(parsed, routingEnv);
case 'recommend':
  return await handleRecipeRecommend(parsed, routingEnv);
```

**Error handling:** `wrapMcpError` in `handleRecipeAction` catch block (same as diagnose).

---

### `src/mcp/tools/recipe.test.ts` (test, composite request-response)

**Analog:** `describe('recipe create-one-click')` (lines 668-707)

**Mock fetchServiceTemplates** (lines 669-676):

```typescript
beforeEach(() => {
  vi.mocked(ofetch).mockReset();
  vi.mocked(ofetch).mockResolvedValue(serviceTemplates);
  vi.mocked(fetchVersion).mockResolvedValue({ version: '4.1.2' });
});
```

**Unknown type rejection** (lines 679-693):

```typescript
it('validates type against list-types ... rejects unknown type with COOLIFY_VALIDATION_ERROR', async () => {
  const result = await handleRecipeAction(
    { ...baseOneClickArgs, type: 'unknown-service' },
    testEnv,
  );
  expect(isRecipeErrorResult(result)).toBe(true);
  expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
});
```

Add `describe('recipe recommend')`: mock `ofetch` for templates; assert `plan_steps[]` shape; assert no mutation (`createService` not called); assert unknown stack → `COOLIFY_VALIDATION_ERROR` + list-types hint.

---

### `src/mcp/prompts.ts` (MCP prompt layer)

**Analog (upgrade):** `incident` prompt (lines 155-207)
**Analog (new prompts):** `deploy` prompt (lines 19-63) — step composition + `optionalInstanceSuffix`

**Registration pattern** (lines 155-169):

```typescript
server.registerPrompt(
  'incident',
  {
    title: 'Incident Response',
    description:
      'Triage an incident with diagnose, logs, restart, or emergency redeploy steps.',
    argsSchema: z.object({
      instance: optionalInstance,
      uuid: z.string().optional().describe('Affected application UUID'),
      project_uuid: z
        .string()
        .optional()
        .describe('Project UUID for emergency redeploy'),
    }),
  },
```

**Composition cite pattern** (lines 184-200):

```typescript
content: `Incident response workflow:

1. Resolve application UUID${uuid ? ` (${uuid})` : ''} from args, \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Triage + logs in one call — \`diagnose.logs\` with \`mode: "full"\`:
   diagnose({ action: "logs", mode: "full", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })
```

**Upgrade incident:** Insert `diagnose.analyze` step after resolve; add `deployment.preflight` when rollback considered; cross-link `rollback` prompt on crash_loop patterns.

**New `rollback` prompt — compose Phase 30 tools** (deploy-preflight.ts lines 645-651):

```typescript
if (options.confirm !== true) {
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: "Action 'rollback' requires confirm:true before mutating.",
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: preview as unknown as Record<string, unknown>,
  });
}
```

Prompt text must cite:
1. `deployment.preflight` (advisory)
2. `deployment.rollback confirm:false` (preview)
3. STOP — human approval
4. `deployment.rollback confirm:true`
5. `COOLIFY_ROLLBACK_UNAVAILABLE` recovery path

**New `maintenance-window` prompt:** Required `resource_type` arg; cite `application|service|database` stop/start/restart actions; confirm gates on destructive ops.

**Helper reuse** (lines 14-16):

```typescript
function optionalInstanceSuffix(instance?: string): string {
  return instance ? `, instance: "${instance}"` : '';
}
```

---

### `tests/mcp/prompts.test.ts` (test)

**Analog:** `incident prompt mentions diagnose.logs...` (lines 104-124)

**Registration count** (lines 29-34):

```typescript
it('registers exactly deploy, diagnose, new-project, and incident prompts', () => {
  const server = new McpServer({ name: 'test-server', version: '1.0.0' });
  registerCoolifyPrompts(server);
  const names = Object.keys(getRegisteredPrompts(server)).sort();
  expect(names).toEqual(['deploy', 'diagnose', 'incident', 'new-project']);
});
```

Update to 6 prompts: add `rollback`, `maintenance-window`.

**Content assertions** (lines 113-120):

```typescript
expect(content).toContain('diagnose({ action: "logs"');
expect(content).toContain('application({ action: "restart"');
expect(content).toContain('emergency({ action: "redeploy_project"');
```

Add tests:
- `rollback` prompt cites `deployment.preflight`, `deployment.rollback`, `confirm: true`, `COOLIFY_ROLLBACK_UNAVAILABLE`
- `maintenance-window` cites lifecycle stop/start + confirm language
- `incident` cites `diagnose.analyze` + `deployment.preflight`
- No embedded API client / fetch calls in prompt bodies (PLAY-02)

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

Add:

```typescript
diagnose_analyze: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'Rule-based runtime log pattern analysis via diagnose.analyze (MCP composite; not a Coolify REST endpoint)',
},
recipe_recommend: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'Advisory stack recommendation from live service-templates catalog via recipe.recommend (MCP composite)',
},
```

---

### `src/mcp/tools/system.test.ts` (test)

**Analog:** `capabilities` describe (lines 139-165)

```typescript
const CAPABILITY_KEYS = [
  'application_logs',
  // ... 15 keys ...
  'deployment_rollback',
] as const;

it('system.version capabilities has exactly fifteen keys ...', async () => {
  expect(Object.keys(result.capabilities ?? {}).sort()).toEqual(
    [...CAPABILITY_KEYS].sort(),
  );
```

Bump to 17 keys: add `diagnose_analyze`, `recipe_recommend`.

---

### `docs/coverage-map.yaml` (config)

**Analog:** `diagnose.logs` row (line 139)

Add composite row for `diagnose.analyze` (no REST endpoint, MCP composite). Mirror `deployment.preflight` pattern (line 133).

---

### `README.md` / `README.de.md` (config)

**Analog:** Phase 26/30 capability callouts — append `diagnose.analyze`, `recipe.recommend`, and playbook prompt list (`rollback`, `maintenance-window`).

---

## Shared Patterns

### Action-based tool extension
**Source:** `src/mcp/tools/diagnose.ts` (Phase 26 `logs`) + `src/mcp/tools/recipe.ts` (Phase 20 `create-one-click`)
**Apply to:** `diagnose.analyze`, `recipe.recommend`

```typescript
export const diagnoseToolSchema = createFlatActionSchema(
  ['app', 'server', 'scan', 'logs', 'analyze'],
  { /* shared + action-specific fields */ },
  { analyze: ['query', 'uuid', 'name', 'domain', 'deployment_uuid', 'lines', 'offset', ...] },
);
```

### Instance routing
**Source:** `src/mcp/tools/shared-read-params.ts` — `parseWithInstanceRouting`, `resolveRoutingEnv`
**Apply to:** All new actions

```typescript
const parsed = parseWithInstanceRouting(diagnoseToolSchema, args);
const routingEnv = resolveRoutingEnv(env, parsed.instance);
```

### FollowUpHint envelope
**Source:** `src/utils/diagnose-hints.ts` lines 1-7
**Apply to:** `matched_patterns[].hint`, `plan_steps[].follow_up_hint`, `recommended_actions[]`

```typescript
export interface FollowUpHint {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  label: string;
  available_in_phase: number;
}
```

### Severity buckets
**Source:** `src/utils/issue-classifier.ts` — `critical` | `high` | `info`
**Apply to:** `matched_patterns[].severity` (log patterns use `critical` | `high` only)

### Log fetch + slice
**Source:** `src/utils/log-helpers.ts` lines 39-64

```typescript
export const EMPTY_RUNTIME_LOGS_HINT =
  'Application exists but runtime logs are empty — container may be idle or logs not yet available.';

export function buildRuntimeLogPayload(
  uuid: string,
  logsStr: string,
  params: { lines: number; offset: number; max_chars: number },
): RuntimeLogPayload { /* ... */ }
```

### Live catalog fetch (SREC-02)
**Source:** `src/utils/service-templates.ts` lines 42-47

```typescript
export async function fetchServiceTemplates(
  env: EnvConfig,
): Promise<Record<string, { name?: string; description?: string }>> {
  const version = await resolvePinnedVersion(env);
  const cdnUrl = `https://cdn.jsdelivr.net/gh/coollabsio/coolify@${version}/templates/service-templates.json`;
```

### Confirm gate (SAF-01)
**Source:** `src/utils/deploy-preflight.ts` lines 645-651
**Apply to:** Rollback prompt text; never bypass in analyze/recommend

```typescript
if (options.confirm !== true) {
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: "Action 'rollback' requires confirm:true before mutating.",
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: preview as unknown as Record<string, unknown>,
  });
}
```

### Advisory-only composites
**Source:** `src/mcp/tools/intelligence.ts` lines 509-521
**Apply to:** `diagnose.analyze`, `recipe.recommend` responses

```typescript
return buildReadResponse(
  { /* findings */ advisory: true },
  { format: parsed.format, max_chars: parsed.max_chars },
);
```

### Error wrapping
**Source:** `src/mcp/tools/diagnose.ts` lines 768-770
**Apply to:** All handler exports

```typescript
} catch (error) {
  return wrapMcpError(error);
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All phase files have close analogs in Phases 26/28/30 patterns |

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/mcp/prompts.ts`, `src/utils/`, `tests/mcp/`, `docs/`, Phase 26 PATTERNS.md
**Files scanned:** ~25
**Pattern extraction date:** 2026-07-31
