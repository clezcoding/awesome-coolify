# Phase 17: Local Manifest & Sync - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 9
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/manifest.ts` | utility | file-I/O | `src/utils/instance-registry.ts` | exact |
| `src/mcp/tools/manifest.ts` | route | request-response | `src/mcp/tools/instance.ts` | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (self) | exact |
| `src/mcp/server.ts` | config | transform | `src/mcp/server.ts` (self) | exact |
| `src/mcp/tools/application.ts` | route | request-response | `src/mcp/tools/application.ts` (self) | exact |
| `src/mcp/tools/service.ts` | route | request-response | `src/mcp/tools/service.ts` (self) | exact |
| `src/mcp/tools/database.ts` | route | request-response | `src/mcp/tools/database.ts` (self) | exact |
| `src/utils/manifest.test.ts` | test | request-response | `src/utils/instance-registry.test.ts` | exact |
| `src/mcp/tools/manifest.test.ts` | test | request-response | `src/mcp/tools/instance.test.ts` | exact |

## Pattern Assignments

### `src/utils/manifest.ts` (utility, file-I/O)

**Analog:** `src/utils/instance-registry.ts`

**Imports pattern** (lines 1-16):
```typescript
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
} from './errors.js';
```

**Zod Schema and Types pattern** (lines 18-31):
```typescript
export const manifestResourceSchema = z.object({
  uuid: z.string().uuid(),
  type: z.enum(['application', 'service', 'database']),
  name: z.string(),
  domains: z.array(z.string()).default([]),
});

export const manifestEnvironmentSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  resources: z.array(manifestResourceSchema).default([]),
});

export const manifestProjectSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  environments: z.array(manifestEnvironmentSchema).default([]),
});

export const manifestServerSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
});

export const manifestSchema = z.object({
  version: z.string().default('1.0.0'),
  updatedAt: z.string(),
  instance: z.string().optional(),
  projects: z.array(manifestProjectSchema).default([]),
  servers: z.array(manifestServerSchema).default([]),
});

export type Manifest = z.infer<typeof manifestSchema>;
```

**Atomic Write & Safe Rename pattern** (lines 140-175):
```typescript
private static executeSave(manifest: Manifest, filePath: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
    renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath);
      }
    } catch {
      /* ignore cleanup failure */
    }
    throw error;
  }
}
```

**Concurrency Protection pattern** (lines 73-83):
```typescript
export class ManifestManager {
  private static writeLock: Promise<void> = Promise.resolve();

  private static withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = ManifestManager.writeLock.then(() => fn());
    ManifestManager.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
```

---

### `src/mcp/tools/manifest.ts` (route, request-response)

**Analog:** `src/mcp/tools/instance.ts`

**Action Schemas / Discriminated Union pattern** (lines 17-126):
```typescript
const getActionSchema = z
  .object({
    action: z.literal('get'),
  })
  .strict();

const upsertActionSchema = z
  .object({
    action: z.literal('upsert'),
    resource: z.object({
      uuid: z.string().uuid(),
      type: z.enum(['application', 'service', 'database']),
      name: z.string(),
      domains: z.array(z.string()).optional(),
    }),
    project_uuid: z.string().uuid().optional(),
    project_name: z.string().optional(),
    environment_uuid: z.string().uuid().optional(),
    environment_name: z.string().optional(),
  })
  .strict();

const deleteActionSchema = z
  .object({
    action: z.literal('delete'),
    uuid: z.string().uuid(),
    confirm: z.boolean().default(false),
  })
  .strict();

export const manifestActionSchema = z.discriminatedUnion('action', [
  getActionSchema,
  upsertActionSchema,
  deleteActionSchema,
  // ... clear, set, sync, diff
]);
```

**Action Handler Dispatch pattern** (lines 260-400):
```typescript
export async function handleManifestAction(
  args: unknown,
  env?: EnvConfig,
): Promise<ManifestActionResult> {
  try {
    const parsed = parseManifestAction(args);

    switch (parsed.action) {
      case 'get': {
        const manifest = ManifestManager.load();
        return buildReadResponse(manifest);
      }
      // ... clear, set, upsert, remove, sync, diff
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `src/utils/errors.ts` (Self-modification)

**Inject Recovery Hints pattern** (lines 254-301):
Extend `toStructuredError` to inspect resource UUIDs and check if they exist in the manifest. If a 404 occurs on a manifest-cached UUID, append the recovery hint.
```typescript
// Insert before final structured error return:
const errorText = `${coolifyMessage ?? ''} ${String(error)}`;
const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
let match;
let hasStaleUuid = false;

// Check if error contains any UUID existing in .coolify/manifest.json
while ((match = uuidRegex.exec(errorText)) !== null) {
  if (ManifestManager.hasUuid(match[0])) {
    hasStaleUuid = true;
    break;
  }
}

if (hasStaleUuid) {
  envelope.recoveryHints = [
    ...(envelope.recoveryHints ?? []),
    'The resource UUID was found in the local manifest cache but returned 404 from the API. The cache may be stale.',
    'Run manifest.sync or manifest.diff to reconcile the local manifest with the live Coolify instance.',
  ];
}
```

---

### `src/mcp/tools/application.ts` / `service.ts` / `database.ts` (route, request-response)

**Analog:** `src/mcp/tools/application.ts` (Self-modification)

**Auto-Upsert Hook pattern** (lines 1883-1900):
Register auto-upsert hook on successful creations, updates, or deletions. Must be robust (fail-safe best effort).
```typescript
// On successful create/update:
try {
  await ManifestManager.autoUpsert({
    uuid: appUuid,
    type: 'application',
    name: String(created.name ?? parsed.name ?? ''),
    domains: parsed.domains ? parsed.domains.split(',') : [],
    projectUuid: parsed.project_uuid,
    environmentUuid: parsed.environment_uuid,
  });
} catch (manifestError) {
  // best-effort non-fatal warning
  response._meta = {
    ...response._meta,
    manifestWarning: `Failed to update local manifest cache: ${manifestError instanceof Error ? manifestError.message : String(manifestError)}`,
  };
}
```

---

### `src/utils/manifest.test.ts` (test, request-response)

**Analog:** `src/utils/instance-registry.test.ts`

**Vitest Isolation and Mocking pattern** (lines 1-19):
```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let testWorkspaceRoot: string;

beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-workspace-'));
});

afterEach(() => {
  rmSync(testWorkspaceRoot, { recursive: true, force: true });
});
```

## Shared Patterns

### Gitignore Safety Append
**Source:** `src/utils/manifest.ts`
**Apply to:** Every manifest write operation
```typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EOL } from 'node:os';

export function ensureGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf8');
  }
  
  const lines = content.split(/\r?\n/);
  const target = '.coolify/';
  
  if (!lines.includes(target) && !lines.includes('.coolify')) {
    const prefix = content.length > 0 && !content.endsWith('\n') ? EOL : '';
    writeFileSync(gitignorePath, `${content}${prefix}${target}${EOL}`, 'utf8');
  }
}
```

### Atomic File Write
**Source:** `src/utils/manifest.ts`
**Apply to:** All manifest operations that write to disk
```typescript
const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
try {
  writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  renameSync(tmpPath, filePath);
} catch (err) {
  if (existsSync(tmpPath)) unlinkSync(tmpPath);
  throw err;
}
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/project-root.ts` | utility | batch | Cross-platform climbing search to resolve workspace-canonical root. Relies on Node.js climbing path loop. |

## Metadata

**Analog search scope:** `src/utils/`, `src/mcp/tools/`
**Files scanned:** 34
**Pattern extraction date:** 2026-07-22
