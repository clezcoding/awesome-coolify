# Phase 12: Environment Variables & Smart Sync - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 7
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/api/client.ts` | service | request-response | `src/api/client.ts` (itself) | exact |
| `src/mcp/tools/application.ts` | controller | request-response | `src/mcp/tools/private_key.ts` | role-match |
| `src/mcp/tools/service.ts` | controller | request-response | `src/mcp/tools/private_key.ts` | role-match |
| `src/mcp/tools/database.ts` | controller | request-response | `src/mcp/tools/private_key.ts` | role-match |
| `src/utils/env-parser.ts` | utility | transform | `src/utils/yaml-validator.ts` | role-match |
| `src/utils/env-parser.test.ts` | test | transform | `src/utils/redact.test.ts` | exact |
| `src/mcp/tools/application.test.ts` (envs:* extension) | test | request-response | `src/mcp/tools/private_key.test.ts` | exact |

## Pattern Assignments

### `src/api/client.ts` (service, request-response)

**Analog:** `src/api/client.ts` (standard GET, POST, PATCH, DELETE operations)

**GET / List Pattern** (lines 513-522):
```typescript
export async function fetchApplicationEnvs(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/applications/${uuid}/envs`, { method: 'GET' });
  return Array.isArray(result) ? result : [];
}
```

**POST / Create Pattern** (lines 477-481):
```typescript
export async function createKeydbDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/keydb', { method: 'POST', body: payload });
}
```

**PATCH / Bulk Pattern** (lines 483-492):
```typescript
export async function updateDatabase(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}`, { method: 'PATCH', body: payload });
}
```

**DELETE Pattern** (lines 494-511):
```typescript
export async function deleteDatabase(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}
```

---

### `src/mcp/tools/application.ts`, `src/mcp/tools/service.ts`, `src/mcp/tools/database.ts` (controller, request-response)

**Analog:** `src/mcp/tools/private_key.ts`

**Imports Pattern** (lines 1-27):
```typescript
import * as z from 'zod/v4';
import { readFileSync } from 'node:fs';
import type { EnvConfig } from '../config/env.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  resolveProjection,
  sanitizeFullProjection,
} from '../../utils/projections.js';
```

**Zod Action Schemas / Dual-layer validation** (lines 47-118):
```typescript
const getActionSchema = z
  .object({
    action: z.literal('get'),
    uuid: z.string().describe('Private key UUID'),
    ...sharedReadParamsSchema,
  })
  .strict();

const createActionSchema = z
  .object({
    action: z.literal('create'),
    name: z.string().describe('Private key name'),
    private_key: z.string().optional().describe('Inline PEM material'),
    key_file: z.string().optional().describe('Local filesystem path to PEM file'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasInline = typeof data.private_key === 'string' && data.private_key.length > 0;
    const hasFile = typeof data.key_file === 'string' && data.key_file.length > 0;

    if (hasInline === hasFile) {
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one of private_key (inline PEM) or key_file (local path) is required',
        params: { code: 'COOLIFY_422' },
      });
    }
  });
