# Phase 10: Application CRUD & Safety - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 4
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/api/client.ts` | service | request-response | `src/api/client.ts` (itself) | exact |
| `src/mcp/tools/application.ts` | controller | request-response | `src/mcp/tools/project.ts` | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (itself) | exact |
| `src/mcp/tools/application.test.ts` | test | request-response | `src/mcp/tools/project.test.ts` | exact |

## Pattern Assignments

### `src/api/client.ts` (service, request-response)

**Analog:** `src/api/client.ts` (itself)

**Imports pattern** (lines 1-8):
```typescript
import https from 'node:https';
import { ofetch } from 'ofetch';
import {
  CoolifyApiError,
  mapApiError,
  toStructuredError,
} from '../utils/errors.js';
import { redactSecrets } from '../utils/redact.js';
```

**Core CRUD pattern** (lines 144-170):
```typescript
export async function createProject(
  url: string,
  token: string,
  payload: { name: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  const body = {
    name: payload.name,
    ...(payload.description ? { description: payload.description } : {}),
  };
  return client('/projects', { method: 'POST', body });
}

export async function updateProject(
  url: string,
  token: string,
  uuid: string,
  payload: { name?: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  const body: Record<string, string> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  return client(`/projects/${uuid}`, { method: 'PATCH', body });
}
```

**Delete with query params pattern** (lines 439-451):
```typescript
export async function deleteServer(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
  delete_volumes = false,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/servers/${uuid}`, {
    method: 'DELETE',
    query: { delete_volumes },
  });
}
```

---

### `src/mcp/tools/application.ts` (controller, request-response)

**Analog:** `src/mcp/tools/project.ts`

**Imports pattern** (lines 1-28):
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createEnvironment,
  createProject,
  deleteProject,
  fetchEnvironments,
  fetchProject,
  fetchProjects,
  updateProject,
} from '../../api/client.js';
import { buildReadResponse, paginateArray, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
```

**Zod Validation pattern** (lines 84-134):
```typescript
const createActionSchema = z
  .object({
    action: z.literal('create'),
    name: z.string().min(1).describe('Project name'),
    initial_environment: z
      .string()
      .optional()
      .describe(
        'Initial environment name (required — ask user for production vs custom per D-09/D-10)',
      ),
    description: z.string().optional().describe('Optional project description'),
    ...mutationResponseParamsSchema,
  })
  .strict();

const updateActionSchema = z
  .object({
    action: z.literal('update'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name for lookup or new name when uuid given'),
    new_name: z.string().optional().describe('New project name when resolving by name only'),
    description: z.string().optional().describe('Updated description'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);

const deleteActionSchema = z
  .object({
    action: z.literal('delete'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name (substring match)'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required for destructive delete'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);
```

**Confirm gate pattern** (lines 221-235):
```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on project '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}
```

**Error Handling / Validation pattern** (lines 164-188):
```typescript
function throwValidationError(error: z.ZodError): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  const code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? 'COOLIFY_422';

  throw new CoolifyApiError({
    code,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints: RECOVERY_HINTS[code] ?? RECOVERY_HINTS.COOLIFY_422,
  });
}
```

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `src/utils/errors.ts` (itself)

**Error mapping pattern** (lines 117-135):
```typescript
export function mapApiError(
  error: unknown,
  httpStatus?: number,
  coolifyMessage?: string,
): CoolifyErrorEnvelope {
  if (httpStatus !== undefined) {
    const code = statusToCode(httpStatus);
    const trimmedCoolifyMessage =
      typeof coolifyMessage === 'string' ? coolifyMessage.trim() : '';
    const message =
      trimmedCoolifyMessage.length > 0
        ? sanitizeMessage(trimmedCoolifyMessage)
        : sanitizeMessage(`Coolify API returned HTTP ${httpStatus}`);
    return {
      code,
      message,
      recoveryHints: RECOVERY_HINTS[code],
      httpStatus,
    };
  }
```

---

### `src/mcp/tools/application.test.ts` (test, request-response)

**Analog:** `src/mcp/tools/project.test.ts`

**Test structure pattern** (lines 139-181):
```typescript
describe('project create', () => {
  beforeEach(() => {
    vi.mocked(createProject).mockReset();
    vi.mocked(createEnvironment).mockReset();
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(createProject).mockResolvedValue({
      uuid: 'proj-new',
      name: 'new-project',
      description: 'new desc',
    });
  });

  it('creates project with initial_environment production and ensures production env per D-09/D-11', async () => {
    const result = await handleProjectAction(
      {
        action: 'create',
        name: 'new-project',
        description: 'new desc',
        initial_environment: 'production',
      },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(createProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ name: 'new-project', description: 'new desc' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });
});
```

---

## Shared Patterns

### Authentication & API Client
**Source:** `src/api/client.ts`
**Apply to:** All client methods
```typescript
const client = createCoolifyClient(url, token, verifySsl);
```

### Error Handling
**Source:** `src/utils/errors.ts`
**Apply to:** All service and controller actions
```typescript
try {
  // ... action logic ...
} catch (error) {
  return wrapMcpError(error);
}
```

### Secret Masking
**Source:** `src/utils/projections.ts`
**Apply to:** All read/get/create/update actions returning application data
```typescript
const data = projection === 'full'
  ? sanitizeFullProjection(raw, parsed.reveal)
  : projectApplicationSummary(rawRecord);
```

## No Analog Found

All files to be created or modified have exact analogs in the existing codebase.

## Metadata

**Analog search scope:** `src/api/`, `src/mcp/tools/`, `src/utils/`
**Files scanned:** 12
**Pattern extraction date:** 2026-07-19
