# Phase 16: Coolify Cloud & Server Branding - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 11
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/server.ts` | config | request-response | `src/mcp/server.ts` (itself) | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (itself) | exact |
| `src/mcp/tools/instance.ts` | controller | request-response | `src/mcp/tools/instance.ts` (itself) | exact |
| `docs/en/cloud.md` | docs | static | `README.md` | partial-match |
| `docs/de/cloud.md` | docs | static | `README.de.md` | partial-match |
| `README.md` | docs | static | `README.md` (itself) | exact |
| `README.de.md` | docs | static | `README.de.md` (itself) | exact |
| `.planning/codebase/CONVENTIONS.md` | docs | static | `.planning/codebase/CONVENTIONS.md` (itself) | exact |
| `src/mcp/server.test.ts` | test | validation | `src/mcp/server.test.ts` (itself) | exact |
| `src/utils/errors.test.ts` | test | validation | `src/utils/errors.test.ts` (itself) | exact |
| `src/mcp/tools/instance.test.ts` | test | validation | `src/mcp/tools/instance.test.ts` (itself) | exact |

## Pattern Assignments

### `src/mcp/server.ts` (config, request-response)

**Analog:** `src/mcp/server.ts` (itself)

**Imports pattern** (lines 1-3):
```typescript
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
```

**McpServer constructor pattern** (lines 581-585):
```typescript
export async function createAndConnectServer(
  env: EnvConfig,
): Promise<McpServer> {
  const server = new McpServer({ name: 'awesome-coolify-mcp', version: '0.1.0' });
  registerCoolifyTools(server, env);
```

**New branding expansion pattern** (to be implemented):
```typescript
const server = new McpServer({
  name: 'awesome-coolify-mcp',
  version: '0.1.0',
  title: 'Awesome Coolify',
  description: 'MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools',
  websiteUrl: 'https://github.com/clezcoding/awesome-coolify',
  icons: [
    {
      src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
      mimeType: 'image/png',
      sizes: ['192x192']
    }
  ]
});
```

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `src/utils/errors.ts` (itself)

**Zod and helper imports** (lines 1-18):
```typescript
import { redactSecrets } from './redact.js';

export type CoolifyErrorCode =
  | 'COOLIFY_401'
  | 'COOLIFY_404'
  | 'COOLIFY_409'
  | 'COOLIFY_422'
  | 'COOLIFY_500'
  | 'COOLIFY_NETWORK'
  | 'COOLIFY_TIMEOUT'
  | 'COOLIFY_AMBIGUOUS_MATCH'
  | 'COOLIFY_403_SENSITIVE_REQUIRED'
  | 'COOLIFY_CONFIRM_REQUIRED'
  | 'COOLIFY_SSH_UNREACHABLE'
  | 'COOLIFY_VALIDATION_ERROR'
  | 'COOLIFY_NO_INSTANCE'
  | 'COOLIFY_INSTANCE_NOT_FOUND'
  | 'COOLIFY_PARTIAL_ENV';
```

**Dynamic Hostname Cloud Detection pattern** (to be implemented):
```typescript
export function isCloudUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'coolify.io' || hostname.endsWith('.coolify.io');
  } catch {
    return false;
  }
}
```

**Dynamic Cloud-specific Error Mapping pattern** (integrating in lines 146-165 and 204-246):
```typescript
// Inside toStructuredError(error: unknown)
const fetchError = error as {
  request?: string;
  response?: { status?: number; _data?: unknown };
  status?: number;
  statusCode?: number;
  data?: unknown;
};

const requestUrl = typeof fetchError.request === 'string' ? fetchError.request : undefined;
const isCloud = requestUrl ? isCloudUrl(requestUrl) : false;

// Inside mapApiError(error, httpStatus, coolifyMessage, isCloud = false)
if (isCloud && httpStatus === 403) {
  return {
    code: 'COOLIFY_CLOUD_FORBIDDEN',
    message: sanitizeMessage(coolifyMessage || 'Cloud API request forbidden. Check team-scoped token permissions.'),
    recoveryHints: RECOVERY_HINTS.COOLIFY_CLOUD_FORBIDDEN,
    httpStatus,
  };
}
if (isCloud && httpStatus === 404) {
  return {
    code: 'COOLIFY_CLOUD_UNSUPPORTED',
    message: sanitizeMessage(coolifyMessage || 'Endpoint not supported or not available on Coolify Cloud.'),
    recoveryHints: RECOVERY_HINTS.COOLIFY_CLOUD_UNSUPPORTED,
    httpStatus,
  };
}
```

---

### `src/mcp/tools/instance.ts` (controller, request-response)

**Analog:** `src/mcp/tools/instance.ts` (itself)

**Existing Instance Actions Union pattern** (lines 107-115):
```typescript
export const instanceActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  addActionSchema,
  updateActionSchema,
  deleteActionSchema,
  setDefaultActionSchema,
  importEnvActionSchema,
]);
```

**Static Cloud-Info Action Schema** (to be implemented):
```typescript
const cloudInfoActionSchema = z
  .object({
    action: z.literal('cloud-info'),
    instance: z.string().optional().describe('Optional instance name (lowercase, 2–32 chars)'),
  })
  .strict();
