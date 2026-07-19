# Phase 11: Service & Database CRUD - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/api/client.ts` | service | request-response | `src/api/client.ts` (Application/Server endpoints) | exact |
| `src/mcp/tools/service.ts` | controller | CRUD | `src/mcp/tools/application.ts` | role-match |
| `src/mcp/tools/database.ts` | controller | CRUD | `src/mcp/tools/application.ts` | role-match |
| `src/mcp/tools/service.test.ts` | test | unit | `src/mcp/tools/application.test.ts` | role-match |
| `src/mcp/tools/database.test.ts` | test | unit | `src/mcp/tools/application.test.ts` | role-match |
| `src/api/client.test.ts` | test | unit | `src/api/client.test.ts` | exact |

## Pattern Assignments

### `src/api/client.ts` (service, request-response)

**Analog:** `src/api/client.ts`

**Service/Database creation pattern** (referencing application creation, lines 257-265):
```typescript
export async function createPublicApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/public', { method: 'POST', body: payload });
}
```

**Service/Database update pattern** (referencing application update, lines 313-322):
```typescript
export async function updateApplication(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, { method: 'PATCH', body: payload });
}
```

**Service/Database deletion pattern** (referencing application deletion, lines 324-341):
```typescript
export async function deleteApplication(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
    delete_volumes?: boolean;
    docker_cleanup?: boolean;
    delete_connected_networks?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}
```

---

### `src/mcp/tools/service.ts` (controller, CRUD)

**Analog:** `src/mcp/tools/application.ts`

**Imports pattern** (lines 1-29):
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createPublicApplication,
  // ... imports ...
} from '../../api/client.js';
import { buildProjectEnvironmentIndex } from '../../utils/project-lookup.js';
import { sanitizeFullProjection } from '../../utils/projections.js';
import { buildReadResponse } from '../../utils/formatters.js';
```

**Creation Validation Scoping & XOR Patterns** (lines 395-401, 72-84 of private_key.ts):
```typescript
// From src/mcp/tools/application.ts:
const createActionSchema = z.discriminatedUnion('source_type', [ ... ]);

// XOR pattern from src/mcp/tools/private_key.ts:
  .superRefine((data, ctx) => {
    const hasInline = typeof data.private_key === 'string' && data.private_key.length > 0;
    const hasFile = typeof data.key_file === 'string' && data.key_file.length > 0;

    if (hasInline === hasFile) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Exactly one of private_key (inline PEM) or key_file (local path) is required',
        params: { code: 'COOLIFY_422' },
      });
    }
  });
```

**Delete & Preview patterns** (lines 1416-1499):
```typescript
async function handleApplicationDelete(
  parsed: DeleteAction,
  env: EnvConfig,
): Promise<ApplicationDeleteResult> {
  const uuid = await resolveAppMutationUuid( ... );
  validateDeleteConfirm(parsed.confirm, uuid);
  await deleteApplication( ... );
  return buildReadResponse({ ok: true, uuid, deleted: true, ... });
}

async function handleApplicationDeletePreview(
  parsed: DeletePreviewAction,
  env: EnvConfig,
): Promise<ApplicationDeletePreviewResult> {
  const uuid = await resolveAppMutationUuid( ... );
  const rawResources = await fetchResources( ... );
  // Filter for children and return counts/warnings
}
```

---

### `src/mcp/tools/database.ts` (controller, CRUD)

**Analog:** `src/mcp/tools/application.ts`

**Engine Discriminator / Masking & Reveal Pattern** (lines 380-401, projection sanitizing lines 1401-1414):
```typescript
// Zod discriminatedUnion for engine:
const createDatabaseSchema = z.discriminatedUnion('engine', [ ... ]);

// Reveal secrets / projection mapping:
const raw = await fetchDatabase(env.COOLIFY_URL, env.COOLIFY_TOKEN, uuid, env.COOLIFY_VERIFY_SSL);
const data = sanitizeFullProjection(raw, parsed.reveal);
```

**Public Access Confirm Pattern** (D-12 custom security guard):
```typescript
if (parsed.is_public === true && parsed.confirm !== true) {
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: 'Enabling public database access requires explicit confirmation (confirm: true).',
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
  });
}
```

---

## Shared Patterns

### Base64 Compose Encoding & Decoding
**Source:** Phase 11 custom specification
**Apply to:** Service Create and Update (docker_compose_raw mapping)
```typescript
export function encodeCompose(yaml: string): string {
  return Buffer.from(yaml, 'utf8').toString('base64');
}

export function decodeCompose(base64: string): string {
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}
```

### Destructive Deletes and Safety Defaults
**Source:** `src/mcp/tools/application.ts` (Lines 767-781)
**Apply to:** Service and Database deletion actions
```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }
  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on resource '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
  });
}
```

### Soft Success Deployment Errors
**Source:** `src/mcp/tools/application.ts` (Lines 1593-1613)
**Apply to:** Service & Database instant-deploy triggers on create
```typescript
try {
  const deployRaw = await triggerDeploy( ... );
  return buildReadResponse({ uuid: appUuid, deploy: { status: 'queued' } });
} catch (error) {
  return buildReadResponse({
    ok: true,
    uuid: appUuid,
    deploy: { status: 'failed_to_queue', error: error.message },
    recoveryHints: [ ... ]
  });
}
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/yaml-validator.ts` | utility | transform | No existing YAML parser or validator utility in the codebase |

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/api/`
**Files scanned:** 35
**Pattern extraction date:** 2026-07-19