```

**Confirm Gate Pattern** (lines 248-262):
```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on private key '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}
```

**Action Execution & Error Handling** (lines 264-280):
```typescript
export async function handlePrivateKeyAction(
  args: unknown,
  env: EnvConfig,
): Promise<PrivateKeyActionResult> {
  try {
    const parsed = parsePrivateKeyAction(args);

    switch (parsed.action) {
      case 'list': {
        // execution ...
      }
      // ...
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

---

### `src/utils/env-parser.ts` (utility, transform)

**Analog:** `src/utils/yaml-validator.ts`

**Input decoding / handling** (lines 7-20):
```typescript
export function decodeCompose(base64: string): string | null {
  if (base64 === '') {
    return '';
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return null;
  }
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}
```

**Robust parse / check structure** (lines 21-34):
```typescript
export function validateCompose(
  yaml: string,
): { ok: true } | { ok: false; error: string } {
  if (yaml.trim() === '') {
    return { ok: false, error: 'compose YAML is empty' };
  }
  try {
    parse(yaml);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
```

---

### `src/utils/env-parser.test.ts` (test, transform)

**Analog:** `src/utils/redact.test.ts`

**Describe/It Unit Testing structure** (lines 1-25):
```typescript
import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact.js';

describe('redactSecrets', () => {
  it('masks Bearer JWT sequences', () => {
    const input = 'Auth failed Bearer eyJhbGciOiJIUzI1NiJ9.abc.def';
    const output = redactSecrets(input);
    expect(output).toContain('Bearer ***');
    expect(output).not.toContain('eyJ');
  });
  // ...
});
```

---

### `src/mcp/tools/application.test.ts` envs:* extension (test, request-response)

**Analog:** `src/mcp/tools/private_key.test.ts`

**Vitest mock setup** (lines 10-21):
```typescript
vi.mock('../../api/client.js', () => ({
  fetchPrivateKeys: vi.fn(),
  fetchPrivateKey: vi.fn(),
  createPrivateKey: vi.fn(),
  updatePrivateKey: vi.fn(),
  deletePrivateKey: vi.fn(),
  fetchServers: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));
```

**Describe/It testing MCP Tool Actions** (lines 51-72):
```typescript
describe('private_key list', () => {
  beforeEach(() => {
    vi.mocked(fetchPrivateKeys).mockReset();
    vi.mocked(fetchPrivateKeys).mockResolvedValue([mockKey]);
  });

  it('returns summary projection with uuid, name, fingerprint, description per D-04', async () => {
    const result = await handlePrivateKeyAction({ action: 'list' }, testEnv);

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    if (isPrivateKeyErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      uuid: 'key-uuid-7',
      name: 'deploy-key',
    });
  });
});
```

Note: Phase 12 uses colocated unit tests (`src/mcp/tools/application.test.ts`, `src/mcp/tools/service.test.ts`, `src/mcp/tools/database.test.ts`, `src/api/client.test.ts`, `src/utils/env-parser.test.ts`) — NOT `tests/integration/envs.test.ts`. The integration test path was a planning placeholder that did not match the repo convention (Phase 11 used colocated unit tests); it is dropped in favor of the colocated unit tests above.

---

## Shared Patterns

### Error Handling
**Source:** `src/utils/errors.ts`
**Apply to:** All controller and service functions.
All action executions must be wrapped in `try/catch` and errors processed through `wrapMcpError` to sanitize outputs (SAF-04) and map codes into `CoolifyErrorCode`.
```typescript
export function wrapMcpError(error: unknown): McpErrorResult {
  const raw = toStructuredError(error);
  const envelope: CoolifyErrorEnvelope = {
    ...raw,
    message: redactSecrets(raw.message),
    recoveryHints: raw.recoveryHints.map((hint) => redactSecrets(hint)),
    ...(raw.data ? { data: redactEnvelopeData(raw.data) } : {}),
  };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
    structuredContent: { ok: false, error: envelope },
  };
}
```

### Projections & Secrets Masking
**Source:** `src/utils/projections.ts`
**Apply to:** All `list` / `get` / `create` / `update` / `sync` actions.
All values are masked (`***`) by default. To output values, the user must explicitly ask the agent, which then passes `reveal: true`.
```typescript
export function sanitizeFullProjection(raw: unknown, reveal = false): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const clone = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  // ...
  if (reveal) {
    maskPemFields(clone);
    return clone;
  }
  maskSecrets(clone);
  return clone;
}
```

### XOR Local Path vs. Inline String Input
**Source:** `src/mcp/tools/private_key.ts`
**Apply to:** `envs:sync` action in `src/mcp/tools/application.ts`
Enforce that exactly one of `env_file` or `env_content` is present.
```typescript
const hasInline = typeof data.private_key === 'string' && data.private_key.length > 0;
const hasFile = typeof data.key_file === 'string' && data.key_file.length > 0;
if (hasInline === hasFile) {
  ctx.addIssue({
    code: 'custom',
    message: 'Exactly one of env_content or env_file is required',
    params: { code: 'COOLIFY_422' },
  });
}
```

## No Analog Found

All files mapped. No files missing analogs.

## Metadata

**Analog search scope:** `src/`
**Files scanned:** 60
**Pattern extraction date:** 2026-07-21
**Revision:** 2026-07-21 — replaced `tests/integration/envs.test.ts` placeholder with colocated `src/mcp/tools/application.test.ts` envs:* extension to match Phase 11 repo convention.