```

**Credentials & Instance Heuristic resolution pattern** (lines 222-232 and 291-356):
```typescript
function inferInstanceType(url: string): 'self-hosted' | 'cloud' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'coolify.io' || hostname.endsWith('.coolify.io')) {
      return 'cloud';
    }
  } catch {
    /* invalid URL handled by schema */
  }
  return 'self-hosted';
}

// Inside handleInstanceAction
case 'cloud-info': {
  let resolvedUrl = '';
  let resolvedType: 'self-hosted' | 'cloud' = 'self-hosted';
  let source: 'registry' | 'env' | 'infer' = 'infer';

  try {
    const creds = InstanceManager.resolveCredentials(parsed.instance, process.env);
    resolvedUrl = creds.url;
    resolvedType = inferInstanceType(creds.url);
    source = parsed.instance ? 'registry' : (process.env.COOLIFY_URL && process.env.COOLIFY_TOKEN ? 'env' : 'registry');
  } catch (err) {
    // If no instance registered yet or other error, fallback to App.coolify.io URL as inferred default
    resolvedUrl = 'https://app.coolify.io';
    resolvedType = 'cloud';
    source = 'infer';
  }

  return buildReadResponse({
    isCloud: resolvedType === 'cloud',
    url: resolvedUrl,
    source,
    setupHints: [
      'Generate a team-scoped token in app.coolify.io under Keys & Tokens.',
      'Run instance.add or import-env to register it locally.',
    ],
    knownLimits: [
      'Cloud does not support server creation/validation/deletion via API.',
      'Some self-hosted endpoints may return 404 (COOLIFY_CLOUD_UNSUPPORTED).',
    ],
    docsLink: 'docs/en/cloud.md',
  });
}
```

---

### `src/utils/errors.test.ts` (test, validation)

**Analog:** `src/utils/errors.test.ts` (itself)

**Standard error mapping test structure** (lines 11-32):
```typescript
describe('mapApiError', () => {
  it('maps HTTP 401 to COOLIFY_401 with recoveryHints', () => {
    const envelope = mapApiError(null, 401);
    expect(envelope.code).toBe('COOLIFY_401');
    expect(envelope.httpStatus).toBe(401);
    expect(envelope.recoveryHints.length).toBeGreaterThanOrEqual(1);
    expect(envelope.recoveryHints[0]).toMatch(/Keys & Tokens/i);
  });

  it('maps HTTP 404 to COOLIFY_404', () => {
    expect(mapApiError(null, 404).code).toBe('COOLIFY_404');
  });
```

**New cloud error mapping tests** (to be implemented):
```typescript
describe('Cloud errors', () => {
  it('maps cloud hostname HTTP 403 to COOLIFY_CLOUD_FORBIDDEN', () => {
    const fetchError = {
      request: 'https://app.coolify.io/api/v1/servers',
      response: { status: 403, _data: { message: 'Forbidden on Cloud' } }
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_CLOUD_FORBIDDEN');
    expect(envelope.recoveryHints[0]).toMatch(/team-scoped token/i);
  });

  it('maps cloud hostname HTTP 404 to COOLIFY_CLOUD_UNSUPPORTED', () => {
    const fetchError = {
      request: 'https://app.coolify.io/api/v1/unsupported-route',
      response: { status: 404, _data: { message: 'Not found' } }
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_CLOUD_UNSUPPORTED');
    expect(envelope.recoveryHints[0]).toMatch(/Endpoint not supported/i);
  });
});
```

---

### `src/mcp/tools/instance.test.ts` (test, validation)

**Analog:** `src/mcp/tools/instance.test.ts` (itself)

**Action testing structure** (lines 39-49):
```typescript
describe('instance tool', () => {
  it('handleInstanceAction list returns registry entries with tokens redacted as ***', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: [{ name: 'prod', token: '***' }],
    });
  });
```

**New cloud-info action testing** (to be implemented):
```typescript
  it('handleInstanceAction cloud-info returns correct static credentials state', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction({
      action: 'add',
      name: 'my-cloud',
      url: 'https://app.coolify.io',
      token: 'my-secret',
      type: 'cloud',
    }, testEnv);

    const result = await handleInstanceAction({ action: 'cloud-info', instance: 'my-cloud' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result.data).toMatchObject({
      isCloud: true,
      url: 'https://app.coolify.io',
      source: 'registry',
    });
  });
```

---

## Shared Patterns

### Dynamic Cloud Host Inference
**Source:** `src/mcp/tools/instance.ts` (as `inferInstanceType`), generalized for global error mapping in `src/utils/errors.ts`.
**Apply to:** Error handling/translation layer and instance info actions.
```typescript
export function isCloudUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'coolify.io' || hostname.endsWith('.coolify.io');
  } catch {
    return false;
  }
}
```

### Static Discovery Action Pattern
**Source:** `src/mcp/tools/instance.ts` (as `cloud-info` case), provides localized instructions and capabilities discovery without hitting live remote servers.
**Apply to:** Informational tools returning local registry analysis or guide-focused advice to the agent.
```typescript
return buildReadResponse({
  isCloud,
  url,
  source,
  setupHints,
  knownLimits,
  docsLink,
});
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/en/cloud.md` | docs | static | Dedicated topic-focused locale markdown documents do not exist yet (only general root-level README files are present). |

## Metadata

**Analog search scope:** `src/`, `docs/`, `.planning/`
**Files scanned:** 68
**Pattern extraction date:** 2026-07-22
