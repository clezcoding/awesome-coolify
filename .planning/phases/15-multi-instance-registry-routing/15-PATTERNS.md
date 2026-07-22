# Phase 15: Multi-Instance Registry & Routing - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 19 (5 core files + 14 domain tools)
**Analogs found:** 18 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/instance-registry.ts` | utility | file-I/O | `src/utils/env-parser.ts` | partial-match |
| `src/mcp/tools/instance.ts` | controller | request-response | `src/mcp/tools/private_key.ts` | exact |
| `src/config/env.ts` | config | transform | `src/config/env.ts` (itself) | exact |
| `src/mcp/server.ts` | config | request-response | `src/mcp/server.ts` (itself) | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (itself) | exact |
| `src/mcp/tools/application.ts` (and other 13 domain tools) | controller | request-response | `src/mcp/tools/system.ts` | exact |

## Pattern Assignments

### `src/utils/instance-registry.ts` (utility, file-I/O)

**Analog:** `src/utils/env-parser.ts` (for Zod schema parsing)

**Imports pattern**:
```typescript
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
```

**Zod Schema pattern**:
```typescript
export const instanceSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
  url: z.string().url(),
  token: z.string().min(1),
  type: z.enum(['self-hosted', 'cloud']),
  verifySsl: z.boolean().default(true),
});

export type Instance = z.infer<typeof instanceSchema>;

export interface Registry {
  default?: string;
  instances: Instance[];
}
```

**Atomic Write & Permission Enforcement pattern**:
```typescript
export class InstanceManager {
  private static dirPath = join(homedir(), '.coolify-mcp');
  private static filePath = join(this.dirPath, 'instances.json');
  private static writeLock = Promise.resolve();

  static async saveRegistry(registry: Registry): Promise<void> {
    this.writeLock = this.writeLock.then(() => this.executeSave(registry)).catch(() => {});
    await this.writeLock;
  }

  private static executeSave(registry: Registry): void {
    if (!existsSync(this.dirPath)) {
      mkdirSync(this.dirPath, { recursive: true, mode: 0o700 });
      chmodSync(this.dirPath, 0o700);
    }

    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
      const content = JSON.stringify(registry, null, 2) + '\n';
      writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
      chmodSync(tmpPath, 0o600);
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      try {
        unlinkSync(tmpPath);
      } catch {}
      throw error;
    }
  }
}
```

---

### `src/mcp/tools/instance.ts` (controller, request-response)

**Analog:** `src/mcp/tools/private_key.ts`

**Zod Discriminated Union pattern** (from `src/mcp/tools/private_key.ts` lines 120-127):
```typescript
export const privateKeyActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  createActionSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);
```

**Confirm-Gate pattern** (from `src/mcp/tools/private_key.ts` lines 248-262):
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

**Token Redaction pattern** (from `src/mcp/tools/private_key.ts` lines 186-201):
```typescript
function stripPemFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (/private_key|pem/i.test(key)) {
      continue;
    }
    if (isRecord(value)) {
      result[key] = stripPemFields(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

---

### `src/config/env.ts` (config, transform)

**Analog:** `src/config/env.ts` (itself)

**Softened Env Schema pattern** (from `src/config/env.ts` lines 5-12):
```typescript
const envSchema = z.object({
  COOLIFY_URL: z.string().url().optional(),
  COOLIFY_TOKEN: z.string().min(1).optional(),
  COOLIFY_VERIFY_SSL: z
    .preprocess((val) => val !== 'false', z.boolean())
    .default(true),
  COOLIFY_MCP_LOG: z.enum(['debug', 'info', 'error']).default('info'),
});
```

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `src/utils/errors.ts` (itself)

**Error Codes & Recovery Hints pattern** (from `src/utils/errors.ts` lines 3-15 and 35-85):
```typescript
export type CoolifyErrorCode =
  | 'COOLIFY_401'
  | 'COOLIFY_404'
  | 'COOLIFY_NO_INSTANCE'
  | 'COOLIFY_INSTANCE_NOT_FOUND'
  // ... other codes ...

export const RECOVERY_HINTS: Record<CoolifyErrorCode, string[]> = {
  COOLIFY_NO_INSTANCE: [
    'No active Coolify instance configured.',
    'Use instance.add to register an instance, or set COOLIFY_URL and COOLIFY_TOKEN environment variables.',
  ],
  COOLIFY_INSTANCE_NOT_FOUND: [
    'The specified instance name was not found in the registry.',
    'Run instance.list to see available instances.',
  ],
  // ... other hints ...
};
```

---

### `src/mcp/tools/application.ts` (and other 13 domain tools) (controller, request-response)

**Analog:** `src/mcp/tools/system.ts`

**Dynamic Credential Resolution pattern**:
```typescript
export async function handleApplicationAction(
  args: any,
  env: EnvConfig,
): Promise<any> {
  try {
    const credentials = InstanceManager.resolveCredentials(args.instance, process.env);
    const client = createCoolifyClient(credentials.url, credentials.token, credentials.verifySsl);
    
    // Use resolved client for API operations
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

---

## Shared Patterns

### Dynamic Credential Precedence
**Source:** `src/utils/instance-registry.ts`
**Apply to:** All 14 domain tools
```typescript
export class InstanceManager {
  static resolveCredentials(
    instanceParam?: string,
    env: NodeJS.ProcessEnv = process.env,
  ): { url: string; token: string; verifySsl: boolean } {
    // 1. Explicit instance param wins
    if (instanceParam) {
      const registry = this.loadRegistry();
      const match = registry.instances.find((i) => i.name === instanceParam);
      if (!match) {
        throw new Error(`COOLIFY_INSTANCE_NOT_FOUND: Instance "${instanceParam}" not found in registry.`);
      }
      return { url: match.url, token: match.token, verifySsl: match.verifySsl };
    }

    // 2. Env override (both must be set)
    if (env.COOLIFY_URL && env.COOLIFY_TOKEN) {
      const verifySsl = env.COOLIFY_VERIFY_SSL !== 'false';
      return { url: env.COOLIFY_URL, token: env.COOLIFY_TOKEN, verifySsl };
    }

    // Partial Env check (hard error)
    if (env.COOLIFY_URL || env.COOLIFY_TOKEN) {
      throw new Error('COOLIFY_PARTIAL_ENV: Both COOLIFY_URL and COOLIFY_TOKEN must be set in environment.');
    }

    // 3. Registry default
    const registry = this.loadRegistry();
    if (registry.default) {
      const match = registry.instances.find((i) => i.name === registry.default);
      if (match) {
        return { url: match.url, token: match.token, verifySsl: match.verifySsl };
      }
    }

    // No instance resolved (soft-start recovery)
    throw new Error('COOLIFY_NO_INSTANCE: No active Coolify instance configured.');
  }
}
```

### Error Wrapping
**Source:** `src/utils/errors.ts`
**Apply to:** All tool handlers
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

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/instance-registry.ts` (File Writing) | utility | file-I/O | No source code files currently write to the local filesystem (only test files do). |

## Metadata

**Analog search scope:** `src/`
**Files scanned:** 64
**Pattern extraction date:** 2026-07-21
