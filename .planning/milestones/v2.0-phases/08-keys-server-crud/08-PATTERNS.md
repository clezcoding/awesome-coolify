# Phase 08: Keys & Server CRUD - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 9
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/private_key.ts` | controller | request-response | `src/mcp/tools/database.ts` | exact |
| `src/mcp/tools/server.ts` | controller | request-response | `src/mcp/tools/database.ts` | exact |
| `src/mcp/tools/private_key.test.ts` | test | request-response | `src/mcp/tools/database.test.ts` | exact |
| `src/mcp/tools/server.test.ts` | test | request-response | `src/mcp/tools/database.test.ts` | exact |
| `src/mcp/server.ts` | config | initialization | `src/mcp/server.ts` | exact (modify) |
| `src/mcp/tools/resource.ts` | controller | CRUD | `src/mcp/tools/resource.ts` | exact (modify) |
| `src/api/client.ts` | service | request-response | `src/api/client.ts` | exact (modify) |
| `src/utils/projections.ts` | utility | transform | `src/utils/projections.ts` | exact (modify) |
| `src/utils/errors.ts` | utility | error-handling | `src/utils/errors.ts` | exact (modify) |

---

## Pattern Assignments

### `src/mcp/tools/private_key.ts` (controller, request-response)
**Analog:** `src/mcp/tools/database.ts`
**Confirm Gate Analog:** `src/mcp/tools/emergency.ts`

- **Imports pattern**:
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchCoolifyClient, // To extend or run queries on security/keys
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import { sharedReadParamsSchema } from './shared-read-params.js';
```

- **Zod Actions discriminated union pattern** (Lines 117-136 in `src/mcp/tools/database.ts`):
```typescript
const getActionSchema = z
  .object({
    action: z.literal('get'),
    uuid: z.string().describe('Private Key UUID'),
    ...sharedReadParamsSchema,
  })
  .strict();

export const privateKeyActionSchema = z.discriminatedUnion('action', [
  getActionSchema,
  // list, create, update, delete, delete_preview
]);
```

- **Confirm Gate / Verification pattern** (Lines 187-204 in `src/mcp/tools/emergency.ts`):
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
```

- **Handler Structure pattern** (Lines 276-336 in `src/mcp/tools/database.ts`):
```typescript
export async function handlePrivateKeyAction(
  args: PrivateKeyAction,
  env: EnvConfig,
): Promise<PrivateKeyActionResult> {
  const parsed = privateKeyActionSchema.parse(args);
  try {
    switch (parsed.action) {
      case 'get':
        // fetch key and return sanitized response
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

---

### `src/mcp/tools/server.ts` (controller, request-response)
**Analog:** `src/mcp/tools/database.ts`
**Validation Poll Loop Analog:** `src/mcp/tools/emergency.ts` (`pollDeploymentUntilTerminal` style)

- **Imports pattern**:
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchServer,
  triggerServerValidate,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import { sharedReadParamsSchema } from './shared-read-params.js';
```

- **Zod Actions discriminated union pattern**:
```typescript
export const serverActionSchema = z.discriminatedUnion('action', [
  // get, create, update, delete, delete_preview, validate
]);
```

- **Poll validation loop pattern** (Adapt from `pollDeploymentUntilTerminal` in `src/utils/deploy-poll.ts`):
```typescript
export async function pollServerUntilReachable(
  fetcher: () => Promise<Record<string, unknown>>,
  timeoutMs: number,
  intervalMs = 2000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const server = await fetcher();
    const reachable = (server.settings as { is_reachable?: boolean } | undefined)?.is_reachable;
    if (reachable === true) {
      return server;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timeout waiting for server reachability validation');
}
```

---

### `src/mcp/tools/private_key.test.ts` & `src/mcp/tools/server.test.ts` (test, request-response)
**Analog:** `src/mcp/tools/database.test.ts`

- **Unit test mock pattern** (Lines 9-27 in `src/mcp/tools/database.test.ts`):
```typescript
vi.mock('../../api/client.js', () => ({
  fetchDatabase: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  triggerDatabaseStart: vi.fn(),
  triggerDatabaseStop: vi.fn(),
  triggerDatabaseRestart: vi.fn(),
}));
```

- **Unit test assertion pattern** (Lines 91-100 in `src/mcp/tools/database.test.ts`):
```typescript
  it('returns summary projection by default', async () => {
    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(result.data).toMatchObject({ ... });
  });
```

---

## Shared Patterns

### 1. Unified Action Routing
All MCP tools must use action discriminated unions, validating inputs immediately with Zod at the boundary before executing API requests.

### 2. Standardized Formatting & Output Sizing
All responses must flow through `buildReadResponse` in `src/utils/formatters.ts` to support pretty printing, raw JSON output, table projections, and strict character limits (`max_chars`).

### 3. Strict Secrets Redacting
Private Key PEM content must be heavily protected:
- Standard projection output must completely omit or substitute the `private_key` parameter with `***`.
- Passing `reveal: true` to `private_key.list` must raise `COOLIFY_422` immediately to prevent bulk leaks of SSH keys.
- `sanitizeFullProjection` in `src/utils/projections.ts` must always mask any field matching `/private_key|pem/i` regardless of `reveal`.

### 4. Robust Connection / Polling Handling
When setting up infrastructure, validation handles temporary unreachable states gracefully. No auto-rollbacks are triggered on validation timeouts. Polling loops check the server's reachability flag with a safe interval and clear time boundary.

---

## No Analog Found

All files requested in Phase 08 have exact or close architectural equivalents in the existing codebase. No greenfield structural patterns are introduced from scratch.

---

## Metadata

**Analog search scope:** `src/mcp/**/*`, `src/api/**/*`, `src/utils/**/*`
**Files scanned:** 25 MCP tools, 2 API clients, 20 utilities
**Pattern extraction date:** Thursday July 16, 2026
